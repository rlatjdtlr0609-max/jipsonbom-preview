import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const urls=['index.html','customer.html','worker.html','construction.html','repair-company.html','admin.html'];
const browser=await chromium.launch({headless:true,channel:process.env.JSB_QA_BROWSER_CHANNEL||'chrome'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[],external=[],writes=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('request',req=>{
   if(new URL(req.url()).origin!==new URL(base).origin)external.push(req.url());
   if(!['GET','HEAD'].includes(req.method()))writes.push(req.url());
  });
  for(const path of urls){
   await page.goto(base+path,{waitUntil:'networkidle'});
   assert.ok(await page.title());
   const dim=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:document.documentElement.clientWidth}));
   assert.ok(dim.scroll<=dim.width+8,'horizontal overflow '+path+' '+JSON.stringify(dim));
  }
  const available={};
  for(const [file,path] of [
   ['work211-home-guide.js','index.html'],
   ['work212-aftercare.js','customer.html'],
   ['work213-notice-preview.js','repair-company.html'],
   ['work214-cash-preview.js','worker.html']]){
   available[file]=await readFile(file,'utf8').then(()=>true).catch(()=>false);
   if(!available[file])continue;
   await page.goto(base+path,{waitUntil:'networkidle'});
   if(file.startsWith('work211')){
    await page.locator('#work211-category').selectOption('욕실·변기');
    await page.locator('.work211-action').click();
    assert.equal(await page.locator('#intake-choice').evaluate(el=>el.open),true);
    assert.equal(await page.locator('#intake-category').inputValue(),'욕실·변기');
   }
   if(file.startsWith('work212')){
    assert.equal(await page.locator('.work212-stages li').count(),5);
    await page.locator('[data-work212-check]').first().check();
    assert.match(await page.locator('.work212-status').textContent(),/1\/3/);
   }
   if(file.startsWith('work213')){
    assert.equal(await page.locator('[data-work213-type]').count(),5);
    await page.locator('[data-work213-type=exception]').click();
    assert.match(await page.locator('.work213-content').textContent(),/MFA/);
    assert.match(await page.locator('.work213-status').textContent(),/전송 0건/);
   }
   if(file.startsWith('work214')){
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
    assert.equal(await page.locator('[data-work214-action=debit]').isDisabled(),true);
   }
  }
  if(process.env.JSB_REQUIRE_ALL_WORK211_214==='true')
   assert.equal(Object.values(available).filter(Boolean).length,4);
  assert.deepEqual(errors,[],'JavaScript errors '+width);
  assert.deepEqual(external,[],'external requests '+width);
  assert.deepEqual(writes,[],'unsafe network writes '+width);
  console.log('WORK215 PASS '+width+'px installed='+JSON.stringify(available));
  await page.close();
 }
}finally{await browser.close();}
