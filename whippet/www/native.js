/* Narrow Android adapter. In a browser this does nothing. */
(() => {
  'use strict';
  if (location.origin !== 'https://appassets.androidplatform.net' || !window.SafeCoreNative) return;
  const pending = new Map();
  let cameraPermissionPending=false;
  window.addEventListener('safecore-camera-prompt',()=>{cameraPermissionPending=true;});
  window.addEventListener('safecore-camera-prompt-end',()=>{cameraPermissionPending=false;});
  let next = 0;
  SafeCoreNative.onmessage = event => {
    try {
      const reply = JSON.parse(event.data), task = pending.get(reply.id);
      if (!task) return;
      pending.delete(reply.id);
      reply.ok ? task.resolve() : task.reject(Error(reply.error || 'Android action failed.'));
    } catch (_) { /* Do not log payloads containing backup data. */ }
  };
  function request(action, value) {
    return new Promise((resolve, reject) => {
      const id = ++next;
      pending.set(id, {resolve, reject});
      SafeCoreNative.postMessage(JSON.stringify({id, action, value}));
    });
  }
  window.SafeCorePlatform = Object.freeze({
    get cameraPermissionPending(){return cameraPermissionPending;},
    copyAddress: address => request('copyAddress', address),
    exportBackup: data => request('exportBackup', data)
  });
})();
