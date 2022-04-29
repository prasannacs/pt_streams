function sleep(milliseconds) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('timed');
        }, milliseconds)
    })
}

function getEngagementSQL(tableName, minMinutes, maxMinutes) {
    return `SELECT id  
    FROM `+ tableName + ` WHERE DATETIME_DIFF(current_datetime, created_at, MINUTE) > `+ minMinutes + 
    ` AND DATETIME_DIFF(current_datetime, created_at, MINUTE) < ` + maxMinutes + ` AND TWEET_TYPE != 'Retweet'`;
}

function getTrends(tableName, minutes) {
    return `SELECT
    context.context_entity_name AS CONTEXT, context.context_domain_name AS DOMAIN, entity.normalized_text as ENTITY, entity.type as ENTITY_TYPE, GT.tweet_type as TWEET_TYPE,
    COUNT(*) AS TWEET_COUNT
  FROM `
    + tableName + ` AS GT,
    UNNEST(entities.annotations.context) AS context,
    UNNEST(entities.annotations.entity) AS entity
where created_at > DATETIME_SUB(current_datetime(), INTERVAL `+ minutes + ` MINUTE) 
  GROUP BY
    CONTEXT, DOMAIN, ENTITY, ENTITY_TYPE, TWEET_TYPE
  ORDER BY
    TWEET_COUNT DESC`;
}

module.exports = { sleep, getEngagementSQL, getTrends };