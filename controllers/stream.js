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

async function streamTweets() {
  //Listen to the stream
  const options = {
    timeout: 20000
  }

  const stream = needle.get(config.pt_stream_url, {
    username: config.gnip_username,
    password: config.gnip_password
  }, options);

  stream.on('data', data => {
    const chunks = [];
    try {
      chunks.push(Buffer.from(data));
      //console.log('-- STREAM --',Buffer.concat(chunks).toString('utf8'));
      pub_sub_svcs.publishMessage(Buffer.concat(chunks).toString('utf8'));
    } catch (e) {
      console.log('Error in streaming ',e);
      // Keep alive signal received. Do nothing.
    }
  }).on('error', error => {
    if (error.code === 'ETIMEDOUT') {
      stream.emit('timeout');
    }
  }).on('end', () =>  {
    console.log('---POWERTRACK STREAM ENDED ---- NOT GOOD -----');
    // do nothing and keep the connection alive
  });
  return stream;
}

module.exports = router;
