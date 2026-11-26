import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const ROOT=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const API='https://ohwkywomdqgcnptsnhwk.supabase.co';
const REDIRECT='https://rlatjdtlr0609-max.github.io/jipsonbom-preview/admin.html';
const fakeJWT='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.synthetic-signature';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:850}});
 const faults=[],calls=[],mutations=[];
 page.on('pageerror',e=>faults.push(e.message));
 await page.route(API+'/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  const path=url.pathname;
  calls.push({path,method:request.method()});
  if(request.method()==='OPTIONS')return route.fulfill({
   status:204,headers:{'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,POST,PUT,OPTIONS',
    'access-control-allow-headers':'apikey,authorization,content-type'}});
  const reply=(status,obj)=>route.fulfill({status,
   headers:{'access-control-allow-origin':'*'},contentType:'application/json',
   body:JSON.stringify(obj)});
  if(path==='/auth/v1/recover'&&request.method()==='POST'){
   assert.equal(url.searchParams.get('redirect_to'),REDIRECT);
   assert.deepEqual(request.postDataJSON(),{email:'admin@example.invalid'});
   return reply(200,{});
  }
  if(path==='/auth/v1/user'&&request.method()==='GET'){
   assert.equal(request.headers().authorization,'Bearer '+fakeJWT);
   return reply(200,{id:'00000000-0000-4000-8000-000000000001',role:'authenticated',is_anonymous:false});
  }
  if(path==='/auth/v1/user'&&request.method()==='PUT'){
   assert.equal(request.headers().authorization,'Bearer '+fakeJWT);
   const obj=request.postDataJSON();
   assert.equal(typeof obj.password,'string');assert.equal(obj.password.length,24);
   mutations.push({path,password_length:obj.password.length});
   return reply(200,{id:'00000000-0000-4000-8000-000000000001'});
  }
  if(path==='/auth/v1/logout')return reply(200,{});
  throw Error('Unexpected auth/REST access '+request.method()+' '+path);
 });
 await page.goto(ROOT+'admin.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#dashboard').isVisible(),false);
 assert.match(await page.locator('#forgot-password').textContent(),/비밀번호 직접 설정·변경/);
 await page.locator('#forgot-password').click();
 await page.locator('#reset-request-form').waitFor({state:'visible'});
 await page.locator('#reset-email').fill('admin@example.invalid');
 await page.locator('#reset-request-submit').click();
 await page.locator('#auth-status').getByText('재설정 안내 메일',{exact:false}).first().waitFor({state:'visible'}).catch(()=>{});
 assert.ok(calls.some(x=>x.path==='/auth/v1/recover'&&x.method==='POST'));
 assert.equal(await page.locator('#dashboard').isVisible(),false);

 await page.goto(ROOT+'admin.html#access_token='+encodeURIComponent(fakeJWT)+
  '&expires_in=3600&type=recovery&refresh_token=synthetic-refresh');
 await page.locator('#reset-confirm-form').waitFor({state:'visible'});
 assert.match(await page.locator('#reset-confirm-form').textContent(),/원하는 비밀번호를 12자 이상 직접 입력/);
 assert.equal(await page.locator('#reset-password').getAttribute('readonly'),null,'user chosen password must be editable');
 assert.equal(new URL(page.url()).hash,'','recovery credentials must be scrubbed from address bar');
 assert.equal(await page.locator('#dashboard').isVisible(),false);
 await page.locator('#reset-generate').click();
 const pw=await page.locator('#reset-password').inputValue();
 assert.equal(pw.length,24);
 assert.equal(await page.locator('#reset-password-repeat').inputValue(),pw);
 assert.match(pw,/^[A-Za-z0-9!@#$%*_-]+$/);
 await page.locator('#reset-confirm-submit').click();
 await page.locator('#login-form').waitFor({state:'visible'});
 assert.equal(mutations.length,1);
 assert.equal(await page.locator('#dashboard').isVisible(),false);
 assert.match(await page.locator('#auth-status').textContent(),/비밀번호 변경이 완료/);
 assert.equal(await page.locator('#reset-password').inputValue(),'');
 assert.equal(new URL(page.url()).hash,'');
 const html=await page.content();
 assert.ok(!html.includes(fakeJWT),'recovery token must never enter HTML');
 assert.ok(!html.includes(pw),'generated password must disappear after save');
 assert.ok(!calls.some(x=>x.path.startsWith('/rest/v1/')),'recovery must not authorize admin operations');

 await page.goto(ROOT+'admin.html#access_token=invalid&type=recovery&expires_in=3600');
 assert.equal(await page.locator('#dashboard').isVisible(),false);
 assert.equal(new URL(page.url()).hash,'');
 assert.equal(await page.locator('#reset-confirm-form').isVisible(),false);
 assert.equal(faults.length,0,JSON.stringify(faults));
 console.log('WORK161 PASS: fixed URL reset request, token scrub, crypto temporary password, password update, admin deny');
} finally {await browser.close();}
