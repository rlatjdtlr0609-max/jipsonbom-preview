import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const api='https://ohwkywomdqgcnptsnhwk.supabase.co';
const browser=await chromium.launch({headless:true,...(process.env.JSB_QA_BROWSER_CHANNEL?{channel:process.env.JSB_QA_BROWSER_CHANNEL}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:850}});
 let reject=false;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(api+'/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname;
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'apikey,authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  const reply=(status,payload)=>route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(payload)});
  if(p==='/auth/v1/token')return reply(200,{access_token:'synthetic-176',expires_in:3600});
  if(p==='/auth/v1/user')return reply(200,{id:'11111111-1111-4111-8111-111111111111',email:'work176@example.invalid',email_confirmed_at:'2026-11-26T00:00:00Z'});
  if(p==='/rest/v1/rpc/jsb_w16_member_profile')return reject?reply(403,{code:'ACCESS_DENIED'}):reply(200,{
   account_id:'11111111-1111-4111-8111-111111111111',intakes:[],next_before:null});
  throw Error('Unexpected API '+p);
 });
 await page.goto(root+'customer.html',{waitUntil:'domcontentloaded'});
 await page.locator('#w165-email').fill('work176@example.invalid');
 await page.locator('#w165-password').fill('synthetic-test-only');
 await page.locator('#w165-auth button[type=submit]').click();
 await page.locator('#w165-request').waitFor({state:'visible'});
 reject=true;
 await page.locator('#w165-reload').click();
 await page.locator('#w165-auth').waitFor({state:'visible'});
 assert.equal(await page.locator('#w165-request').isVisible(),false);
 assert.equal(await page.locator('#w165-list button').count(),0);
 assert.equal(await page.locator('#w165-detail').textContent(),'');
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).length+Object.keys(sessionStorage).length),0);
 assert.deepEqual(errors,[]);
 console.log('WORK176 PASS: authenticated API 403 clears session/form/owned data; no real credentials');
}finally{await browser.close();}
