# Local test rehberi - Galeri + Admin

## 1) Firebase web config degerlerini gir
`js/firebase-config.js` dosyasini ac ve Firebase Project Settings > General > Your apps > SDK setup and configuration bolumundeki degerleri yapistir.

## 2) Authentication ac
Firebase Console > Authentication > Sign-in method:
- Email/Password: Enable

Sonra Authentication > Users > Add user ile bir admin kullanici olustur.

## 3) Firestore Database olustur
Firebase Console > Firestore Database > Create database.

## 4) Storage olustur
Firebase Console > Storage > Get started.

## 5) Guvenlik kurallari (test icin baslangic)
Firestore Rules:
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /galleryItems/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Storage Rules:
```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /gallery/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 6) Localde calistir
Proje klasorunde:
```powershell
python -m http.server 8080
```

## 7) Test adresleri
- Site: `http://localhost:8080/index.html`
- Admin: `http://localhost:8080/admin.html`

Admin panelde giris yapip gorsel ekledikten sonra ana sayfadaki galeri canli olarak dolar.

## 8) Iletisim formundan gercek e-posta almak
Bu projede iletisim formu Firestore'a iki kayit yazar:
- `contactMessages` (arsiv)
- `mail` (e-posta kuyrugu)

Gercek e-posta icin Firebase Extension kur:
- Firebase Console > Extensions > Explore > `Trigger Email from Firestore`
- Collection path: `mail`
- SMTP ayarlarini (Gmail/SendGrid vb.) doldur

Firestore Rules'a su kisimlari ekle ve Publish et:
```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /galleryItems/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /contactMessages/{docId} {
      allow create: if true;
      allow read, update, delete: if false;
    }

    match /mail/{docId} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

`js/firebase-config.js` icindeki `window.VIENNA_CONTACT_CONFIG.recipientEmail` adresine mail duser.
