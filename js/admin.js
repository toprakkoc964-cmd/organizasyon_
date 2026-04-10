(function initAdminPanel() {
  var loginForm = document.getElementById("admin-login-form");
  var uploadForm = document.getElementById("admin-upload-form");
  var logoutBtn = document.getElementById("admin-logout");
  var loginBox = document.getElementById("admin-login-box");
  var appBox = document.getElementById("admin-app-box");
  var statusEl = document.getElementById("admin-status");
  var listEl = document.getElementById("admin-gallery-list");
  var uploadButton = document.getElementById("admin-upload-button");

  if (!loginForm || !uploadForm || !logoutBtn || !loginBox || !appBox || !statusEl || !listEl) {
    return;
  }

  if (!window.viennaFirebase || !window.viennaFirebase.ready) {
    statusEl.textContent = "Firebase ayarlari eksik. js/firebase-config.js dosyasini doldurun.";
    loginBox.hidden = true;
    appBox.hidden = true;
    return;
  }

  var auth = window.viennaFirebase.auth;
  var db = window.viennaFirebase.db;
  var storage = window.viennaFirebase.storage;
  var serverTimestamp = window.viennaFirebase.serverTimestamp;
  var unsubscribe = null;

  auth.onAuthStateChanged(function onAuthStateChanged(user) {
    if (!user) {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      loginBox.hidden = false;
      appBox.hidden = true;
      statusEl.textContent = "Yonetim paneli icin giris yapin.";
      return;
    }

    loginBox.hidden = true;
    appBox.hidden = false;
    statusEl.textContent = "Giris yapildi: " + user.email;
    startListeningGallery();
  });

  loginForm.addEventListener("submit", function handleLogin(event) {
    event.preventDefault();
    var email = document.getElementById("admin-email").value.trim();
    var password = document.getElementById("admin-password").value;

    auth.signInWithEmailAndPassword(email, password)
      .then(function() {
        loginForm.reset();
      })
      .catch(function(error) {
        statusEl.textContent = "Giris hatasi: " + error.message;
      });
  });

  logoutBtn.addEventListener("click", function handleLogout() {
    auth.signOut();
  });

  uploadForm.addEventListener("submit", function handleUpload(event) {
    event.preventDefault();

    var caption = document.getElementById("admin-caption").value.trim();
    var fileInput = document.getElementById("admin-file");
    var file = fileInput.files && fileInput.files[0];

    if (!file) {
      statusEl.textContent = "Lutfen bir gorsel secin.";
      return;
    }

    uploadButton.disabled = true;
    uploadButton.textContent = "Yukleniyor...";

    var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    var storagePath = "gallery/" + Date.now() + "-" + safeName;
    var imageRef = storage.ref(storagePath);

    imageRef.put(file)
      .then(function() {
        return imageRef.getDownloadURL();
      })
      .then(function(url) {
        return db.collection("galleryItems").add({
          caption: caption || "Vienna Event",
          imageUrl: url,
          storagePath: storagePath,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser ? auth.currentUser.email : ""
        });
      })
      .then(function() {
        uploadForm.reset();
        statusEl.textContent = "Gorsel basariyla eklendi.";
      })
      .catch(function(error) {
        statusEl.textContent = "Yukleme hatasi: " + error.message;
      })
      .finally(function() {
        uploadButton.disabled = false;
        uploadButton.textContent = "Gorseli Yayinla";
      });
  });

  listEl.addEventListener("click", function handleDelete(event) {
    var button = event.target.closest("button[data-id]");
    if (!button) {
      return;
    }

    var docId = button.getAttribute("data-id");
    var storagePath = button.getAttribute("data-storage");

    if (!window.confirm("Bu gorsel silinsin mi?")) {
      return;
    }

    statusEl.textContent = "Gorsel siliniyor...";

    var removeStorage = Promise.resolve();
    if (storagePath) {
      removeStorage = storage.ref(storagePath).delete();
    }

    removeStorage
      .catch(function() {
        return Promise.resolve();
      })
      .then(function() {
        return db.collection("galleryItems").doc(docId).delete();
      })
      .then(function() {
        statusEl.textContent = "Gorsel silindi.";
      })
      .catch(function(error) {
        statusEl.textContent = "Silme hatasi: " + error.message;
      });
  });

  function startListeningGallery() {
    if (unsubscribe) {
      unsubscribe();
    }

    unsubscribe = db.collection("galleryItems")
      .orderBy("createdAt", "desc")
      .limit(100)
      .onSnapshot(function(snapshot) {
        if (snapshot.empty) {
          listEl.innerHTML = "<p class=\"admin-muted\">Henuz gorsel yok.</p>";
          return;
        }

        var html = "";
        snapshot.forEach(function(doc) {
          var item = doc.data();
          html += "<article class=\"admin-gallery-item\">";
          html += "<img src=\"" + escapeAttr(item.imageUrl || "") + "\" alt=\"" + escapeHtml(item.caption || "Galeri gorseli") + "\" />";
          html += "<div class=\"admin-gallery-meta\">";
          html += "<h3>" + escapeHtml(item.caption || "Baslik yok") + "</h3>";
          html += "<button type=\"button\" class=\"btn-ghost\" data-id=\"" + doc.id + "\" data-storage=\"" + escapeAttr(item.storagePath || "") + "\">Sil</button>";
          html += "</div></article>";
        });

        listEl.innerHTML = html;
      }, function(error) {
        statusEl.textContent = "Listeleme hatasi: " + error.message;
      });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return String(value).replace(/\"/g, "&quot;");
  }
})();
