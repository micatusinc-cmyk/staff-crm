// ReLGroup 稼働者管理 - サービスワーカー
// アプリを「インストール」できるようにするためと、通信が一瞬途切れた時でも
// 直前に開けていたページの見た目を出せるようにするための、最低限のキャッシュ。
// スプレッドシートとの同期(fetch)にはキャッシュを使わせない(常に最新を取りに行く)。

const CACHE_NAME = 'relgroup-crm-v2';
const APP_SHELL = [
  './staff_crm.html',
  './staff_crm_limited.html',
  './manifest.json',
  './manifest-limited.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Google Apps Script との通信(スプレッドシート同期)は絶対にキャッシュしない
  if (url.hostname.includes('script.google.com')) {
    return; // ブラウザ本来のfetchに任せる
  }
  // 別ドメイン(フォント等)もキャッシュ対象外、素通しにする
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone)).catch(()=>{});
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
