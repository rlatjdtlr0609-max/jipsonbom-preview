import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[],external=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(new URL(r.url()).origin!==new URL(base).origin)external.push(r.url());if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
  await page.goto(base+'customer.html',{waitUntil:'networkidle'});
  const dim=await page.evaluate(()=>({a:document.documentElement.scrollWidth,b:document.documentElement.clientWidth}));
  assert.ok(dim.a<=dim.b+8,'horizontal overflow');
  assert.equal(await page.locator('#work212-aftercare').count(),1);
assert.equal(await page.locator('.work212-stages li').count(),5);
await page.locator('.work212-checks input').first().check();
assert.match(await page.locator('.work212-status').textContent(),/1\/3/);
assert.match(await page.locator('.work212-safety').textContent(),/서버/);
  assert.deepEqual(errors,[],'page errors');
  assert.deepEqual(external,[],'external writes');
  assert.deepEqual(writes,[],'no network writes');
  console.log('WORK212 preview PASS '+width+'px');
  await page.close();
 }
}finally{await browser.close();}
