/* Restricted legacy P2PKH development sender. Amounts use integer base units.
   No keys are exported and no networking occurs in this module. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./engine.js'),require('./assets/ethers.umd.min.js'));
  else root.WalletTransactions=factory(root.WalletEngine,root.ethers);
})(typeof globalThis==='object'?globalThis:this,function(E,ethers){
  const U=ethers.utils, COIN=100000000n, DUST=1000000n, MAX_FEE=10000000n, FLAT_MAX_INPUTS=6;
  const bytes=x=>U.arrayify(x), hex=x=>U.hexlify(x).slice(2), concat=parts=>U.concat(parts);
  const reverse=x=>Uint8Array.from(x).reverse();
  const hash256=x=>bytes(U.sha256(U.sha256(x)));
  function integer(value,max=0x7fffffffffffffffn){ const n=BigInt(value);if(n<0n||n>max)throw Error('Invalid transaction integer.');return n; }
  function le(value,size){let n=integer(value,(1n<<BigInt(size*8))-1n);const a=new Uint8Array(size);for(let i=0;i<size;i++){a[i]=Number(n&255n);n>>=8n;}return a;}
  function vi(n){if(n<253)return le(n,1);if(n<=65535)return concat([le(253,1),le(n,2)]);return concat([le(254,1),le(n,4)]);}
  function blob(h){const a=bytes('0x'+h);return concat([vi(a.length),a]);}
  function amount(text){if(typeof text!=='string'||!/^(0|[1-9]\d{0,9})(\.\d{1,8})?$/.test(text))throw Error('Enter a coin amount with at most 8 decimal places.');const [whole,fraction='']=text.split('.');return BigInt(whole)*COIN+BigInt(fraction.padEnd(8,'0'));}
  function format(n){n=BigInt(n);const sign=n<0n?'-':'';if(n<0n)n=-n;const fraction=String(n%COIN).padStart(8,'0').replace(/0+$/,'');return sign+String(n/COIN)+(fraction?'.'+fraction:'');}
  function script(coin,address){
    if(!E.NETWORKS[coin]||typeof address!=='string'||address.length<25||address.length>40)throw Error('Use a plain receiving address for the selected coin.');
    let a;try{a=U.base58.decode(address);}catch(_){throw Error('Invalid address.');}
    if(a.length!==25||a[0]!==E.NETWORKS[coin].prefix||hex(hash256(a.slice(0,21)).slice(0,4))!==hex(a.slice(21)))throw Error('Address checksum or coin network does not match.');
    return '76a914'+hex(a.slice(1,21))+'88ac';
  }
  const scriptHash=(coin,address)=>hex(reverse(bytes(U.sha256('0x'+script(coin,address)))));
  function serialize(tx,scripts){
    return concat([le(tx.version,4),vi(tx.inputs.length),...tx.inputs.flatMap((i,n)=>[reverse(bytes('0x'+i.txid)),le(i.pos,4),blob(scripts?scripts[n]:i.script||''),le(i.sequence??0xffffffff,4)]),vi(tx.outputs.length),...tx.outputs.flatMap(o=>[le(o.value,8),blob(o.script)]),le(tx.locktime||0,4)]);
  }
  function parse(raw){
    if(typeof raw!=='string'||!/^(?:[0-9a-f]{2})+$/i.test(raw)||raw.length>2000000)throw Error('Invalid raw transaction.');
    const a=bytes('0x'+raw);let p=0;
    function take(n){if(!Number.isInteger(n)||n<0||p+n>a.length)throw Error('Truncated transaction.');const b=a.slice(p,p+n);p+=n;return b;}
    function read(n){return take(n).reduceRight((v,b)=>(v<<8n)+BigInt(b),0n);}
    function count(){const tag=Number(read(1));const n=tag<253?BigInt(tag):read(tag===253?2:tag===254?4:8);if(n>100000n||(tag===253&&n<253n)||(tag===254&&n<=65535n)||(tag===255&&n<=0xffffffffn))throw Error('Invalid transaction count.');return Number(n);}
    const version=Number(read(4));let n=count(),witness=false;
    if(n===0){if(Number(read(1))!==1)throw Error('Unsupported witness flags.');witness=true;n=count();}
    if(!n||n>10000)throw Error('Unsupported transaction inputs.');
    const inputs=Array.from({length:n},()=>({txid:hex(reverse(take(32))),pos:Number(read(4)),script:hex(take(count())),sequence:Number(read(4))}));
    const outputs=Array.from({length:count()},()=>({value:read(8),script:hex(take(count()))}));
    if(!outputs.length)throw Error('No transaction outputs.');
    if(witness)for(const input of inputs){const items=count();for(let i=0;i<items;i++)take(count());}
    const locktime=Number(read(4));if(p!==a.length)throw Error('Trailing transaction bytes.');
    const tx={version,inputs,outputs,locktime};
    return {...tx,txid:hex(reverse(hash256(serialize(tx)))),coinbase:inputs.length===1&&inputs[0].txid==='0'.repeat(64)&&inputs[0].pos===0xffffffff};
  }
  function verifyUTXO(coin,u,tip){
    if(!u||!Number.isInteger(u.index)||u.index<0||u.index>=20||!Number.isInteger(u.pos)||u.pos<0||!Number.isInteger(u.height)||u.height<=0||u.height>tip)throw Error('Only confirmed wallet outputs can be spent.');
    const prev=parse(u.raw),out=prev.outputs[u.pos];
    if(prev.txid!==u.txid||!out||out.value!==integer(u.value)||out.script!==script(coin,u.address))throw Error('Previous transaction does not match the claimed wallet output.');
    if(prev.coinbase&&tip-u.height+1<240)throw Error('Mining reward is not mature yet (240 confirmations required).');
    return {...u,value:out.value,script:out.script};
  }
  function plan({coin,destination,amount:requested,utxos,changeAddress,feeRate='1000000',tip,feeIncluded=false,flatFee=false}){
    let value=amount(requested);const budget=value;if(value<DUST)throw Error('Enter enough to cover the fee and at least 0.01 for the recipient.');
    const destinationScript=script(coin,destination),changeScript=script(coin,changeAddress);
    let rate=integer(feeRate);if(rate<1000000n)rate=1000000n;if(rate>MAX_FEE)throw Error('Network fee exceeds this development wallet’s safety limit.');
    if(flatFee&&(!['pep','wht'].includes(coin)||rate>1000000n))throw Error('The 0.01-coin flat fee does not meet the current relay requirement.');
    if(!Number.isInteger(tip)||tip<0||!Array.isArray(utxos))throw Error('A fresh chain snapshot is required.');
    const seen=new Set();const candidates=utxos.map(u=>verifyUTXO(coin,u,tip)).sort((a,b)=>a.value===b.value?a.txid.localeCompare(b.txid):a.value>b.value?-1:1);
    let total=0n,fee=0n,change=0n;const inputs=[];
    for(const u of candidates){
      const key=u.txid+':'+u.pos;if(seen.has(key))throw Error('Duplicate transaction input.');seen.add(key);
      inputs.push(u);total+=u.value;
      const size=10+149*inputs.length+34*2;fee=BigInt(Math.ceil(size/1000))*rate;
      if(total>=(feeIncluded?budget:value+fee)){change=total-(feeIncluded?budget:value+fee);break;}
      if(inputs.length>=8)break;
    }
    if(!inputs.length||inputs.length>8||total<(feeIncluded?budget:value+fee))throw Error(`Available confirmed coins: ${format(total)}. The entered total exceeds what can be spent in this test transaction (up to 8 inputs).`);
    if(flatFee&&fee!==1000000n)throw Error('This transaction is too large for the 0.01-coin flat fee. Use fewer inputs or a smaller total.');
    if(feeIncluded){
      value=budget-fee;
      if(value<DUST)throw Error(`The total must cover the ${format(fee)} network fee plus at least 0.01 for the recipient.`);
      if(change>0n&&change<DUST)throw Error(`This would leave ${format(change)} as change, below the minimum. Use Max to include it in your total.`);
    }
    if(change<DUST){fee+=change;change=0n;}
    if(flatFee&&fee!==1000000n)throw Error('Small change would increase the flat fee. Use Max instead.');
    if(fee>MAX_FEE)throw Error('Fee exceeds the 0.1-coin development limit.');
    const outputs=[{value,script:destinationScript}];if(change)outputs.push({value:change,script:changeScript});
    return {coin,destination,changeAddress,amount:value,fee,change,inputs,outputs,tip,feeIncluded,flatFee,budget,version:1,locktime:0,createdAt:Date.now()};
  }
  function sign(p,recipe){
    const valid=E.validateRecipe(ethers,recipe),master=U.HDNode.fromMnemonic(valid.mnemonic,valid.passphrase);
    if(p.version!==1||p.locktime!==0||p.inputs.length<1||p.inputs.length>8||p.amount<DUST||p.fee<0n||p.fee>MAX_FEE)throw Error('Invalid send review.');
    if(p.feeIncluded&&p.amount+p.fee!==p.budget)throw Error('The reviewed total changed.');
    if(p.flatFee&&(!['pep','wht'].includes(p.coin)||p.fee!==1000000n))throw Error('The reviewed flat fee changed.');
    if(p.outputs.length!==(p.change?2:1)||p.outputs[0].value!==p.amount||p.outputs[0].script!==script(p.coin,p.destination)||p.change&&(p.outputs[1].value!==p.change||p.outputs[1].script!==script(p.coin,p.changeAddress)))throw Error('Send review outputs changed.');
    const ownedChange=E.accounts(ethers,valid,0)[p.coin].address;
    if(p.changeAddress!==ownedChange)throw Error('Change address does not belong to this wallet.');
    let total=0n;
    const scripts=p.inputs.map((input,index)=>{
      const u=verifyUTXO(p.coin,input,p.tip);total+=u.value;
      const node=master.derivePath(E.NETWORKS[p.coin].path.replace('{index}',String(u.index)));
      const ownScript='76a914'+U.ripemd160(U.sha256(node.publicKey)).slice(2)+'88ac';
      if(ownScript!==u.script)throw Error('Input is not owned by this seed.');
      const signingScripts=p.inputs.map((_,i)=>i===index?u.script:'');
      const digest=U.hexlify(hash256(concat([serialize(p,signingScripts),le(1,4)])));
      const sig=new U.SigningKey(node.privateKey).signDigest(digest);
      function derInt(h){let v=h.slice(2).replace(/^(00)+/,'')||'00';if(parseInt(v.slice(0,2),16)&128)v='00'+v;return '02'+hex(le(v.length/2,1))+v;}
      const body=derInt(sig.r)+derInt(sig.s),der='30'+hex(le(body.length/2,1))+body+'01';
      return hex(le(der.length/2,1))+der+'21'+node.publicKey.slice(2);
    });
    if(total!==p.amount+p.change+p.fee)throw Error('Transaction amounts do not balance.');
    const raw=hex(serialize(p,scripts)),decoded=parse(raw);
    if(raw.length/2>10000)throw Error('Test transaction is too large.');
    if(p.flatFee&&raw.length/2>1000)throw Error('Transaction exceeds the flat-fee size limit.');
    return {raw,txid:decoded.txid};
  }
  return {COIN,DUST,MAX_FEE,FLAT_MAX_INPUTS,amount,format,script,scriptHash,parse,serialize,verifyUTXO,plan,sign};
});
