import { createHmac, timingSafeEqual } from 'node:crypto';

export function readSecrets(env) {
  const required = ['AI_BEARER_TOKEN', 'META_VERIFY_TOKEN', 'META_APP_SECRET', 'FB_PAGE_ACCESS_TOKEN'];
  for (const name of required) {
    if (typeof env[name] !== 'string' || env[name].trim().length < 32) {
      // Report the configuration name only. Never log values.
      throw new Error(`Missing or insufficient ${name}`);
    }
  }
  return {
    aiBearerToken: env.AI_BEARER_TOKEN,
    verifyToken: env.META_VERIFY_TOKEN,
    appSecret: env.META_APP_SECRET,
  };
}

export function verifyMetaSignature(body, signature, secret) {
  if (!Buffer.isBuffer(body) || typeof secret !== 'string' || secret.length < 32 ||
      typeof signature !== 'string' || !/^sha256=[a-fA-F0-9]{64}$/.test(signature)) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(body).digest();
  const actual = Buffer.from(signature.slice(7), 'hex');
  return timingSafeEqual(actual, expected);
}
