import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const routes=['index.html','customer.html','worker.html','repair-company.html','construction.html','admin.html'];
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const path of routes){
   await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   const skip=page.locator('#jsb-skip-main');
   assert.equal(await skip.count(),1,'skip link missing '+path);
   const before=await page.evaluate(()=>location.hash);
   await skip.focus();await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>document.activeElement.tagName),'MAIN','main not focused '+path);
   assert.equal(await page.evaluate(()=>location.hash),before,'SPA route changed '+path);
   assert.equal(await page.locator('main').count(),1,'main landmark '+path);
  }
  assert.deepEqual(errors,[],'JS runtime errors '+width);
  await page.close();
 }
}finally{await browser.close();}