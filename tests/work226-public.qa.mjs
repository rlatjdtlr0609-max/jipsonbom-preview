import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[],writes=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());if(new URL(r.url()).origin!==new URL(origin).origin)external.push(r.url());});
  await page.goto(origin+'index.html',{waitUntil:'networkidle'});
  const details=page.locator('#jsb-work226-coverage');
  assert.equal(await details.count(),1);
  await details.locator('summary').click();
  assert.match(await details.textContent(),/접수 자체가 기사 배정이나 방문예약 확정을 의미하지는 않습니다/);
  assert.match(await details.textContent(),/실제 접수·기사배정·예약·결제는 처리하지 않습니다/);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=8,'horizontal overflow '+width);
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(external,[]);
  await page.close();
 }
}finally{await browser.close();}