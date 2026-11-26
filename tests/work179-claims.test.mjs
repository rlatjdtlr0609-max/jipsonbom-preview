import test from 'node:test';
import assert from 'node:assert/strict';
import {publishOpportunity,emptyClaimBoard,claimAction} from '../work179-claims.mjs';
const eligibility={adminApproved:true,active:true,areaAllowed:true,skillAllowed:true,
 complianceValid:true,opportunityStillOpen:true,dailyLimitAvailable:true};
const id='OPP_179',a='WORKER_A',b='WORKER_B';
const act=(s,action,workerId,key,extra=eligibility)=>claimAction(s,action,{
 workerId,key,expectedVersion:s.version,eligibility:extra});
test('public board never exposes customer name, phone, exact address, access codes',()=>{
 const v=publishOpportunity({id,category:'배관',estimatedLabor:80000,district:'강남구',title:'수리',
  publishable:true,state:'OPEN',customerName:'SECRET',phone:'01012345678',fullAddress:'동호수',
  accessSecret:'PASSWORD'});
 assert.equal(v.district,'강남구');assert.equal('customerName' in v,false);
 assert.doesNotMatch(JSON.stringify(v),/SECRET|12345678|PASSWORD|동호수/);
 assert.throws(()=>publishOpportunity({id,state:'HIDDEN',publishable:true,district:'강남구'}),/NOT_PUBLISHABLE/);
});
test('only one worker can claim; replay idempotent; competing workers/versions denied',()=>{
 const before=emptyClaimBoard(id);
 const s=act(before,'CLAIM',a,'KEY_CLAIM_A');
 assert.equal(s.activeClaim.workerId,a);assert.equal(before.activeClaim,null);
 assert.equal(act(s,'CLAIM',a,'KEY_CLAIM_A'),s);
 assert.throws(()=>act(s,'CLAIM',b,'KEY_CLAIM_B'),/ALREADY_CLAIMED/);
 assert.throws(()=>claimAction(s,'CLAIM',{workerId:b,key:'KEY_NEW_B',expectedVersion:0,eligibility}),/STALE/);
 assert.throws(()=>act(s,'RELEASE',b,'KEY_RELEASE_B'),/NOT_OWNED/);
 const released=act(s,'RELEASE',a,'KEY_RELEASE_A');
 assert.equal(released.activeClaim,null);
 assert.equal(act(released,'RELEASE',a,'KEY_RELEASE_A'),released);
});
test('APPROVED alone does not mean ACTIVE, missing region/skill/compliance blocks',()=>{
 const s=emptyClaimBoard(id);
 for(const field of Object.keys(eligibility)){
  assert.throws(()=>act(s,'CLAIM',a,'KEY_'+field,{...eligibility,[field]:false}),/INELIGIBLE/);
 }
 assert.throws(()=>claimAction(s,'CLAIM',{workerId:a,key:'short',expectedVersion:0,eligibility}),/INVALID/);
});
