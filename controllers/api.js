const express = require("express");
const utils = require('.././services/utils.js');
const api_svcs = require('.././services/api.js');
const config = require('../config.js');

const router = express.Router();

router.get("/", function (req, res) {
    console.log('-- API Services -- ');
    res.send('API Services');
});

router.get("/trends", function (req, res) {
    console.log('-- API Services | Trending Data -- ');
    api_svcs.getTrends(60).then(function (results)  {
        res.send(results);
    });
    
});

module.exports = router
