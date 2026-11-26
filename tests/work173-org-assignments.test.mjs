import test from 'node:test';
import assert from 'node:assert/strict';
import {createOrg,orgCommand} from '../work173-org-assignments.mjs';
const id='ORGA',ownerId='OWNER_A',workerId='WORKER_A';
const owner={userId:ownerId,authenticated:true,active:true};
const worker={userId:workerId,authenticated:true,active:true};
const outsider={userId:'OWNER_B',authenticated:true,active:true};
const pass={approved:true,active:true,regionAllowed:true,complianceValid:true};
const job={id:'JOB_001',orgId:id,status:'READY',start:100,end:200};
const init=()=>createOrg({id,ownerId});
const doIt=(s,action,actor=owner,extras={})=>orgCommand(s,action,{
 actor,workerId,expectedVersion:s.version,key:'KEY_'+action+'_'+s.version,...extras});
test('owner invites, only worker accepts, active worker assigned and duplicate blocked',()=>{
 let s=init();
 assert.throws(()=>doIt(s,'INVITE',outsider),/ORG_OWNER_PERMISSION_DENIED/);
 s=doIt(s,'INVITE');
 assert.equal(s.members[workerId].status,'INVITED');
 assert.throws(()=>doIt(s,'ACCEPT',owner),/WORKER_SELF_ACCEPT_REQUIRED/);
 s=doIt(s,'ACCEPT',worker);
 assert.equal(s.members[workerId].status,'ACCEPTED');
 const old=s;
 s=doIt(s,'ASSIGN',owner,{job,workerEligible:pass});
 assert.equal(s.assignments.JOB_001.workerId,workerId);
 assert.equal(old.assignments.JOB_001,undefined,'no in-place mutation of input');
 assert.throws(()=>doIt(s,'ASSIGN',owner,{job,workerEligible:pass}),/ALREADY_ASSIGNED/);
 const repeat=orgCommand(s,'ASSIGN',{actor:owner,workerId,expectedVersion:old.version,
   key:'KEY_ASSIGN_'+old.version,job,workerEligible:pass});
 assert.equal(repeat,s,'same idempotency key never duplicates');
 assert.throws(()=>doIt(s,'REVOKE'),/ACTIVE_ASSIGNMENTS_REQUIRE_REVIEW/);
 s=doIt(s,'UNASSIGN',owner,{job});
 s=doIt(s,'REVOKE');
 assert.equal(s.members[workerId].status,'REVOKED');
});
test('cross-company, pending membership, invalid eligibility, schedule overlaps denied',()=>{
 let s=init();
 const before=s;
 assert.throws(()=>doIt(s,'ASSIGN',owner,{job,workerEligible:pass}),/ACCEPTED_MEMBERSHIP_REQUIRED/);
 s=doIt(s,'INVITE');
 assert.throws(()=>doIt(s,'ASSIGN',owner,{job,workerEligible:pass}),/ACCEPTED_MEMBERSHIP_REQUIRED/);
 s=doIt(s,'ACCEPT',worker);
 for(const v of [{...pass,approved:false},{...pass,active:false},{...pass,regionAllowed:false}])
  assert.throws(()=>doIt(s,'ASSIGN',owner,{job,workerEligible:v}),/WORKER_NOT_ELIGIBLE/);
 assert.throws(()=>doIt(s,'ASSIGN',owner,{job:{...job,orgId:'ORGB'},workerEligible:pass}),/UNSAFE_JOB_OR_SCOPE/);
 s=doIt(s,'ASSIGN',owner,{job,workerEligible:pass});
 assert.throws(()=>doIt(s,'ASSIGN',owner,{
   job:{id:'JOB_002',orgId:id,status:'READY',start:150,end:220},workerEligible:pass}),/SCHEDULE_CONFLICT/);
 assert.equal(before.version,0);
});
test('optimistic version mismatch and idempotency key reuse fail closed',()=>{
 let s=init();
 s=doIt(s,'INVITE');
 assert.throws(()=>orgCommand(s,'ACCEPT',{actor:worker,workerId,key:'NEWKEY',expectedVersion:0}),/STALE_ORG_VERSION/);
 assert.throws(()=>orgCommand(s,'REVOKE',{actor:owner,workerId,key:'KEY_INVITE_0',
 expectedVersion:s.version}),/IDEMPOTENCY_KEY_REUSE_CONFLICT/);
});
