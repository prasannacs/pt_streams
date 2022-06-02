const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors')
const stream = require('./controllers/stream')
const api = require('./controllers/api')
const token = require('./controllers/token')
const stripe = require('./controllers/stripe')

const app = express();
const PORT = process.env.PORT || 4020;

app.use(cors());
app.options('*', cors()) 
app.post('*', cors()) 

app.use(bodyParser.json({strict:false}));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/stripe', stripe)
app.use('/stream',stream);
app.use('/api', api)
app.use('/token', token)

app.listen(PORT, ()=>   {
    console.log("App listening on port",PORT);
    //stream.streamTweetsHttp();
});

module.exports = app;
