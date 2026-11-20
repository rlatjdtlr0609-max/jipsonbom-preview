import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const base='http://127.0.0.1:8765/';
const widths=[320,360,390,430,768,1366];
const screens=['home','customer','worker','provider','adminEntry','guideEntry','repairCompany'];
await mkdir('mobile-qa-evidence',{recursive:true});
const browser=await chromium.launch({headless:true});
let bad=0;
try {
  for(const width of widths){
    const height=width<=430?800:width===768?1024:900;
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,isMobile:width<=430,hasTouch:width<=430});
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
        const summary=page.locator('.mobile-menu summary');
        await summary.click();
        assert.equal(await page.locator('.mobile-menu nav [data-go]').count(),7);
        assert.equal(await page.locator('.mobile-menu nav [data-auth=signup]').count(),1);
        for(const screen of screens){
          await summary.click().catch(()=>{});
          const opened=await page.locator('.mobile-menu').evaluate(el=>el.open);
          if(!opened) await summary.click();
          await page.locator('.mobile-menu nav [data-go='+screen+']').click();
          await page.waitForFunction(name=>{const section=document.querySelector('section[data-screen="'+name+'"]');return section&&!section.hidden;},screen);
          assert.equal(await page.locator('.mobile-menu').evaluate(el=>el.open),false,'Menu should close on '+screen);
        }
        await page.goto(base+'#customer');
        await page.screenshot({path:'mobile-qa-evidence/customer-'+width+'.png',fullPage:false});
        await page.goto(base+'#home');
      }else if(width===768){
        assert.ok(facts.menuVisible,'Tablet menu missing');
        assert.ok(!facts.searchVisible,'Tablet navigation should not crowd header');
      }else{
        assert.ok(!facts.menuVisible,'Desktop should not show hamburger');
        assert.ok(facts.tabVisible,'Desktop seven-area tabs missing');
      }
      await page.screenshot({path:'mobile-qa-evidence/home-'+width+'.png',fullPage:false});
      console.log('PASS MOBILE_LAYOUT',JSON.stringify(facts));
    }catch(error){bad++;console.error('FAIL WIDTH',width,error.stack??String(error));}
    finally{await page.close();}
  }
}finally{await browser.close();}
if(bad)process.exit(1);
