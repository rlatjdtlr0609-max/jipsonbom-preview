import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const origin='https://ohwkywomdqgcnptsnhwk.supabase.co';
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const browser=await chromium.launch({headless:true});
let phase=1,commands=[],unhandled=[],shown=false;
try{
 const page=await browser.newPage({viewport:{width:390,height:850}});
 page.on('pageerror',e=>unhandled.push(e.message));
 page.on('dialog',async d=>{shown=true;assert.equal(d.type(),'confirm');await d.accept();});
 page.on('request',r=>{
  if(!r.url().startsWith(origin))return;
  const p=new URL(r.url()).pathname;
  assert.ok(['/auth/v1/token','/auth/v1/user',
   '/auth/v1/factors/11111111-1111-4111-8111-111111111111/challenge',
   '/auth/v1/factors/11111111-1111-4111-8111-111111111111/verify',
   '/auth/v1/logout','/rest/v1/rpc/jsb_w103_admin_snapshot',
   '/rest/v1/rpc/jsb_w108_admin_panel','/rest/v1/rpc/jsb_w114_admin_list',
   '/rest/v1/rpc/jsb_w120_admin_task_queue',
   '/rest/v1/rpc/jsb_w120_admin_task_command'].includes(p),p);
 });
 await page.route(origin+'/**',async route=>{
  const r=route.request(),url=new URL(r.url()),path=url.pathname;
  const headers={'access-control-allow-origin':'*'};
  if(r.method()==='OPTIONS')return route.fulfill({status:204,headers:{
   ...headers,'access-control-allow-headers':'apikey,authorization,content-type',
   'access-control-allow-methods':'POST,GET,OPTIONS'}});
  let status=200,object={};
  if(path==='/auth/v1/token')object={access_token:'aal1-synthetic',expires_in:3600};
  else if(path==='/auth/v1/user')object={id:'00000000-0000-4000-8000-000000000006',role:'authenticated',is_anonymous:false,factors:[{id:'11111111-1111-4111-8111-111111111111',factor_type:'totp',status:'verified'}]};
  else if(path.endsWith('/challenge'))object={id:'22222222-2222-4222-8222-222222222222'};
  else if(path.endsWith('/verify'))object={access_token:'aal2-synthetic',expires_in:3600};
  else if(path==='/rest/v1/rpc/jsb_w103_admin_snapshot')object={
    environment:'DEVELOPMENT',read_only:true,production_deployment:false,
    schema_version:'WORK103_DEV_V1',screen_count:24,
    mfa_and_backend_permissions_verified:true,pii_included:false,
    counts:{open_operation_tasks:1}
  };
  else if(path==='/rest/v1/rpc/jsb_w108_admin_panel'){
   const screen=r.postDataJSON()?.p_screen;
   object={environment:'DEVELOPMENT',read_only:true,
    production_deployment:false,mfa_and_backend_permissions_verified:true,pii_included:false,
    full_business_e2e_certified:false,workflow_actions_enabled:false,real_pg_actions_enabled:false,
    screen_id:screen,screen_count:24,schema_version:'WORK108_READ_ONLY_V1',screen_coverage:'AGGREGATE_ONLY',
    metrics:[{key:'open',label:'미처리 운영업무',source:'WORK93',value:phase===3?0:1}]};
  }
  else if(path==='/rest/v1/rpc/jsb_w114_admin_list'){
   const b=r.postDataJSON();object={environment:'DEVELOPMENT',read_only:true,
    production_deployment:false,mfa_and_backend_permissions_verified:true,pii_included:false,
    full_business_e2e_certified:false,workflow_actions_enabled:false,real_pg_actions_enabled:false,
    screen_id:b.p_screen,screen_count:24,schema_version:'WORK114_SAFE_LIST_V1',
    list_coverage:'PSEUDONYMIZED_STATUS_ONLY',limit:b.p_limit,offset:b.p_offset,total:0,has_more:false,items:[]};
  }
  else if(path==='/rest/v1/rpc/jsb_w120_admin_task_queue'){
   assert.equal(r.headers().authorization,'Bearer aal2-synthetic');
   object={environment:'DEVELOPMENT',read_only:true,source_mutated:false,
    approval_or_payment_enabled:false,production_deployment:false,pii_included:false,
    schema_version:'WORK120_QUEUE_V1',task_command_enabled:true,
    items:phase===3?[]:[{id,row_version:phase,task_type:'REQUEST_PUBLICATION_REVIEW',
      priority:'NORMAL',status:phase===1?'OPEN':'CLAIMED',
      due_at:null,created_at:'2026-11-25T06:00:00Z',
      can_claim:phase===1,can_release:phase===2,can_resolve:phase===2,
      priority_rank:2}]};
  }
  else if(path==='/rest/v1/rpc/jsb_w120_admin_task_command'){
   const b=r.postDataJSON();commands.push(b);
   assert.equal(r.headers().authorization,'Bearer aal2-synthetic');
   assert.equal(b.p_task,id);assert.equal(b.p_expected_version,phase);
   assert.match(b.p_key,/^[0-9a-f-]{36}$/);
   if(phase===1){
    assert.equal(b.p_action,'CLAIM');assert.deepEqual(b.p_data,{});
   }else if(phase===2){
    assert.equal(b.p_action,'RESOLVE');
    assert.deepEqual(b.p_data,{resolution_code:'REVIEW_HANDOFF',resolution_reference:'SYNTHETIC_CASE_EVIDENCE'});
   }else throw Error('Unexpected command');
   phase++;
   object={source_record_modified:false,booking_changed:false,cash_changed:false,
    worker_approved:false,development_only:true,
    result:{id,row_version:phase,status:phase===2?'CLAIMED':'RESOLVED',original_source_unchanged:true}};
  }
  else if(path==='/auth/v1/logout')object={};
  else throw Error('Unexpected REST path '+path);
  await route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(object)});
 });
 await page.goto(base+'admin.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#operation-console').isVisible(),false);
 await page.locator('#login-email').fill('admin@example.invalid');
 await page.locator('#login-password').fill('synthetic-dev-secret');
 await page.locator('#login-submit').click();
 await page.locator('#mfa-form').waitFor({state:'visible'});
 assert.equal(await page.locator('#operation-console').isVisible(),false,'AAL1 cannot display operational task');
 await page.locator('#totp-code').fill('123456');
 await page.locator('#mfa-submit').click();
 await page.locator('#operation-console').waitFor({state:'visible'});
 await page.locator('#ops-items .ops-controls button').first().waitFor({state:'visible'});
 assert.equal(phase,1);
 await page.locator('#ops-items .ops-controls button').first().click();
 await page.waitForFunction(()=>document.querySelector('.ops-resolve-form')!==null);
 assert.equal(phase,2);
 await page.locator('.ops-resolve-form input').nth(0).fill('REVIEW_HANDOFF');
 await page.locator('.ops-resolve-form input').nth(1).fill('SYNTHETIC_CASE_EVIDENCE');
 await page.locator('.ops-resolve-form button').click();
 await page.waitForFunction(()=>document.querySelector('#ops-status')?.textContent.includes('활성 원장 0건'));
 assert.equal(phase,3);assert.equal(shown,true);
 assert.deepEqual(commands.map(c=>c.p_action),['CLAIM','RESOLVE']);
 assert.equal(await page.locator('#ops-items .ops-item').count(),0);
 const result=await page.evaluate(()=>({
  storageKeys:[...Object.keys(localStorage),...Object.keys(sessionStorage)],
  body:document.body.textContent,hash:location.hash
 }));
 assert.deepEqual(result.storageKeys,[]);
 assert.doesNotMatch(result.body,/synthetic-dev-secret|aal1-synthetic|aal2-synthetic/);
 assert.doesNotMatch(result.hash,/synthetic/);
 assert.deepEqual(unhandled,[]);
 console.log('WORK120/124 UI PASS: real chromium mock MFA, task CLAIM->RESOLVE with distinct source, idempotency keys, no persisted token, policy-approved synthetic only');
}finally{await browser.close();}
