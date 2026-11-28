import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const origin=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const png=Buffer.from('89504e470d0a1a0a0000000000000000','hex');
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[],writes=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{
   if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url());
   if(new URL(r.url()).origin!==new URL(origin).origin)external.push(r.url());
  });
  await page.goto(origin+'customer.html',{waitUntil:'networkidle'});
  const msg=page.locator('#preview-file');
  const waitFor=async text=>page.waitForFunction(text=>document.querySelector('#preview-file')?.textContent.includes(text),text);
  assert.match(await page.locator('#preview-media').getAttribute('accept'),/video\/mp4/);
  await page.locator('#preview-media').setInputFiles({
   name:'synthetic.png',mimeType:'image/png',buffer:png
  });
  await waitFor('브라우저 사전검사 통과');
  assert.match(await msg.textContent(),/업로드·검역은 수행되지 않았습니다/);
  await page.locator('#preview-media').setInputFiles({
   name:'synthetic.exe',mimeType:'image/png',buffer:png
  });
  await waitFor('선택 불가');
  assert.equal(await page.locator('#preview-media').evaluate(e=>e.files.length),0);
  await page.locator('#preview-media').setInputFiles(
   Array.from({length:6},(_,i)=>({name:'test'+i+'.png',mimeType:'image/png',buffer:png}))
  );
  await waitFor('최대 5장');
  assert.equal(await page.locator('#preview-media').evaluate(e=>e.files.length),0);
  assert.deepEqual(errors,[]);
  assert.deepEqual(writes,[]);
  assert.deepEqual(external,[]);
  console.log('WORK218 + WORK244 PASS public-only preflight '+width+'px');
  await page.close();
 }
}finally{await browser.close();}
