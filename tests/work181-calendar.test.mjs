import test from 'node:test';
import assert from 'node:assert/strict';
import {createCalendar,calendarEvent} from '../work181-calendar.mjs';
const base=createCalendar('WORKER_A');
const at=(s,action,bookingId,extra={})=>calendarEvent(s,action,{
 bookingId,key:'KEY_'+action+'_'+bookingId+'_'+s.version,expectedVersion:s.version,...extra});
const hold=(s,b,slot={start:1000,end:1100})=>at(s,'HOLD',b,{slot,now:100,expiresAt:500});
const confirm=(s,b)=>at(s,'CONFIRM',b,{now:200,approvedQuote:true,customerConfirmed:true,workerConfirmed:true});
test('claim is not booking; only approved two-party slot turns a short hold into a confirmed visit',()=>{
 const s=hold(base,'VISIT_A');
 assert.equal(Object.keys(s.bookings).length,0);
 assert.throws(()=>at(s,'CONFIRM','VISIT_A',{now:200,approvedQuote:false,customerConfirmed:true,workerConfirmed:true}),/CONFIRMATION_EVIDENCE/);
 const b=confirm(s,'VISIT_A');
 assert.equal(b.bookings.VISIT_A.status,'CONFIRMED');
 assert.equal(b.holds.VISIT_A.status,'CONSUMED');
 assert.equal(hold(base,'VISIT_X').holds.VISIT_X.status,'ACTIVE');
 assert.throws(()=>hold(b,'VISIT_B'),/SLOT_UNAVAILABLE/);
});
test('reschedule collision is atomic and cancellation keeps immutable event history',()=>{
 let s=confirm(hold(base,'VISIT_A'),'VISIT_A');
 s=confirm(hold(s,'VISIT_B',{start:1200,end:1300}),'VISIT_B');
 const before=JSON.stringify(s);
 assert.throws(()=>at(s,'CHANGE','VISIT_A',{slot:{start:1250,end:1350},
 approvedQuote:true,customerConfirmed:true,workerConfirmed:true}),/CALENDAR_CONFLICT/);
 assert.equal(JSON.stringify(s),before);
 s=at(s,'CHANGE','VISIT_A',{slot:{start:1400,end:1500},
 approvedQuote:true,customerConfirmed:true,workerConfirmed:true});
 assert.equal(s.bookings.VISIT_A.start,1400);
 s=at(s,'CANCEL','VISIT_A',{reason:'customer requested cancellation'});
 assert.equal(s.bookings.VISIT_A.status,'CANCELLED');
 assert.equal(s.events.filter(x=>x.action==='CHANGE').length,1);
 assert.equal(s.events.filter(x=>x.action==='CANCEL').length,1);
});
test('expired hold and replay guards',()=>{
 let s=hold(base,'VISIT_A');
 assert.throws(()=>at(s,'CONFIRM','VISIT_A',{now:500,approvedQuote:true,customerConfirmed:true,workerConfirmed:true}),/HOLD_NOT_VALID/);
 const expired=at(s,'EXPIRE_HOLD','VISIT_A',{now:501});
 assert.equal(expired.holds.VISIT_A.status,'EXPIRED');
 assert.throws(()=>at(expired,'CONFIRM','VISIT_A',{now:200,approvedQuote:true,customerConfirmed:true,workerConfirmed:true}),/HOLD_NOT_VALID/);
 assert.equal(calendarEvent(s,'HOLD',{bookingId:'VISIT_A',key:'KEY_HOLD_VISIT_A_0',expectedVersion:0}),s);
});
