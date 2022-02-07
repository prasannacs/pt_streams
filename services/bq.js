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
      } else {
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

      if (tweet.user != undefined) {
        tweet.user.user_url = 'http://twitter.com/' + tweet.user.screen_name
      }

      if (tweet.created_at != undefined) {
        var cDate = new Date(tweet.created_at);
        //console.log('====== pushed tweet id ',tweet.id, 'type ', tweet_type);
        resultRows.push({
          id: tweet.id_str,
          text: tweet.text,
          category: category,
          reply_settings: tweet.reply_settings,
          source: tweet.source,
          author_id: tweet.author_id,
          conversation_id: tweet.conversation_id,
          created_at: BigQuery.datetime(cDate.toISOString()),
          lang: tweet.lang,
          in_reply_to_user_id: tweet.in_reply_to_user_id,
          in_reply_to_screen_name: tweet.in_reply_to_screen_name,
          possibly_sensitive: tweet.possibly_sensitive,
          geo: geoVar,
          entities: entitiesVar,
          user: tweet.user,
          tweet_url: 'http://twitter.com/twitter/status/' + tweet.id_str,
          tweet_type: tweet_type
        });
      }
    }
  });
  if (resultRows.length > 0)
    insertRowsAsStream(resultRows);
}

module.exports = { insertResults };
