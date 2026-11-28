/* WORK301 · MASTER_11 cumulative public fixed URL release gate.
 * Catches accidental loss of previous safe UI and prevents unsafe network activation.
 * This does NOT certify actual customer/backend/PG E2E or commercial launch.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const fixed=['index.html','customer.html','worker.html','repair-company.html','construction.html','admin.html'];
test('WORK301 six fixed URLs and no public secrets',async()=>{
 const docs=await Promise.all(fixed.map(read));
 for(let i=0;i<docs.length;i++){
  const html=docs[i];
  assert.match(html,/lang="ko"/,fixed[i]);
  assert.match(html,/Content-Security-Policy/,fixed[i]);
  assert.match(html,/name="robots" content="noindex,nofollow/,fixed[i]);
  assert.match(html,/work240-accessibility.js/,fixed[i]);
  assert.doesNotMatch(html,/(sb_secret_|service[_-]?role[_-]?key|BEGIN PRIVATE KEY)/i,fixed[i]);
  if(fixed[i]!=='admin.html'){
   assert.match(html,/connect-src 'none'/,fixed[i]);
   assert.match(html,/form-action 'none'/,fixed[i]);
  }
 }
});
test('WORK301 preserve already verified public features',async()=>{
 const home=await read('index.html'),customer=await read('customer.html'),worker=await read('worker.html'),repair=await read('repair-company.html');
 for(const f of ['work211-home-guide.js','work226-service-coverage.js'])assert.ok(home.includes(f),f);
 for(const f of ['work212-aftercare.js','work218-public-preflight.js'])assert.ok(customer.includes(f),f);
 for(const f of ['work214-cash-preview.js','role-pages.js?v=work283-20261128-1'])assert.ok(worker.includes(f),f);
 assert.match(repair,/work213-notice-preview.js/);
 const fee=await read('role-pages.js');
 assert.match(fee,/Number\.isSafeInteger\(amount\)&&amount>0/);
 assert.match(fee,/amount%10===0/);
 assert.match(fee,/amount\/10/);
 assert.doesNotMatch(fee,/amount\*\.1/);
 const media=await read('work218-public-preflight.js');
 assert.match(media,/async function validSignature/);
 assert.doesNotMatch(media,/\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB)\b/);
});
test('WORK301 24 admin screens and 7 original home screens retained',async()=>{
 const home=await read('index.html'),source=await read('admin.js');
 assert.equal((home.match(/<section data-screen=/g)||[]).length,7);
 const definition=source.split('const groups=[')[1]?.split('];\n const labels')[0];
 assert.ok(definition,'24-screen declaration not found');
 const screenIds=[...definition.matchAll(/^\s*\['([a-z_]+)','/gm)].map(x=>x[1]);
 assert.equal(screenIds.length,24);
 assert.equal(new Set(screenIds).size,24);
});
