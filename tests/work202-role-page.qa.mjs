import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,...(process.env.JSB_QA_BROWSER_CHANNEL?{channel:process.env.JSB_QA_BROWSER_CHANNEL}:{})});
try{
 for(const [file,role] of [['worker.html','worker'],['repair-company.html','repairCompany']]){
  const page=await browser.newPage({viewport:{width:390,height:840}});
  const requests=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://ohwkywomdqgcnptsnhwk.supabase.co/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   requests.push({path,method:req.method(),authorization:req.headers().authorization||null});
   const headers={'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'apikey,authorization,content-type'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   let data;
   if(path==='/auth/v1/token')data={access_token:'synthetic202securityToken'.repeat(2),expires_in:3600};
   else if(path==='/auth/v1/user')data={id:'11111111-1111-4111-8111-111111111111',email:'dev202@example.invalid',email_confirmed_at:'2026-11-26T00:00:00Z'};
   else if(path==='/auth/v1/logout')data={};
   else if(path==='/rest/v1/rpc/jsb_w04_jobs')data=[{id:'JOB202',customerName:'SYNTHETIC_SECRET'}];
   else if(path==='/rest/v1/rpc/jsb_w09_read')data={visits:[]};
   else if(path==='/rest/v1/rpc/jsb_w10_provider_read')data={org_id:'11111111-1111-4111-8111-111111111111',businessName:'SENSITIVE_ORG_NAME'};
   else throw Error('unexpected call '+path);
   return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto(root+file,{waitUntil:'domcontentloaded'});
  await page.locator('#w202-role-dev').waitFor({state:'visible'});
  await page.locator('#w202-email').fill('dev202@example.invalid');
  await page.locator('#w202-pass').fill('test-only-password');
  await page.locator('#w202-login button[type=submit]').click();
  await page.locator('#w202-load').waitFor({state:'visible'});
  await page.waitForFunction(()=>document.querySelector('#w202-load')?.disabled===false);
  await page.locator('#w202-load').click();
  await page.waitForFunction(()=>document.querySelector('#w202-result')?.textContent.length>5);
  const str=await page.locator('#w202-result').textContent();
  assert.ok(str.includes(role==='worker'?'작업게시물 수':'승인된 업체'));
  assert.doesNotMatch(str,/SYNTHETIC_SECRET|SENSITIVE_ORG_NAME|dev202@example.invalid/);
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).length+Object.keys(sessionStorage).length),0);
  assert.equal(requests.filter(x=>x.path.includes('/rpc/')).length,role==='worker'?2:1);
  assert.equal(requests.some(x=>/command|submit_once|upload/.test(x.path)),false);
  await page.locator('#w202-logout').click();
  await page.waitForFunction(()=>document.querySelector('#w202-load')?.disabled===true);
  assert.equal(await page.locator('#w202-result').textContent(),'');
  assert.equal(await page.locator('#w202-pass').inputValue(),'');
  assert.deepEqual(errors,[]);
  console.log('WORK202 '+role+' PASS 390px DEV authenticated RPC read only, no PII, logout clears session');
  await page.close();
 }
}finally{await browser.close();}
