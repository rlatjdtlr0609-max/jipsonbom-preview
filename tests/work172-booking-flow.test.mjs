import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlow,applyFlow} from '../work172-booking-flow.mjs';
const ids={jobId:'DEMO_JOB_172',workerId:'WORKER_172',customerId:'CUSTOMER_172'};
const eligible={approved:true,active:true,regionAllowed:true,complianceValid:true,claimAvailable:true};
const safety={workerStillActive:true,regionStillAllowed:true,quoteStillApproved:true,
 noScheduleConflict:true,customerConfirmedSlot:true,workerConfirmedSlot:true,
 claimStillValid:true,visitId:'VISIT_172'};
const init=()=>createFlow({...ids,cash:15000});
function move(flow,action,actor,data={}){
 return applyFlow(flow,action,{actor,expectedVersion:flow.version,key:'KEY_'+action,...data});
}
function ready(){
 let s=move(init(),'CLAIM',ids.workerId,{workerEligible:eligible});
 s=move(s,'SUBMIT_QUOTE',ids.workerId,{quote:{amount:130000,version:'QUOTE_V1'}});
 s=move(s,'APPROVE_QUOTE',ids.customerId,{quote:{version:'QUOTE_V1'}});
 s=move(s,'PROPOSE_VISIT',ids.workerId,{visit:{id:'VISIT_172',start:100,end:200}});
 return s;
}
test('full customer->worker->customer approval->booking->hold->completion',()=>{
 let s=ready();
 assert.equal(s.state,'VISIT_PROPOSED');
 assert.equal(s.cash.held,0,'claim, quote and customer approval must not charge worker');
 s=move(s,'CONFIRM_BOOKING',ids.customerId,{safety,officialPrice:80000,officialVersion:'TARIFF_V1'});
 assert.equal(s.state,'BOOKED');
 assert.deepEqual([s.cash.available,s.cash.held,s.cash.debited],[7000,8000,0]);
 assert.deepEqual(s.billingUnit,{id:'DEMO_JOB_172_VISIT_172',officialPrice:80000,
  officialVersion:'TARIFF_V1',fee:8000,quoteAmount:130000,customerPaymentMode:'DIRECT_PAY_TO_WORKER'});
 const snapshot=JSON.stringify(s);
 const duplicate=applyFlow(s,'CONFIRM_BOOKING',{actor:ids.customerId,expectedVersion:0,
  key:'KEY_CONFIRM_BOOKING',safety,officialPrice:80000,officialVersion:'TARIFF_V1'});
 assert.equal(JSON.stringify(duplicate),snapshot,'idempotent replay must not double hold');
 s=move(s,'START_WORK',ids.workerId);
 assert.equal(s.cash.debited,0,'job started but not completed');
 s=move(s,'COMPLETE_WORK',ids.customerId);
 assert.equal(s.state,'COMPLETED');
 assert.deepEqual([s.cash.available,s.cash.held,s.cash.debited],[7000,0,8000]);
 assert.throws(()=>move(s,'COMPLETE_WORK',ids.customerId),/ILLEGAL_STATE_TRANSITION/);
 assert.throws(()=>move(s,'CANCEL',ids.customerId),/CANCEL_NOT_ALLOWED/);
 assert.equal(s.events.length,7);
});
test('unsafe worker, quote mismatch, conflicting slot, unapproved rounding and low cash fail atomically',()=>{
 const s=init();
 assert.throws(()=>move(s,'CLAIM',ids.workerId,{workerEligible:{...eligible,active:false}}),/WORKER_NOT_ELIGIBLE/);
 assert.equal(s.state,'PUBLIC');assert.equal(s.version,0);
 let r=ready();
 assert.throws(()=>move(r,'CONFIRM_BOOKING',ids.customerId,{safety:{...safety,noScheduleConflict:false},
 officialPrice:80000,officialVersion:'V1'}),/BOOKING_PREFLIGHT_FAILED/);
 assert.throws(()=>move(r,'CONFIRM_BOOKING',ids.customerId,{safety,officialPrice:80001,officialVersion:'V1'}),/ROUNDING_POLICY_APPROVAL_REQUIRED/);
 assert.throws(()=>move(r,'CONFIRM_BOOKING',ids.customerId,{safety,officialPrice:190000,officialVersion:'V1'}),/INSUFFICIENT_DEMO_CASH/);
 assert.equal(r.state,'VISIT_PROPOSED');assert.equal(r.cash.held,0);
 assert.throws(()=>move(r,'CONFIRM_BOOKING',ids.workerId,{safety,officialPrice:80000,officialVersion:'V1'}),/ACTOR_NOT_AUTHORIZED/);
 assert.throws(()=>applyFlow(r,'CONFIRM_BOOKING',{actor:ids.customerId,expectedVersion:r.version-1,
 key:'NEW_KEY',safety,officialPrice:80000,officialVersion:'V1'}),/STALE_EXPECTED_VERSION/);
});
test('cancel after hold releases amount exactly once, cancelling before booking never holds',()=>{
 let r=ready();
 const pre=move(r,'CANCEL',ids.customerId);
 assert.equal(pre.state,'CANCELLED');assert.equal(pre.cash.held,0);assert.equal(pre.cash.debited,0);
 r=move(r,'CONFIRM_BOOKING',ids.customerId,{safety,officialPrice:80000,officialVersion:'V1'});
 const cancellation=move(r,'CANCEL',ids.customerId);
 assert.deepEqual([cancellation.cash.available,cancellation.cash.held,cancellation.cash.debited],[15000,0,0]);
 assert.throws(()=>move(cancellation,'CANCEL',ids.customerId),/CANCEL_NOT_ALLOWED/);
 assert.equal(cancellation.cash.events.filter(x=>x.action==='RELEASE').length,1);
});
test('cannot reuse an idempotency key for a different actor/action',()=>{
 let s=move(init(),'CLAIM',ids.workerId,{workerEligible:eligible});
 assert.throws(()=>applyFlow(s,'CANCEL',{actor:ids.customerId,key:'KEY_CLAIM',
 expectedVersion:s.version}),/IDEMPOTENCY_KEY_CONFLICT/);
});
