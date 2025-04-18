import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = 'texanverify123';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// GET /webhook – Facebook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST /webhook – Messenger message handler
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const event = entry.messaging?.[0];

      if (!event || !event.message || !event.sender) continue;

      const senderId = event.sender.id;
      const messageText = event.message.text;

      if (messageText) {
        console.log(`📨 Tex received: "${messageText}" from ${senderId}`);

        try {
          const aiResponse = await axios.post(
            'https://texanwillsandtrusts.com/wp-json/mwai-engine/v1/chat',
            {
              prompt: messageText
