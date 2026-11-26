/* WORK202 — only approved DEV Supabase endpoint calls, no payment or data writes.
 * The server/PostgreSQL RLS, not this client, determines role and resource access.
 * Token lives only in closure memory and expires; no browser storage/cookies.
 */
const HOST='https://ohwkywomdqgcnptsnhwk.supabase.co';
const KEY='sb_publishable_tNSrR-mJYeChyS1J_5Ykkg_oH15pvXd'; // public key already used by customer-dev.js
const ORIGIN=/^(https:\/\/rlatjdtlr0609-max\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/i;
const ALLOWED=new Map([
 ['/auth/v1/token?grant_type=password','POST'],['/auth/v1/user','GET'],
 ['/auth/v1/logout','POST'],['/rest/v1/rpc/jsb_w04_jobs','POST'],
 ['/rest/v1/rpc/jsb_w09_read','POST'],['/rest/v1/rpc/jsb_w10_provider_read','POST']
]);
export function createDevRoleClient({fetchImpl=fetch,origin,role,now=()=>Date.now()}={}){
 if(!['worker','repairCompany'].includes(role)||!ORIGIN.test(origin||''))
  throw Error('DEV_ROLE_OR_ORIGIN_DENIED');
 let session=null,revision=0;
 const clear=()=>{revision++;session=null;};
 const state=()=>({authenticated:!!session&&now()<session.expiresAt,role});
 async function call(path,body,token){
  if(ALLOWED.get(path)!==(body===undefined?'GET':'POST'))
   throw Error('UNAPPROVED_DEV_API_ROUTE');
  const headers={apikey:KEY,...(body===undefined?{}:{'content-type':'application/json'}),
   ...(token?{authorization:'Bearer '+token}:{})};
  const resp=await fetchImpl(HOST+path,{
   method:body===undefined?'GET':'POST',mode:'cors',cache:'no-store',credentials:'omit',
   redirect:'error',referrerPolicy:'no-referrer',headers,
   ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const result=await resp.json().catch(()=>null);
  if(!resp.ok){
   if(resp.status===401||resp.status===403)clear();
   throw Error('DEV_AUTH_OR_PERMISSION_DENIED');
  }
  return result;
 }
 async function login(email,password){
  if(typeof email!=='string'||!/^\S+@\S+\.\S+$/.test(email)||
     typeof password!=='string'||password.length<6)throw Error('VALID_DEV_CREDENTIALS_REQUIRED');
  clear();const rev=revision;
  const resp=await call('/auth/v1/token?grant_type=password',{email,password});
  if(typeof resp?.access_token!=='string'||!(resp.expires_in>0&&resp.expires_in<=86400))
   throw Error('SIGNED_AUTH_SESSION_NOT_VERIFIED');
  const token=resp.access_token;
  const user=await call('/auth/v1/user',undefined,token);
  if(revision!==rev)throw Error('SESSION_CHANGED');
  if(!user||typeof user.id!=='string'||user.is_anonymous===true||!user.email_confirmed_at||
     user.email?.toLowerCase()!==email.toLowerCase())throw Error('VERIFIED_USER_MISMATCH');
  session={token,expiresAt:now()+resp.expires_in*1000,id:user.id};
  return {authenticated:true,role};
 }
 async function read(){
  const s=session,rev=revision;
  if(!s||now()>=s.expiresAt){clear();throw Error('DEV_SESSION_EXPIRED');}
  let result;
  if(role==='worker'){
   const board=await call('/rest/v1/rpc/jsb_w04_jobs',{p_admin:false},s.token);
   if(revision!==rev||!session||session.token!==s.token)throw Error('SESSION_CHANGED');
   const visits=await call('/rest/v1/rpc/jsb_w09_read',{
    p_role:'worker',p_booking:null,p_evidence:null},s.token);
   if(!Array.isArray(board))throw Error('UNEXPECTED_WORKER_RESPONSE');
   result={workOpportunityCount:board.length,visitResponseVerified:visits!==null,
    organizationResponseVerified:null};
  }else{
   const org=await call('/rest/v1/rpc/jsb_w10_provider_read',{
    p_domain:'repair',p_view:'self',p_target:null},s.token);
   result={workOpportunityCount:null,visitResponseVerified:null,
    organizationResponseVerified:org!==null};
  }
  if(revision!==rev||!session||session.token!==s.token||now()>=s.expiresAt)
   throw Error('SESSION_CHANGED');
  // Never return raw customer/job/org data to the public DEV page.
  return Object.freeze({...result,role,devOnly:true,readOnly:true,realBusinessE2E:false});
 }
 async function logout(){
  const t=session?.token;clear();
  if(t)try{await call('/auth/v1/logout',{},t);}catch{}
  return {authenticated:false};
 }
 return Object.freeze({login,read,logout,clear,state});
}
