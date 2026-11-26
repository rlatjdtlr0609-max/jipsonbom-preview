/* WORK167 — deterministic, in-memory only worker fee state machine.
 * MASTER_11: fee = OFFICIAL_PRICE * 10%, not a submitted worker quote.
 * Rounding for non-divisible official prices is unapproved; refuse rather than guess.
 * NO database, card, PG, wallet, authentication, or server writes.
 */
const cleanVersion=v=>typeof v==='string'&&/^[A-Za-z0-9._-]{1,64}$/.test(v);
const cleanBooking=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{4,80}$/.test(v);
export function officialFee(price,version){
 if(!Number.isSafeInteger(price)||price<=0)throw Error('OFFICIAL_PRICE_POSITIVE_INTEGER_REQUIRED');
 if(!cleanVersion(version))throw Error('OFFICIAL_PRICE_VERSION_REQUIRED');
 // The original MASTER has not confirmed rounding. No silent Math.round/truncation.
 if(price%10!==0)throw Error('ROUNDING_POLICY_APPROVAL_REQUIRED');
 return Object.freeze({price,version,rate:0.10,fee:price/10});
}
export function emptyCashState(available=100000){
 if(!Number.isSafeInteger(available)||available<0)throw Error('INVALID_DEMO_BALANCE');
 return {available,held:0,debited:0,bookings:{},events:[]};
}
export function stepCash(state,booking,action,snapshot=null){
 if(!cleanBooking(booking)||!['CONFIRM_BOOKING','COMPLETE_WORK','RELEASE_HOLD'].includes(action))
  throw Error('INVALID_ACTION');
 const copy={available:state.available,held:state.held,debited:state.debited,
  bookings:{...state.bookings},events:[...state.events]};
 const old=copy.bookings[booking];
 if(action==='CONFIRM_BOOKING'){
  if(old){if(old.status==='HELD'&&snapshot&&old.fee===snapshot.fee&&old.version===snapshot.version)return copy;
   throw Error('BOOKING_ALREADY_PROCESSED');}
  if(!snapshot||!Number.isSafeInteger(snapshot.fee)||snapshot.fee<=0||
     !cleanVersion(snapshot.version)||snapshot.price/10!==snapshot.fee||
     snapshot.rate!==0.10)throw Error('INVALID_OFFICIAL_SNAPSHOT');
  if(copy.available<snapshot.fee)throw Error('INSUFFICIENT_DEMO_CASH');
  copy.available-=snapshot.fee;copy.held+=snapshot.fee;
  copy.bookings[booking]={...snapshot,status:'HELD'};
  copy.events.push({booking,action:'HOLD',fee:snapshot.fee,version:snapshot.version});
 }else{
  if(!old||old.status!=='HELD')throw Error('BOOKING_NOT_HELD_OR_ALREADY_PROCESSED');
  copy.held-=old.fee;
  if(action==='COMPLETE_WORK'){
   copy.debited+=old.fee;copy.bookings[booking]={...old,status:'DEBITED'};
   copy.events.push({booking,action:'DEBIT',fee:old.fee,version:old.version});
  }else{
   copy.available+=old.fee;copy.bookings[booking]={...old,status:'RELEASED'};
   copy.events.push({booking,action:'RELEASE',fee:old.fee,version:old.version});
  }
 }
 if(copy.available<0||copy.held<0||copy.debited<0)throw Error('LEDGER_INTEGRITY_FAILURE');
 return copy;
}
