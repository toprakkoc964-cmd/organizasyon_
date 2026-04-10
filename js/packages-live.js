(function initLivePackages() {

    var CACHE_KEY = "vienna_packages_v1";
    var CACHE_TTL = 30 * 60 * 1000; // 30 dakika (ms)

    var allPackageData = {};
    var modalEl, modalTitleEl, modalBodyEl, modalContactBtn, modalCloseBtn;

    document.addEventListener("DOMContentLoaded", function () {

        // Modal elementleri bağla
        modalEl         = document.getElementById("pkg-modal");
        modalTitleEl    = document.getElementById("modal-pkg-title");
        modalBodyEl     = document.getElementById("modal-pkg-features");
        modalContactBtn = document.getElementById("modal-pkg-contact");
        modalCloseBtn   = document.getElementById("pkg-modal-close");

        if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
        if (modalEl) {
            modalEl.addEventListener("click", function (e) {
                if (e.target === modalEl) closeModal();
            });
        }
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeModal();
        });

        // 1) Önce cache'den anında render et (flash yok)
        var cached = readCache();
        if (cached) {
            allPackageData = cached;
            renderAll(cached);
        }

        // 2) Firebase'den arka planda gerçek veriyi çek
        if (!window.viennaFirebase || !window.viennaFirebase.ready) return;
        var db = window.viennaFirebase.db;
        var pkgIds = ["essence", "elegance", "royal"];
        var fetched = {};
        var done = 0;

        pkgIds.forEach(function (pkgId) {
            db.collection("packages").doc(pkgId).get().then(function (doc) {
                fetched[pkgId] = doc.exists ? doc.data() : null;
                done++;
                if (done === pkgIds.length) {
                    // Tüm veriler geldi: cache'e yaz ve fark varsa ekrana bas
                    writeCache(fetched);
                    allPackageData = fetched;
                    // Sadece cache yoksa (ilk yüklemede) veya veri değiştiyse render et
                    if (!cached || JSON.stringify(cached) !== JSON.stringify(fetched)) {
                        renderAll(fetched);
                    }
                }
            }).catch(function () {
                done++;
            });
        });
    });

    /* ============ RENDER ============ */

    function renderAll(data) {
        ["essence", "elegance", "royal"].forEach(function (pkgId) {
            var cardEl = document.getElementById("package-" + pkgId);
            if (!cardEl) return;
            if (data[pkgId]) {
                renderPackageCard(cardEl, pkgId, data[pkgId]);
            } else {
                cardEl.innerHTML = "<div style='text-align:center;padding:40px 0;color:#ff8f8f;'>Yönetim panelinden paket bilgisi giriniz.</div>";
            }
        });
    }

    function renderPackageCard(container, id, data) {
        var html = "";
        var title      = escapeHtml(data.title      || "Başlıksız Paket");
        var subtitle   = escapeHtml(data.subtitle   || "");
        var priceLabel = escapeHtml(data.priceLabel || "Başlangıç");
        var priceValue = escapeHtml(data.priceValue || "Fiyat Sorunuz");
        var features   = Array.isArray(data.features) ? data.features : [];

        if (id === "elegance") {
            html += '<div style="position:absolute;top:0;left:50%;transform:translate(-50%,-50%);background:var(--color-primary);color:var(--color-bg);padding:4px 16px;border-radius:999px;font-weight:bold;font-size:0.8rem;text-transform:uppercase;white-space:nowrap;z-index:2;">En Çok Tercih Edilen</div>';
        }

        html += '<h3 class="card-title">' + title + '</h3>';
        html += '<p>' + subtitle + '</p>';
        html += '<div class="price-tag">' + priceLabel + '<br><span>' + priceValue + '</span></div>';

        // İlk 3 madde önizleme
        var preview = features.slice(0, 3);
        html += '<ul class="feature-list">';
        preview.forEach(function (feat) {
            var r = parseFeature(feat);
            html += r.nested
                ? '<li data-nested="true">' + escapeHtml(r.text) + '</li>'
                : '<li>' + escapeHtml(r.text) + '</li>';
        });
        if (features.length > 3) {
            html += '<li style="color:var(--color-text-secondary);opacity:0.5;padding-top:4px;font-size:0.88rem;list-style:none;">+' + (features.length - 3) + ' madde daha...</li>';
        }
        html += '</ul>';

        html += '<button class="btn-ghost pkg-details-btn" data-pkgid="' + id + '" style="width:100%;justify-content:center;margin-bottom:12px;">Tüm Paket İçeriğini Gör</button>';

        container.innerHTML = html;

        var btn = container.querySelector(".pkg-details-btn");
        if (btn) btn.addEventListener("click", function () { openModal(id); });
    }

    /* ============ MODAL ============ */

    function openModal(pkgId) {
        var data = allPackageData[pkgId];
        if (!data || !modalEl) return;

        var features = Array.isArray(data.features) ? data.features : [];
        modalTitleEl.textContent = data.title || "Paket İçeriği";

        var listHtml = '<ul class="feature-list">';
        features.forEach(function (feat) {
            var r = parseFeature(feat);
            listHtml += r.nested
                ? '<li data-nested="true">' + escapeHtml(r.text) + '</li>'
                : '<li>' + escapeHtml(r.text) + '</li>';
        });
        listHtml += '</ul>';
        modalBodyEl.innerHTML = listHtml;

        if (modalContactBtn) modalContactBtn.href = "contact.html?paket=" + pkgId;

        modalEl.style.display = "flex";
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        if (!modalEl) return;
        modalEl.style.display = "none";
        document.body.style.overflow = "";
    }

    /* ============ CACHE (localStorage) ============ */

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
        } catch (e) {
            return null;
        }
    }

    function writeCache(data) {
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
        } catch (e) { /* localStorage dolu olabilir */ }
    }

    /* ============ UTILS ============ */

    function parseFeature(feat) {
        var m = String(feat).match(/^[\s\u00A0]*[-*]\s*(.*)$/);
        return m ? { nested: true, text: m[1] } : { nested: false, text: feat };
    }

    function escapeHtml(v) {
        return String(v)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

})();
