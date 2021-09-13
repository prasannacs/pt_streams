const express = require("express");
const fs = require('fs');
const { pipeline } = require('stream');
const axios = require("axios").default;
const axiosRetry = require("axios-retry");
const needle = require('needle');
const pub_sub_svcs = require('.././services/pub-sub.js');
const config = require('../config.js');

const router = express.Router();

axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  shouldResetTimeout: true,
  retryCondition: (axiosError) => {
    return true;
  },
});

router.get("/", function (req, res) {
  streamTweets();
  res.send("Now streaming tweets ..");
});

router.get("/alive", function (req, res) {
  //console.log('staying alive ..');
  res.send('Alive');
});

router.get("/poll", function (req, res) {
  console.log('polling Tweets from PubSub');
  pub_sub_svcs.synchronousPull(config.gcp_projectId, config.gcp_subscriptionName, config.messageCount);
  res.send('polling Tweets from PubSub');
});

async function streamTweets() {
  //Listen to the stream
  const options = {
    timeout: 2,
    compressed: true,
    connection: 'Keep-Alive',
    content_type: 'application/json'
  }

  const stream = needle.get(config.pt_stream_url, {
    username: config.gnip_username,
    password: config.gnip_password
  }, options);

  var msg_counter = 0;
  stream.on('readable', function () {
    var node;

    // our stream will only emit a single JSON root node.
    var splited_payload = '';
    while (node = this.read()) {
      //console.log('got data: ', node.toString());
      var json_payload = node.toString();
      if (json_payload) {
        try {
          JSON.parse(json_payload);
          pub_sub_svcs.publishMessage(config.gcp_topicName, JSON.stringify(json_payload));
          // msg_counter++;
          // if (msg_counter > config.messageCount) {
          //   msg_counter = 0;
          //   pub_sub_svcs.synchronousPull(config.gcp_projectId, config.gcp_subscriptionName, config.messageCount);
          // }
        } catch (e) {
          if (json_payload[0] == undefined || json_payload[0] == '\r' || json_payload[0] == '' || json_payload[0] == '\n') {
            console.log('~~~ Heartbeat payload ~~~ ');
          } else {
            if (splited_payload.length > 0) {
              splited_payload.append(json_payload);
              pub_sub_svcs.publishMessage(JSON.stringify(splited_payload));
              console.log('splited_payload ', JSON.parse(splited_payload));
              splited_payload = '';
            }
            else
              splited_payload = json_payload;
          }
        }
      }
      // const used = process.memoryUsage().heapUsed / 1024 / 1024;
      // console.log(used,`The script uses approximately ${Math.round(used * 100) / 100} MB`);
    }
  }).on('done', function (err, response) {
    console.log('Stream done ', response);
  }).on('close', function () {
    console.log('Client disconnect ', response);
    streamTweets();
  }).on('err', function (error, response) {
    console.log('Stream connection error ', response);
    streamTweets();
  }).on('timeout', function (error, response) {
    console.log('Stream timeout error ', response);
    streamTweets();
  });
  return stream;
}

module.exports = router;
