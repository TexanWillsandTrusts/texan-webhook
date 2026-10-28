import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readSecrets, verifyMetaSignature } from './security.js';
const secret = 'synthetic-meta-app-secret-32bytes-only';
const body = Buffer.from('{"object":"page","entry":[]}');
const sign = value => 'sha256=' + createHmac('sha256', secret).update(value).digest('hex');

test('accepts the exact signed bytes', () => assert.equal(verifyMetaSignature(body, sign(body), secret), true));
test('rejects tampered content', () => assert.equal(verifyMetaSignature(Buffer.from('{}'), sign(body), secret), false));
test('rejects reserialized signed content', () => assert.equal(verifyMetaSignature(Buffer.from('{ "object":"page","entry":[]}'), sign(body), secret), false));
test('rejects wrong secret', () => assert.equal(verifyMetaSignature(body, sign(body), 'different-synthetic-secret-32bytes'), false));
test('rejects missing, malformed and duplicate header values', () => {
  for (const value of [undefined, null, '', 'sha1=abc', 'sha256=abc', 'sha256='+'z'.repeat(64), [sign(body), sign(body)], sign(body)+','+sign(body)]) {
    assert.equal(verifyMetaSignature(body, value, secret), false);
  }
});
test('rejects missing secret and non-buffer body', () => {
  assert.equal(verifyMetaSignature(body, sign(body), undefined), false);
  assert.equal(verifyMetaSignature(body.toString(), sign(body), secret), false);
});
test('valid secret configuration is accepted', () => {
  const env = Object.fromEntries(['AI_BEARER_TOKEN','META_VERIFY_TOKEN','META_APP_SECRET','FB_PAGE_ACCESS_TOKEN'].map(k=>[k,secret]));
  assert.equal(readSecrets(env).appSecret, secret);
});
test('each absent or weak credential fails closed without leaking a value', () => {
  for (const name of ['AI_BEARER_TOKEN','META_VERIFY_TOKEN','META_APP_SECRET','FB_PAGE_ACCESS_TOKEN']) {
    for (const invalid of [undefined,'','unsafe']) {
      const env = Object.fromEntries(['AI_BEARER_TOKEN','META_VERIFY_TOKEN','META_APP_SECRET','FB_PAGE_ACCESS_TOKEN'].map(k=>[k,secret]));
      env[name] = invalid;
      assert.throws(()=>readSecrets(env), error=>error.message.includes(name) && !error.message.includes(secret));
    }
  }
});
