// Synthetic history and an isolated browser. No wallet storage from real users.
const assert=require('node:assert/strict'),{webcrypto}=require('node:crypto'),{chromium}=require('./browser-helper.cjs');
const E=require('../www/engine.js'),ethers=require('../www/assets/ethers.umd.min.js');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
 try{
  const c=await b.newContext({viewport:{width:390,height:844}});await require('./funded_network.cjs')(c);
  const vault=E.unprotected(webcrypto,E.recipe(ethers,'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'));
  await c.addInitScript(v=>localStorage.setItem('whippet.dev.encrypted.v1',JSON.stringify(v)),vault);
  await c.route('https://pepecoinservice.org/**',r=>r.fulfill({status:200,body:'Isolated explorer fixture'}));
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.install();await p.goto('http://localhost:8787/#activity');
  assert.equal(await p.locator('.page-head').innerText(),'Activity');assert.equal(await p.locator('.activity-asset[open]').count(),0);
  await p.evaluate(()=>{
   const original=WalletNetwork.scan;WalletNetwork.scan=async(...args)=>{const s=await original(...args);s.rows[0].history=Array.from({length:40},(_,i)=>({tx_hash:(s.coin==='pep'?'a':'b').repeat(62)+i.toString(16).padStart(2,'0'),height:500-i}));return s;};
   const v=JSON.parse(localStorage.getItem('whippet.dev.encrypted.v1'));
   localStorage.setItem('corevault.send-attempts.'+WalletLibrary.id(v),JSON.stringify([{coin:'pep',txid:'c'.repeat(64),outpoints:['d'.repeat(64)+':0'],at:Date.now(),status:'unknown'}]));
  });
  await p.clock.runFor(4001);await p.waitForFunction(()=>document.querySelectorAll('.live-tx').length===61);
  const pep=p.locator('[data-activity-coin=pep]'),wht=p.locator('[data-activity-coin=wht]');
  await pep.locator('summary').click();assert.equal(await pep.locator('.activity-list').isVisible(),true);assert.equal(await wht.locator('.activity-list').isVisible(),false);
  assert.equal(await wht.locator('a').count(),0);assert.equal(await pep.locator('a').count(),31);
  assert.equal(await pep.locator('.activity-list').evaluate(el=>el.scrollHeight>el.clientHeight),true);
  await pep.locator('.activity-list').evaluate(el=>{el.scrollTop=450;});await p.clock.runFor(4001);
  assert.equal(await pep.getAttribute('open'),'');assert.equal(await pep.locator('.activity-list').evaluate(el=>el.scrollTop),450);
  assert.equal(await wht.getAttribute('open'),null);
  const link=pep.locator('a').first();assert.equal(await link.getAttribute('rel'),'noopener noreferrer');assert.equal(await link.getAttribute('referrerpolicy'),'no-referrer');
  const popup=c.waitForEvent('page');await link.click();const explorer=await popup;await explorer.waitForLoadState();
  assert.match(explorer.url(),/^https:\/\/pepecoinservice\.org\/explorer\/tx\/[0-9a-f]{64}\/$/);await explorer.close();
  assert.equal(await p.evaluate(()=>location.hash),'#activity');
  for(const width of [320,390,430]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await p.screenshot({path:'whippet/test-results/activity-assets.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('PASS: simple Activity header; collapsed asset groups; bounded scroll; refresh preserves open/scroll; PEP-only explorer links; uncertain-send warning retained; external fixture browser.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
