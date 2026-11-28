/* WORK241: public-only, no-credential live Edge gateway smoke tests.
 * Does not exercise signed test-account flows or send personal data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
const base='https://ohwkywomdqgcnptsnhwk.supabase.co/functions/v1/jsb-work241-readonly';
const origin='https://rlatjdtlr0609-max.github.io';
async function get(path,init={}){
 const abort=AbortSignal.timeout(15000);
 const result=await fetch(base+path,{signal:abort,redirect:'error',cache:'no-store',...init});
 const body=await result.json().catch(()=>null);
 return {result,body};
}
test('241 DEV-only endpoint health is active and not promoted to production',async()=>{
 const {result,body}=await get('/health',{headers:{Origin:origin}});
 assert.equal(result.status,200);
 assert.equal(body.status,'ok');
 assert.equal(body.mode,'DEV_READ_ONLY');
 assert.equal(body.version,'work241-v1');
 assert.equal(result.headers.get('cache-control'),'no-store');
});
test('241 anonymous read is blocked and never returns customer data',async()=>{
 for(const endpoint of ['/me','/requests']){
  const {result,body}=await get(endpoint,{headers:{Origin:origin}});
  assert.equal(result.status,401);
  assert.deepEqual(body,{error:'AUTH_REQUIRED'});
  assert.equal(result.headers.get('access-control-allow-origin'),origin);
 }
});
test('241 write, unrecognized path and invalid origin are denied',async()=>{
 assert.equal((await get('/requests',{method:'POST',headers:{Origin:origin}})).result.status,405);
 assert.equal((await get('/unknown',{headers:{Origin:origin}})).result.status,404);
 assert.equal((await get('/health',{headers:{Origin:'https://attacker.invalid'}})).result.status,403);
});
test('241 preflight permits only GET and scoped headers',async()=>{
 const {result}=await get('/requests',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization, apikey'}});
 assert.equal(result.status,204);
 const bad=await get('/requests',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}});
 assert.equal(bad.result.status,403);
});
