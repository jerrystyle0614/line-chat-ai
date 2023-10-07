require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// event handler
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }
  console.log('line event:', event);
  const data = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    max_tokens: 500,
    messages: [
      { 
        role: 'user', 
        content: event.message.text
      },
      {
        role: 'system',
        content: '你好，我是機器人',
      }
    ]
  });
  console.log('completions:', data);
  const { choices } = data;
  const content = choices[0]?.delta?.content;
  const message = content || '抱歉，我沒有話可說了。';
  const echo = { type: 'text', text: message };
  console.log('message:', message);
  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});