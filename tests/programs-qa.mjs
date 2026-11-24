import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import assert from 'node:assert/strict';

const base=process.env.JSB_QA_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
try{
 for(const width of [360,768,1366]){
  const page=await browser.newPage({viewport:{width,height:850},isMobile:width===360,hasTouch:width===360});
  const errors=[],unsafe=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>{
   if(req.method()!=='GET'||!req.url().startsWith(base))unsafe.push(req.method()+' '+req.url());
  });
  await page.goto(base,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('section[data-screen]').count(),7,'Existing seven screens must stay intact');
  assert.equal(await page.locator('#benefit-programs').isVisible(),true);
  assert.equal(await page.locator('#campaign-programs').isVisible(),true);
  assert.equal(await page.locator('#benefit-categories [data-benefit-group]:visible').count(),4);
  assert.equal(await page.locator('#benefit-programs button:disabled').count(),1);
  assert.equal(await page.locator('#campaign-programs button:disabled').count(),1);
  await page.locator('[data-benefit-filter="region"]').click();
  assert.equal(await page.locator('#benefit-categories [data-benefit-group]:visible').count(),1);
  assert.equal(await page.locator('[data-benefit-filter="region"]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#benefit-visible-count').textContent(),/1개 혜택 유형/);
  await page.locator('[data-benefit-filter="all"]').click();
  assert.equal(await page.locator('#benefit-categories [data-benefit-group]:visible').count(),4);
  await page.locator('#campaign-programs [data-go="customer"]').click();
  assert.equal(await page.locator('section[data-screen="customer"]').isVisible(),true);
  assert.equal(await page.locator('#customer-benefits').count(),1);
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth);
  assert.ok(overflow<=2,'Horizontal overflow '+overflow+' at '+width);
  assert.deepEqual(errors,[],JSON.stringify(errors));
  assert.deepEqual(unsafe,[],JSON.stringify(unsafe));
  console.log('MASTER11 #10/#16 preview '+width+'px PASS');
  await page.close();
 }
}finally{await browser.close();}
