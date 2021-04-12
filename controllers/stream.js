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
  //pub_sub_svcs.synchronousPull();
  res.send("Now streaming tweets ..");
});

async function streamTweets() {
  //Listen to the stream
  const options = {
    timeout: 20000,
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
          pub_sub_svcs.publishMessage(JSON.stringify(json_payload));
          msg_counter++;
          if (msg_counter > 250) {
            msg_counter = 0;
            pub_sub_svcs.synchronousPull();
          }
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
    }
  }).on('done', function (err, response) {
    console.log('Stream done ', response);
  });
  return stream;
}

module.exports = router;
