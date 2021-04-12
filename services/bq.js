const { BigQuery } = require("@google-cloud/bigquery");

const projectId = "twttr-des-sa-demo-dev";
const datasetId = "twitter";
const table = "pt_cashtags_trends";


async function insertRowsAsStream(tableId, rows) {
  const bigqueryClient = new BigQuery();

  // Insert data into a table
  try {
    const result = await new Promise((resolve, reject) => {
      bigqueryClient
        .dataset(datasetId)
        .table(tableId)
        .insert(rows)
        .then((results) => {
          console.log(`Inserted ${rows.length} rows`);
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

      if(tweet.created_at != undefined) {
      var cDate = new Date(tweet.created_at);
      console.log('====== pushed tweet id ',tweet.id, 'created_at ',cDate, ' tweet.created_at -- ',tweet.created_at);
      resultRows.push({
        id: tweet.id,
        text: tweet.text,
        category: category,
        reply_settings: tweet.reply_settings,
        source: tweet.source,
        author_id: tweet.author_id,
        conversation_id: tweet.conversation_id,
       //created_at : tweet.created_at,
        created_at: BigQuery.datetime(cDate.toISOString()),
        lang: tweet.lang,
        in_reply_to_user_id: tweet.in_reply_to_user_id,
        in_reply_to_screen_name: tweet.in_reply_to_screen_name,
        possibly_sensitive: tweet.possibly_sensitive,
        geo: geoVar,
        entities: entitiesVar,
      });
    }
    }
  });

  console.log('Result row ---------------- length ----',resultRows.length);
  if( resultRows.length > 0 )
    insertRowsAsStream(table, resultRows);
}

module.exports = { insertResults };