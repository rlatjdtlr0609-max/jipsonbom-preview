import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const ROOT=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const API='https://ohwkywomdqgcnptsnhwk.supabase.co';
const browser=await chromium.launch({headless:true,...(process.env.JSB_QA_BROWSER_CHANNEL?{channel:process.env.JSB_QA_BROWSER_CHANNEL}:{})});
try{
 for(const mode of ['NO_MFA','NO_GRANT','UNVERIFIED_SNAPSHOT']){
  const page=await browser.newPage({viewport:{width:390,height:840}});
  const requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(API+'/**',async route=>{
   const req=route.request(),url=new URL(req.url());
   requests.push(req.method()+' '+url.pathname);
   const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   const respond=(status,payload)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(payload)});
   if(url.pathname==='/auth/v1/token')return respond(200,{access_token:'synthetic-aal1',expires_in:3600});
   if(url.pathname==='/auth/v1/user')return respond(200,{id:'11111111-1111-4111-8111-111111111111',role:'authenticated',is_anonymous:false,factors:mode==='NO_MFA'?[]:[{id:'22222222-2222-4222-8222-222222222222',factor_type:'totp',status:'verified'}]});
   if(url.pathname.endsWith('/challenge'))return respond(200,{id:'33333333-3333-4333-8333-333333333333'});
   if(url.pathname.endsWith('/verify'))return respond(200,{access_token:'synthetic-aal2',expires_in:3600});
   if(url.pathname==='/rest/v1/rpc/jsb_w103_admin_snapshot'){
    assert.equal(req.headers().authorization,'Bearer synthetic-aal2');
    return mode==='NO_GRANT'?respond(403,{code:'ACCESS_DENIED'}):respond(200,{
     environment:'DEVELOPMENT',read_only:true,production_deployment:false,
     mfa_and_backend_permissions_verified:false,screen_count:24,pii_included:false,counts:{}});
   }
   throw Error('Unapproved admin request '+url.pathname);
  });
  await page.goto(ROOT+'admin.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#dashboard').isVisible(),false);
  await page.locator('#login-email').fill('admin@example.invalid');
  await page.locator('#login-password').fill('synthetic-test-password');
  await page.locator('#login-submit').click();
  if(mode==='NO_MFA'){
   await page.locator('#enroll-form').waitFor({state:'visible'});
   assert.equal(requests.some(x=>x.includes('jsb_w103_admin_snapshot')),false);
  }else{
   await page.locator('#mfa-form').waitFor({state:'visible'});
   await page.locator('#totp-code').fill('123456');
   await page.locator('#mfa-submit').click();
   await page.locator('#login-form').waitFor({state:'visible'});
   assert.equal(requests.filter(x=>x.includes('jsb_w103_admin_snapshot')).length,1);
  }
  assert.equal(await page.locator('#dashboard').isVisible(),false,'no protected screen without verified server approval');
  assert.ok(!requests.some(x=>x==='GET /auth/v1/factors'),'obsolete 405 MFA endpoint must not return');
  assert.ok(!requests.some(x=>x.includes('jsb_w108_admin_panel')),'no protected panel data before snapshot');
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).length),0);
  assert.equal(errors.length,0,JSON.stringify({mode,errors}));
  console.log('WORK169 '+mode+' PASS — fail-closed administrator access');
  await page.close();
 }
}finally{await browser.close();}
