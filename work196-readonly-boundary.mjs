/* WORK196: read-only signed-member boundary preflight.
 * Run against actual DEV API only when a published project key and two distinct
 * user-supplied test accounts are securely provisioned. Never stores credentials.
 * No real personal information, writes, migrations, or grant modifications.
 */
const HOST='https://ohwkywomdqgcnptsnhwk.supabase.co';
const uuid=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const publishable=/^sb_publishable_[a-zA-Z0-9_-]{15,}$/;
export async function verifyMemberBoundaries({key,accessA,accessB,requestA,requestB,transport=fetch}={}){
 const reasons=[];
 if(!publishable.test(key||''))reasons.push('PUBLISHABLE_KEY_REQUIRED');
 if(!accessA||!accessB||accessA===accessB)reasons.push('TWO_DISTINCT_SIGNED_SESSIONS_REQUIRED');
 if(!uuid.test(requestA||'')||!uuid.test(requestB||'')||requestA===requestB)
  reasons.push('TWO_DIFFERENT_OWNED_DEV_REQUESTS_REQUIRED');
 if(reasons.length)return Object.freeze({state:'BLOCKED',reasons,realE2E:false});
 const get=async(token,path,body)=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await transport(HOST+path,{method:body?'POST':'GET',redirect:'error',cache:'no-store',credentials:'omit',
    headers:{apikey:key,authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:controller.signal});
   return {status:r.status,body:await r.json().catch(()=>null)};
  }finally{clearTimeout(timer);}
 };
 try{
  const [a,b]=await Promise.all([
   get(accessA,'/auth/v1/user'),get(accessB,'/auth/v1/user')
  ]);
  if(![a,b].every(x=>x.status===200&&uuid.test(x.body?.id||'')&&x.body?.email_confirmed_at&&
     x.body?.is_anonymous!==true)||a.body.id===b.body.id)
   return {state:'FAIL',reason:'TWO_GOTRUE_AUTHENTICATED_UIDS_NOT_VERIFIED',realE2E:false};
  const calls=[
   [accessA,requestA,true],[accessB,requestB,true],
   [accessB,requestA,false],[accessA,requestB,false]
  ];
  for(const [token,id,mustOwn] of calls){
   const r=await get(token,'/rest/v1/rpc/jsb_member_request',{p_id:id});
   if(mustOwn){
    if(r.status!==200||r.body?.id!==id)return {state:'FAIL',reason:'OWN_RECEIPT_ACCESS_FAILED',realE2E:false};
   }else if(r.status===200&&r.body!==null)
    return {state:'FAIL',reason:'FOREIGN_RECEIPT_IDOR',realE2E:false};
  }
  // No PII in returned report; identity and access check only.
  return Object.freeze({state:'PASS',realE2E:true,checks:6,storageWrites:0,dbWrites:0});
 }catch{
  return Object.freeze({state:'BLOCKED',reasons:['DEV_API_UNREACHABLE_OR_TIMEOUT'],realE2E:false});
 }
}
