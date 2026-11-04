// Fake clocks, generated public fixture and fake balances; no live coins.
const assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {chromium}=require('./browser-helper.cjs'),E=require('../www/engine.js'),ethers=require('../www/assets/ethers.umd.min.js');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true});
 try{
  const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  const vault=E.unprotected(webcrypto,E.recipe(ethers,'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'));
  await c.addInitScript(v=>{
   window.__balances={pep:1000,wht:1000};window.__calls={};
   window.fetch=async(url,options)=>{if(!String(url).endsWith('?pair=PEPUSD,USDTUSD')||options.credentials!=='omit'||options.referrerPolicy!=='no-referrer')throw Error('Unexpected price request');return new Response(JSON.stringify({error:[],result:{PEPUSD:{c:['.01']},USDTZUSD:{c:['.5']}}}));};
   window.WebSocket=class{constructor(){throw Error('Real connection prohibited');}};
   Object.defineProperty(window,'WalletNetwork',{configurable:true,set(N){Object.defineProperty(window,'WalletNetwork',{value:N,configurable:true});N.scan=async(coin,accounts)=>{
    __calls[coin]=(__calls[coin]||0)+1;const amount=BigInt(__balances[coin])*100000000n;
    return {coin,tip:500,at:Date.now(),confirmed:amount,unconfirmed:0n,everUsed:amount?[0]:[],feeRate:1000000n,rows:accounts.map((account,i)=>({account,confirmed:i?0n:amount,unconfirmed:0n,history:[],utxos:[]}))};
   };}});
  },vault);
  await p.clock.install();await p.clock.pauseAt(new Date(Date.now()+100));
  await p.goto('http://localhost:8787/#setup');
  await p.locator('[data-setup="import"]').click();await p.locator('#phrase').fill(vault.recipe.mnemonic);
  const restoredAt=await p.evaluate(()=>Date.now());
  await p.locator('#submit-setup').click();await p.waitForFunction(()=>__calls.pep&&__calls.wht);
  await p.waitForFunction(()=>document.querySelector('[data-overview-coin=pep] .holding-balance')?.textContent==='1000 PEP');
  assert.ok(await p.evaluate(t=>Date.now()-t<4000,restoredAt),'restore must not wait for the reporting delay');
  assert.equal(await p.evaluate(()=>__calls.pep),1);assert.equal(await p.evaluate(()=>__calls.wht),1);
  assert.equal(await p.locator('#wallet-worth').innerText(),'≈ 20.00 USDT*');
  assert.equal(await p.locator('#home-coin, .home-balance, .home-actions').count(),0);
  assert.equal(await p.locator('[data-overview-coin=wht] .holding-balance').innerText(),'1000 WHT');
  await p.evaluate(()=>{__balances.wht=0;});await p.clock.runFor(3999);
  assert.equal(await p.evaluate(()=>__calls.wht),1,'no periodic query before 4 seconds');
  await p.clock.runFor(1);
  await p.waitForFunction(()=>__calls.wht===2);
  assert.equal(await p.locator('[data-overview-coin=wht] .holding-balance').innerText(),'1000 WHT');
  await p.clock.runFor(3999);
  assert.equal(await p.locator('[data-overview-coin=wht] .holding-balance').innerText(),'1000 WHT');
  assert.equal(await p.evaluate(()=>__calls.wht),2);
  await p.clock.runFor(1);
  await p.waitForFunction(()=>document.querySelector('[data-overview-coin=wht] .holding-balance').textContent==='0 WHT');
  assert.equal(await p.evaluate(()=>__calls.wht),3,'publication requires a fresh query at the 4-second boundary');
  assert.equal(await p.locator('#wallet-worth').innerText(),'≈ 20.00 USDT');
  for(const width of [320,390,430]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await p.screenshot({path:'whippet/test-results/wallet-usdt-total.png',fullPage:true});
  assert.doesNotMatch(await p.locator('#main').innerText(),/4 second|settling|reporting delay|—/i);
  assert.deepEqual(errors,[]);console.log('PASS: immediate restore balances; periodic query at 4 seconds; changed balance withheld until fresh reread 4 seconds later; cumulative USDT, zero-balance exclusion and unpriced holdings.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
