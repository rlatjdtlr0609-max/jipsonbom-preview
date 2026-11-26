import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const ROOT=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,...(process.env.JSB_QA_BROWSER_CHANNEL?{channel:process.env.JSB_QA_BROWSER_CHANNEL}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:850}});
 const errors=[],external=[],writes=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(new URL(r.url()).origin!==new URL(ROOT).origin)external.push(r.url());if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
 await page.goto(ROOT+'repair-company.html',{waitUntil:'networkidle'});
 await page.locator('#w168-result').waitFor({state:'visible'});
 assert.match(await page.locator('#w168-result').textContent(),/BLOCKED_SCHEDULE_CONFLICT/);
 await page.locator('#w168-conflict').uncheck();
 await page.locator('#w168-check').click();
 assert.match(await page.locator('#w168-result').textContent(),/PREFLIGHT_ONLY_NO_WRITE/);
 await page.locator('#w168-actor').selectOption('DEMO-OWNER-B');
 await page.locator('#w168-check').click();
 assert.match(await page.locator('#w168-result').textContent(),/DENIED_ORGANIZATION_SCOPE/);
 assert.equal(errors.length,0,JSON.stringify(errors));
 assert.equal(external.length,0,JSON.stringify(external));
 assert.equal(writes.length,0,JSON.stringify(writes));
 console.log('WORK168 PASS: 390px cross-company access denied, conflicting assignment blocked, no API writes');
}finally{await browser.close();}
