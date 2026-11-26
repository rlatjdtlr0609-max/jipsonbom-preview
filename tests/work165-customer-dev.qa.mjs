import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const ROOT=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const API='https://ohwkywomdqgcnptsnhwk.supabase.co';
const ids={a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',
 c:'33333333-3333-4333-8333-333333333333',ra:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',rb:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
const states={A:[],B:[]};
const seen={A:[],B:[]};
let attemptsA=0;
const browser=await chromium.launch({headless:true,...(process.env.JSB_QA_BROWSER_CHANNEL?{channel:process.env.JSB_QA_BROWSER_CHANNEL}:{})});
const actor=req=>{
 const v=req.headers().authorization||'';
 return v==='Bearer test-A'?'A':v==='Bearer test-B'?'B':null;
};
try{
 const page=await browser.newPage({viewport:{width:390,height:860}});
 const errors=[],unsanctioned=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',request=>{
  const u=new URL(request.url());
  if(u.origin!==new URL(ROOT).origin&&u.origin!==API)unsanctioned.push(u.origin);
 });
 await page.route(API+'/**',async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
  const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS',
    'access-control-allow-headers':'apikey,authorization,content-type'};
  const reply=(status,data)=>route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(data)});
  if(method==='OPTIONS')return route.fulfill({status:204,headers});
  if(!['/auth/v1/signup','/auth/v1/token','/auth/v1/user','/auth/v1/logout',
     '/rest/v1/rpc/jsb_member_submit_once','/rest/v1/rpc/jsb_w16_member_profile',
     '/rest/v1/rpc/jsb_member_request'].includes(path))
   throw Error('Unexpected endpoint '+method+' '+path);
  if(path==='/auth/v1/signup'){
   assert.equal(req.postDataJSON()?.email,'dev-c@example.invalid');
   return reply(200,{user:{id:ids.c},session:null});
  }
  if(path==='/auth/v1/token'){
   assert.equal(url.searchParams.get('grant_type'),'password');
   const body=req.postDataJSON(),type=body.email==='dev-a@example.invalid'?'A':'B';
   assert.equal(body.password,'ExamplePassword_165!');
   return reply(200,{access_token:'test-'+type,expires_in:3600,user:{id:ids[type.toLowerCase()]}});
  }
  if(path==='/auth/v1/user'){
   const who=actor(req);
   return who?reply(200,{id:ids[who.toLowerCase()],
    email:'dev-'+who.toLowerCase()+'@example.invalid',
    email_confirmed_at:'2026-11-26T01:00:00Z',is_anonymous:false}):reply(401,{code:'invalid_token'});
  }
  if(path==='/auth/v1/logout')return reply(200,{});
  const who=actor(req);if(!who)return reply(401,{code:'unauthorized'});
  if(path==='/rest/v1/rpc/jsb_w16_member_profile'){
   const data=req.postDataJSON();
   assert.ok(Object.hasOwn(data,'p_before'));
   return reply(200,{account_id:ids[who.toLowerCase()],
    intakes:states[who].map(x=>({request_id:x.id,submitted_at:'2026-11-26T10:00:00Z',consents:[]})),
    next_before:null});
  }
  if(path==='/rest/v1/rpc/jsb_member_submit_once'){
   assert.equal(method,'POST');
   const {p_data,p_key}=req.postDataJSON();
   assert.match(p_key,/^[0-9a-f]{64}$/);
   assert.equal(p_data.terms,true);assert.equal(p_data.privacy,true);
   assert.equal(p_data.contactConfirmed,true);
   assert.equal(p_data.policyVersion,'work01-dev-v1');
   assert.match(p_data.phone,/^[0-9]{8,11}$/);
   seen[who].push(p_key);
   // Simulate a successful database commit with lost network response on A's first request.
   if(who==='A'){
    attemptsA++;
    if(states.A.length===0)states.A.push({id:ids.ra,description:p_data.description});
    if(attemptsA===1)return reply(503,{code:'response_lost'});
    assert.equal(seen.A[0],seen.A[1],'idempotency key must survive retry');
    return reply(200,{id:ids.ra});
   }
   if(states.B.length===0)states.B.push({id:ids.rb,description:p_data.description});
   return reply(200,{id:ids.rb});
  }
  if(path==='/rest/v1/rpc/jsb_member_request'){
   const {p_id}=req.postDataJSON();
   const record=states[who].find(x=>x.id===p_id);
   return reply(200,record?{id:record.id,category:'수전·배관',
    description:record.description,status:'submitted'}:null);
  }
  throw Error('Unhandled API request');
 });
 await page.goto(ROOT+'customer.html',{waitUntil:'networkidle'});
 assert.equal(await page.locator('main#screen [data-screen="customer"]').count(),1);
 assert.equal(await page.locator('#w165-auth').isVisible(),true);
 assert.equal(await page.locator('#w165-request').isVisible(),false);
 const csp=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
 assert.match(csp,/connect-src https:\/\/ohwkywomdqgcnptsnhwk\.supabase\.co/);
 assert.match(csp,/form-action 'none'/);
 // Login A
 await page.locator('#w165-email').fill('dev-a@example.invalid');
 await page.locator('#w165-password').fill('ExamplePassword_165!');
 await page.locator('#w165-auth button[type=submit]').click();
 await page.locator('#w165-request').waitFor({state:'visible'});
 assert.match(await page.locator('#w165-status').textContent(),/현재 로그인 계정의 접수/);
 await page.locator('#w165-request input[name=name]').fill('테스트A');
 await page.locator('#w165-request input[name=phone]').fill('01000000000');
 await page.locator('#w165-request input[name=address]').fill('가상 작업장 A');
 await page.locator('#w165-request textarea[name=description]').fill('A 계정의 가상 누수 요청');
 for(const x of ['contactConfirmed','terms','privacy'])
  await page.locator('#w165-request input[name='+x+']').check();
 // First response lost but DB row exists; retry must not create duplicate.
 await page.locator('#w165-request button[type=submit]').click();
 await page.locator('#w165-status').getByText('재시도',{exact:false}).waitFor({state:'visible'}).catch(()=>{});
 await page.locator('#w165-request button[type=submit]').click();
 await page.locator('#w165-list button[data-w165-open]').waitFor({state:'visible'});
 assert.equal(states.A.length,1);assert.equal(new Set(seen.A).size,1);
 await page.locator('#w165-list button[data-w165-open]').click();
 await page.locator('#w165-detail').getByText('A 계정의 가상 누수 요청',{exact:false}).waitFor({state:'visible'});
 assert.match(await page.locator('#w165-detail').textContent(),/A 계정의 가상 누수 요청/);
 await page.locator('#w165-signout').click();
 await page.locator('#w165-auth').waitFor({state:'visible'});
 assert.equal(await page.locator('#w165-list button').count(),0);
 assert.doesNotMatch(await page.locator('#w165-detail').textContent(),/A 계정/);
 // Login B; A's information cannot appear in B's list or detail.
 await page.locator('#w165-email').fill('dev-b@example.invalid');
 await page.locator('#w165-password').fill('ExamplePassword_165!');
 await page.locator('#w165-auth button[type=submit]').click();
 await page.locator('#w165-request').waitFor({state:'visible'});
 assert.equal(await page.locator('#w165-list button[data-w165-open]').count(),0);
 assert.doesNotMatch(await page.locator('#w165-detail').textContent(),/A 계정/);
 const direct=await page.evaluate(async({api,id})=>{
  const r=await fetch(api+'/rest/v1/rpc/jsb_member_request',{
    method:'POST',headers:{apikey:'test-publishable','authorization':'Bearer test-B','content-type':'application/json'},
    body:JSON.stringify({p_id:id})
  });return r.json();
 },{api:API,id:ids.ra});
 assert.equal(direct,null,'B must not access A request by guessing its UUID');
 // B own intake works, but not A
 await page.locator('#w165-request input[name=name]').fill('테스트B');
 await page.locator('#w165-request input[name=phone]').fill('01000000001');
 await page.locator('#w165-request input[name=address]').fill('가상 작업장 B');
 await page.locator('#w165-request textarea[name=description]').fill('B 계정만 볼 수 있는 가상 요청');
 for(const x of ['contactConfirmed','terms','privacy'])
  await page.locator('#w165-request input[name='+x+']').check();
 await page.locator('#w165-request button[type=submit]').click();
 await page.locator('#w165-list button[data-w165-open]').waitFor({state:'visible'});
 await page.locator('#w165-list button').click();
 await page.locator('#w165-detail').getByText('B 계정만 볼 수 있는',{exact:false}).waitFor({state:'visible'});
 assert.match(await page.locator('#w165-detail').textContent(),/B 계정만 볼 수 있는/);
 assert.doesNotMatch(await page.locator('#w165-detail').textContent(),/A 계정/);
 // Cross ownership blocked even via API; no storage of JWTs or user data.
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).length),0);
 assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).length),0);
 await page.locator('#w165-signout').click();
 await page.locator('#w165-email').fill('dev-c@example.invalid');
 await page.locator('#w165-password').fill('ExamplePassword_165!');
 await page.locator('#w165-signup').click();
 await page.locator('#w165-status').getByText('가입 요청을 접수했습니다',{exact:false}).waitFor({state:'visible'});
 assert.match(await page.locator('#w165-status').textContent(),/등록 메일에서 확인/);
 assert.equal(await page.locator('#w165-request').isVisible(),false);
 assert.equal(unsanctioned.length,0,JSON.stringify(unsanctioned));
 assert.equal(errors.length,0,JSON.stringify(errors));
 console.log('WORK165 PASS: mock Auth A/B, confirmed email, idempotent retry, owned profile/detail, direct UUID B denial, memory-only sessions, signup pending');
}finally{await browser.close();}
