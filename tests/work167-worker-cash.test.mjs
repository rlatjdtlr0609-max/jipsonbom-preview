import test from 'node:test';
import assert from 'node:assert/strict';
import {officialFee,emptyCashState,stepCash} from '../work167-cash-policy.mjs';
test('official rate 10 percent; never worker quotation and snapshot preserved',()=>{
 const s=officialFee(80000,'OFFICIAL-DEMO-V1');
 assert.deepEqual(s,{price:80000,version:'OFFICIAL-DEMO-V1',rate:0.1,fee:8000});
 assert.equal(officialFee(30000,'OFFICIAL-DEMO-V2').fee,3000);
 assert.throws(()=>officialFee(80001,'V1'),/ROUNDING_POLICY_APPROVAL_REQUIRED/);
 assert.throws(()=>officialFee(0,'V1'),/POSITIVE_INTEGER/);
 assert.throws(()=>officialFee(80000,''),/VERSION_REQUIRED/);
});
test('hold exactly once; confirmed completion debits once; no second debit',()=>{
 const official=officialFee(80000,'OFFICIAL-DEMO-V1');
 const hold=stepCash(emptyCashState(20000),'BOOK-1','CONFIRM_BOOKING',official);
 assert.deepEqual([hold.available,hold.held,hold.debited],[12000,8000,0]);
 const repeat=stepCash(hold,'BOOK-1','CONFIRM_BOOKING',official);
 assert.equal(repeat.events.length,1);
 const complete=stepCash(repeat,'BOOK-1','COMPLETE_WORK');
 assert.deepEqual([complete.available,complete.held,complete.debited],[12000,0,8000]);
 assert.equal(complete.bookings['BOOK-1'].version,'OFFICIAL-DEMO-V1');
 assert.throws(()=>stepCash(complete,'BOOK-1','COMPLETE_WORK'),/ALREADY_PROCESSED/);
 assert.throws(()=>stepCash(complete,'BOOK-1','RELEASE_HOLD'),/ALREADY_PROCESSED/);
});
test('failed booking returns held cash; insufficient balance and rate change blocked',()=>{
 const s=officialFee(80000,'V1'),start=emptyCashState(9000);
 const hold=stepCash(start,'BOOK-2','CONFIRM_BOOKING',s);
 const release=stepCash(hold,'BOOK-2','RELEASE_HOLD');
 assert.deepEqual([release.available,release.held,release.debited],[9000,0,0]);
 assert.throws(()=>stepCash(release,'BOOK-2','CONFIRM_BOOKING',s),/ALREADY_PROCESSED/);
 assert.throws(()=>stepCash(emptyCashState(500),'BOOK-3','CONFIRM_BOOKING',s),/INSUFFICIENT/);
 assert.throws(()=>stepCash(hold,'BOOK-2','CONFIRM_BOOKING',officialFee(90000,'V2')),/ALREADY_PROCESSED/);
});
