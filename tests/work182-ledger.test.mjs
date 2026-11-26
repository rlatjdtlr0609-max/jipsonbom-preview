import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLedger,ledgerOperation} from '../work182-ledger.mjs';
const init=()=>initialLedger({workerId:'WORKER_A',simulatedPrepaidBalance:9000});
const op=(s,action,bookingId,key,more={})=>ledgerOperation(s,action,{
 bookingId,key,expectedVersion:s.version,...more});
test('official version locked, 10pct fee independent of quote, debit after actual work only',()=>{
 let s=init();
 s=op(s,'HOLD','BOOK_A','KEY_HOLD_A',{officialPrice:80000,officialVersion:'TARIFF_V1'});
 assert.deepEqual([s.prepaid,s.held,s.debited],[1000,8000,0]);
 assert.equal(s.holds.BOOK_A.officialVersion,'TARIFF_V1');
 assert.throws(()=>op(s,'DEBIT','BOOK_A','KEY_DEBIT_A',{jobCompleted:false}),/COMPLETION_REQUIRED/);
 s=op(s,'DEBIT','BOOK_A','KEY_DEBIT_A',{jobCompleted:true});
 assert.deepEqual([s.prepaid,s.held,s.debited],[1000,0,8000]);
 assert.equal(s.transactions[1].transferToWorker,false);
 assert.equal(s.transactions[1].customerPaymentMode,'DIRECT_PAY_TO_WORKER');
 const replay=ledgerOperation(s,'DEBIT',{bookingId:'BOOK_A',key:'KEY_DEBIT_A',
  expectedVersion:1,jobCompleted:true});
 assert.equal(replay,s);
 assert.throws(()=>op(s,'DEBIT','BOOK_A','KEY_DEBIT_A_2',{jobCompleted:true}),/COMPLETION_REQUIRED/);
});
test('cancel releases held cash, does not create payout; duplicate booking and old price denied',()=>{
 let s=init();s=op(s,'HOLD','BOOK_A','HOLD_A',{officialPrice:80000,officialVersion:'V1'});
 assert.throws(()=>op(s,'HOLD','BOOK_A','HOLD_A_2',{officialPrice:90000,officialVersion:'V2'}),/BOOKING_ALREADY/);
 assert.throws(()=>op(s,'RELEASE','BOOK_A','RELEASE_A',{cancellationApproved:false}),/RELEASE_APPROVAL/);
 s=op(s,'RELEASE','BOOK_A','RELEASE_A',{cancellationApproved:true});
 assert.deepEqual([s.prepaid,s.held,s.debited],[9000,0,0]);
 assert.equal(s.transactions.length,2);
 assert.ok(s.transactions.every(x=>x.realPG===false&&x.transferToWorker===false));
});
test('insufficient prepaid balance, rate rounding, stale version, key collision fail closed',()=>{
 const s=init();
 assert.throws(()=>op(s,'HOLD','BOOK_X','HOLD_X',{officialPrice:90010,officialVersion:'V1'}),/INSUFFICIENT/);
 assert.throws(()=>op(s,'HOLD','BOOK_X','HOLD_X',{officialPrice:80001,officialVersion:'V1'}),/ROUNDING_POLICY/);
 const a=op(s,'HOLD','BOOK_X','HOLD_X',{officialPrice:80000,officialVersion:'V1'});
 assert.throws(()=>ledgerOperation(a,'HOLD',{bookingId:'BOOK_X',key:'HOLD_X',
  expectedVersion:0,officialPrice:70000,officialVersion:'V1'}),/IDEMPOTENCY_KEY_COLLISION/);
 assert.throws(()=>ledgerOperation(a,'HOLD',{bookingId:'BOOK_Y',key:'HOLD_Y',
  expectedVersion:0,officialPrice:10000,officialVersion:'V1'}),/STALE_LEDGER_VERSION/);
});
