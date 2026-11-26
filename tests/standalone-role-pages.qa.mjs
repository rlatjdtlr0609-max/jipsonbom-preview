import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const BASE=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const specs=[
 {path:'customer.html',role:'customer',title:'고객',check:'#requestForm'},
 {path:'worker.html',role:'worker',title:'수리기사',check:'#calcprice'},
 {path:'construction.html',role:'provider',title:'공사업체',check:'#constructionContract'},
 {path:'repair-company.html',role:'repairCompany',title:'수리업체',check:'#providermain'}
];
const browser=await chromium.launch({headless:true,...(process.env.JSB_QA_BROWSER_CHANNEL?{channel:process.env.JSB_QA_BROWSER_CHANNEL}:{})});
try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const faults=[],external=[],writes=[];
  page.on('pageerror',e=>faults.push(e.message));
  page.on('request',request=>{
   const u=new URL(request.url());
   if(u.origin!==new URL(BASE).origin)external.push(request.url());
   if(!['GET','HEAD'].includes(request.method()))writes.push(request.url());
  });
  for(const spec of specs){
   await page.goto(BASE+spec.path,{waitUntil:'networkidle'});
   assert.equal(await page.locator('body').getAttribute('data-role-page'),spec.role);
   assert.equal(await page.locator('main#screen [data-screen]').count(),1,'one isolated role screen expected');
   assert.equal(await page.locator('main#screen [data-screen]').getAttribute('data-screen'),spec.role);
   assert.equal(await page.locator('main#screen [data-screen]').isVisible(),true);
   assert.equal(await page.locator(spec.check).count(),1);
   assert.equal(await page.locator('.role-tabs a[aria-current="page"]').count(),1);
   assert.match(await page.title(),new RegExp(spec.title));
   const html=await page.content();
   if(spec.role==='customer')
    assert.match(html,/connect-src https:\\/\\/ohwkywomdqgcnptsnhwk\\.supabase\\.co/);
   else assert.match(html,/connect-src 'none'/);
   assert.match(html,/form-action 'none'/);
   assert.doesNotMatch(html,/sb_secret_|service[_-]?role[_-]?key|BEGIN PRIVATE KEY/i);
   const dim=await page.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    layout:document.documentElement.scrollWidth
   }));
   assert.ok(dim.layout<=dim.viewport+8,
    'horizontal overflow '+spec.path+' width '+width+' actual '+JSON.stringify(dim));
   assert.equal(external.length,0,'no external request '+JSON.stringify(external));
   assert.equal(writes.length,0,'no unsafe write requests '+JSON.stringify(writes));
  }
  await page.goto(BASE+'customer.html',{waitUntil:'networkidle'});
  await page.locator('#preview-media').setInputFiles({
   name:'synthetic-preview.png',mimeType:'image/png',buffer:Buffer.from([137,80,78,71])
  });
  assert.match(await page.locator('#preview-file').textContent(),/전송하지 않습니다/);
  await page.locator('#requestForm').evaluate(el=>el.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  assert.match(await page.locator('#preview-receipt').textContent(),/실제 접수.*발생하지 않았습니다/);
  assert.equal(writes.length,0);
  await page.goto(BASE+'worker.html',{waitUntil:'networkidle'});
  await page.locator('#calcprice').fill('80000');
  assert.match((await page.locator('#calcresult').textContent()).replaceAll(',',''),/8000원/);
  await page.locator('#jobs [data-filter="전기·조명"]').click();
  assert.equal(await page.locator('#jobs [data-filter="전기·조명"]').getAttribute('class').then(x=>x.includes('active')),true);
  await page.goto(BASE+'construction.html',{waitUntil:'networkidle'});
  await page.locator('[data-construction-step="report"]').first().click();
  assert.match(await page.locator('#constructionContract [role="status"]').textContent(),/시연 전용/);
  await page.goto(BASE+'repair-company.html',{waitUntil:'networkidle'});
  await page.locator('[data-provider]').first().click();
  assert.match(await page.locator('#toast').textContent(),/시연용 안내/);
  const target=page.locator('.role-tabs a[href="./customer.html"]');
  const diag=await target.evaluate(el=>{
   const chain=[];for(let n=el;n&&chain.length<6;n=n.parentElement){
    const css=getComputedStyle(n);chain.push({tag:n.tagName,class:n.className,display:css.display,visibility:css.visibility,rect:n.getBoundingClientRect().toJSON()});
   }
   return {viewport:innerWidth,mq:matchMedia('(max-width:720px)').matches,chain};
  });
  console.log('WORK164 NAV DIAGNOSTIC '+JSON.stringify({width,diag}));
  assert.equal(await target.isVisible(),true,'sibling fixed URL navigation must be visible');
  await target.click({timeout:3000});
  await page.waitForURL('**/customer.html');
  assert.equal(await page.locator('main#screen [data-screen]').getAttribute('data-screen'),'customer');
  await page.goto(BASE+'index.html',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#standalone-pages a').count(),4);
  for(const spec of specs){
   assert.equal(await page.locator('#standalone-pages a[href="./'+spec.path+'"]').count(),1);
  }
  assert.equal(await page.locator('main#screen [data-screen]').count(),7,'original seven-section home must be preserved');
  assert.equal(faults.length,0,JSON.stringify({width,faults}));
  assert.equal(external.length,0,JSON.stringify({width,external}));
  assert.equal(writes.length,0,JSON.stringify({width,writes}));
  console.log('WORK164 PASS: '+width+'px four isolated role pages, safe demo events, no privileged request, original home intact');
  await page.close();
 }
}finally{await browser.close();}
