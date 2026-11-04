/* Public-address navigation driven by live history and saved usage metadata.
   Unknown history must never be treated as proof that an address is unused. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReceiveBook = api;
})(typeof globalThis === 'object' ? globalThis : this, function() {
  function create(pool, saved = {}) {
    if (!Array.isArray(pool) || !pool.length || pool.some((a,i) => a.index !== i || typeof a.address !== 'string')) throw new Error('Invalid address pool.');
    let index = Number.isInteger(saved.index) && saved.index >= 0 && saved.index < pool.length ? saved.index : 0;
    let pinned = saved.pinned === true, browsing = index !== 0, cursor = 0;
    const used = new Set((Array.isArray(saved.used)?saved.used:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<pool.length)), checked = new Set();
    while(used.has(cursor))cursor++;
    const allowed = () => [...new Set([...used,...(cursor<pool.length?[cursor]:[])])].sort((a,b)=>a-b);
    if(!allowed().includes(index)) {index=Math.min(cursor,pool.length-1);browsing=false;}
    const view = () => {
      const shown = pinned ? 0 : index;
      return {account: pool[shown], index: shown, pinned, browsing: !pinned && browsing,
        cursor, exhausted: cursor >= pool.length, automatic: !pinned && !browsing,
        status: used.has(shown) ? 'Used' : checked.has(shown) ? 'No history found' : 'History unavailable',
        canPrevious: !pinned && allowed().some(i=>i<shown), canNext: !pinned && allowed().some(i=>i>shown)};
    };
    function move(delta) {
      if (pinned) return view();
      const choices=allowed(),position=choices.indexOf(index);
      index=choices[Math.max(0,Math.min(choices.length-1,position+delta))]; browsing = true; return view();
    }
    function latest() { browsing = false; index = Math.min(cursor, pool.length - 1); return view(); }
    return {
      view, previous: () => move(-1), next: () => move(1), latest,
      pin(value) { pinned = value === true; if (!pinned) latest(); return view(); },
      preferences: () => ({index, pinned, used:[...used]}),
      remember(indices) {
        for(const i of indices)if(Number.isInteger(i)&&i>=0&&i<pool.length)used.add(i);
        while(used.has(cursor))cursor++;
        if(!pinned&&!browsing)index=Math.min(cursor,pool.length-1);
      },
      observe(address, history) {
        const i = pool.findIndex(a => a.address === address);
        if (i < 0 || !Array.isArray(history) || history.some(tx => !tx || !/^[0-9a-f]{64}$/i.test(tx.tx_hash) || !Number.isInteger(tx.height) || tx.height < -1)) throw new Error('Invalid address history.');
        checked.add(i);
        // Never recycle a used address, even if its funds are spent or reorged.
        if (history.length) used.add(i);
        while (used.has(cursor)) cursor++;
        if (!pinned && !browsing) index = Math.min(cursor, pool.length - 1);
        return view();
      }
    };
  }
  return {create};
});
