import test from 'node:test';
import assert from 'node:assert/strict';
import {laborTotal,quoteLedger,quoteEvent} from '../work180-quotes.mjs';
const one={visitLabor:20000,items:[{id:'SINK',labor:40000,defaultLabor:35000,quantity:1},
{id:'PIPE',labor:0,defaultLabor:30000,quantity:1}],approvedExtra:10000,extraApproved:true,
approvedDiscount:5000,discountApproved:true};
const worker='WORKER_A',customer='CUSTOMER_A';
const execute=(s,action,actor,more={})=>quoteEvent(s,action,{actor,key:'KEY_'+action+'_'+s.version,
 expectedVersion:s.version,now:100,deadline:200,...more});
test('single visit fee, per-item selected labor fallback only and approved adjustments',()=>{
 const v=laborTotal(one);assert.equal(v.itemsLabor,70000);assert.equal(v.total,95000);
 assert.equal(v.partsPriced,false);assert.equal(v.visitLabor,20000);
 assert.throws(()=>laborTotal({...one,extraApproved:false}),/EXTRA_NOT/);
 assert.throws(()=>laborTotal({...one,discountApproved:false}),/DISCOUNT_NOT/);
 assert.throws(()=>laborTotal({...one,items:[one.items[0],one.items[0]]}),/DUPLICATE/);
});
test('immutable numbered V1/V2 and only current sent unexpired quote can be approved',()=>{
 let s=quoteLedger({jobId:'JOB_A',workerId:worker,customerId:customer});
 s=execute(s,'DRAFT',worker,{components:one});
 assert.equal(s.versions[0].version,1);
 assert.throws(()=>execute(s,'APPROVE',customer,{expectedQuoteVersion:1}),/QUOTE_NOT_APPROVABLE/);
 s=execute(s,'SEND',worker,{expectedQuoteVersion:1});
 assert.throws(()=>execute(s,'APPROVE',worker,{expectedQuoteVersion:1}),/QUOTE_NOT_APPROVABLE/);
 s=execute(s,'REQUEST_REVISION',customer,{expectedQuoteVersion:1});
 s=execute(s,'DRAFT',worker,{components:{...one,items:[{id:'SINK',labor:50000,defaultLabor:35000,quantity:1}]}});
 assert.equal(s.versions.length,2);assert.equal(s.versions[0].status,'REVISION_REQUESTED');
 assert.equal(s.versions[1].version,2);
 s=execute(s,'SEND',worker,{expectedQuoteVersion:2});
 assert.throws(()=>execute(s,'APPROVE',customer,{expectedQuoteVersion:1}),/QUOTE_VERSION_MISMATCH/);
 assert.throws(()=>execute(s,'APPROVE',customer,{expectedQuoteVersion:2,now:200}),/QUOTE_NOT_APPROVABLE/);
 s=execute(s,'APPROVE',customer,{expectedQuoteVersion:2});
 assert.equal(s.versions[1].status,'APPROVED');
 assert.throws(()=>execute(s,'DRAFT',worker,{components:one}),/QUOTE_DRAFT_NOT_ALLOWED/);
});
test('retry same version and key is idempotent; cross-actor reuse and stale state denied',()=>{
 const s=quoteLedger({jobId:'JOB_A',workerId:worker,customerId:customer});
 const n=execute(s,'DRAFT',worker,{components:one});
 const args={actor:worker,key:'KEY_DRAFT_0',expectedVersion:0,components:one};
 assert.equal(quoteEvent(n,'DRAFT',args),n);
 assert.throws(()=>quoteEvent(n,'DRAFT',{...args,actor:customer}),/QUOTE_KEY_COLLISION/);
 assert.throws(()=>quoteEvent(n,'DRAFT',{...args,key:'OTHER_KEY'}),/STALE_QUOTE_LEDGER/);
});
