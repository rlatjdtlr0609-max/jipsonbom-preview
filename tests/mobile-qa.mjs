import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';

const base=process.env.JSB_QA_URL || 'http://127.0.0.1:8765/';
const widths=[320,360,390,430,768,1024,1366];
const screens=['home','customer','worker','provider','adminEntry','guideEntry','repairCompany'];
await mkdir('mobile-qa-evidence',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
let bad=0;
try {
  for(const width of widths){
    const page=await browser.newPage({viewport:{width,height:width<=430?800:width===768?1024:900},deviceScaleFactor:1,isMobile:width<=430,hasTouch:width<=430});
    page.setDefaultTimeout(8000);
    await page.emulateMedia({reducedMotion:'reduce'});
    const faults=[];
    page.on('pageerror',error=>faults.push(error.message));
    page.on('request',request=>{
      if(request.method()!=='GET'||!request.url().startsWith(base))faults.push('Unexpected network request '+request.method());
    });
    async function go(route) {
      await page.goto(base+'#'+route,{waitUntil:'domcontentloaded'});
      assert.ok(await page.locator('section[data-screen="'+route+'"]').isVisible(),'Route hidden: '+route);
      const overshoot=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
      assert.ok(overshoot<=2,route+' overflow '+overshoot+'px');
    }
    try {
      await go('home');
      const facts=await page.evaluate(()=>{
        const rect=x=>document.querySelector(x)?.getBoundingClientRect();
        const visible=x=>{const el=document.querySelector(x);return !!(el&&getComputedStyle(el).display!=='none'&&rect(x)?.width>0)};
        const logo=rect('.navouter .logo'),login=rect('.navtools .navbtn:not(.strong)'),menu=rect('.mobile-menu > summary');
        const body=rect('.hy-hero-body'),img=rect('.hy-hero-img');
        return {
          width:innerWidth,bodyWidth:document.body.scrollWidth,documentWidth:document.documentElement.scrollWidth,
          menuVisible:visible('.mobile-menu > summary'),desktopNavVisible:visible('.mainnav'),
          desktopSearchVisible:visible('.navtools .hy-nav-search'),
          signupHeaderVisible:visible('.navtools .navbtn.strong'),loginVisible:visible('.navtools .navbtn:not(.strong)'),
          devTabsVisible:visible('.tabstrip'),
          heroImageBelowText:!!(body&&img&&img.top>=body.bottom-2),
          headerNoOverlap:!!(logo&&login&&menu&&logo.right<=login.left+1&&login.right<=menu.left+1),
          heroPrimaryCTAs:document.querySelectorAll('.hy-hero-actions [data-intake-open]').length,
          heroSignupCTAs:document.querySelectorAll('.hy-hero-actions [data-auth=signup]').length,
          heroWorkerCTAs:document.querySelectorAll('.hy-hero-actions [data-go=worker]').length,
          heroWorkerAds:document.querySelectorAll('.hy-hero > .hy-hero-aside').length,
          publicNavTexts:[...document.querySelectorAll('.mainnav [data-go]')].map(el=>el.textContent.trim()),
          screenCount:document.querySelectorAll('#screen > [data-screen]').length
        };
      });
      assert.ok(facts.documentWidth<=width+2 && facts.bodyWidth<=width+2,'Horizontal overflow '+JSON.stringify(facts));
      assert.equal(facts.screenCount,7,'The seven legacy areas must remain intact');
      assert.equal(facts.heroPrimaryCTAs,1,'MASTER_11 requires one photo CTA');
      assert.equal(facts.heroSignupCTAs,0,'Signup cannot compete in hero');
      assert.equal(facts.heroWorkerCTAs,0,'Worker CTA cannot compete in hero');
      assert.equal(facts.heroWorkerAds,0,'Worker marketing must be below hero');
      assert.ok(!facts.devTabsVisible,'The seven-area development tab strip must be hidden from customers');
      assert.deepEqual(facts.publicNavTexts,['생활수리','이용방법','비용안내','고객센터·FAQ','기사 등록']);
      if(width<=1024){
        assert.ok(facts.menuVisible&&!facts.desktopNavVisible,'Responsive public navigation');
        const summary=page.locator('.mobile-menu summary');
        await summary.click();
        assert.equal(await page.locator('.mobile-menu nav [data-go="adminEntry"],.mobile-menu nav [data-go="guideEntry"]').count(),0,'Internal routes must not be advertised');
        assert.ok(await page.locator('.mobile-menu nav [data-scroll="help-center"]').count()===1);
        assert.ok(await page.locator('.mobile-menu nav [data-scroll="myrequests"]').count()===1);
        assert.ok(await page.locator('.mobile-menu nav [data-intake-open]').count()===1);
        await page.keyboard.press('Escape');
        assert.ok(await summary.evaluate(el=>el===document.activeElement),'Focus must return to menu');
      } else {
        assert.ok(!facts.menuVisible&&facts.desktopNavVisible,'Desktop public navigation');
      }
      if(width<=430){
        assert.ok(!facts.desktopSearchVisible,'Desktop header intake button must hide on mobile');
        assert.ok(!facts.signupHeaderVisible,'Header signup should move inside mobile menu');
        assert.ok(facts.loginVisible,'Login must remain in mobile header');
        assert.ok(facts.heroImageBelowText,'Hero photo must sit below body on mobile');
        assert.ok(facts.headerNoOverlap,'Mobile logo/login/menu overlap '+JSON.stringify(facts));
      }
      for(const route of screens)await go(route);
      await go('home');
      assert.ok(await page.locator('#service-categories').isVisible());
      assert.ok(await page.locator('#price-guide').isVisible());
      assert.ok(await page.locator('#help-center').isVisible());
      assert.equal(await page.locator('#hySearch').count(),1);
      assert.equal(await page.locator('.hy-hero #hySearch').count(),0,'Search should not compete with photo CTA');
      const help=page.locator('#help-center details').first();
      await help.locator('summary').click();
      assert.ok(await help.evaluate(el=>el.open),'FAQ must expand');
      await page.locator('.hy-hero-actions [data-intake-open]').click();
      assert.ok(await page.locator('#intake-choice').evaluate(el=>el.open),'Choice must open');
      assert.equal(await page.locator('#intake-choice [data-intake-member]').count(),2);
      await page.locator('#intake-choice [data-intake-guest]').click();
      assert.ok(await page.locator('#reception').evaluate(el=>el===document.activeElement),'Guest should focus intake');
      assert.match(await page.locator('#requestForm select[name=account]').inputValue(),/비회원/);
      await go('home');
      await page.locator('.hy-category-grid [data-cat="욕실·변기"]').click();
      assert.ok(await page.locator('#intake-choice').evaluate(el=>el.open),'Category should open choice');
      await page.locator('#intake-choice [data-intake-guest]').click();
      assert.equal(await page.locator('#requestForm select[name=category]').inputValue(),'욕실·변기');
      await go('home');
      await page.locator('.hy-hero-actions [data-intake-open]').click();
      await page.locator('#intake-choice .jsb-intake-options [data-intake-member]').click();
      assert.ok(await page.locator('#autharea').evaluate(el=>el===document.activeElement),'Member should focus auth route');
      assert.match(await page.locator('#requestForm select[name=account]').inputValue(),/회원으로/);
      await go('customer');
      const customerText=await page.locator('section[data-screen=customer]').innerText();
      assert.ok(customerText.includes('고객 마이페이지'),'My intake must not be named Customer Center');
      assert.ok(!/기사 캐시 10%/.test(customerText),'Customer-facing area should not expose the worker fee calculation');
      await page.locator('#requestForm select[name=category]').selectOption({index:1});
      await page.locator('#preview-media').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN9sAAAAASUVORK5CYII=','base64')});
      assert.match(await page.locator('#preview-file').innerText(),/1개/);
      await page.locator('#requestForm button[type=submit]').click();
      assert.match(await page.locator('#preview-receipt').innerText(),/시연 전용/);
      await page.screenshot({path:'mobile-qa-evidence/customer-'+width+'.png'});
      await go('worker');
      await page.locator('#calcprice').fill('90000');
      assert.equal(await page.locator('#calcresult').innerText(),'9,000원');
      assert.ok(await page.locator('#worker-apply').count()===1);
      await go('provider');
      await page.locator('[data-construction-step=report]').click();
      assert.match(await page.locator('#constructionContract [role=status]').innerText(),/실제 계약 및 청구 차단/);
      await go('home');
      assert.equal(await page.locator('input[type=password],#member-workspace').count(),0,'No real authentication in public preview');
      assert.ok(await page.locator('.hy-hero-img').evaluate(el=>el.complete&&el.naturalWidth>0),'Existing hero photo preserved');
      assert.deepEqual(faults,[],'No network writes or JS faults');
      await page.screenshot({path:'mobile-qa-evidence/home-'+width+'.png'});
      console.log('PASS MASTER11_R5_LAYOUT '+JSON.stringify(facts));
    }catch(error){bad++;console.error('FAIL WIDTH '+width+' '+(error.stack??String(error)));}
    finally{await page.close();}
  }
  if(!bad&&process.env.GITHUB_ACTIONS==='true'&&process.env.GITHUB_REPOSITORY==='rlatjdtlr0609-max/jipsonbom-preview'&&process.env.GITHUB_REF==='refs/heads/main'){
    const homepage='https://rlatjdtlr0609-max.github.io/jipsonbom-preview/';
    const source=await readFile('index.html','utf8');
    const expectedAssets=source.match(/\.\/release\.(?:css|js)\?v=[a-f0-9]{12}/g);
    assert.equal(expectedAssets?.length,2);
    const live=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    live.setDefaultTimeout(8000);
    try{
      await live.setExtraHTTPHeaders({'Cache-Control':'no-cache'});
      const deadline=Date.now()+180000;
      for(;;){
        const response=await live.goto(homepage,{waitUntil:'domcontentloaded'});
        if(response?.ok()&&response.url()===homepage &&
           await live.evaluate(paths=>paths.every(path=>[...document.querySelectorAll('link[href],script[src]')].some(el=>(el.getAttribute('href')??el.getAttribute('src'))===path)),expectedAssets))break;
        if(Date.now()>=deadline)throw Error('Pages has not served this R5 release');
        await new Promise(resolve=>setTimeout(resolve,5000));
      }
      await live.locator('.hy-hero-actions [data-intake-open]').click();
      assert.ok(await live.locator('#intake-choice').evaluate(el=>el.open));
      await live.locator('#intake-choice [data-intake-guest]').click();
      assert.ok(await live.locator('#reception').isVisible());
      await live.screenshot({path:'mobile-qa-evidence/deployed-r5-home-390.png'});
      assert.match(await live.locator('#release-version').innerText(),/MASTER_11 공개메뉴 R5/);
      for(const route of screens){
        await live.goto(homepage+'#'+route,{waitUntil:'domcontentloaded'});
        assert.ok(await live.locator('section[data-screen="'+route+'"]').isVisible());
      }
      console.log('PASS DEPLOYED_HTTPS_R5 '+homepage+' '+expectedAssets.join(' ')+' seven-preserved routes');
    }finally{await live.close();}
  }
}finally{await browser.close();}
if(bad)process.exit(1);
