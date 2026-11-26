import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const ROOT=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const API='https://ohwkywomdqgcnptsnhwk.supabase.co';
const userId='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch({headless:true,...(process.env.JSB_QA_BROWSER_CHANNEL?{channel:process.env.JSB_QA_BROWSER_CHANNEL}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:810}});
 const errors=[];let wrongOwner=true;page.on('pageerror',e=>errors.push(e.message));
 await page.route(API+'/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  const h={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type'};
  const send=(status,data)=>route.fulfill({status,headers:h,contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:h});
  if(path==='/auth/v1/token')return send(200,{access_token:'synth171',expires_in:3600});
  if(path==='/auth/v1/user')return send(200,{id:userId,email:'synthetic171@example.invalid',email_confirmed_at:'2026-11-26T00:00:00Z',is_anonymous:false});
  if(path==='/rest/v1/rpc/jsb_w16_member_profile')
   return send(200,{account_id:wrongOwner?'22222222-2222-4222-8222-222222222222':userId,intakes:[],next_before:null});
  if(path==='/auth/v1/logout')return send(200,{});
  throw Error('unexpected endpoint: '+path);
 });
 await page.goto(ROOT+'customer.html',{waitUntil:'domcontentloaded'});
 async function login(){
  await page.locator('#w165-email').fill('synthetic171@example.invalid');
  await page.locator('#w165-password').fill('only-for-unit-test');
  await page.locator('#w165-auth button[type=submit]').click();
 }
 await login();
 await page.waitForFunction(()=>document.querySelector('#w165-status')?.textContent.includes('소유자 검증에 실패'));
 assert.equal(await page.locator('#w165-request').isVisible(),false);
 assert.equal(await page.locator('#w165-auth').isVisible(),true);
 wrongOwner=false;await login();
 await page.locator('#w165-request').waitFor({state:'visible'});
 await page.locator('#w165-request input[name=name]').fill('synthetic-only-name');
 await page.locator('#w165-request input[name=phone]').fill('00000000000');
 await page.locator('#w165-request input[name=address]').fill('synthetic address');
 await page.locator('#w165-signout').click();
 await page.locator('#w165-auth').waitFor({state:'visible'});
 assert.equal(await page.locator('#w165-request input[name=name]').inputValue(),'');
 assert.equal(await page.locator('#w165-request input[name=phone]').inputValue(),'');
 assert.equal(await page.locator('#w165-request input[name=address]').inputValue(),'');
 assert.equal(await page.locator('#w165-list button').count(),0);
 assert.equal(await page.locator('#w165-detail').textContent(),'');
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).length+Object.keys(sessionStorage).length),0);
 assert.deepEqual(errors,[]);
 console.log('WORK171 PASS: mismatched server owner forces logout and customer PII cleared after signout');
}finally{await browser.close();}
