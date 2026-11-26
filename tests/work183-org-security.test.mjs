import test from 'node:test';
import assert from 'node:assert/strict';
import {grantOrgRead,canOrgAssign,immutableAssignmentEvidence} from '../work183-org-security.mjs';
const actor={userId:'ORG_OWNER_A',authenticated:true,active:true,roles:['ORG_OWNER']};
const org={id:'ORG_A',ownerId:'ORG_OWNER_A',status:'APPROVED',version:3,managers:[]};
const member={orgId:'ORG_A',workerId:'WORKER_A',status:'ACCEPTED',start:100,end:null};
const job={id:'JOB_A',orgId:'ORG_A',state:'ASSIGNABLE'};
const workerStatus={active:true,approved:true,regionAllowed:true,complianceValid:true};
const opts={actor,org,member,job,workerStatus,now:200};
test('owner rights are separate from worker job claim and manager permission sets',()=>{
 assert.equal(grantOrgRead({actor,org,permission:'ASSIGN_JOBS'}),true);
 assert.equal(grantOrgRead({actor:{...actor,roles:['WORKER']},org,permission:'ASSIGN_JOBS'}),false);
 assert.equal(grantOrgRead({actor:{...actor,userId:'ORG_OWNER_B'},org,permission:'READ_MEMBERS'}),false);
 const manager={userId:'MANAGER_A',authenticated:true,active:true,roles:['PROVIDER_ADMIN']};
 const scoped={...org,managers:[{userId:'MANAGER_A',status:'ACTIVE',permissions:['READ_MEMBERS']}]};
 assert.equal(grantOrgRead({actor:manager,org:scoped,permission:'READ_MEMBERS'}),true);
 assert.equal(grantOrgRead({actor:manager,org:scoped,permission:'ASSIGN_JOBS'}),false);
});
test('revoked/stale membership and job crossing company denied',()=>{
 assert.equal(canOrgAssign(opts),'PREFLIGHT_ONLY_NEEDS_SERVER_ATOMIC_CHECK');
 for(const bad of [{...member,status:'REVOKED'},{...member,start:300},{...member,end:199},{...member,orgId:'ORG_B'}]){
  assert.equal(canOrgAssign({...opts,member:bad}),'MEMBERSHIP_NOT_ACTIVE_AT_ASSIGNMENT');
 }
 assert.equal(canOrgAssign({...opts,job:{...job,orgId:'ORG_B'}}),'JOB_NOT_OWNED_BY_ORG');
 assert.equal(canOrgAssign({...opts,workerStatus:{...workerStatus,active:false}}),'WORKER_NOT_ELIGIBLE');
});
test('evidence immutable: org and worker snapshots do not follow later membership edits',()=>{
 const original=immutableAssignmentEvidence(opts);
 member.status='REVOKED';org.version=4;
 assert.equal(original.orgVersion,3);
 assert.equal(original.workerId,'WORKER_A');
 assert.equal(original.membershipEndAt,null);
 assert.equal(original.realAssignment,false);
 assert.ok(Object.isFrozen(original));
 assert.throws(()=>immutableAssignmentEvidence(opts),/SCOPE_OR_STATUS_DENIED/);
});
