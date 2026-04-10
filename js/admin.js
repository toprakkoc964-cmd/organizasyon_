(function initAdminPanel() {
  var loginForm = document.getElementById("admin-login-form");
  var uploadForm = document.getElementById("admin-upload-form");
  var logoutBtn = document.getElementById("admin-logout");
  var loginBox = document.getElementById("admin-login-box");
  var appBox = document.getElementById("admin-app-box");
  var statusEl = document.getElementById("admin-status");
  var listEl = document.getElementById("admin-gallery-list");
  var uploadButton = document.getElementById("admin-upload-button");

  // Package Management Variables
  var tabGallery = document.getElementById("tab-gallery");
  var tabPackages = document.getElementById("tab-packages");
  var sectionGallery = document.getElementById("section-gallery");
  var sectionPackages = document.getElementById("section-packages");

  var pkgBtns = document.querySelectorAll(".package-btn");
  var pkgForm = document.getElementById("admin-package-form");
  var featureInput = document.getElementById("pkg-new-feature");
  var btnAddFeature = document.getElementById("btn-add-feature");
  var featureListEl = document.getElementById("pkg-features-list");
  
  var currentPkgId = "essence";
  var currentPkgFeatures = [];

  if (!loginForm || !uploadForm || !logoutBtn || !loginBox || !appBox || !statusEl) {
    return;
  }

  if (!window.viennaFirebase || !window.viennaFirebase.ready) {
    statusEl.textContent = "Firebase ayarlari eksik.";
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
    
    // Load default package for the package tab
    if (pkgForm) {
      loadPackageInfo(currentPkgId);
    }
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
    uploadButton.textContent = "Sikistiriliyor...";

    // 1. Read file as Data URL to process via Image API
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        // 2. Scale down if necessary (Max width: 1200)
        var MAX_WIDTH = 1200;
        var scale = 1;
        if (img.width > MAX_WIDTH) {
          scale = MAX_WIDTH / img.width;
        }

        var canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 3. Compress and convert to WebP Format Object (Blob) with ~0.80 quality
        canvas.toBlob(function(blob) {
          if (!blob) {
             statusEl.textContent = "Sikistirma hatasi.";
             uploadButton.disabled = false;
             uploadButton.textContent = "Gorseli Yayinla";
             return;
          }

          uploadButton.textContent = "Buluta Yukleniyor...";

          // Safely set the filename to .webp
          var safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "-").split(".")[0];
          if (!safeName) safeName = "foto";
          var storagePath = "gallery/" + Date.now() + "-" + safeName + ".webp";
          var imageRef = storage.ref(storagePath);

          // 4. Upload the lightweight WebP Blob to Firebase
          imageRef.put(blob)
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
              statusEl.textContent = "Gorsel basariyla .webp olarak sikistirildi ve eklendi.";
            })
            .catch(function(error) {
              statusEl.textContent = "Yukleme hatasi: " + error.message;
            })
            .finally(function() {
              uploadButton.disabled = false;
              uploadButton.textContent = "Gorseli Yayinla";
            });
        }, "image/webp", 0.80);
      };
      
      img.onerror = function() {
         statusEl.textContent = "Gorsel islenemedi.";
         uploadButton.disabled = false;
         uploadButton.textContent = "Gorseli Yayinla";
      };
      
      img.src = e.target.result;
    };
    
    reader.onerror = function() {
       statusEl.textContent = "Dosya okuma hatasi.";
       uploadButton.disabled = false;
       uploadButton.textContent = "Gorseli Yayinla";
    };
    
    reader.readAsDataURL(file);
  });

  if (listEl) {
      listEl.addEventListener("click", function handleDelete(event) {
        var button = event.target.closest("button[data-id]");
        if (!button) return;

        var id = button.getAttribute("data-id");
        var path = button.getAttribute("data-path");
        var oldText = button.textContent;

        if (!confirm("Bu gorseli silmek istediginize emin misiniz?")) {
          return;
        }

        button.disabled = true;
        button.textContent = "Siliniyor...";

        db.collection("galleryItems").doc(id).delete()
          .then(function() {
            if (path) {
              return storage.ref(path).delete().catch(function(err) {
                console.log("Dosya bulunamadi veya zaten silinmis: " + err.message);
              });
            }
          })
          .then(function() {
            statusEl.textContent = "Gorsel islem tamamlandi.";
          })
          .catch(function(error) {
            button.disabled = false;
            button.textContent = oldText;
            statusEl.textContent = "Silme hatasi: " + error.message;
          });
      });
  }

  function startListeningGallery() {
    if (!listEl) return;
    db.collection("galleryItems")
      .orderBy("createdAt", "desc")
      .onSnapshot(
        function(snapshot) {
          if (snapshot.empty) {
            listEl.innerHTML = "<p class=\"admin-muted\">Henuz gorsel yok.</p>";
            return;
          }

          var html = "";
          snapshot.forEach(function(doc) {
            var data = doc.data();
            var id = doc.id;
            var path = escapeAttr(data.storagePath || "");
            
            html += "<article class=\"admin-gallery-item\">";
            html += "<img src=\"" + escapeAttr(data.imageUrl || "") + "\" alt=\"Thumb\">";
            html += "<div class=\"admin-gallery-meta\">";
            html += "<h3>" + escapeHtml(data.caption || "Vienna Event") + "</h3>";
            html += "<p class=\"admin-muted\" style=\"font-size:0.8rem; margin-top:4px;\">Ekleyen: " + escapeHtml(data.createdBy || "?") + "</p>";
            html += "<button type=\"button\" class=\"btn-ghost\" style=\"color:#ff8f8f; margin-top:12px;\" data-id=\"" + escapeAttr(id) + "\" data-path=\"" + path + "\">Medyayi Sil</button>";
            html += "</div>";
            html += "</article>";
          });
          listEl.innerHTML = html;
        },
        function(error) {
          statusEl.textContent = "Liste okuma hatasi: " + error.message;
        }
      );
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  // ==========================================
  // PACKAGE MANAGEMENT LOGIC
  // ==========================================

  if (tabGallery && tabPackages) {
    tabGallery.addEventListener("click", function() {
      tabGallery.classList.add("btn-primary");
      tabGallery.classList.remove("btn-ghost");
      tabPackages.classList.add("btn-ghost");
      tabPackages.classList.remove("btn-primary");
      sectionGallery.hidden = false;
      sectionPackages.hidden = true;
      statusEl.textContent = "Galeri Yonetimi aktif";
    });

    tabPackages.addEventListener("click", function() {
      tabPackages.classList.add("btn-primary");
      tabPackages.classList.remove("btn-ghost");
      tabGallery.classList.add("btn-ghost");
      tabGallery.classList.remove("btn-primary");
      sectionGallery.hidden = true;
      sectionPackages.hidden = false;
      statusEl.textContent = "Paket Yonetimi aktif";
    });
  }

  if (pkgForm) {
    pkgBtns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        pkgBtns.forEach(function(b) {
          b.classList.remove("btn-primary");
          b.classList.add("btn-ghost");
        });
        btn.classList.add("btn-primary");
        btn.classList.remove("btn-ghost");
        currentPkgId = btn.getAttribute("data-pkg");
        loadPackageInfo(currentPkgId);
      });
    });

    function renderFeatures() {
      featureListEl.innerHTML = "";
      if (currentPkgFeatures.length === 0) {
        featureListEl.innerHTML = '<p class="admin-muted" style="margin:0; font-size: 0.9rem;">Henuz hicbir ozellik eklenmemis.</p>';
        return;
      }

      currentPkgFeatures.forEach(function(feat, index) {
        var row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.padding = "8px 12px";
        row.style.border = "1px solid var(--color-border)";
        row.style.borderRadius = "4px";

        var textSpan = document.createElement("span");
        textSpan.textContent = feat;

        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.textContent = "X";
        delBtn.className = "btn-ghost";
        delBtn.style.padding = "4px 12px";
        delBtn.style.color = "#ff8f8f";
        delBtn.style.marginLeft = "10px";
        
        delBtn.addEventListener("click", function() {
          currentPkgFeatures.splice(index, 1);
          renderFeatures();
        });

        row.appendChild(textSpan);
        row.appendChild(delBtn);
        featureListEl.appendChild(row);
      });
    }

    function loadPackageInfo(pkgId) {
      statusEl.textContent = pkgId.toUpperCase() + " paketi yukleniyor...";
      db.collection("packages").doc(pkgId).get().then(function(doc) {
        if (doc.exists) {
            var data = doc.data();
            document.getElementById("pkg-title").value = data.title || "";
            document.getElementById("pkg-subtitle").value = data.subtitle || "";
            document.getElementById("pkg-price-label").value = data.priceLabel || "";
            document.getElementById("pkg-price-value").value = data.priceValue || "";
            currentPkgFeatures = data.features || [];
        } else {
            document.getElementById("pkg-title").value = "";
            document.getElementById("pkg-subtitle").value = "";
            document.getElementById("pkg-price-label").value = "";
            document.getElementById("pkg-price-value").value = "";
            currentPkgFeatures = [];
        }
        renderFeatures();
        statusEl.textContent = "Duzenlenen Paket: " + pkgId.toUpperCase();
      }).catch(function(err) {
        statusEl.textContent = "Hata: " + err.message;
      });
    }

    btnAddFeature.addEventListener("click", function() {
      var val = featureInput.value.trim();
      if (val) {
        currentPkgFeatures.push(val);
        featureInput.value = "";
        renderFeatures();
      }
    });

    featureInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        e.preventDefault();
        btnAddFeature.click();
      }
    });

    pkgForm.addEventListener("submit", function(e) {
      e.preventDefault();
      var saveBtn = document.getElementById("btn-save-package");
      var oldText = saveBtn.textContent;
      saveBtn.textContent = "Kaydediliyor...";
      saveBtn.disabled = true;
      statusEl.textContent = "Kaydediliyor...";
      
      var data = {
        title: document.getElementById("pkg-title").value.trim(),
        subtitle: document.getElementById("pkg-subtitle").value.trim(),
        priceLabel: document.getElementById("pkg-price-label").value.trim(),
        priceValue: document.getElementById("pkg-price-value").value.trim(),
        features: currentPkgFeatures,
        updatedAt: serverTimestamp()
      };

      db.collection("packages").doc(currentPkgId).set(data, { merge: true })
        .then(function() {
           statusEl.textContent = currentPkgId.toUpperCase() + " paketi basariyla guncellendi!";
        })
        .catch(function(err) {
           statusEl.textContent = "Yetki Hatasi: Lutfen Firestore Kurallarinizi 'packages' klasorune izin verecek sekilde ayarlayin.";
           console.error(err);
        })
        .finally(function() {
           saveBtn.textContent = oldText;
           saveBtn.disabled = false;
        });
    });
  }

})();
