import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const origin=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const png=Buffer.from('89504e470d0a1a0a0000000000000000','hex');
const fake=Buffer.alloc(16,0);
const jpeg=Buffer.from('ffd8ff0000000000000000000000ffd9','hex');
const mp4=Buffer.concat([Buffer.from('0000001866747970','hex'),Buffer.from('69736f6d00000000','hex'),Buffer.alloc(8)]);
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const writes=[],external=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{
   if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url());
   if(new URL(r.url()).origin!==new URL(origin).origin)external.push(r.url());
  });
  await page.goto(origin+'customer.html',{waitUntil:'networkidle'});
  const input=page.locator('#preview-media');
  async function check(file,ok){
   await input.setInputFiles(file);
   await page.waitForFunction(ok=>document.querySelector('#preview-file')?.textContent.includes(ok?'브라우저 사전검사 통과':'선택 불가'),ok);
   const text=await page.locator('#preview-file').textContent();
   assert.match(text,/파일을 서버로 전송하지 않습니다/);
   if(!ok)assert.equal(await input.evaluate(el=>el.files.length),0);
  }
  await check({name:'proof.png',mimeType:'image/png',buffer:png},true);
  await check({name:'spoof.png',mimeType:'image/png',buffer:fake},false);
  await check({name:'proof.jpg',mimeType:'image/jpeg',buffer:jpeg},true);
  await check({name:'spoof.jpg',mimeType:'image/jpeg',buffer:png},false);
  await check({name:'proof.mp4',mimeType:'video/mp4',buffer:mp4},true);
  await check({name:'spoof.mp4',mimeType:'video/mp4',buffer:fake},false);
  const dim=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(dim<=8,'horizontal overflow '+width);
  assert.deepEqual(errors,[],'JS runtime errors '+width);
  assert.deepEqual(writes,[],'unexpected writes '+width);
  assert.deepEqual(external,[],'external network requests '+width);
  console.log('WORK244 signature validation PASS '+width+'px');
  await page.close();
 }
}finally{await browser.close();}
