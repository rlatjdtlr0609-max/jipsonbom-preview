import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base=process.env.JSB_QA_URL || 'http://127.0.0.1:8765/';
const widths=[320,360,390,430,768,1024,1366];
const screens=['home','customer','worker','provider','adminEntry','guideEntry','repairCompany'];
await mkdir('mobile-qa-evidence',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
let bad=0;
try {
  for(const width of widths){
    const height=width<=430?800:width===768?1024:900;
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:width<=430,hasTouch:width<=430});
    page.setDefaultTimeout(8000);
    await page.emulateMedia({reducedMotion:'reduce'});
    const faults=[];
    page.on('pageerror',err=>faults.push(err.message));
    page.on('request',req=>{if(req.method()!=='GET'||!req.url().startsWith(base))faults.push('Unexpected network request');});
    try{
      await page.goto(base,{waitUntil:'domcontentloaded'});
      await page.locator('.hy-hero-primary').waitFor();
      const facts=await page.evaluate(()=>{
        const r=x=>document.querySelector(x)?.getBoundingClientRect();
        const isVisible=x=>{const el=document.querySelector(x);return el&&getComputedStyle(el).display!=='none'&&r(x)?.width>0};
        let logo=r('.navouter .logo'),login=r('.navtools .navbtn:not(.strong)'),menu=r('.mobile-menu > summary'),body=r('.hy-hero-body'),img=r('.hy-hero-img');
        return {
          width:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
          menuVisible:isVisible('.mobile-menu > summary'),
          searchVisible:isVisible('.navtools .hy-nav-search'),
          tabVisible:isVisible('.tabstrip'),
          signupHeaderVisible:isVisible('.navtools .navbtn.strong'),
          loginVisible:isVisible('.navtools .navbtn:not(.strong)'),
          heroImageBelowText:!!(body&&img&&img.top>=body.bottom-2),
          headerNoOverlap:!!(logo&&login&&menu&&logo.right<=login.left+1&&login.right<=menu.left+1),
          menuRect:menu?{x:menu.x,y:menu.y,width:menu.width}:null,
          logoRect:logo?{x:logo.x,y:logo.y,width:logo.width}:null,
          loginRect:login?{x:login.x,y:login.y,width:login.width}:null
        };
      });
      assert.ok(facts.documentWidth<=width+2,'Horizontal overflow '+JSON.stringify(facts));
      assert.ok(facts.bodyWidth<=width+2,'Body overflow '+JSON.stringify(facts));
      if(width<=430){
        assert.ok(facts.menuVisible,'Menu missing');
        assert.ok(!facts.searchVisible,'Desktop search button must hide on mobile');
        assert.ok(!facts.tabVisible,'Duplicate 7-tab strip must hide on mobile');
        assert.ok(!facts.signupHeaderVisible,'Signup must move inside the mobile menu');
        assert.ok(facts.loginVisible,'Mobile login unavailable');
        assert.ok(facts.heroImageBelowText,'Hero image must be below text and CTAs');
        assert.ok(facts.headerNoOverlap,'Logo/login/menu collision '+JSON.stringify(facts));
      }
      if (width<=1024) {
        assert.ok(facts.menuVisible && !facts.searchVisible,'Tablet/mobile menu');
        const summary=page.locator('.mobile-menu summary');
        await summary.click();
        assert.equal(await page.locator('.mobile-menu nav [data-go]').count(),7);
        assert.equal(await page.locator('.mobile-menu nav [data-auth=signup]').count(),1);
        await page.keyboard.press('Escape');
        assert.ok(await summary.evaluate(el=>el===document.activeElement));
      } else {
        assert.ok(!facts.menuVisible && facts.tabVisible,'Desktop navigation');
      }
      async function go(screen) {
        const nav=width<=1024?'.mobile-menu nav':'#tabs';
        if (width<=1024) await page.locator('.mobile-menu summary').click();
        const link=page.locator(nav+' [data-go="'+screen+'"]');
        await link.click();
        assert.equal(await link.getAttribute('aria-current'),'page');
        assert.ok(await page.locator('section[data-screen="'+screen+'"]').isVisible());
        assert.equal(await page.locator('.mobile-menu').evaluate(el=>el.open),false);
      }
      for (const screen of screens) {
        await go(screen);
        const over=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
        assert.ok(over<=1,screen+' horizontal overflow '+over);
      }
      await go('home');
      await page.locator('.hy-hero-actions [data-go="customer"]').click();
      assert.ok(await page.locator('#reception').evaluate(el=>el===document.activeElement));
      await page.locator('#requestForm select[name=category]').selectOption({index:1});
      await page.locator('#preview-media').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN9sAAAAASUVORK5CYII=','base64')});
      assert.match(await page.locator('#preview-file').innerText(),/1개/);
      await page.locator('#requestForm button[type=submit]').click();
      assert.match(await page.locator('#preview-receipt').innerText(),/시연 전용/);
      await page.screenshot({path:'mobile-qa-evidence/customer-'+width+'.png'});
      await go('worker');
      await page.locator('#calcprice').fill('90000');
      assert.equal(await page.locator('#calcresult').innerText(),'9,000원');
      await go('provider');
      await page.locator('[data-construction-step=report]').click();
      assert.match(await page.locator('#constructionContract [role=status]').innerText(),/실제 계약 및 청구 차단/);
      await go('home');
      assert.equal(await page.locator('input[type=password],#member-workspace').count(),0);
      assert.ok(await page.locator('.hy-hero-img').evaluate(el=>el.complete&&el.naturalWidth>0));
      assert.deepEqual(faults,[]);
      await page.screenshot({path:'mobile-qa-evidence/home-'+width+'.png',fullPage:false});
      console.log('PASS MOBILE_LAYOUT',JSON.stringify(facts));
    }catch(error){bad++;console.error('FAIL WIDTH',width,error.stack??String(error));}
    finally{await page.close();}
  }
}finally{await browser.close();}
if(bad)process.exit(1);
