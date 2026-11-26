import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const fixed=['index.html','customer.html','worker.html','repair-company.html','construction.html','admin.html'];
test('WORK215 fixed pages and protected boundary',async()=>{
 const pages=await Promise.all(fixed.map(read));
 for(const [i,html] of pages.entries()){
  assert.match(html,/lang="ko"/);
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.doesNotMatch(html,/(sb_secret_|service[_-]?role[_-]?key|BEGIN PRIVATE KEY)/i,fixed[i]);
 }
 for(const html of pages.slice(0,5)){
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
 }
 assert.equal((pages[0].match(/<section data-screen=/g)||[]).length,7);
 const source=await read('admin.js');
 const text=source.split('const groups=[')[1]?.split('];\n const labels')[0];
 assert.ok(text,'Admin 24 screen source missing');
 const entries=[...text.matchAll(/^\s*\['([a-z_]+)','/gm)].map(x=>x[1]);
 assert.equal(entries.length,24);
 assert.equal(new Set(entries).size,24);
 for(const file of ['customer.html','worker.html','construction.html','repair-company.html'])
  assert.ok(pages[0].includes('./'+file));
});
test('WORK215 optional modular public additions are safe',async()=>{
 const modules=[
  ['index.html','work211-home-guide.js'],
  ['customer.html','work212-aftercare.js'],
  ['repair-company.html','work213-notice-preview.js'],
  ['worker.html','work214-cash-preview.js']
 ];
 let installed=0;
 for(const [page,script] of modules){
  const html=await read(page);
  if(!html.includes('./'+script))continue;
  installed++;
  const source=await read(script);
  assert.doesNotMatch(source,/\b(fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB)\b/i,script);
 }
 if(process.env.JSB_REQUIRE_ALL_WORK211_214==='true')
  assert.equal(installed,4,'4 public additions required in the final fixed-link release');
});
