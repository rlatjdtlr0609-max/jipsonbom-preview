import test from 'node:test';
import assert from 'node:assert/strict';
import {canReadOrganization,canViewAssignedWorker,preflightAssignment} from '../work168-org-guard.mjs';
const owner={userId:'OWNER-A',authenticated:true,active:true};
const outsider={userId:'OWNER-B',authenticated:true,active:true};
const company={id:'ORG-A',ownerId:'OWNER-A',status:'APPROVED',type:'REPAIR_TEAM'};
const member={orgId:'ORG-A',workerId:'WORKER-A',status:'ACCEPTED'};
const job={id:'JOB-A',orgId:'ORG-A',state:'ASSIGNABLE',start:100,end:200};
test('tenant B and unauthenticated actor cannot read A',()=>{
 assert.equal(canReadOrganization(owner,company),true);
 assert.equal(canReadOrganization(outsider,company),false);
 assert.equal(canReadOrganization({...owner,authenticated:false},company),false);
 assert.equal(canReadOrganization(owner,{...company,status:'PENDING'}),false);
 assert.equal(canReadOrganization(owner,{...company,type:'CONSTRUCTION'}),false);
 assert.equal(canViewAssignedWorker(outsider,company,member),false);
});
test('worker link and job must share tenant, accepted membership, schedule',()=>{
 assert.equal(canViewAssignedWorker(owner,company,member),true);
 assert.equal(canViewAssignedWorker(owner,company,{...member,status:'INVITED'}),false);
 assert.equal(canViewAssignedWorker(owner,company,{...member,orgId:'ORG-B'}),false);
 assert.equal(preflightAssignment({actor:outsider,org:company,link:member,job}),'DENIED_ORGANIZATION_SCOPE');
 assert.equal(preflightAssignment({actor:owner,org:company,link:member,job:{...job,orgId:'ORG-B'}}),'DENIED_JOB_SCOPE');
 assert.equal(preflightAssignment({actor:owner,org:company,link:member,job,conflicts:[{workerId:'WORKER-A',start:150,end:250}]}),'BLOCKED_SCHEDULE_CONFLICT');
 assert.equal(preflightAssignment({actor:owner,org:company,link:member,job,conflicts:[]}), 'PREFLIGHT_ONLY_NO_WRITE');
});
