/* WORK186 — REAL DEV Supabase customer E2E runner (never deployed to public browser).
 * Actual PASS requires TWO independently verified GoTrue JWT sessions and owned
 * receipts, not synthetic claim headers. No secrets, tokens, names or data in logs.
 * Writing synthetic records requires explicit DEV flag + dedicated test identities.
 */
import {randomBytes} from 'node:crypto';
const HOST='https://ohwkywomdqgcnptsnhwk.supabase.co';
const UUID=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const mail=x=>typeof x==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
function claims(token){
 const parts=token?.split('.');
 if(parts?.length!==3)throw Error('INVALID_AUTH_JWT');
 const jwt=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
 if(!UUID.test(jwt.sub||'')||jwt.role!=='authenticated'||
   !Number.isFinite(jwt.exp)||jwt.exp*1000<=Date.now()||
   !UUID.test(jwt.session_id||''))throw Error('INVALID_AUTH_CLAIMS');
 return jwt;
}
function fail(name){throw new Error(name);}
export async function customerDevE2E({env={},transport=fetch,now=Date.now()}={}){
 const required=['JSB_WORK186_PUBLISHABLE_KEY','JSB_WORK186_A_EMAIL','JSB_WORK186_A_PASSWORD',
   'JSB_WORK186_B_EMAIL','JSB_WORK186_B_PASSWORD'];
 const missing=required.filter(k=>!env[k]);
 if(missing.length)return {state:'BLOCKED',reason:'SECURE_DEV_CREDENTIALS_REQUIRED',missing};
 if(!/^sb_publishable_[a-zA-Z0-9_-]{15,}$/.test(env.JSB_WORK186_PUBLISHABLE_KEY))
  return {state:'BLOCKED',reason:'PUBLISHABLE_KEY_ONLY'};
 if(!mail(env.JSB_WORK186_A_EMAIL)||!mail(env.JSB_WORK186_B_EMAIL)||
   env.JSB_WORK186_A_EMAIL===env.JSB_WORK186_B_EMAIL)
  return {state:'BLOCKED',reason:'DISTINCT_VERIFIED_EMAILS_REQUIRED'};
 const tokens=[],checks=[];
 async function request(path,{token,body}={}){
  if(!/^\/(auth\/v1\/(?:token\?grant_type=password|user|logout)|rest\/v1\/rpc\/(?:jsb_w16_member_profile|jsb_member_submit_once|jsb_member_request))$/.test(path))
   fail('UNAPPROVED_PATH');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const r=await transport(HOST+path,{method:body===undefined?'GET':'POST',redirect:'error',
    cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:controller.signal,
    headers:{apikey:env.JSB_WORK186_PUBLISHABLE_KEY,...(token?{authorization:'Bearer '+token}:{}),
     ...(body===undefined?{}:{'content-type':'application/json'})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
   const data=await r.json().catch(()=>null);
   return {status:r.status,ok:r.ok,data};
  }finally{clearTimeout(timeout);}
 }
 async function signIn(email,password){
  const auth=await request('/auth/v1/token?grant_type=password',{body:{email,password}});
  if(!auth.ok||typeof auth.data?.access_token!=='string')fail('GOTRUE_LOGIN_NOT_VERIFIED');
  const t=auth.data.access_token;tokens.push(t);
  const jwt=claims(t);
  const who=await request('/auth/v1/user',{token:t});
  if(!who.ok||who.data?.id!==jwt.sub||who.data?.email?.toLowerCase()!==email.toLowerCase()||
      !who.data?.email_confirmed_at||who.data?.is_anonymous===true)
   fail('GOTRUE_USER_UID_MISMATCH');
  return {id:jwt.sub,token:t};
 }
 function requireOwner(profile,actor){
  if(profile.status!==200||profile.data?.account_id!==actor.id||!Array.isArray(profile.data?.intakes))
   fail('OWNERSHIP_PROFILE_MISMATCH');
 }
 const denyForeign=result=>!result.ok||result.data===null;
 try{
  const a=await signIn(env.JSB_WORK186_A_EMAIL,env.JSB_WORK186_A_PASSWORD);
  const b=await signIn(env.JSB_WORK186_B_EMAIL,env.JSB_WORK186_B_PASSWORD);
  if(a.id===b.id)fail('NOT_DISTINCT_GO_TRUE_IDENTITIES');
  checks.push('TWO_SIGNED_JWT_UIDS_VERIFIED');
  const aProfile=await request('/rest/v1/rpc/jsb_w16_member_profile',{token:a.token,body:{p_before:null}});
  const bProfile=await request('/rest/v1/rpc/jsb_w16_member_profile',{token:b.token,body:{p_before:null}});
  requireOwner(aProfile,a);requireOwner(bProfile,b);
  checks.push('TWO_SEPARATE_OWNER_PROFILES');
  let aid=env.JSB_WORK186_A_REQUEST_ID,bid=env.JSB_WORK186_B_REQUEST_ID;
  const write=env.JSB_WORK186_ALLOW_SYNTHETIC_DEV_WRITE==='1';
  if(write){
   const nonce=randomBytes(10).toString('hex');
   const payload=who=>({name:'WORK186_SYNTHETIC_'+who,phone:'00000000000',
    category:'TEST',description:'WORK186 SYNTHETIC DEV ONLY '+nonce,
    address:'SYNTHETIC ADDRESS — NOT REAL',terms:true,privacy:true,
    contactConfirmed:true,policyVersion:'work01-dev-v1'});
   async function submit(who,actor){
    const p=payload(who),key=randomBytes(32).toString('hex');
    const body={p_data:p,p_key:key};
    const first=await request('/rest/v1/rpc/jsb_member_submit_once',{token:actor.token,body});
    const second=await request('/rest/v1/rpc/jsb_member_submit_once',{token:actor.token,body});
    if(!first.ok||!second.ok||!UUID.test(first.data?.id||'')||first.data?.id!==second.data?.id)
      fail('IDEMPOTENT_DEV_SUBMIT_FAILED');
    return first.data.id;
   }
   aid=await submit('A',a);bid=await submit('B',b);
   checks.push('REAL_DEV_SYNTHETIC_SUBMIT_IDEMPOTENT');
  }
  if(!UUID.test(aid||'')||!UUID.test(bid||'')||aid===bid)
   return {state:'BLOCKED',reason:'OWNED_DEV_REQUEST_IDS_OR_EXPLICIT_SYNTHETIC_WRITE_REQUIRED',checks};
  const [ownA,ownB,foreignA,foreignB]=await Promise.all([
   request('/rest/v1/rpc/jsb_member_request',{token:a.token,body:{p_id:aid}}),
   request('/rest/v1/rpc/jsb_member_request',{token:b.token,body:{p_id:bid}}),
   request('/rest/v1/rpc/jsb_member_request',{token:b.token,body:{p_id:aid}}),
   request('/rest/v1/rpc/jsb_member_request',{token:a.token,body:{p_id:bid}})
  ]);
  if(!ownA.ok||ownA.data?.id!==aid||!ownB.ok||ownB.data?.id!==bid)
   fail('OWN_RECEIPT_UNREADABLE');
  if(!denyForeign(foreignA)||!denyForeign(foreignB))fail('CROSS_CUSTOMER_IDOR');
  checks.push('TWO_OWN_RECORDS_READ','TWO_FOREIGN_RECORDS_DENIED');
  return {state:'PASS',checks,requestWrites:write?'SYNTHETIC_DEV_ONLY':'NONE'};
 }catch(e){
  return {state:'FAIL',reason:['GOTRUE_LOGIN_NOT_VERIFIED','INVALID_AUTH_JWT','INVALID_AUTH_CLAIMS',
   'GOTRUE_USER_UID_MISMATCH','NOT_DISTINCT_GO_TRUE_IDENTITIES','OWNERSHIP_PROFILE_MISMATCH',
   'IDEMPOTENT_DEV_SUBMIT_FAILED','OWN_RECEIPT_UNREADABLE','CROSS_CUSTOMER_IDOR'].includes(e.message)
   ?e.message:'NETWORK_OR_UNEXPECTED_RESPONSE',checks};
 }finally{
  // Best-effort cleanup of GoTrue sessions; no tokens ever logged or persisted.
  await Promise.all(tokens.map(token=>request('/auth/v1/logout',{token,body:{}}).catch(()=>{})));
 }
}
