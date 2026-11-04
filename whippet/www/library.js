/* Wallet collection. Preserve the legacy active-wallet slot for compatibility.
   Archive before switching; never discard the current wallet on a failed save.
   Call mutations under the app's Web Lock to serialize browser-tab writers. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.WalletLibrary = factory(root.WalletEngine);
})(typeof globalThis === 'object' ? globalThis : this, function(E) {
  const ACTIVE = 'whippet.dev.encrypted.v1', COLLECTION = 'corevault.wallets.v1';
  const id = vault => vault.format === E.OPEN_FORMAT ? vault.id : vault.salt + vault.iv;
  function create(storage) {
    const active = () => { const raw = storage.getItem(ACTIVE); return raw ? E.validateEnvelope(JSON.parse(raw)) : null; };
    function list() {
      const raw = storage.getItem(COLLECTION);
      const data = raw ? JSON.parse(raw) : {version:1, wallets:[]};
      if (data.version !== 1 || !Array.isArray(data.wallets) || data.wallets.length > 25) throw new Error('Saved wallet list could not be read. It has not been overwritten.');
      const ids = new Set();
      for (const item of data.wallets) {
        E.validateEnvelope(item.vault);
        if (typeof item.name !== 'string' || item.name.length > 50 || item.id !== id(item.vault) || ids.has(item.id)) throw new Error('Invalid saved wallet entry.');
        ids.add(item.id);
      }
      const current = active();
      if (current && !ids.has(id(current))) data.wallets.push({id:id(current), name:'My wallet', vault:current});
      return data.wallets;
    }
    function write(wallets) {
      if (wallets.length > 25) throw new Error('This development build supports up to 25 saved wallets.');
      storage.setItem(COLLECTION, JSON.stringify({version:1, wallets}));
    }
    return {list, active,
      save(vault, name) {
        E.validateEnvelope(vault);
        const wallets = list();
        if (!wallets.some(w => w.id === id(vault))) wallets.push({id:id(vault), name:(String(name || '').trim() || `Wallet ${wallets.length + 1}`).slice(0,50), vault});
        write(wallets);
        try { storage.setItem(ACTIVE, JSON.stringify(vault)); }
        catch (_) { throw new Error('The new wallet was saved to the wallet list, but could not be opened. Your previous active wallet was kept.'); }
      },
      activate(target) {
        const wallets = list(), item = wallets.find(w => w.id === target);
        if (!item) throw new Error('Wallet is no longer in this browser.');
        write(wallets);
        storage.setItem(ACTIVE, JSON.stringify(item.vault));
        return item.vault;
      },
      rename(target, name) {
        const wallets = list(), item = wallets.find(w => w.id === target);
        if (!item || typeof name !== 'string' || !name.trim() || name.length > 50) throw new Error('Use a wallet name of 1–50 characters.');
        item.name = name.trim(); write(wallets);
      },
      removeActive() {
        const current = active();
        write(list().filter(w => !current || w.id !== id(current)));
        storage.removeItem(ACTIVE);
      },
      remove(target) {
        const wallets=list();
        if(!wallets.some(w=>w.id===target))throw new Error('Wallet is no longer saved on this device.');
        const current=active();
        write(wallets.filter(w=>w.id!==target));
        if(current&&id(current)===target)storage.removeItem(ACTIVE);
      }
    };
  }
  return {create, id, ACTIVE, COLLECTION};
});
