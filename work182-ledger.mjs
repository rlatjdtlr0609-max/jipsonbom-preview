/* WORK182 append-only in-memory ledger proof. MASTER_11 #134 and #57.
 * NOT a PG ledger or proof of real payment. No cash sale/charge can be issued.
 */
import {officialFee} from './work167-cash-policy.mjs';
const valid=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{4,80}$/.test(v);
const money=v=>Number.isSafeInteger(v)&&v>=0;
export function initialLedger({workerId,simulatedPrepaidBalance}){
 if(!valid(workerId)||!money(simulatedPrepaidBalance))throw Error('INVALID_SIMULATED_WALLET');
 return {workerId,prepaid:simulatedPrepaidBalance,held:0,debited:0,
   holds:{},transactions:[],keys:{},version:0,paymentMode:'DIRECT_PAY_TO_WORKER'};
}
export function ledgerOperation(state,action,{bookingId,key,expectedVersion,officialPrice,
 officialVersion,jobCompleted=false,cancellationApproved=false}={}){
 if(!['HOLD','DEBIT','RELEASE'].includes(action)||!valid(bookingId)||!valid(key))
  throw Error('INVALID_LEDGER_OPERATION');
 const fingerprint=JSON.stringify({action,bookingId,officialPrice,officialVersion,jobCompleted,cancellationApproved});
 const replay=state.keys[key];
 if(replay){
  if(replay!==fingerprint)throw Error('IDEMPOTENCY_KEY_COLLISION');
  return state;
 }
 if(expectedVersion!==state.version)throw Error('STALE_LEDGER_VERSION');
 const existing=state.holds[bookingId];
 const out={...state,holds:{...state.holds},keys:{...state.keys},transactions:[...state.transactions]};
 let amount=0;
 if(action==='HOLD'){
  if(existing)throw Error('BOOKING_ALREADY_IN_LEDGER');
  const snapshot=officialFee(officialPrice,officialVersion);
  amount=snapshot.fee;
  if(out.prepaid<amount)throw Error('INSUFFICIENT_PREPAID_CASH');
  out.prepaid-=amount;out.held+=amount;
  out.holds[bookingId]={state:'HELD',amount,officialPrice,officialVersion,rate:0.1};
 }else if(action==='DEBIT'){
  if(existing?.state!=='HELD'||jobCompleted!==true)throw Error('COMPLETION_REQUIRED_OR_NOT_HELD');
  amount=existing.amount;out.held-=amount;out.debited+=amount;
  out.holds[bookingId]={...existing,state:'DEBITED'};
 }else{
  if(existing?.state!=='HELD'||cancellationApproved!==true)throw Error('RELEASE_APPROVAL_REQUIRED');
  amount=existing.amount;out.held-=amount;out.prepaid+=amount;
  out.holds[bookingId]={...existing,state:'RELEASED'};
 }
 out.version++;
 out.keys[key]=fingerprint;
 out.transactions.push(Object.freeze({seq:out.version,bookingId,action,amount,
  officialPrice:out.holds[bookingId].officialPrice,
  officialVersion:out.holds[bookingId].officialVersion,
  customerPaymentMode:'DIRECT_PAY_TO_WORKER',
  realPG:false,transferToWorker:false}));
 if(!money(out.prepaid)||!money(out.held)||!money(out.debited)||
   out.prepaid+out.held+out.debited!==state.prepaid+state.held+state.debited)
  throw Error('INVARIANT_VIOLATION');
 return out;
}
