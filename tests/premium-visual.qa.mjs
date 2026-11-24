/* Screenshot-based browser acceptance on unmerged premium candidate.
 * Real DOM/CSS/assets; no customer account, remote API, payment or production deploy.
 */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {join,extname,resolve} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=resolve(process.cwd());
const extension={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  const target=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!target.startsWith(root+'/')){res.writeHead(403);res.end();return;}
  const bytes=await readFile(target);
  res.writeHead(200,{'content-type':extension[extname(target)]||'application/octet-stream','cache-control':'no-store'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const screens=['home','customer','worker','provider','adminEntry','guideEntry','repairCompany'];
const sizes=[{width:375,height:812,dpr:2},{width:768,height:1024,dpr:2},{width:1440,height:900,dpr:1}];
let browser,checks=0;
await mkdir('design-screenshots',{recursive:true});
try{
 browser=await chromium.launch({headless:true});
 for(const size of sizes){
  const context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:size.dpr,
   colorScheme:'light',reducedMotion:'reduce'});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const failed=[];page.on('requestfailed',r=>failed.push(r.url()+': '+r.failure()?.errorText));
  await page.goto(url+'/#home',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('body > .jsb-skip-link').count(),1,'Missing keyboard skip link');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('jsb-skip-link')),true);
  assert.equal(await page.locator('.logo .mark svg.jsb-svg-icon').count(),1,'Brand glyph not replaced');
  assert.ok((await page.locator('img').count())>=10,'Source imagery missing');
  const hero=page.locator('.hy-hero-img');
  assert.equal(await hero.getAttribute('src'),'./assets/hero-shelf-premium-20261124.webp','Owner-selected representative photo missing');
  const photo=await hero.evaluate(img=>({loaded:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
  assert.equal(photo.loaded,true,'Representative photo is not decoded');
  assert.equal(photo.naturalWidth,1672,'Representative photo unexpectedly downscaled');
  assert.equal(photo.naturalHeight,941);
  assert.equal(await hero.getAttribute('fetchpriority'),'high');
  assert.ok((await hero.getAttribute('alt')).includes('AI'),'AI imagery must be explicitly marked illustrative');
  const campaignBg=await page.locator('.jsb-campaign').first().evaluate(e=>getComputedStyle(e).backgroundImage).catch(()=>null);
  if(campaignBg!==null)assert.equal(campaignBg,'none','Campaign must not rely on stock gradients');
  for(const screen of screens){
   const tab=page.locator('#tabs [data-go="'+screen+'"]').first();
   assert.equal(await tab.count(),1,'Missing nav '+screen);
   if(await tab.isVisible())await tab.click();
   else await tab.evaluate(el=>el.click()); // Original mobile menu hides the seven-tab desktop strip.
   await page.locator('[data-screen="'+screen+'"]').waitFor({state:'visible'});
   await page.evaluate(()=>document.fonts.ready);
   const report=await page.evaluate(name=>{
    const root=document.querySelector('[data-screen="'+name+'"]');
    const bounds=root.getBoundingClientRect();
    const style=getComputedStyle(document.body);
    return {
     scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
     contentWidth:bounds.width,visible:root&&!root.hidden,
     font:style.fontFamily,cssLoaded:getComputedStyle(document.querySelector('.navouter')).backdropFilter==='none',
     imageMissing:[...root.querySelectorAll('img')].filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.currentSrc),
     svgCount:document.querySelectorAll('.jsb-svg-icon').length,
     screenLabel:document.querySelector('#tabs .tab.active')?.textContent
    };
   },screen);
   assert.equal(report.visible,true,screen+' visibility');
   assert.ok(report.cssLoaded,'Premium CSS not loaded');
   assert.ok(report.svgCount>=2,'Inline SVG icons not applied '+screen);
   assert.ok(report.scrollWidth<=size.width+3,'Page horizontal overflow '+screen+' @'+size.width+': '+JSON.stringify(report));
   assert.deepEqual(report.imageMissing,[],'Images broken '+screen);
   await page.screenshot({path:join('design-screenshots',screen+'-'+size.width+'px.png'),
    fullPage:true,animations:'disabled'});
   checks++;
   console.log('PREMIUM_VISUAL_PASS',screen,size.width,'dpr='+size.dpr,'svg='+report.svgCount);
  }
  assert.deepEqual(errors,[],'Browser JS errors');
  assert.deepEqual(failed,[],'Failed requests');
  await context.close();
 }
 console.log('PREMIUM_UI_ALL_SCREENS_OK',checks,'of',screens.length*sizes.length);
}finally{
 if(browser)await browser.close();
 await new Promise(r=>server.close(r));
}
