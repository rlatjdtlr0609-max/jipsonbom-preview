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
  await page.goto(base+'index.html',{waitUntil:'networkidle'});
  const dim=await page.evaluate(()=>({a:document.documentElement.scrollWidth,b:document.documentElement.clientWidth}));
  assert.ok(dim.a<=dim.b+8,'horizontal overflow');
  assert.equal(await page.locator('#work211-guide').count(),1);
await page.locator('#work211-category').selectOption('욕실·변기');
await page.locator('.work211-action').click();
assert.equal(await page.locator('#intake-choice').evaluate(x=>x.open),true);
assert.equal(await page.locator('#intake-category').inputValue(),'욕실·변기');
assert.equal(await page.locator('[data-screen]').count(),7);
  assert.deepEqual(errors,[],'page errors');
  assert.deepEqual(external,[],'external writes');
  assert.deepEqual(writes,[],'no network writes');
  console.log('WORK211 preview PASS '+width+'px');
  await page.close();
 }
}finally{await browser.close();}
