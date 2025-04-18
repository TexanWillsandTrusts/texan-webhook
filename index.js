import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = 'texanverify123';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// GET /webhook for Meta verification
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

// POST /webhook to receive messages
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const event = entry.messaging?.[0];

      if (!event || !event.message || !event.sender) continue;

      const senderId = event.sender.id;
      const messageText = event.message.text;

      if (messageText) {
        const replyText = "Hi there 👋 I'm Tex! Do you have a Will or Trust yet?";

        try {
          await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: senderId },
            message: { text: replyText }
          });
        } catch (err) {
          console.error('Error sending message:', err?.response?.data || err.message);
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Texan Webhook running on port ${PORT}`));
