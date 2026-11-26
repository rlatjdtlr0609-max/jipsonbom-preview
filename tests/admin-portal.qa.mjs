import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)('playwright');
const URL_BASE=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const SUPA='https://ohwkywomdqgcnptsnhwk.supabase.co';
const payload={
 environment:'DEVELOPMENT',read_only:true,production_deployment:false,
 schema_version:'WORK103_DEV_V1',screen_count:24,
 full_business_e2e_certified:false,pii_included:false,
 mfa_and_backend_permissions_verified:true,
 counts:{customer_requests:4,worker_applications:2,work_opportunities:3,
  confirmed_bookings:1,open_operation_tasks:5,worker_documents:2,
  open_aftercare_cases:1,active_compliance_policy:0,booking_impact_reviews:0}
};
const panel=(screen)=>({
 environment:'DEVELOPMENT',read_only:true,production_deployment:false,
 schema_version:'WORK108_READ_ONLY_V1',screen_count:24,screen_id:screen,
 full_business_e2e_certified:false,pii_included:false,
 mfa_and_backend_permissions_verified:true,
 workflow_actions_enabled:false,real_pg_actions_enabled:false,
 screen_coverage:'AGGREGATE_ONLY',
 metrics:(screen==='overview'
  ?[{key:'requests',label:'수리접수 건수',value:4,source:'WORK01 접수'},
    {key:'jobs',label:'작업게시 건수',value:3,source:'WORK04 작업'},
    {key:'bookings',label:'확정예약',value:1,source:'WORK04 예약'}]
  :[{key:screen,label:'DB 업무별 집계 '+screen,value:2,source:'WORK108 DB'}])
});
const list=(screen,offset=0,limit=15)=>{
 const total=screen==='overview'?17:1;
 return {
  environment:'DEVELOPMENT',read_only:true,production_deployment:false,
  schema_version:'WORK114_SAFE_LIST_V1',screen_count:24,screen_id:screen,
  full_business_e2e_certified:false,pii_included:false,
  mfa_and_backend_permissions_verified:true,
  workflow_actions_enabled:false,real_pg_actions_enabled:false,
  list_coverage:'PSEUDONYMIZED_STATUS_ONLY',
  limit,offset,total,has_more:offset+limit<total,
  items:Array.from({length:Math.max(0,Math.min(limit,total-offset))},(_,i)=>({
   ref:(offset+i+1).toString(16).padStart(12,'0'),
   title:screen==='overview'?'운영업무':'상태조회 '+screen,
   status:'OPEN',source:'WORK93 운영업무',
   time:'2026-11-25T08:00:00Z',amount_krw:null
  }))
 };
};
const workQueue={
 environment:'DEVELOPMENT',read_only:true,source_mutated:false,
 approval_or_payment_enabled:false,production_deployment:false,pii_included:false,
 schema_version:'WORK120_QUEUE_V1',task_command_enabled:false,items:[]
};
const workFinance={
 environment:'DEVELOPMENT',adapter:'DEV_VIRTUAL',read_only:true,
 source_of_fee:'OFFICIAL_SERVICE_PRICE',fee_percent:10,
 actual_pg_reconciled:false,actual_payment_enabled:false,
 full_cash_e2e_certified:false,booking_or_cash_changed:false,
 production_deployment:false,schema_version:'WORK123_CASH_AUDIT_V1',
 booking_count:0,hold_count:0,held_count:0,debited_count:0,
 fee_rule_mismatches:0,confirmed_booking_missing_hold:0,
 hold_snapshot_mismatches:0,orphan_holds:0,duplicate_holds_for_booking:0,
 refund_review_requests:0
};
const workProvider={
 schema_version:'WORK122_ORG_BOOKING_READ_V1',
 environment:'DEVELOPMENT',read_only:true,pii_included:false,
 production_deployment:false,assignment_action_enabled:false,
 booking_change_enabled:false,company_or_worker_record_modified:false,
 full_company_e2e_certified:false,org_count:0,membership_count:0,
 invited_memberships:0,accepted_memberships:0,ended_memberships:0,
 booking_membership_links:0,confirmed_bookings_with_nonaccepted_member:0,
 document_count:0,verified_document_count:0,region_link_count:0
};
const browser=await chromium.launch({headless:true,...(process.env.JSB_QA_BROWSER_CHANNEL?{channel:process.env.JSB_QA_BROWSER_CHANNEL}:{})});
let successful=0;
try{
 for(const width of [360,768,1366]){
  const context=await browser.newContext({viewport:{width,height:width===360?780:900},deviceScaleFactor:1});
  const page=await context.newPage();
  const faults=[],calls=[];
  page.on('pageerror',err=>faults.push(err.message));
  page.on('request',r=>{if(r.url().startsWith(SUPA))calls.push({url:r.url(),method:r.method()});});
  await page.route(SUPA+'/**',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{
    'access-control-allow-origin':'*','access-control-allow-methods':'POST,GET,OPTIONS',
    'access-control-allow-headers':'apikey,authorization,content-type'}});
   const body=async(status,obj)=>route.fulfill({status,
    contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(obj)});
   if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password'){
    assert.equal(req.method(),'POST');
    assert.equal(req.postDataJSON().email,'admin@example.invalid');
    return body(200,{access_token:'test-aal1',expires_in:3600});
   }
   if(url.pathname==='/auth/v1/user')return body(200,{id:'00000000-0000-4000-8000-000000000006',role:'authenticated',is_anonymous:false,factors:[{id:'11111111-1111-4111-8111-111111111111',factor_type:'totp',status:'verified'}]});
   if(url.pathname==='/auth/v1/logout')return body(200,{});
   if(url.pathname.endsWith('/challenge'))return body(200,{id:'22222222-2222-4222-8222-222222222222'});
   if(url.pathname.endsWith('/verify'))return body(200,{access_token:'test-aal2',expires_in:3600});
   if(url.pathname==='/rest/v1/rpc/jsb_w103_admin_snapshot'){
    assert.equal(req.headers().authorization,'Bearer test-aal2');
    return body(200,payload);
   }
   if(url.pathname==='/rest/v1/rpc/jsb_w108_admin_panel'){
    assert.equal(req.headers().authorization,'Bearer test-aal2');
    const input=req.postDataJSON();
    assert.deepEqual(Object.keys(input),['p_screen']);
    return body(200,panel(input.p_screen));
   }
   if(url.pathname==='/rest/v1/rpc/jsb_w114_admin_list'){
    assert.equal(req.headers().authorization,'Bearer test-aal2');
    const input=req.postDataJSON();
    assert.deepEqual(Object.keys(input).sort(),['p_limit','p_offset','p_screen']);
    assert.equal(input.p_limit,15);
    return body(200,list(input.p_screen,input.p_offset,input.p_limit));
   }
   if(url.pathname==='/rest/v1/rpc/jsb_w120_admin_task_queue'){
    assert.deepEqual(req.postDataJSON(),{p_limit:15});
    return body(200,workQueue);
   }
   if(url.pathname==='/rest/v1/rpc/jsb_w123_admin_cash_integrity')
    return body(200,workFinance);
   if(url.pathname==='/rest/v1/rpc/jsb_w122_admin_org_booking_integrity')
    return body(200,workProvider);
   if(url.pathname==='/rest/v1/rpc/jsb_w120_admin_task_command')
    return body(403,{code:'42501'});
   throw Error('Unexpected external request '+url.pathname);
  });
  await page.goto(URL_BASE+'admin.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#dashboard').isVisible(),false,'dashboard must be closed before auth');
  assert.equal(calls.length,0,'No network call before explicit login');
  assert.equal(await page.locator('#login-form').isVisible(),true);
  assert.equal(await page.locator('#mfa-form').isVisible(),false);
  const overflow=async()=>page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-window.innerWidth);
  assert.ok(await overflow()<=2,'Login horizontal overflow width '+width);
  await page.locator('#login-email').fill('admin@example.invalid');
  await page.locator('#login-password').fill('secret-do-not-store');
  await page.locator('#login-submit').click();
  await page.locator('#mfa-form').waitFor({state:'visible'});
  assert.equal(await page.locator('#login-password').inputValue(),'');
  assert.equal(await page.locator('#dashboard').isVisible(),false,'AAL1 must not display private dashboard');
  await page.locator('#totp-code').fill('123456');
  await page.locator('#mfa-submit').click();
  await page.locator('#dashboard').waitFor({state:'visible'});
  assert.equal(await page.locator('#screen-nav button').count(),24);
  await page.waitForFunction(()=>document.querySelector('#ops-status')?.textContent.includes('미승인'));
  assert.equal(await page.locator('#ops-items button').count(),0,'Unapproved TASK claim must not expose business commands');
  await page.locator('#metrics .metric').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#metrics .metric').count(),3);
  assert.match(await page.locator('#metrics').innerText(),/4/);
  await page.locator('.record-item').first().waitFor({state:'visible'});
  assert.equal(await page.locator('.record-item').count(),15);
  assert.equal(await page.locator('#records-next').isEnabled(),true);
  await page.locator('#records-next').click();
  await page.waitForFunction(()=>document.querySelector('#records-page')?.textContent.includes('16'));
  assert.equal(await page.locator('.record-item').count(),2);
  await page.locator('#records-prev').click();
  await page.waitForFunction(()=>document.querySelector('#records-page')?.textContent.includes('1–15'));
  assert.equal(await page.locator('.record-item').count(),15);
  await page.locator('[data-screen-id="cash"]').click();
  await page.locator('#finance-items .finance-item').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#finance-items .finance-item').count(),10);
  assert.match(await page.locator('#finance-status').innerText(),/실거래 미검증/);
  await page.locator('[data-screen-id="providers"]').click();
  await page.locator('#provider-items .finance-item').first().waitFor({state:'visible'});
  assert.equal(await page.locator('#provider-items .finance-item').count(),10);
  assert.match(await page.locator('#provider-status').innerText(),/미활성/);
  await page.locator('[data-screen-id="cases"]').click();
  assert.match(await page.locator('#detail-title').innerText(),/A\/S/);
  await page.waitForFunction(()=>document.querySelector('.metric-label')?.textContent.includes('cases'));
  await page.waitForFunction(()=>document.querySelector('.record-title')?.textContent.includes('cases'));
  assert.ok(calls.some(c=>c.url.endsWith('/jsb_w108_admin_panel')),'server panels must be queried');
  await page.locator('[data-screen-id="release"]').click();
  await page.waitForFunction(()=>document.querySelector('.metric-label')?.textContent.includes('release'));
  await page.waitForFunction(()=>document.querySelector('.record-title')?.textContent.includes('release'));
  assert.match(await page.locator('#detail-safety').innerText(),/실제 업무처리/);
  assert.ok(await overflow()<=2,'Dashboard horizontal overflow width '+width);
  const secret=await page.evaluate(()=>({
   stored:[...Object.keys(localStorage),...Object.keys(sessionStorage)],
   text:document.body.textContent,
   fragment:location.hash
  }));
  assert.equal(secret.stored.length,0);
  assert.doesNotMatch(secret.text,/secret-do-not-store|test-aal1|test-aal2/);
  assert.doesNotMatch(secret.fragment,/test-aal1|test-aal2/);
  assert.deepEqual(faults,[]);
  await page.locator('#logout').click();
  await page.locator('#login-form').waitFor({state:'visible'});
  assert.equal(await page.locator('#dashboard').isVisible(),false,'Logout hides all data');
  successful++;
  await context.close();
 }
 const rejected=await browser.newPage();
 await rejected.route(SUPA+'/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{
   'access-control-allow-origin':'*','access-control-allow-methods':'POST,GET,OPTIONS',
   'access-control-allow-headers':'apikey,authorization,content-type'}});
  const response={contentType:'application/json',headers:{'access-control-allow-origin':'*'}};
  if(path==='/auth/v1/token')return route.fulfill({...response,status:401,body:'{"error":"invalid_grant"}'});
  return route.abort();
 });
 await rejected.goto(URL_BASE+'admin.html',{waitUntil:'domcontentloaded'});
 await rejected.locator('#login-email').fill('wrong@example.invalid');
 await rejected.locator('#login-password').fill('not-the-password');
 await rejected.locator('#login-submit').click();
 await rejected.locator('#auth-status[data-error="true"]').waitFor({state:'visible'});
 assert.equal(await rejected.locator('#dashboard').isVisible(),false);
 await rejected.close();
 const denied=await browser.newPage();
 await denied.route(SUPA+'/**',async route=>{
  const u=new URL(route.request().url());
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{
   'access-control-allow-origin':'*','access-control-allow-methods':'POST,GET,OPTIONS',
   'access-control-allow-headers':'apikey,authorization,content-type'}});
  let status=200,value={};
  if(u.pathname==='/auth/v1/token')value={access_token:'test-aal1',expires_in:3600};
  else if(u.pathname==='/auth/v1/user')value={id:'00000000-0000-4000-8000-000000000006',role:'authenticated',is_anonymous:false,factors:[{id:'11111111-1111-4111-8111-111111111111',factor_type:'totp',status:'verified'}]};
  else if(u.pathname.endsWith('/challenge'))value={id:'22222222-2222-4222-8222-222222222222'};
  else if(u.pathname.endsWith('/verify'))value={access_token:'test-aal2',expires_in:3600};
  else if(u.pathname==='/rest/v1/rpc/jsb_w103_admin_snapshot'){status=403;value={code:'42501',message:'PRIVATE_DB_DETAIL_NEVER_RENDER'};}
  else throw Error('Unexpected path '+u.pathname);
  await route.fulfill({status,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},body:JSON.stringify(value)});
 });
 await denied.goto(URL_BASE+'admin.html',{waitUntil:'domcontentloaded'});
 await denied.locator('#login-email').fill('admin@example.invalid');
 await denied.locator('#login-password').fill('password');
 await denied.locator('#login-submit').click();
 await denied.locator('#mfa-form').waitFor({state:'visible'});
 await denied.locator('#totp-code').fill('123456');
 await denied.locator('#mfa-submit').click();
 await denied.locator('#auth-status[data-error="true"]').waitFor({state:'visible'});
 assert.equal(await denied.locator('#dashboard').isVisible(),false);
 assert.doesNotMatch(await denied.locator('body').innerText(),/PRIVATE_DB_DETAIL_NEVER_RENDER/);
 await denied.close();
 // A valid AAL2 admin must NOT see finance metrics without prices_manage.
 // A second protected screen may still succeed; stale or private details
 // from the denied screen must never be presented.
 const scoped=await browser.newPage();
 await scoped.route(SUPA+'/**',async route=>{
  const req=route.request(),u=new URL(req.url());
  const headers={'access-control-allow-origin':'*'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:{
   ...headers,'access-control-allow-methods':'POST,GET,OPTIONS',
   'access-control-allow-headers':'apikey,authorization,content-type'}});
  let status=200,value={};
  if(u.pathname==='/auth/v1/token')value={access_token:'test-aal1',expires_in:3600};
  else if(u.pathname==='/auth/v1/user')value={id:'00000000-0000-4000-8000-000000000006',role:'authenticated',is_anonymous:false,factors:[{id:'11111111-1111-4111-8111-111111111111',factor_type:'totp',status:'verified'}]};
  else if(u.pathname.endsWith('/challenge'))value={id:'22222222-2222-4222-8222-222222222222'};
  else if(u.pathname.endsWith('/verify'))value={access_token:'test-aal2',expires_in:3600};
  else if(u.pathname==='/rest/v1/rpc/jsb_w103_admin_snapshot')value=payload;
  else if(u.pathname==='/rest/v1/rpc/jsb_w108_admin_panel'){
   const screen=req.postDataJSON().p_screen;
   if(screen==='cash'){status=403;value={code:'42501',message:'PRIVATE_PERSONAL_DATA_MUST_NOT_APPEAR'};}
   else{
    if(screen==='tasks')await new Promise(ok=>setTimeout(ok,180));
    value=panel(screen);
   }
  }else if(u.pathname==='/rest/v1/rpc/jsb_w114_admin_list'){
   const input=req.postDataJSON(),screen=input.p_screen;
   if(screen==='cash'){status=403;value={code:'42501',message:'SENSITIVE_PROTECTED_NEVER_RENDERED'};}
   else{
    if(screen==='tasks')await new Promise(ok=>setTimeout(ok,200));
    value=list(screen,input.p_offset,input.p_limit);
   }
  }else if(u.pathname==='/rest/v1/rpc/jsb_w120_admin_task_queue'){
    value=workQueue;
  }else if(u.pathname==='/rest/v1/rpc/jsb_w123_admin_cash_integrity'){
    status=403;value={code:'42501',message:'ACCESS_DENIED'};
  }else if(u.pathname==='/rest/v1/rpc/jsb_w120_admin_task_command'){
    status=403;value={code:'42501'};
  }else if(u.pathname==='/auth/v1/logout')value={};
  else throw Error('Unexpected scoped path '+u.pathname);
  await route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(value)});
 });
 await scoped.goto(URL_BASE+'admin.html',{waitUntil:'domcontentloaded'});
 await scoped.locator('#login-email').fill('admin@example.invalid');
 await scoped.locator('#login-password').fill('password');
 await scoped.locator('#login-submit').click();
 await scoped.locator('#mfa-form').waitFor({state:'visible'});
 await scoped.locator('#totp-code').fill('123456');
 await scoped.locator('#mfa-submit').click();
 await scoped.locator('#dashboard').waitFor({state:'visible'});
 await scoped.locator('.metric').first().waitFor({state:'visible'});
 await scoped.locator('[data-screen-id="cash"]').click();
 await scoped.waitForFunction(()=>document.querySelector('#dashboard-message')?.textContent.includes('별도 업무권한'));
 assert.equal(await scoped.locator('.metric').count(),0,'denied finance panel must have no metrics');
 await scoped.waitForFunction(()=>document.querySelector('#records-state')?.textContent.includes('별도 업무권한'));
 assert.equal(await scoped.locator('.record-item').count(),0,'denied finance list must expose no records');
 await scoped.waitForFunction(()=>document.querySelector('#finance-status')?.textContent.includes('권한'));
 assert.equal(await scoped.locator('.finance-item').count(),0,'finance scope denial reveals no diagnostic');
 assert.doesNotMatch(await scoped.locator('body').innerText(),/PRIVATE_PERSONAL_DATA_MUST_NOT_APPEAR/);
 await scoped.locator('[data-screen-id="tasks"]').click();
 await scoped.locator('[data-screen-id="cases"]').click();
 await scoped.waitForFunction(()=>document.querySelector('.metric-label')?.textContent.includes('cases'));
 await scoped.waitForTimeout(280);
 assert.match(await scoped.locator('.record-title').innerText(),/cases/,'late task list must not replace selected cases');
 assert.match(await scoped.locator('.metric-label').innerText(),/cases/,'late tasks response must not overwrite selected cases');
 await scoped.close();
 const index=await readFile('index.html','utf8');
 const html=await readFile('admin.html','utf8');
 const js=await readFile('admin.js','utf8');
 assert.ok(index.includes('href="./admin.html"'),'existing admin entry should point to secured page');
 assert.match(html,/connect-src https:\/\/ohwkywomdqgcnptsnhwk\.supabase\.co/);
 assert.match(js,/jsb_w103_admin_snapshot/);
 assert.match(js,/jsb_w108_admin_panel/);
 assert.match(js,/jsb_w114_admin_list/);
 assert.match(js,/jsb_w120_admin_task_queue/);
 assert.match(js,/jsb_w120_admin_task_command/);
 assert.match(js,/jsb_w123_admin_cash_integrity/);
 assert.match(js,/jsb_w122_admin_org_booking_integrity/);
 assert.doesNotMatch(js,/localStorage\s*\.|sessionStorage\s*\.|document\.cookie|service_role|sb_secret_/i);
 assert.ok(!html.includes('test-aal2'));
 console.log('WORK119-124 PASS: '+successful+' viewport admin login MFA task gate OFF finance rights and no token persistence');
}finally{await browser.close();}
