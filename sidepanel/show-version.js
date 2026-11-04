(function showExtensionVersionLabel() {
  try {
    var v = chrome.runtime.getManifest().version;
    var el = document.getElementById('extension-version-label');
    if (el && v) {
      el.textContent = 'v' + v;
      el.hidden = false;
      el.removeAttribute('hidden');
      el.title = 'Extension version ' + v;
    }
  } catch (_) {}
})();
