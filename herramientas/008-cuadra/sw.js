var C='lab008-v3',A=['./','index.html','estilo.css','logica.js','xlsx.js','app.js','manifest.webmanifest','ejemplos/cartola-ejemplo.xlsx'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(A)}));self.skipWaiting()});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C&&x.indexOf('lab008')===0}).map(function(x){return caches.delete(x)}))}))});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(function(r){var c=r.clone();caches.open(C).then(function(k){k.put(e.request,c)});return r}).catch(function(){return caches.match(e.request)}))});
