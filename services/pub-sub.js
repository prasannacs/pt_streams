const {PubSub} = require('@google-cloud/pubsub');

const pubSubClient = new PubSub();
const topicName = "test-stream";

async function publishMessage(message) {
  // Publishes the message as a string, e.g. "Hello, world!" or JSON.stringify(someObject)
  const dataBuffer = Buffer.from(message);

  try {
    const messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
    console.log(`Message ${messageId} published.`);
  } catch (error) {
    console.error(`Received error while publishing: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { publishMessage };
