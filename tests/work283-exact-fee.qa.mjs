import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errs=[],external=[],writes=[];
  page.on('pageerror',e=>errs.push(e.message));
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());if(new URL(r.url()).origin!==new URL(origin).origin)external.push(r.url());});
  await page.goto(origin+'worker.html',{waitUntil:'networkidle'});
  const input=page.locator('#calcprice'),result=page.locator('#calcresult');
  assert.equal(await result.getAttribute('aria-live'),'polite');
  await input.fill('80000');
  assert.match((await result.textContent()).replaceAll(',',''),/^8000원$/);
  assert.equal(await result.getAttribute('data-work283-valid'),'true');
  await input.fill('100001');
  assert.match(await result.textContent(),/계산 보류.*원 미만/);
  assert.equal(await result.getAttribute('data-work283-valid'),'false');
  await input.fill('12345');
  assert.match(await result.textContent(),/계산 보류/);
  await input.fill('-10');
  assert.match(await result.textContent(),/유효한 공식단가/);
  await input.fill('0');
  assert.match(await result.textContent(),/유효한 공식단가/);
  await input.fill('100000');
  assert.match((await result.textContent()).replaceAll(',',''),/^10000원$/);
  assert.match(await page.locator('#work214-cash').textContent(),/실제 공식 단가표.*연결되지 않습니다/);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=8,'horizontal overflow at '+width);
  assert.deepEqual(errs,[]);assert.deepEqual(external,[]);assert.deepEqual(writes,[]);
  console.log('WORK283 PASS exact 10% / pending rounding '+width+'px');
  await page.close();
 }
}finally{await browser.close();}
