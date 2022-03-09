function sleep(milliseconds) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('timed');
        }, milliseconds)
    })
}

function getEngagementSQL(tableName) {
    return `SELECT id  
    FROM `+ tableName + ` WHERE DATETIME_DIFF(current_datetime, created_at, MINUTE) > 60 
    AND DATETIME_DIFF(current_datetime, created_at, MINUTE) < 1440 AND TWEET_TYPE != 'Retweet'`;
}

module.exports = { sleep, getEngagementSQL };