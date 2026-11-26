/* WORK172 — MASTER_11 #17 #23 #41 #47 #122 #134 #137.
 * Pure DEV flow simulator. NOT a matching/booking/cash backend.
 * Never send data, grant worker roles, or produce actual payment records.
 */
import {officialFee,emptyCashState,stepCash} from './work167-cash-policy.mjs';
const moves=Object.freeze({
 CLAIM:{from:'PUBLIC',to:'CLAIMED',role:'WORKER'},
 SUBMIT_QUOTE:{from:'CLAIMED',to:'QUOTED',role:'WORKER'},
 APPROVE_QUOTE:{from:'QUOTED',to:'QUOTE_APPROVED',role:'CUSTOMER'},
 PROPOSE_VISIT:{from:'QUOTE_APPROVED',to:'VISIT_PROPOSED',role:'WORKER'},
 CONFIRM_BOOKING:{from:'VISIT_PROPOSED',to:'BOOKED',role:'CUSTOMER'},
 START_WORK:{from:'BOOKED',to:'IN_PROGRESS',role:'WORKER'},
 COMPLETE_WORK:{from:'IN_PROGRESS',to:'COMPLETED',role:'CUSTOMER'},
 CANCEL:{from:null,to:'CANCELLED',role:'CUSTOMER'}
});
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{4,80}$/.test(v);
const positive=v=>Number.isSafeInteger(v)&&v>0;
export function createFlow({jobId,workerId,customerId,cash=30000}){
 if(!id(jobId)||!id(workerId)||!id(customerId)||workerId===customerId)throw Error('INVALID_WORKFLOW_IDENTIFIERS');
 return {jobId,workerId,customerId,state:'PUBLIC',version:0,claim:null,quote:null,visit:null,
  billingUnit:null,events:[],keys:{},cash:emptyCashState(cash),paymentMode:'DIRECT_PAY_TO_WORKER'};
}
export function applyFlow(source,action,{actor,expectedVersion,key,workerEligible,quote,
 visit,safety,officialPrice,officialVersion}={}){
 if(!moves[action])throw Error('UNKNOWN_TRANSITION');
 if(!id(key))throw Error('IDEMPOTENCY_KEY_REQUIRED');
 const prior=source.keys[key];
 if(prior){
  if(prior.action!==action||prior.actor!==actor)throw Error('IDEMPOTENCY_KEY_CONFLICT');
  return source;
 }
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion!==source.version)throw Error('STALE_EXPECTED_VERSION');
 const rule=moves[action];
 const belongs=rule.role==='WORKER'?actor===source.workerId:actor===source.customerId;
 if(!belongs)throw Error('ACTOR_NOT_AUTHORIZED');
 if(action==='CANCEL'){
  if(!['CLAIMED','QUOTED','QUOTE_APPROVED','VISIT_PROPOSED','BOOKED'].includes(source.state))
   throw Error('CANCEL_NOT_ALLOWED');
 }else if(source.state!==rule.from)throw Error('ILLEGAL_STATE_TRANSITION');
 const out={...source,cash:source.cash,events:[...source.events],keys:{...source.keys}};
 if(action==='CLAIM'){
  if(workerEligible?.approved!==true||workerEligible?.active!==true||
     workerEligible?.regionAllowed!==true||workerEligible?.complianceValid!==true||
     workerEligible?.claimAvailable!==true)throw Error('WORKER_NOT_ELIGIBLE');
  out.claim={workerId:actor,jobId:source.jobId};
 }else if(action==='SUBMIT_QUOTE'){
  if(!positive(quote?.amount)||!id(quote?.version))throw Error('VALID_LABOUR_QUOTE_REQUIRED');
  out.quote={amount:quote.amount,version:quote.version,approved:false};
 }else if(action==='APPROVE_QUOTE'){
  if(!out.quote||quote?.version!==out.quote.version)throw Error('STALE_QUOTE_VERSION');
  out.quote={...out.quote,approved:true};
 }else if(action==='PROPOSE_VISIT'){
  if(!Number.isFinite(visit?.start)||!Number.isFinite(visit?.end)||
     visit.end<=visit.start||!id(visit?.id))throw Error('VISIT_TIME_INVALID');
  out.visit={...visit,customerConfirmed:false};
 }else if(action==='CONFIRM_BOOKING'){
  if(safety?.workerStillActive!==true||safety?.regionStillAllowed!==true||
    safety?.quoteStillApproved!==true||safety?.noScheduleConflict!==true||
    safety?.customerConfirmedSlot!==true||safety?.workerConfirmedSlot!==true||
    safety?.claimStillValid!==true)throw Error('BOOKING_PREFLIGHT_FAILED');
  if(out.quote?.approved!==true||!out.visit||safety?.visitId!==out.visit.id)
    throw Error('BOOKING_QUOTE_OR_SLOT_MISMATCH');
  const snapshot=officialFee(officialPrice,officialVersion);
  const billingUnit=source.jobId+'_'+out.visit.id;
  out.cash=stepCash(source.cash,billingUnit,'CONFIRM_BOOKING',snapshot);
  out.billingUnit={id:billingUnit,officialPrice,officialVersion,fee:snapshot.fee,
    quoteAmount:out.quote.amount,customerPaymentMode:'DIRECT_PAY_TO_WORKER'};
  out.visit={...out.visit,customerConfirmed:true};
 }else if(action==='COMPLETE_WORK'){
  if(!out.billingUnit)throw Error('NO_CONFIRMED_BILLING_UNIT');
  out.cash=stepCash(source.cash,out.billingUnit.id,'COMPLETE_WORK');
 }else if(action==='CANCEL'&&out.billingUnit){
  out.cash=stepCash(source.cash,out.billingUnit.id,'RELEASE_HOLD');
 }
 out.state=rule.to;out.version+=1;
 out.keys[key]={action,actor};
 out.events.push({action,version:out.version,actor,jobId:out.jobId,mode:'DEV_SIMULATION'});
 return out;
}
