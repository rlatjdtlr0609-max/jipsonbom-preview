import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const ORIGIN='https://ohwkywomdqgcnptsnhwk.supabase.co';
const ROOT=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const paths=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route(ORIGIN+'/**',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname;
  paths.push(req.method()+' '+p);
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{
   'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS',
   'access-control-allow-headers':'apikey,authorization,content-type'}});
  const response=(status,obj)=>route.fulfill({status,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},body:JSON.stringify(obj)});
  if(p==='/auth/v1/token')return response(200,{access_token:'synthetic-aal1',expires_in:3600});
  if(p==='/auth/v1/user')return response(200,{id:'01234567-89ab-4cde-89ab-0123456789ab',role:'authenticated',is_anonymous:false});
  if(p==='/auth/v1/factors'&&req.method()==='GET')return response(200,{totp:[]});
  if(p==='/auth/v1/factors'&&req.method()==='POST'){
   assert.deepEqual(req.postDataJSON(),{factor_type:'totp',friendly_name:'집손봄 관리자 인증'});
   return response(200,{id:'11111111-1111-4111-8111-111111111111',
    totp:{qr_code:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"></svg>')}});
  }
  if(p.endsWith('/challenge'))return response(200,{id:'22222222-2222-4222-8222-222222222222'});
  if(p.endsWith('/verify')){
   assert.equal(req.postDataJSON().code,'123456');
   return response(200,{access_token:'synthetic-aal2',expires_in:3600});
  }
  if(p==='/rest/v1/rpc/jsb_w103_admin_snapshot'){
   assert.equal(req.headers().authorization,'Bearer synthetic-aal2');
   return response(403,{message:'ACCESS_DENIED'});
  }
  if(p==='/auth/v1/logout')return response(200,{});
  throw Error('Unexpected request '+req.method()+' '+p);
 });
 await page.goto(ROOT+'admin.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#dashboard').isVisible(),false);
 await page.locator('#login-email').fill('admin@example.invalid');
 await page.locator('#login-password').fill('synthetic-password');
 await page.locator('#login-submit').click();
 await page.locator('#enroll-form').waitFor({state:'visible'});
 assert.equal(await page.locator('#dashboard').isVisible(),false);
 await page.locator('#enroll-start').click();
 await page.locator('#enroll-qr-wrap').waitFor({state:'visible'});
 assert.match(await page.locator('#enroll-qr').getAttribute('src'),/^data:image\/svg\+xml,/);
 await page.locator('#enroll-code').fill('123456');
 await page.locator('#enroll-verify').click();
 await page.locator('#login-form').waitFor({state:'visible'});
 assert.equal(await page.locator('#dashboard').isVisible(),false);
 assert.match(await page.locator('#auth-status').textContent(),/관리자 업무권한이 아직 승인되지 않아/);
 assert.equal(errors.length,0,JSON.stringify(errors));
 assert.ok(paths.some(x=>x==='POST /auth/v1/factors'));
 assert.ok(paths.some(x=>x.endsWith('/challenge')));
 assert.ok(paths.some(x=>x.endsWith('/verify')));
 assert.ok(paths.includes('POST /rest/v1/rpc/jsb_w103_admin_snapshot'));
 const html=await page.content();
 assert.doesNotMatch(html,/synthetic-aal1|synthetic-aal2|synthetic-password/);
 console.log('WORK160 fixed admin URL: verified QR enroll, token memory only, no administrator bypass — PASS');
}finally{await browser.close();}
