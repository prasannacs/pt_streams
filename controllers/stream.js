const express = require("express");
const fs = require('fs');
const { pipeline } = require('stream');
const axios = require("axios").default;
const axiosRetry = require("axios-retry");
const needle = require('needle');

const router = express.Router();
const bearerToken = 'Bearer AAAAAAAAAAAAAAAAAAAAAKlAOQEAAAAARS7DnwRTsyaDm0STmkaxYgI90RU%3DTyZTpAo3mYOGvp9rSCgT9eISvsdEYuVM8pggVfL2iuzP4Xohw3'

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
  const streamURL = "https://gnip-stream.twitter.com/stream/powertrack/accounts/Prasanna-Selvaraj/publishers/twitter/dev.json";

  //Listen to the stream
  const options = {
    timeout: 20000
  }

  const stream = needle.get(streamURL, {
    username: 'prasannas@twitter.com',
    password: 'bond0505'
  }, options);

  stream.on('data', data => {
    const chunks = [];
    try {
      //console.log('data -- ',data);
      chunks.push(Buffer.from(data));
      console.log('-- STREAM --',Buffer.concat(chunks).toString('utf8'));
    } catch (e) {
      console.log('Error in streaming ',e);
      // Keep alive signal received. Do nothing.
    }
  }).on('error', error => {
    if (error.code === 'ETIMEDOUT') {
      stream.emit('timeout');
    }
  }).on('end', () =>  {
    // do nothing and keep the connection alive
  })
  ;
  // const result = await streamToString(stream)
  // console.log('result -- ', result);
  return stream;

}

function streamToString(stream) {
  console.log('streamToString ');
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}


module.exports = router;
