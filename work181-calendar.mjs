/* WORK181 booking calendar transaction model. MASTER_11 #40/#41/#51/#122.
 * Pure proposed server-algorithm mock; production requires PG GiST exclusion in one txn.
 * Claim is not a calendar HOLD, and cancelled visit history must be preserved.
 */
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(v);
const windowOK=x=>Number.isSafeInteger(x?.start)&&Number.isSafeInteger(x?.end)&&x.end>x.start;
export function createCalendar(workerId){
 if(!id(workerId))throw Error('INVALID_WORKER');
 return {workerId,version:0,holds:{},bookings:{},events:[],keys:{}};
}
const blocked=(s,slot,ignore)=>{
 const active=[...Object.values(s.bookings).filter(x=>x.status==='CONFIRMED'&&x.id!==ignore),
               ...Object.values(s.holds).filter(x=>x.status==='ACTIVE'&&x.id!==ignore)];
 return active.some(x=>x.start<slot.end&&slot.start<x.end);
};
export function calendarEvent(source,action,{bookingId,key,expectedVersion,slot,
  expiresAt,now,approvedQuote,customerConfirmed,workerConfirmed,reason}={}){
 if(!['HOLD','CONFIRM','CHANGE','CANCEL','EXPIRE_HOLD'].includes(action)||!id(bookingId)||!id(key))
  throw Error('BAD_CALENDAR_COMMAND');
 const old=source.keys[key];
 if(old){if(old.action!==action||old.bookingId!==bookingId)throw Error('CALENDAR_KEY_COLLISION');return source;}
 if(source.version!==expectedVersion)throw Error('STALE_CALENDAR_VERSION');
 const out={...source,holds:{...source.holds},bookings:{...source.bookings},
  keys:{...source.keys},events:[...source.events]};
 const hold=out.holds[bookingId],booking=out.bookings[bookingId];
 if(action==='HOLD'){
  if(!windowOK(slot)||!Number.isSafeInteger(now)||!Number.isSafeInteger(expiresAt)||
     expiresAt<=now||expiresAt-now>30*60*1000)throw Error('INVALID_SHORT_HOLD');
  if(hold||booking||blocked(source,slot))throw Error('SLOT_UNAVAILABLE');
  out.holds[bookingId]={id:bookingId,start:slot.start,end:slot.end,expiresAt,status:'ACTIVE'};
 }else if(action==='CONFIRM'){
  if(!hold||hold.status!=='ACTIVE'||!Number.isSafeInteger(now)||now>=hold.expiresAt)
   throw Error('HOLD_NOT_VALID');
  if(approvedQuote!==true||customerConfirmed!==true||workerConfirmed!==true)
   throw Error('CONFIRMATION_EVIDENCE_REQUIRED');
  if(blocked(source,hold,bookingId))throw Error('CALENDAR_CONFLICT');
  out.holds[bookingId]={...hold,status:'CONSUMED'};
  out.bookings[bookingId]={id:bookingId,start:hold.start,end:hold.end,status:'CONFIRMED',changes:0};
 }else if(action==='CHANGE'){
  if(!booking||booking.status!=='CONFIRMED'||!windowOK(slot)||
     approvedQuote!==true||customerConfirmed!==true||workerConfirmed!==true)
   throw Error('CHANGE_APPROVAL_REQUIRED');
  if(blocked(source,slot,bookingId))throw Error('CALENDAR_CONFLICT');
  // Old block stays intact until every validation passes and replacement is atomic.
  out.bookings[bookingId]={...booking,start:slot.start,end:slot.end,changes:booking.changes+1};
 }else if(action==='CANCEL'){
  if(!booking||booking.status!=='CONFIRMED'||typeof reason!=='string'||reason.trim().length<3)
   throw Error('CANCEL_REASON_OR_STATUS_REQUIRED');
  out.bookings[bookingId]={...booking,status:'CANCELLED',cancelReason:reason};
 }else{
  if(!hold||hold.status!=='ACTIVE'||!Number.isSafeInteger(now)||now<hold.expiresAt)
   throw Error('HOLD_NOT_EXPIRED');
  out.holds[bookingId]={...hold,status:'EXPIRED'};
 }
 out.version++;out.keys[key]={action,bookingId};
 out.events.push({action,bookingId,version:out.version,oldBooking:booking||null,newBooking:out.bookings[bookingId]||null});
 return out;
}
