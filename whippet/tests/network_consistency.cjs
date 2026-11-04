const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const accounts=Array.from({length:20},(_,index)=>({index,address:'fixture-'+index}));
const tx='a'.repeat(64),amount=100000000000,genesis='863714e1c1a15526a0081a35097c56e28dbd43ef97f76fec0ccd5a7510326292';
let mode='pending';
class Socket{static OPEN=1;constructor(){this.readyState=1;queueMicrotask(()=>this.onopen());}close(){this.readyState=3;}
 send(raw){const q=JSON.parse(raw),active=q.params[0]==='fixture-0';let result;
  if(q.method==='server.version')result=['fixture','1.4'];else if(q.method==='server.features')result={genesis_hash:genesis};
  else if(q.method==='blockchain.headers.subscribe')result={height:500};
  else if(q.method.endsWith('get_balance'))result=active?{confirmed:mode==='pending'?0:amount,unconfirmed:mode==='confirmed'?0:amount}:{confirmed:0,unconfirmed:0};
  else if(q.method.endsWith('get_history'))result=active?[{tx_hash:tx,height:mode==='pending'?0:500},...(mode==='duplicate-history'?[{tx_hash:tx,height:0}]:[])]:[];
  else if(q.method.endsWith('listunspent'))result=active?[{tx_hash:tx,tx_pos:1,value:amount,height:mode==='pending'?0:500},...(mode==='duplicate-output'?[{tx_hash:tx,tx_pos:1,value:amount,height:0}]:[])]:[];
  else result=.01;
  queueMicrotask(()=>this.onmessage({data:JSON.stringify({id:q.id,result})}));
 }}
const ctx={WebSocket:Socket,WalletTransactions:{scriptHash:(_,a)=>a},setTimeout,clearTimeout};vm.createContext(ctx);vm.runInContext(fs.readFileSync('whippet/www/network.js','utf8'),ctx);const N=ctx.WalletNetwork;
(async()=>{try{const s=await N.scan('wht',accounts);assert.equal(s.confirmed+s.unconfirmed,100000000000n);
 for(mode of ['duplicate-history','duplicate-output','mismatched-total'])await assert.rejects(()=>N.scan('wht',accounts,s),/Inconsistent|do not agree/);
 assert.equal(s.confirmed+s.unconfirmed,100000000000n);mode='confirmed';const next=await N.scan('wht',accounts,s);assert.equal(next.confirmed,100000000000n);assert.equal(next.unconfirmed,0n);
 console.log('PASS: pending/confirmed overlap, duplicate outputs and inconsistent totals rejected; prior snapshot preserved and settled 1000 WHT accepted.');
}finally{N.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
