// ReLGroup 稼働者管理 - サービスワーカー
// アイコン画像だけキャッシュし、HTML本体やmanifest.jsonはキャッシュしない。
// (アプリ名などを直しても反映されない、という事故が起きていたため、
//  内容が変わりうるファイルは一切キャッシュに残さない方針に変更した)

const CACHE_NAME = 'relgroup-crm-v3';
const APP_SHELL = [
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
  // 画像(アイコン)以外は絶対にキャッシュに保存しない
  // (HTMLやmanifest.jsonをキャッシュすると、アプリ名や内容を直しても反映されない事故になるため)
  const isImage = /\.(png|jpg|jpeg|svg|ico)$/i.test(url.pathname);
  if (!isImage) {
    event.respondWith(fetch(event.request));
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
