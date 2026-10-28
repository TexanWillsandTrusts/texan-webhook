import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { readSecrets, verifyMetaSignature } from './security.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// WordPress AI Engine API endpoint and bearer token
const AI_ENDPOINT = 'https://texanwillsandtrusts.com/wp-json/mwai-ui/v1/chats/submit';
const { aiBearerToken: BEARER_TOKEN, verifyToken: VERIFY_TOKEN, appSecret: APP_SECRET } = readSecrets(process.env);

// Verify Meta's signature against the exact bytes before parsing or side effects.
app.use(bodyParser.json({
  limit: '100kb',
  verify(req, res, body) {
    if (req.method === 'POST' &&
        !verifyMetaSignature(body, req.headers['x-hub-signature-256'], APP_SECRET)) {
      const error = new Error('Invalid webhook signature');
      error.status = 403;
      throw error;
    }
  },
}));
app.use((error, req, res, next) => {
  if (error) return res.sendStatus(error.status === 403 ? 403 : 400);
  next();
});

// 🔐 Webhook Verification (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verified with Meta');
      res.status(200).send(challenge);
    } else {
      console.warn('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// 📥 Handle Incoming Messages (POST)
app.post('/webhook', async (req, res) => {
  // Unsupported/missing JSON content types never reach the JSON verifier.
  if (!req.is('application/json')) return res.sendStatus(415);
  const body = req.body;
  if (!body || !Array.isArray(body.entry)) return res.sendStatus(400);

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const event = entry.messaging?.[0] || entry.standby?.[0];
      if (!event) continue;

      const senderId = event.sender?.id;
      const messageText = event.message?.text;

      if (typeof senderId === 'string' && typeof messageText === 'string' && messageText) {
        await handleMessage(senderId, messageText);
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// 🔁 Always use FB Page Access Token (for now)
function getAccessToken() {
  return process.env.FB_PAGE_ACCESS_TOKEN;
}

// 🤖 Send Message to AI Engine and Respond
async function handleMessage(senderId, userMessage) {
  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BEARER_TOKEN}`,
      },
      body: JSON.stringify({
        message: userMessage,
        context: {},
      }),
    });

    const data = await response.json();

    if (data?.text) {
      await sendMessage(senderId, data.text);
    } else {
      console.error('Invalid AI response');
      await sendMessage(senderId, 'Lo siento, no entendí eso. ¿Podrías intentarlo de otra manera?');
    }
  } catch (error) {
    console.error('AI request failed');
    await sendMessage(senderId, 'Oops, hubo un error al procesar tu mensaje.');
  }
}

// 📤 Send Reply to Messenger
async function sendMessage(senderId, replyText) {
  const accessToken = getAccessToken();
  if (!accessToken) {
    console.error('❌ Access token is missing!');
    return;
  }

  const url = 'https://graph.facebook.com/v18.0/me/messages';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        recipient: { id: senderId },
        message: { text: replyText },
      }),
    });

    const data = await response.json();
    if (data.error) {
      console.error('Message delivery failed');
    }
  } catch (error) {
    console.error('Graph API request failed');
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Texan Webhook running on port ${PORT}`);
});
