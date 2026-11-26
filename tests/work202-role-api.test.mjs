import test from 'node:test';
import assert from 'node:assert/strict';
import {createDevRoleClient} from '../work202-role-client.mjs';
const emails={worker:'work202-worker@example.invalid',repairCompany:'work202-provider@example.invalid'};
function mock({denied=false}={}){
 const calls=[];
 const fetchImpl=async(url,options)=>{
  const path=new URL(url).pathname;
  calls.push({path,method:options.method,body:options.body?JSON.parse(options.body):null});
  let status=200,value;
  if(path==='/auth/v1/token')value={access_token:'synthetic202secure'.repeat(3),expires_in:3600};
  else if(path==='/auth/v1/user')value={id:'11111111-1111-4111-8111-111111111111',email:emails.worker,
   email_confirmed_at:'2026-11-26T00:00:00Z',is_anonymous:false};
  else if(path==='/auth/v1/logout')value={};
  else if(path==='/rest/v1/rpc/jsb_w04_jobs'){value=[{id:'WORK202_ID',name:'SENSITIVE_SHOULD_NOT_RENDER'}];if(denied)status=403;}
  else if(path==='/rest/v1/rpc/jsb_w09_read')value={visits:[]};
  else throw Error('unexpected '+path);
  return {status,ok:status===200,json:async()=>value};
 };
 return {calls,fetchImpl};
}
test('only approved origin and role get Supabase DEV client',()=>{
 assert.throws(()=>createDevRoleClient({origin:'https://attacker.invalid',role:'worker'}),/DEV_ROLE/);
 assert.throws(()=>createDevRoleClient({origin:'http://127.0.0.1:8765',role:'administrator'}),/DEV_ROLE/);
});
test('signed login and worker read only no customer data or command writes',async()=>{
 const m=mock();
 const c=createDevRoleClient({origin:'http://127.0.0.1:8765',role:'worker',fetchImpl:m.fetchImpl});
 await c.login(emails.worker,'synthetic-long-password');
 const r=await c.read();
 assert.equal(r.workOpportunityCount,1);
 assert.equal(r.readOnly,true);assert.equal(r.realBusinessE2E,false);
 assert.doesNotMatch(JSON.stringify(r),/SENSITIVE_SHOULD_NOT_RENDER/);
 assert.deepEqual(m.calls.filter(x=>x.path.includes('/rpc/')).map(x=>x.path),
 ['/rest/v1/rpc/jsb_w04_jobs','/rest/v1/rpc/jsb_w09_read']);
 await c.logout();assert.equal(c.state().authenticated,false);
 await assert.rejects(c.read(),/DEV_SESSION_EXPIRED/);
});
test('server-side 403 clears browser client session; never invents business completion',async()=>{
 const m=mock({denied:true});
 const c=createDevRoleClient({origin:'http://127.0.0.1:8765',role:'worker',fetchImpl:m.fetchImpl});
 await c.login(emails.worker,'synthetic-long-password');
 await assert.rejects(c.read(),/DEV_AUTH_OR_PERMISSION_DENIED/);
 assert.equal(c.state().authenticated,false);
});
