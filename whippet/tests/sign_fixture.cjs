// Public BIP39 fixture exclusively for disconnected regtest verification.
const fs=require('node:fs');
const E=require('../www/engine.js'),T=require('../www/transactions.js'),ethers=require('../www/assets/ethers.umd.min.js');
const recipe=E.recipe(ethers,'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
const request=JSON.parse(fs.readFileSync(0,'utf8'));
const account=E.accounts(ethers,recipe,0)[request.coin];
const destination=E.accounts(ethers,recipe,2)[request.coin].address;
if(request.action==='address')process.stdout.write(JSON.stringify({address:account.address,script:T.script(request.coin,account.address)}));
else{
  const prev=T.parse(request.raw),pos=prev.outputs.findIndex(o=>o.script===T.script(request.coin,account.address));
  if(pos<0)throw Error('Fixture funding output not found.');
  const p=T.plan({coin:request.coin,destination,amount:'1.01',feeIncluded:true,flatFee:true,changeAddress:account.address,tip:request.tip,utxos:[{...account,txid:prev.txid,pos,height:request.height,value:prev.outputs[pos].value,raw:request.raw}]});
  const signed=T.sign(p,recipe);
  process.stdout.write(JSON.stringify({...signed,fee:T.format(p.fee),change:T.format(p.change),destination}));
}
