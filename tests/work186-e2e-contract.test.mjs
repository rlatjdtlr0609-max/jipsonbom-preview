import test from 'node:test';
import assert from 'node:assert/strict';
import {customerDevE2E} from '../work186-real-dev-e2e.mjs';
const ids={a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',
aRequest:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',bRequest:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
const key='sb_publishable_'+('x'.repeat(20));
const jwt=(id)=>['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({
 sub:id,session_id:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'
})).toString('base64url'),'placeholder'].join('.');
const env={JSB_WORK186_PUBLISHABLE_KEY:key,JSB_WORK186_A_EMAIL:'a@synthetic.invalid',
 JSB_WORK186_A_PASSWORD:'synthetic-a',JSB_WORK186_B_EMAIL:'b@synthetic.invalid',
 JSB_WORK186_B_PASSWORD:'synthetic-b',JSB_WORK186_A_REQUEST_ID:ids.aRequest,
 JSB_WORK186_B_REQUEST_ID:ids.bRequest};
function mock({crossLeak=false}={}){
 const log=[];
 const transport=async(url,opts)=>{
  const path=new URL(url).pathname,req=opts.body?JSON.parse(opts.body):null;
  log.push({path,method:opts.method,body:req,auth:opts.headers.authorization||null});
  const who=opts.headers.authorization?.includes(jwt(ids.a))?'a':'b';
  const signed=!!opts.headers.authorization;
  let status=200,data=null;
  if(path==='/auth/v1/token')data={access_token:jwt(req.email.startsWith('a@')?ids.a:ids.b),expires_in:3600};
  else if(path==='/auth/v1/user')data={id:ids[who],email:who+'@synthetic.invalid',
   email_confirmed_at:'2026-11-26T00:00:00Z',is_anonymous:false};
  else if(path==='/rest/v1/rpc/jsb_w16_member_profile')data={account_id:ids[who],intakes:[],next_before:null};
  else if(path==='/rest/v1/rpc/jsb_member_request'){
   const allowed=(who==='a'&&req.p_id===ids.aRequest)||(who==='b'&&req.p_id===ids.bRequest);
   if(allowed||crossLeak)data={id:req.p_id};
   else data=null;
  }else if(path==='/auth/v1/logout')data={};
  else throw Error('Unexpected route '+path);
  return {ok:status===200,status,json:async()=>data};
 };
 return {log,transport};
}
test('without safely injected credentials returns BLOCKED with zero requests',async()=>{
 const {log,transport}=mock();
 assert.equal((await customerDevE2E({transport})).state,'BLOCKED');
 assert.equal(log.length,0);
});
test('real endpoint protocol contract: two JWT identities, own IDs and cross denial',async()=>{
 const {transport,log}=mock();
 const result=await customerDevE2E({env,transport});
 assert.equal(result.state,'PASS',JSON.stringify(result));
 assert.deepEqual(result.checks,['TWO_SIGNED_JWT_UIDS_VERIFIED','TWO_SEPARATE_OWNER_PROFILES',
  'TWO_OWN_RECORDS_READ','TWO_FOREIGN_RECORDS_DENIED']);
 assert.equal(log.filter(x=>x.path==='/auth/v1/logout').length,2);
 assert.equal(log.filter(x=>x.path==='/rest/v1/rpc/jsb_member_submit_once').length,0);
 assert.equal(log.filter(x=>x.path==='/rest/v1/rpc/jsb_member_request').length,4);
 assert.equal(log.some(x=>/service_role|sb_secret/.test(JSON.stringify(x))),false);
});
test('foreign customer leak fails E2E; no fake PASS from owner assertions',async()=>{
 const {transport}=mock({crossLeak:true});
 const result=await customerDevE2E({env,transport});
 assert.equal(result.state,'FAIL');assert.equal(result.reason,'CROSS_CUSTOMER_IDOR');
});
test('no request ownership test if neither written nor seeded IDs supplied',async()=>{
 const {transport,log}=mock();
 const e={...env};delete e.JSB_WORK186_A_REQUEST_ID;delete e.JSB_WORK186_B_REQUEST_ID;
 const r=await customerDevE2E({env:e,transport});
 assert.equal(r.state,'BLOCKED');
 assert.equal(log.filter(x=>x.path==='/auth/v1/logout').length,2);
});
