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
      return Promise.resolve(null);
  }

  if (!event.message.text.startsWith('老師')) {
      console.log('Message does not have the "老師" prefix. Ignoring...');
      return Promise.resolve(null);
  }

  let stream;
  try {
    stream = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        max_tokens: 500,
        messages: [
            { role: 'user', content: event.message.text.replace('老師', '') }, // Remove the "大師:" prefix
            { role: 'system', content: '你好，我是0安老師助理！' }
        ]
    });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return client.replyMessage(event.replyToken, { type: 'text', text: '發生錯誤，請聯繫Jerry！' });
  }

  const content = stream?.choices[0]?.message?.content;
  console.log('content:', content);
  const message = content || '我不懂你的意思！';
  return client.replyMessage(event.replyToken, { type: 'text', text: message });
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});