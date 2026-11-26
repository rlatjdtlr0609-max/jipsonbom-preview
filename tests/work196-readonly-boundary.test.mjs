import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyMemberBoundaries} from '../work196-readonly-boundary.mjs';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
const aid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',bid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const env={key:'sb_publishable_'+('z'.repeat(25)),accessA:'syntheticJWT_A',accessB:'syntheticJWT_B',requestA:aid,requestB:bid};
function fake({leak=false,missing=false}={}){
 const requests=[];
 return {requests,transport:async(url,opt)=>{
  const path=new URL(url).pathname,actor=opt.headers.authorization==='Bearer syntheticJWT_A'?'A':'B',body=opt.body?JSON.parse(opt.body):{};
  requests.push({path,method:opt.method,actor,body});
  const result=path==='/auth/v1/user'?
   {status:200,body:{id:actor==='A'?a:b,email_confirmed_at:'2026-11-26T01:00:00Z',is_anonymous:false}}:
   {status:200,body:(actor==='A'&&body.p_id===aid)||(actor==='B'&&body.p_id===bid)||leak?{id:body.p_id}:null};
  if(missing&&path==='/auth/v1/user')return {status:401,json:async()=>({error:'expired'})};
  return {status:result.status,json:async()=>result.body};
 }};
}
test('without real accounts, BLOCKED and zero outgoing HTTP requests',async()=>{
 const {requests,transport}=fake();
 const x=await verifyMemberBoundaries({transport});
 assert.equal(x.state,'BLOCKED');assert.equal(x.realE2E,false);assert.equal(requests.length,0);
});
test('mock protocol checks two separate verified GoTrue users and rejects foreign UUIDs',async()=>{
 const m=fake(),v=await verifyMemberBoundaries({...env,transport:m.transport});
 assert.equal(v.state,'PASS');assert.equal(v.dbWrites,0);
 assert.equal(m.requests.length,6);assert.ok(m.requests.every(x=>['GET','POST'].includes(x.method)));
 assert.equal(m.requests.some(x=>x.path.includes('submit_once')),false);
});
test('fake cross-user read and expired auth tokens fail closed',async()=>{
 assert.deepEqual((await verifyMemberBoundaries({...env,transport:fake({leak:true}).transport})).reason,'FOREIGN_RECEIPT_IDOR');
 assert.deepEqual((await verifyMemberBoundaries({...env,transport:fake({missing:true}).transport})).reason,'TWO_GOTRUE_AUTHENTICATED_UIDS_NOT_VERIFIED');
});
