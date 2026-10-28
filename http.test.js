import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';

test('real Express endpoint rejects unsigned and tampered requests before handling', async () => {
  const secret = 'synthetic-secret-for-local-tests-only';
  const env = {...process.env, PORT:'18971', AI_BEARER_TOKEN:secret, META_VERIFY_TOKEN:secret, META_APP_SECRET:secret, FB_PAGE_ACCESS_TOKEN:secret};
  const child = spawn(process.execPath, ['index.js'], {cwd:import.meta.dirname, env, stdio:['ignore','pipe','pipe']});
  let output = '';
  child.stdout.on('data', data => {output += data.toString();});
  child.stderr.on('data', data => {output += data.toString();});
  try {
    await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw new Error('server exited');}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('start timeout')),5000).unref())]);
    const base = 'http://127.0.0.1:18971';
    // Empty entries cannot trigger AI or Messenger calls, even if authentication fails open.
    const body = '{"object":"page","entry":[]}';
    const signature = 'sha256='+createHmac('sha256',secret).update(body).digest('hex');
    for (const path of ['/webhook','/webhook/','/WEBHOOK']) {
      assert.equal((await fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body})).status,403);
      assert.equal((await fetch(base+path,{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':signature},body:body+' '})).status,403);
      assert.equal((await fetch(base+path,{method:'POST',headers:{'content-type':'application/json','x-hub-signature-256':signature},body})).status,200);
    }
    assert.equal((await fetch(base+'/webhook',{method:'POST',body})).status,415);
    assert.equal((await fetch(base+'/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=fixture')).status,403);
    assert.equal(await (await fetch(base+'/webhook?hub.mode=subscribe&hub.verify_token='+secret+'&hub.challenge=fixture')).text(),'fixture');
    assert.equal(output.includes(secret),false);
  } finally {
    child.kill();
    await once(child,'exit');
  }
});
