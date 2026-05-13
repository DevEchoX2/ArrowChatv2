(() => {
  const config = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: '',
  };

  const hasAllRequiredFields = Object.values(config).every((value) => typeof value === 'string' && value.trim().length > 0);
  if (!hasAllRequiredFields) return;

  window.ARROWCHAT_FIREBASE_CONFIG = config;
  try {
    localStorage.setItem('arrowchat_firebase_config', JSON.stringify(config));
  } catch {}
})();
