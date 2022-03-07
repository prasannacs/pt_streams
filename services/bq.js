const { BigQuery } = require("@google-cloud/bigquery");
const config = require('../config.js');

async function insertRowsAsStream(rows) {
  const bigqueryClient = new BigQuery();

  // Insert data into a table
  try {
    const result = await new Promise((resolve, reject) => {
      bigqueryClient
        .dataset(config.pt_datasetId)
        .table(config.pt_table)
        .insert(rows)
        .then((results) => {
          console.log(config.app_name, ` Inserted ${rows.length} rows`);
          resolve(rows);
        })
        .catch((err) => {
          reject(err);
        });
    });
  } catch (error) {
    console.log("----BQ JSON Error --- \n ", JSON.stringify(error), "\n");
    throw new Error(error);
  }
}

async function insertResults(results, category) {
  var resultRows = [];
  results.forEach(function (tweet, index) {
    //console.log(' -- TWEET -- ',tweet);

    if (tweet) {
      tweet = JSON.parse(tweet);
      if (tweet.geo != undefined) {
        var geoVar = tweet.geo;
        if (tweet.geo.coordinates != undefined) {
          geoVar.coordinates = tweet.geo.coordinates;
          if (tweet.geo.coordinates.coordinates != undefined && Array.isArray(tweet.geo.coordinates.coordinates) && tweet.geo.coordinates.coordinates.length) {
            geoVar.coordinates.coordinates = tweet.geo.coordinates.coordinates;
          }
        }
      }

      var tweet_type;
      // Determine Tweet type
      if (tweet.in_reply_to_user_id != undefined || tweet.in_reply_to_user_id != null) {
        tweet_type = 'Reply';
      } else if (tweet.text) {
        if (tweet.text.startsWith('RT', 0)) {
          tweet_type = 'Retweet'
        }
      } else if (tweet.quoted_status) {
        tweet_type = 'Quote'
      } 
      
      if( tweet_type === null || tweet_type === undefined ) {
        tweet_type = 'Original'
      }

      // Determine full text
      if (tweet.extended_tweet) {
        tweet.text = tweet.extended_tweet.full_text;
      }

      if (tweet.entities != undefined) {
        var entitiesVar = tweet.entities;
        if (tweet.entities.urls === undefined)
          entitiesVar.urls = [];
        else
          entitiesVar.urls = [];
        // TODO: ^^ correct it
        if (tweet.entities.user_mentions === undefined)
          entitiesVar.user_mentions = [];
        if (tweet.entities.hashtags === undefined)
          entitiesVar.hashtags = [];
        if (tweet.entities.media === undefined)
          entitiesVar.media = [];
        entitiesVar.media = [];
      }

      // Determine Media
      if( tweet.media != undefined) {
        var media = tweet.media;
        var mediaArr = getMediaArray(media);
      }
      if( tweet.extended_entities != undefined) {
        var e_media = tweet.extended_entities.media;
        var e_mediaArr = getMediaArray(e_media);
        var extended_entities = {};
        extended_entities.media = e_mediaArr;
      }

      if (tweet.user != undefined) {
        tweet.user.user_url = 'http://twitter.com/' + tweet.user.screen_name
      }

      if (tweet.created_at != undefined) {
        var cDate = new Date(tweet.created_at);
        var tweety = {};
        tweety.id = tweet.id_str
        tweety.text = tweet.text
        tweety.category = category
        tweety.reply_settings =  tweet.reply_settings
        tweety.source = tweet.source
        tweety.author_id = tweet.author_id
        tweety.conversation_id = tweet.conversation_id
        tweety.created_at = BigQuery.datetime(cDate.toISOString())
        tweety.lang = tweet.lang
        tweety.in_reply_to_user_id = tweet.in_reply_to_user_id
        tweety.in_reply_to_screen_name = tweet.in_reply_to_screen_name
        tweety.possibly_sensitive = tweet.possibly_sensitive
        tweety.geo = geoVar
        tweety.entities = entitiesVar
        tweety.user = tweet.user
        tweety.tweet_url = 'http://twitter.com/twitter/status/' + tweet.id_str
        tweety.tweet_type = tweet_type
        if( tweet.media != undefined || tweet.media != null)
          tweety.media = mediaArr
        if( tweet.extended_entities != undefined || tweet.extended_entities != null)
          tweety.extended_entities = extended_entities
        //console.log('====== pushed tweet id ',tweet.id, 'type ', tweet_type);
        resultRows.push(tweety);
      }
    }
  });
  if (resultRows.length > 0)
    insertRowsAsStream(resultRows);
}

function getMediaArray(media) {
  var mediaArr = [];
  media.forEach(function (media, index) {
    var mediaObj = {};
    mediaObj.id = media.id_str;
    mediaObj.media_url = media.media_url;
    mediaObj.media_url_https = media.media_url_https;
    mediaObj.url = media.url;
    mediaObj.display_url = media.display_url;
    mediaObj.expanded_url = media.expanded_url;
    mediaObj.type = media.type;
    mediaArr.push(mediaObj);
  })
  return mediaArr;
}

module.exports = { insertResults };
