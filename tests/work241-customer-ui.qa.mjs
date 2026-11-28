import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const host=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const project='https://ohwkywomdqgcnptsnhwk.supabase.co';
const uuid='11111111-1111-4111-8111-111111111111';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[],calls=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route(project+'/**',async route=>{
   const request=route.request(),url=request.url();calls.push({url,method:request.method()});
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type','content-type':'application/json'};
   const fulfill=async(status,payload)=>route.fulfill({status,headers,body:JSON.stringify(payload)});
   if(url.includes('/auth/v1/token?grant_type=password')){
    assert.equal(request.method(),'POST');
    return fulfill(200,{access_token:'aaa.bbb.ccc',expires_in:3600,user:{id:uuid,role:'authenticated',is_anonymous:false}});
   }
   if(url.endsWith('/functions/v1/jsb-work241-readonly/me'))return fulfill(200,{member:true,read_only:true,environment:'DEVELOPMENT'});
   if(url.endsWith('/functions/v1/jsb-work241-readonly/requests'))return fulfill(200,{read_only:true,workflow_status_included:false,intakes:[{request_id:uuid,submitted_at:'2026-11-28T00:00:00Z',consent_count:2,private_phone:'SECRET'}]});
   return fulfill(404,{error:'NOT_FOUND'});
  });
  await page.goto(host+'customer.html#work241-dev-auth',{waitUntil:'networkidle'});
  const panel=page.locator('#work241-customer-readonly');
  assert.equal(await panel.isVisible(),true);
  assert.equal(calls.length,0,'no auth or customer data request before explicit login');
  await panel.locator('input[name=email]').fill('dev@example.invalid');
  await panel.locator('input[name=password]').fill('test-password-1234');
  await panel.locator('button[type=submit]').click();
  await page.locator('#work241-customer-readonly output').getByText(/개발 계정 본인 접수 1건/).waitFor();
  assert.equal(await panel.locator('ol li').count(),1);
  assert.doesNotMatch(await panel.textContent(),/SECRET|private_phone/);
  assert.equal(await page.evaluate(()=>localStorage.length),0);
  assert.equal(await page.evaluate(()=>sessionStorage.length),0);
  await panel.locator('button[type=button]').click();
  assert.equal(await panel.locator('ol li').count(),0);
  assert.match(await panel.locator('output').textContent(),/인증된 테스트 세션이 없습니다/);
  assert.deepEqual(errors,[]);
  const dim=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(dim<=8,'horizontal overflow at '+width);
  console.log('WORK241 customer UI mock verified '+width+'px');
  await page.close();
 }
}finally{await browser.close();}
