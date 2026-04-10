(function initializeViennaFirebase() {
  var config = window.VIENNA_FIREBASE_CONFIG;
  var hasConfig = config && config.apiKey && config.projectId;

  if (!window.firebase) {
    console.error("Firebase SDK yuklenemedi.");
    window.viennaFirebase = { ready: false, reason: "sdk-missing" };
    return;
  }

  if (!hasConfig) {
    console.warn("Firebase ayarlari eksik. js/firebase-config.js dosyasini doldurun.");
    window.viennaFirebase = { ready: false, reason: "config-missing" };
    return;
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(config);
  }

  window.viennaFirebase = {
    ready: true,
    auth: firebase.auth(),
    db: firebase.firestore(),
    storage: firebase.storage(),
    serverTimestamp: firebase.firestore.FieldValue.serverTimestamp
  };
})();
