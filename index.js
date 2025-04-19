import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || 'YOUR_PAGE_ACCESS_TOKEN';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'TexWebhook2024';

// Root route for testing
app.get('/', (req, res) => {
  res.send('🚀 Texan Webhook running');
});

// Facebook Webhook Verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

// Message handler
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;
      const message_text = webhook_event.message?.text;

      if (sender_psid && message_text) {
        console.log(`📨 Tex received: "${message_text}" from ${sender_psid}`);

        try {
          const aiResponse = await fetch('https://texanwillsandtrusts.com/wp-json/tex-chat/v1/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message_text })
          });

          const data = await aiResponse.json();

          if (data?.text) {
            await callSendAPI(sender_psid, data.text);
          } else {
            console.error('⚠️ No text in AI response:', data);
            await callSendAPI(sender_psid, "Hmm, I didn't quite catch that. Want to try asking another way?");
          }
        } catch (error) {
          console.error('❌ Error processing message:', error);
          await callSendAPI(sender_psid, "Sorry, I had trouble answering that one. Try again in a bit!");
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// Send message to Facebook Messenger user
async function callSendAPI(sender_psid, response) {
  const request_body = {
    recipient: { id: sender_psid },
    message: { text: response }
  };

  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request_body)
    });

    const result = await res.json();

    if (res.ok) {
      console.log('📤 Message sent successfully');
    } else {
      console.error('⚠️ Error sending message:', result);
    }
  } catch (err) {
    console.error('❌ Failed to call Send API:', err);
  }
}

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Texan Webhook running on port ${PORT}`);
});
