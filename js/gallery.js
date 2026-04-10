(function initGallery() {

    var CACHE_KEY = "vienna_gallery_v1";
    var CACHE_TTL = 15 * 60 * 1000; // 15 dakika

    var statusEl = document.getElementById("gallery-status");
    var gridEl   = document.getElementById("gallery-grid");

    if (!statusEl || !gridEl) return;

    // 1) Önce cache'den anında render et (flash yok)
    var cached = readCache();
    if (cached && cached.length > 0) {
        renderGallery(cached);
        statusEl.textContent = "";
    }

    // 2) Firebase'den arka planda gerçek veriyi çek
    if (!window.viennaFirebase || !window.viennaFirebase.ready) {
        if (!cached) statusEl.textContent = "Galeri için Firebase ayarları bekleniyor.";
        return;
    }

    var db = window.viennaFirebase.db;

    db.collection("galleryItems")
        .orderBy("createdAt", "desc")
        .limit(24)
        .onSnapshot(
            function onSnapshot(snapshot) {
                statusEl.textContent = "";
                if (snapshot.empty) {
                    if (!cached) {
                        statusEl.textContent = "Henüz galeriye görsel eklenmedi.";
                        gridEl.innerHTML = "";
                    }
                    return;
                }

                var items = [];
                snapshot.forEach(function (doc) {
                    items.push(doc.data());
                });

                // Cache'e yaz
                writeCache(items);

                // Eğer yeni veri cache'ten farklıysa ekranı güncelle
                if (!cached || JSON.stringify(cached) !== JSON.stringify(items)) {
                    renderGallery(items);
                }
            },
            function onError() {
                if (!cached) {
                    gridEl.innerHTML = "";
                    statusEl.textContent = "";
                }
            }
        );

    /* ============ RENDER ============ */

    function renderGallery(items) {
        var html = "";
        items.forEach(function (item) {
            var caption  = escapeHtml(item.caption  || "Vienna Event");
            var imageUrl = escapeAttr(item.imageUrl || "");
            html += '<article class="gallery-item">';
            html += '<img src="' + imageUrl + '" alt="' + caption + '" loading="lazy" />';
            html += '<div class="gallery-caption">' + caption + '</div>';
            html += '</article>';
        });

        var groupHtml   = '<div class="marquee-group">' + html + '</div>';
        var repeatCount = Math.max(8, Math.ceil(20 / items.length));
        var finalHtml   = "";
        for (var i = 0; i < repeatCount; i++) finalHtml += groupHtml;

        gridEl.innerHTML = finalHtml;
    }

    /* ============ CACHE ============ */

    function readCache() {
        try {
            var raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var obj = JSON.parse(raw);
            if (Date.now() - obj.ts > CACHE_TTL) {
                localStorage.removeItem(CACHE_KEY);
                return null;
            }
            return obj.data;
        } catch (e) { return null; }
    }

    function writeCache(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
        } catch (e) {}
    }

    /* ============ UTILS ============ */

    function escapeHtml(v) {
        return String(v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function escapeAttr(v) {
        return String(v).replace(/"/g, "&quot;");
    }

})();
