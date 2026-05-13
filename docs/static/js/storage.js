/**
 * Browser-only transcript storage (IndexedDB) for GitHub Pages.
 */
(function () {
  var DB_NAME = "neuroassist-pages-v1";
  var STORE = "sessions";

  function openDb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onerror = function () {
        reject(req.error);
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
    });
  }

  function saveSession(payload) {
    return openDb().then(function (db) {
      var id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "s-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
      var rec = {
        id: id,
        title: payload.title,
        createdAt: new Date().toISOString(),
        languageSource: payload.languageSource,
        languageTarget: payload.languageTarget != null ? payload.languageTarget : null,
        mode: payload.mode,
        segments: payload.segments || []
      };
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.oncomplete = function () {
          resolve({ id: id });
        };
        tx.onerror = function () {
          reject(tx.error);
        };
        tx.objectStore(STORE).put(rec);
      });
    });
  }

  function listSessions(limit) {
    limit = limit || 50;
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var store = tx.objectStore(STORE);
        var req = store.getAll();
        req.onsuccess = function () {
          var rows = req.result || [];
          rows.sort(function (a, b) {
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
          resolve(rows.slice(0, limit));
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  function getSession(id) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).get(id);
        req.onsuccess = function () {
          resolve(req.result || null);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
    });
  }

  window.NAStorage = {
    saveSession: saveSession,
    listSessions: listSessions,
    getSession: getSession
  };
})();
