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
  await page.goto(base+'worker.html',{waitUntil:'networkidle'});
  const dim=await page.evaluate(()=>({a:document.documentElement.scrollWidth,b:document.documentElement.clientWidth}));
  assert.ok(dim.a<=dim.b+8,'horizontal overflow');
  assert.equal(await page.locator('#work214-cash').count(),1);
assert.equal(await page.locator('[data-work214-action=debit]').isDisabled(),true);
await page.locator('[data-work214-action=hold]').click();
assert.match(await page.locator('.work214-state').textContent(),/HELD/);
await page.locator('[data-work214-action=debit]').click();
assert.equal(await page.locator('[data-work214-action=debit]').isDisabled(),true);
assert.equal(await page.locator('[data-work214-action=release]').isDisabled(),true);
assert.equal(await page.locator('.work214-history li').count(),2);
await page.locator('[data-work214-action=reset]').click();
await page.locator('[data-work214-action=hold]').click();
await page.locator('[data-work214-action=release]').click();
assert.match(await page.locator('.work214-state').textContent(),/해제/);
  assert.deepEqual(errors,[],'page errors');
  assert.deepEqual(external,[],'external writes');
  assert.deepEqual(writes,[],'no network writes');
  console.log('WORK214 preview PASS '+width+'px');
  await page.close();
 }
}finally{await browser.close();}
