const express = require("express");
const fs = require('fs');
const { pipeline } = require('stream');
const axios = require("axios").default;
const axiosRetry = require("axios-retry");
const needle = require('needle');
const pub_sub_svcs = require('.././services/pub-sub.js');
const utils = require('.././services/utils.js');

const config = require('../config.js');
const https = require('https');

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
  streamTweetsHttp();
  res.send("Now streaming tweets ..");
});

router.get("/alive", function (req, res) {
  //console.log('staying alive ..');
  res.send('Alive');
});

router.get("/poll/:frequency/:delay", function (req, res) {
  console.log('polling Tweets from PubSub ',req.params.frequency);
  for(var i=0; i<req.params.frequency; i++) {
    setTimeout(() => {
      pub_sub_svcs.synchronousPull(config.gcp_projectId, config.gcp_subscriptionName, config.messageCount).then( (messenger) => {
        console.log('Stream reconnect => ',messenger);
        if( messenger === 'disconnect')
          streamTweetsHttp();  
      })

      },req.params.delay);
  }
  res.send('polling Tweets from PubSub');
});

async function streamTweetsHttp() {

  var options = {
    host: config.pt_stream_host,
    port: 443,
    path: config.pt_stream_path,
    keepAlive: true,
    headers: {
      'Authorization': 'Basic ' + new Buffer(config.gnip_username + ':' + config.gnip_password).toString('base64')
    }
  };
  request = https.get(options, function (res) {
    console.log('streaming with HTTP .. ',config.app_name);
    var body = '';
    // var msg_counter = 0;
    res.on('data', function (data) {
      // our stream will only emit a single JSON root node.
      var splited_payload = '';
      //console.log('got data: ', data.toString(),'---------\n');
      var json_payload = data.toString();
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
          console.log('Error -- ',e.message);
          if (json_payload[0] === undefined || json_payload[0] === '\r' || json_payload[0] === '' || json_payload[0] === '\n') {
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
    });
    res.on('end', function () {
      //here we have the full response, html or json object
      console.log(body);
    })
    res.on('error', function (e) {
      console.log("Got error: " + e.message);
      streamTweetsHttp();
    });
  });

}


module.exports = router
module.exports.streamTweetsHttp = streamTweetsHttp;
