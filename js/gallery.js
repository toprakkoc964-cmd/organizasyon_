(function initGallery() {
  var statusEl = document.getElementById("gallery-status");
  var gridEl = document.getElementById("gallery-grid");

  if (!statusEl || !gridEl) {
    return;
  }

  if (!window.viennaFirebase || !window.viennaFirebase.ready) {
    statusEl.textContent = "Galeri icin Firebase ayarlari bekleniyor.";
    return;
  }

  var db = window.viennaFirebase.db;

  db.collection("galleryItems")
    .orderBy("createdAt", "desc")
    .limit(24)
    .onSnapshot(
      function onSnapshot(snapshot) {
        if (snapshot.empty) {
          statusEl.textContent = "Henuz galeriye gorsel eklenmedi.";
          gridEl.innerHTML = "";
          return;
        }

        statusEl.textContent = "";
        var html = "";

        snapshot.forEach(function eachDoc(doc) {
          var item = doc.data();
          var caption = escapeHtml(item.caption || "Vienna Event");
          var imageUrl = escapeAttr(item.imageUrl || "");

          html += "<article class=\"gallery-item\">";
          html += "<img src=\"" + imageUrl + "\" alt=\"" + caption + "\" loading=\"lazy\" />";
          html += "<div class=\"gallery-caption\">" + caption + "</div>";
          html += "</article>";
        });

        gridEl.innerHTML = html;
      },
      function onError() {
        statusEl.textContent = "Galeri yuklenirken bir hata olustu.";
      }
    );

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
