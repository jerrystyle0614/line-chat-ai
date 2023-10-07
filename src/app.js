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

  if (!event.message.text.startsWith('大師:')) {
      console.log('Message does not have the "大師:" prefix. Ignoring...');
      return Promise.resolve(null);
  }

  let data;
  try {
    stream = await openai.chat.completions.create({
          model: 'gpt-4',
          max_tokens: 500,
          messages: [
              { role: 'user', content: event.message.text.replace('大師:', '') }, // Remove the "大師:" prefix
              { role: 'system', content: '你好，我是機器人' }
          ],
          stream: true
      });
      for await (const part of stream) {
        console.log('part:', part);
        const content = part.choices[0]?.delta?.content;
        console.log('completions:', content);
        const message = content || '我不懂你的意思！';
        // use reply API
        return client.replyMessage(event.replyToken, { type: 'text', text: message });
      }
  } catch (error) {
      console.error('Error calling OpenAI API:', error);
      // reply with an error message or handle it appropriately
      return client.replyMessage(event.replyToken, { type: 'text', text: '發生錯誤，請聯繫Jerry！' });
  }
}

// listen on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});