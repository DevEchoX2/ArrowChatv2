(() => {
  const config = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: '',
  };

  const isFilled = Object.values(config).every((value) => String(value || '').trim().length > 0);
  if (!isFilled) return;

  window.ARROWCHAT_FIREBASE_CONFIG = config;
  try {
    localStorage.setItem('arrowchat_firebase_config', JSON.stringify(config));
  } catch {}
})();
