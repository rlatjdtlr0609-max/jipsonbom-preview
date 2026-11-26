/* WORK180 synthetic labor-only quote ledger. MASTER_11 #23 and #47.
 * No parts prices/margins; no real customer consent or quote API.
 */
const goodId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(v);
const money=v=>Number.isSafeInteger(v)&&v>=0;
export function laborTotal({visitLabor,items,approvedExtra=0,approvedDiscount=0,
 extraApproved=false,discountApproved=false}){
 if(!money(visitLabor)||!Array.isArray(items)||!items.length||
    items.some(x=>!goodId(x.id)||!money(x.labor)||!money(x.defaultLabor)||
      !Number.isSafeInteger(x.quantity)||x.quantity<1)||
    !money(approvedExtra)||!money(approvedDiscount))throw Error('INVALID_LABOR_COMPONENTS');
 if(approvedExtra>0&&!extraApproved)throw Error('EXTRA_NOT_CUSTOMER_APPROVED');
 if(approvedDiscount>0&&!discountApproved)throw Error('DISCOUNT_NOT_APPROVED');
 const keys=new Set();let labor=0;
 for(const x of items){
  if(keys.has(x.id))throw Error('DUPLICATE_QUOTE_ITEM');keys.add(x.id);
  // Standard item labor replaces the parent fallback, never added on top of it.
  const amount=x.labor>0?x.labor:x.defaultLabor;
  if(!Number.isSafeInteger(labor+amount*x.quantity))throw Error('AMOUNT_OVERFLOW');
  labor+=amount*x.quantity;
 }
 const total=visitLabor+labor+approvedExtra-approvedDiscount;
 if(!Number.isSafeInteger(total)||total<0)throw Error('INVALID_TOTAL');
 return Object.freeze({visitLabor,itemsLabor:labor,approvedExtra,approvedDiscount,total,
  currency:'KRW',partsPriced:false});
}
export function quoteLedger({jobId,workerId,customerId}){
 if(![jobId,workerId,customerId].every(goodId))throw Error('INVALID_QUOTE_PARTICIPANTS');
 return {jobId,workerId,customerId,version:0,versions:[],keys:{}};
}
export function quoteEvent(state,action,{actor,key,expectedVersion,components,
    expectedQuoteVersion,now,deadline}={}){
 if(!['DRAFT','SEND','APPROVE','REQUEST_REVISION','REJECT'].includes(action)||!goodId(key))
  throw Error('INVALID_QUOTE_ACTION');
 const prev=state.keys[key];
 if(prev){if(prev.actor!==actor||prev.action!==action)throw Error('QUOTE_KEY_COLLISION');return state;}
 if(expectedVersion!==state.version)throw Error('STALE_QUOTE_LEDGER');
 const worker=actor===state.workerId,customer=actor===state.customerId;
 const latest=state.versions.at(-1);
 let next;
 if(action==='DRAFT'){
  if(!worker||latest?.status==='APPROVED')throw Error('QUOTE_DRAFT_NOT_ALLOWED');
  const amount=laborTotal(components);
  next={version:(latest?.version||0)+1,status:'DRAFT',amount,deadline:null};
 }else{
  if(!latest||!Number.isSafeInteger(expectedQuoteVersion)||latest.version!==expectedQuoteVersion)
   throw Error('QUOTE_VERSION_MISMATCH');
  if(action==='SEND'){
   if(!worker||latest.status!=='DRAFT'||!Number.isSafeInteger(deadline)||
      !Number.isSafeInteger(now)||deadline<=now)throw Error('QUOTE_SEND_NOT_ALLOWED');
   next={...latest,status:'SENT',deadline};
  }else{
   if(!customer||latest.status!=='SENT'||!Number.isSafeInteger(now)||
     now>=latest.deadline)throw Error('QUOTE_NOT_APPROVABLE');
   next={...latest,status:action==='APPROVE'?'APPROVED':action==='REJECT'?'REJECTED':'REVISION_REQUESTED'};
  }
 }
 const copy={...state,version:state.version+1,
  versions:action==='DRAFT'?[...state.versions,next]:[...state.versions.slice(0,-1),next],
  keys:{...state.keys,[key]:{actor,action}}};
 return copy;
}
