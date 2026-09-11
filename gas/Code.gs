// ころころにゃんこ コレクション帳 — 同期用バックエンド
// script.google.com に貼り付けて「ウェブアプリ」としてデプロイする

const KEY = "kk-a58f19c3b7d24e60"; // index.html 側の SYNC_KEY と一致させる
const PROP = "korokoro_state";

function _state() {
  const v = PropertiesService.getScriptProperties().getProperty(PROP);
  return v ? JSON.parse(v) : { owned: [], custom: [], showKH: false, updatedAt: 0 };
}
function _save(s) {
  s.updatedAt = Date.now();
  PropertiesService.getScriptProperties().setProperty(PROP, JSON.stringify(s));
}
function _json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.k !== KEY) return _json({ ok: false, error: "auth" });
  return _json({ ok: true, state: _state() });
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return _json({ ok: false, error: "parse" }); }
  if (b.k !== KEY) return _json({ ok: false, error: "auth" });
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const s = _state();
    const owned = new Set(s.owned);
    switch (b.op) {
      case "toggle":
        if (b.got) owned.add(b.id); else owned.delete(b.id);
        break;
      case "custom_add":
        if (b.item && b.item.id && !s.custom.some(c => c.id === b.item.id)) s.custom.push(b.item);
        break;
      case "custom_del":
        s.custom = s.custom.filter(c => c.id !== b.id);
        owned.delete(b.id);
        break;
      case "kh":
        s.showKH = !!b.v;
        break;
      case "merge": // バックアップ読み込み時
        (b.owned || []).forEach(id => owned.add(id));
        (b.custom || []).forEach(c => { if (c && c.id && !s.custom.some(x => x.id === c.id)) s.custom.push(c); });
        if (typeof b.showKH === "boolean") s.showKH = b.showKH;
        break;
      default:
        return _json({ ok: false, error: "op" });
    }
    s.owned = [...owned];
    _save(s);
    return _json({ ok: true, state: s });
  } finally {
    lock.releaseLock();
  }
}
