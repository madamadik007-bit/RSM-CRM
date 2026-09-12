import * as XLSX from "xlsx";
import { APP_CSS, APP_HTML, APP_JS, ICON_SVG, MANIFEST, SERVICE_WORKER } from "./ui.js";

const INITIAL_PASSWORD_SALT = "Pi_mcJkHom4YbUMqWT_kng";
const INITIAL_PASSWORD_HASH = "-A4qpnRdNo2BIXBcYB9nZfd7ASTJ63SgF543XNVYwRQ";
const PASSWORD_RESET_SALT = "5Fk45f6xQ_VeMyjnThDJFA";
const PASSWORD_RESET_HASH = "gYi7eJ9MVMuMxpQbz_rLq4LzZrkaQEgLqh2e9y82u4s";
const PASSWORD_RESET_KEY = "password_reset_20260909_v3";
const PBKDF2_ITERATIONS = 5000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_ATTEMPT_LIMIT = 8;
const SESSION_COOKIE = "rsm_crm_session";
const encoder = new TextEncoder();
const schemaPromises = new WeakMap();

const ENTITIES = {
  customers: {
    required: ["name"],
    fields: ["name", "phone", "role", "source", "status", "district", "neighborhood", "budget_min", "budget_max", "rooms", "net_min", "net_max", "notes"],
    numbers: new Set(["budget_min", "budget_max", "net_min", "net_max"]),
    defaults: { role: "Alıcı", source: "", status: "Aktif" },
  },
  owners: {
    required: ["name"],
    fields: ["name", "phone", "district", "neighborhood", "notes"],
    numbers: new Set(),
    defaults: {},
  },
  properties: {
    required: ["title"],
    fields: ["title", "type", "status", "property_type", "city", "district", "neighborhood", "site", "price", "rooms", "gross_m2", "net_m2", "floor", "owner_name", "owner_phone", "listing_no", "listing_date", "source_url", "location_text", "notes"],
    numbers: new Set(["price", "gross_m2", "net_m2"]),
    defaults: { type: "Satılık", status: "Aktif", property_type: "Daire", city: "Konya" },
  },
  demands: {
    required: ["customer_id"],
    fields: ["customer_id", "type", "district", "neighborhood", "budget_min", "budget_max", "rooms", "property_type", "net_min", "net_max", "status", "notes"],
    numbers: new Set(["customer_id", "budget_min", "budget_max", "net_min", "net_max"]),
    defaults: { type: "Satılık", property_type: "Daire", status: "Aktif" },
  },
  tasks: {
    required: ["title"],
    fields: ["title", "due_date", "type", "customer_id", "property_id", "status", "notes"],
    numbers: new Set(["customer_id", "property_id"]),
    defaults: { status: "Açık" },
  },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4) normalized += "=";
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function randomToken(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function derivePassword(password, salt) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: base64UrlToBytes(salt),
    iterations: PBKDF2_ITERATIONS,
  }, key, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return diff === 0;
}

function parseCookies(request) {
  const result = {};
  const raw = request.headers.get("cookie") || "";
  for (const item of raw.split(";")) {
    const index = item.indexOf("=");
    if (index < 1) continue;
    result[item.slice(0, index).trim()] = decodeURIComponent(item.slice(index + 1).trim());
  }
  return result;
}

function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  const value = token ? encodeURIComponent(token) : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function securityHeaders(contentType, cacheControl = "no-store") {
  return {
    "content-type": contentType,
    "cache-control": cacheControl,
    "content-security-policy": "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; manifest-src 'self'; object-src 'none'; script-src 'self'; style-src 'self'",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
}

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...securityHeaders("application/json; charset=utf-8"), ...extraHeaders },
  });
}

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) throw new HttpError(415, "JSON içeriği gerekli.");
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Gönderilen veri okunamadı.");
  }
}

function validateOrigin(request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Geçersiz istek kaynağı.");
}

function cleanText(value, max = 4000) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\u0000/g, "").trim().slice(0, max);
}

function cleanNumber(value, field) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new HttpError(400, `${field} alanı sayı olmalıdır.`);
  if (number < 0) throw new HttpError(400, `${field} alanı negatif olamaz.`);
  if ((field === "id" || field === "customer_id" || field === "property_id") && !Number.isInteger(number)) {
    throw new HttpError(400, `${field} alanı geçersiz.`);
  }
  return number;
}

function sanitizeEntity(entity, input, allowOrphanDemand = false) {
  const config = ENTITIES[entity];
  if (!config) throw new HttpError(404, "Kayıt türü bulunamadı.");
  const data = {};
  for (const field of config.fields) {
    const fallback = Object.prototype.hasOwnProperty.call(config.defaults, field) ? config.defaults[field] : "";
    data[field] = config.numbers.has(field) ? cleanNumber(input[field], field) : cleanText(input[field] ?? fallback);
  }
  for (const field of config.required) {
    if (allowOrphanDemand && entity === "demands" && field === "customer_id") continue;
    if (data[field] === "" || data[field] === null) throw new HttpError(400, `${field} alanı zorunludur.`);
  }
  if (data.budget_min !== undefined && data.budget_max !== undefined && data.budget_min !== null && data.budget_max !== null && data.budget_min > data.budget_max) {
    throw new HttpError(400, "Minimum bütçe maksimum bütçeden büyük olamaz.");
  }
  if (data.net_min !== undefined && data.net_max !== undefined && data.net_min !== null && data.net_max !== null && data.net_min > data.net_max) {
    throw new HttpError(400, "Minimum net m² maksimum net m²’den büyük olamaz.");
  }
  return data;
}


function emsalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  let text = String(value).trim().replace(/\s+/g, "").replace(/TL/gi, "").replace(/₺/g, "");
  if (!text) return null;
  if (text.includes(",") && text.includes(".")) text = text.replace(/\./g, "").replace(",", ".");
  else if (text.includes(",")) text = text.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  text = text.replace(/[^\d.-]/g, "");
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function emsalStatus(value) {
  const text = cleanText(value, 200).toLocaleLowerCase("tr-TR");
  return (text.includes("aktif") || text.includes("düştü")) ? "Aktif" : "Pasif";
}

function emsalPropertyType(title) {
  const text = cleanText(title, 500).toLocaleLowerCase("tr-TR");
  if (text.includes("villa")) return "Villa";
  if (text.includes("arsa")) return "Arsa";
  if (text.includes("dükkan") || text.includes("dukkan")) return "Dükkan";
  if (text.includes("ofis")) return "Ofis";
  if (text.includes("bina")) return "Bina";
  if (text.includes("tarla")) return "Tarla";
  return "Daire";
}

function emsalToProperty(row) {
  const location = [row.mevki, row.konum_notu].map((v) => cleanText(v, 1000)).filter(Boolean).join(" · ");
  const notes = [
    row.portfoy_yetkisi ? "Portföy yetkisi: " + row.portfoy_yetkisi : "",
    row.malik_notu ? "Malik notu: " + row.malik_notu : "",
    row.analiz_notu ? "Analiz notu: " + row.analiz_notu : "",
    row.aciklama ? row.aciklama : "",
  ].map((v) => cleanText(v, 1600)).filter(Boolean).join("\n");
  const typeText = cleanText(row.islem_turu, 100).toLocaleLowerCase("tr-TR");
  return {
    title: cleanText(row.baslik, 500) || (row.ilan_no ? "İlan " + row.ilan_no : "Emsal ilan"),
    type: typeText.includes("kira") ? "Kiralık" : "Satılık",
    status: emsalStatus(row.ilan_durumu),
    property_type: emsalPropertyType(row.baslik),
    city: cleanText(row.il, 100) || "Konya",
    district: cleanText(row.ilce, 150),
    neighborhood: cleanText(row.mahalle, 150),
    site: cleanText(row.site_adi, 300),
    price: emsalNumber(row.fiyat),
    rooms: cleanText(row.oda, 100),
    gross_m2: emsalNumber(row.brut),
    net_m2: emsalNumber(row.net),
    floor: cleanText(row.kat, 100),
    owner_name: cleanText(row.malik_adi, 300),
    owner_phone: cleanText(row.malik_telefon, 100),
    listing_no: cleanText(row.ilan_no, 100),
    listing_date: /^\d{4}-\d{2}-\d{2}/.test(String(row.ilan_tarihi_iso || "")) ? String(row.ilan_tarihi_iso).slice(0, 10) : "",
    source_url: "",
    location_text: cleanText(location, 2000),
    notes: cleanText(notes, 4000),
  };
}

async function listEmsal(DB, url) {
  const q = cleanText(url.searchParams.get("q"), 200);
  const status = cleanText(url.searchParams.get("status"), 100);
  const requested = Number(url.searchParams.get("limit") || 250);
  const limit = Math.max(1, Math.min(250, Number.isFinite(requested) ? Math.floor(requested) : 250));
  const where = [];
  const binds = [];
  if (q) {
    const like = "%" + q + "%";
    where.push("(ilan_no LIKE ? OR baslik LIKE ? OR ilce LIKE ? OR mahalle LIKE ? OR site_adi LIKE ? OR mevki LIKE ? OR oda LIKE ? OR malik_adi LIKE ? OR malik_telefon LIKE ?)");
    for (let i = 0; i < 9; i += 1) binds.push(like);
  }
  if (status) { where.push("ilan_durumu=?"); binds.push(status); }
  const clause = where.length ? " WHERE " + where.join(" AND ") : "";
  const rows = (await DB.prepare("SELECT * FROM emsal_listings" + clause + " ORDER BY id DESC LIMIT ?").bind(...binds, limit).all()).results || [];
  const totalResult = await DB.prepare("SELECT COUNT(*) AS count FROM emsal_listings" + clause).bind(...binds).all();
  const listingNos = rows.map((row) => cleanText(row.ilan_no, 100)).filter(Boolean);
  const crmMap = new Map();
  if (listingNos.length) {
    const placeholders = listingNos.map(() => "?").join(",");
    const matches = (await DB.prepare("SELECT id,listing_no FROM properties WHERE listing_no IN (" + placeholders + ")").bind(...listingNos).all()).results || [];
    for (const match of matches) crmMap.set(String(match.listing_no), Number(match.id));
  }
  return {
    bagli: true,
    toplam: Number(totalResult.results?.[0]?.count || 0),
    ilanlar: rows.map((row) => {
      let data = {};
      try { data = JSON.parse(row.raw_json || "{}"); } catch {}
      return { ...data, ...row, price: emsalNumber(row.fiyat), gross_m2: emsalNumber(row.brut), net_m2: emsalNumber(row.net), crm_property_id: row.ilan_no ? (crmMap.get(String(row.ilan_no)) || null) : null };
    }),
  };
}

async function importEmsal(DB, id) {
  const row = await DB.prepare("SELECT * FROM emsal_listings WHERE id=?").bind(id).first();
  if (!row) throw new HttpError(404, "Emsal ilanı bulunamadı.");
  const mapped = sanitizeEntity("properties", emsalToProperty(row));
  let existing = null;
  if (mapped.listing_no) existing = await DB.prepare("SELECT * FROM properties WHERE listing_no=? ORDER BY id LIMIT 1").bind(mapped.listing_no).first();
  if (!existing) existing = await DB.prepare("SELECT * FROM properties WHERE title=? AND district=? AND neighborhood=? AND COALESCE(price,0)=COALESCE(?,0) ORDER BY id LIMIT 1").bind(mapped.title, mapped.district, mapped.neighborhood, mapped.price).first();
  if (!existing) {
    await insertEntity(DB, "properties", mapped);
    const created = mapped.listing_no ? await DB.prepare("SELECT id FROM properties WHERE listing_no=? ORDER BY id DESC LIMIT 1").bind(mapped.listing_no).first() : await DB.prepare("SELECT id FROM properties ORDER BY id DESC LIMIT 1").first();
    return { ok: true, created: true, property_id: Number(created?.id || 0) };
  }
  const merged = {};
  for (const field of ENTITIES.properties.fields) merged[field] = existing[field] || mapped[field] || "";
  if (mapped.price !== null) merged.price = mapped.price;
  if (mapped.listing_date) merged.listing_date = mapped.listing_date;
  if (!["Satıldı", "Kiralandı"].includes(existing.status)) merged.status = mapped.status || existing.status;
  await updateEntity(DB, "properties", existing.id, merged);
  return { ok: true, created: false, property_id: Number(existing.id) };
}

async function ensureColumn(DB, table, column, definition) {
  const info = await DB.prepare(`PRAGMA table_info(${table})`).all();
  if ((info.results || []).some((row) => row.name === column)) return;
  await DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  if (column === "updated_at") await DB.prepare(`UPDATE ${table} SET updated_at=created_at WHERE updated_at IS NULL`).run();
}

async function buildSchema(DB) {
  const queries = [
    "CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT,role TEXT,source TEXT DEFAULT '',status TEXT DEFAULT 'Aktif',district TEXT,neighborhood TEXT,budget_min INTEGER,budget_max INTEGER,rooms TEXT,net_min REAL,net_max REAL,notes TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS owners(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,phone TEXT,district TEXT,neighborhood TEXT,notes TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS properties(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,type TEXT,status TEXT,property_type TEXT,city TEXT,district TEXT,neighborhood TEXT,site TEXT,price INTEGER,rooms TEXT,gross_m2 REAL,net_m2 REAL,floor TEXT,owner_name TEXT,owner_phone TEXT,listing_no TEXT,listing_date TEXT,source_url TEXT,location_text TEXT,notes TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS demands(id INTEGER PRIMARY KEY AUTOINCREMENT,customer_id INTEGER,type TEXT,district TEXT,neighborhood TEXT,budget_min INTEGER,budget_max INTEGER,rooms TEXT,property_type TEXT,net_min REAL,net_max REAL,status TEXT,notes TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,due_date TEXT,type TEXT,customer_id INTEGER,property_id INTEGER,status TEXT DEFAULT 'Açık',notes TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS emsal_listings(id INTEGER PRIMARY KEY,ilan_no TEXT,baslik TEXT,ilan_tarihi TEXT,fiyat TEXT,il TEXT,ilce TEXT,mahalle TEXT,mevki TEXT,site_adi TEXT,brut TEXT,net TEXT,oda TEXT,bina_yasi TEXT,kat TEXT,kat_sayisi TEXT,esyali TEXT,kimden TEXT,malik_adi TEXT,malik_telefon TEXT,portfoy_yetkisi TEXT,malik_notu TEXT,konum_notu TEXT,aciklama TEXT,kaynak_metni TEXT,created_at TEXT,updated_at TEXT,analiz_notu TEXT,ilan_durumu TEXT,emlak_ofisi TEXT,islem_turu TEXT,ilan_tarihi_iso TEXT,sahibinden_mi INTEGER,malik_adi_elle TEXT,malik_telefon_elle TEXT,ilan_bitis_tarihi TEXT,raw_json TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS emsal_price_history(id INTEGER PRIMARY KEY,ilan_id INTEGER,eski_fiyat TEXT,yeni_fiyat TEXT,degisim_tarihi TEXT)",
    "CREATE INDEX IF NOT EXISTS idx_emsal_listing_no ON emsal_listings(ilan_no)",
    "CREATE INDEX IF NOT EXISTS idx_emsal_region ON emsal_listings(ilce,mahalle,site_adi)",
    "CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,token_hash TEXT UNIQUE NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL)",
    "CREATE TABLE IF NOT EXISTS login_attempts(id INTEGER PRIMARY KEY AUTOINCREMENT,ip_hash TEXT NOT NULL,attempted_at INTEGER NOT NULL)",
    "CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)",
    "CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_hash,attempted_at)",
    "CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(status,due_date)",
    "CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status,district,neighborhood)",
    "CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status,district,neighborhood)",
  ];
  for (const query of queries) await DB.prepare(query).run();

  const additions = [
    ["customers", "source", "TEXT DEFAULT ''"],
    ["customers", "status", "TEXT DEFAULT 'Aktif'"],
    ["customers", "updated_at", "TEXT"],
    ["owners", "updated_at", "TEXT"],
    ["properties", "listing_no", "TEXT"],
    ["properties", "listing_date", "TEXT"],
    ["properties", "source_url", "TEXT"],
    ["properties", "location_text", "TEXT"],
    ["properties", "updated_at", "TEXT"],
    ["demands", "updated_at", "TEXT"],
    ["tasks", "updated_at", "TEXT"],
  ];
  for (const [table, column, definition] of additions) await ensureColumn(DB, table, column, definition);

  await DB.prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES('password_salt',?)").bind(INITIAL_PASSWORD_SALT).run();
  await DB.prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES('password_hash',?)").bind(INITIAL_PASSWORD_HASH).run();
  await DB.prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES('bootstrap_used','0')").run();

  const passwordReset = await DB.prepare("SELECT value FROM app_settings WHERE key=?").bind(PASSWORD_RESET_KEY).all();
  if (!passwordReset.results?.length) {
    await DB.batch([
      DB.prepare("UPDATE app_settings SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key='password_salt'").bind(PASSWORD_RESET_SALT),
      DB.prepare("UPDATE app_settings SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key='password_hash'").bind(PASSWORD_RESET_HASH),
      DB.prepare("UPDATE app_settings SET value='1',updated_at=CURRENT_TIMESTAMP WHERE key='bootstrap_used'"),
      DB.prepare("DELETE FROM sessions"),
      DB.prepare("DELETE FROM login_attempts"),
      DB.prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES(?,'1')").bind(PASSWORD_RESET_KEY),
    ]);
  }
}

function ensureSchema(DB) {
  if (!schemaPromises.has(DB)) {
    const promise = buildSchema(DB).catch((error) => {
      schemaPromises.delete(DB);
      throw error;
    });
    schemaPromises.set(DB, promise);
  }
  return schemaPromises.get(DB);
}

async function settings(DB) {
  const result = await DB.prepare("SELECT key,value FROM app_settings WHERE key IN ('password_salt','password_hash','bootstrap_used')").all();
  return Object.fromEntries((result.results || []).map((row) => [row.key, row.value]));
}

async function isAuthenticated(request, DB) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return false;
  const tokenHash = await sha256(token);
  const result = await DB.prepare("SELECT id FROM sessions WHERE token_hash=? AND expires_at>?").bind(tokenHash, nowSeconds()).all();
  return Boolean(result.results && result.results.length);
}

async function requireAuth(request, DB) {
  if (!(await isAuthenticated(request, DB))) throw new HttpError(401, "Oturum süresi doldu. Lütfen yeniden giriş yapın.");
}

async function verifyPassword(DB, password) {
  const current = await settings(DB);
  if (!current.password_salt || !current.password_hash) return false;
  const value = String(password || "");
  const calculated = await derivePassword(value, current.password_salt);
  if (safeEqual(calculated, current.password_hash)) {
    if (current.bootstrap_used !== "1") {
      await DB.prepare("UPDATE app_settings SET value='1',updated_at=CURRENT_TIMESTAMP WHERE key='bootstrap_used'").run();
    }
    return true;
  }

  return false;
}

async function createSession(DB) {
  const token = randomToken();
  const createdAt = nowSeconds();
  await DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(createdAt).run();
  await DB.prepare("INSERT INTO sessions(id,token_hash,created_at,expires_at) VALUES(?,?,?,?)")
    .bind(crypto.randomUUID(), await sha256(token), createdAt, createdAt + SESSION_TTL_SECONDS).run();
  return token;
}

async function loginKey(request) {
  const address = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  return sha256(address.split(",")[0].trim());
}

async function loginAllowed(DB, ipHash) {
  const cutoff = nowSeconds() - LOGIN_WINDOW_SECONDS;
  await DB.prepare("DELETE FROM login_attempts WHERE attempted_at<?").bind(cutoff).run();
  const result = await DB.prepare("SELECT COUNT(*) AS count FROM login_attempts WHERE ip_hash=? AND attempted_at>=?").bind(ipHash, cutoff).all();
  return Number(result.results?.[0]?.count || 0) < LOGIN_ATTEMPT_LIMIT;
}

async function listAll(DB) {
  const [customers, owners, properties, demands, tasks] = await Promise.all([
    DB.prepare("SELECT * FROM customers ORDER BY COALESCE(updated_at,created_at) DESC,id DESC").all(),
    DB.prepare("SELECT * FROM owners ORDER BY COALESCE(updated_at,created_at) DESC,id DESC").all(),
    DB.prepare("SELECT * FROM properties ORDER BY COALESCE(updated_at,created_at) DESC,id DESC").all(),
    DB.prepare("SELECT d.*,c.name customer_name,c.phone customer_phone FROM demands d LEFT JOIN customers c ON c.id=d.customer_id ORDER BY COALESCE(d.updated_at,d.created_at) DESC,d.id DESC").all(),
    DB.prepare("SELECT t.*,c.name customer_name,p.title property_title FROM tasks t LEFT JOIN customers c ON c.id=t.customer_id LEFT JOIN properties p ON p.id=t.property_id ORDER BY CASE WHEN t.status='Tamamlandı' THEN 1 ELSE 0 END,COALESCE(t.due_date,'9999-12-31'),t.id DESC").all(),
  ]);
  return {
    customers: customers.results || [],
    owners: owners.results || [],
    properties: properties.results || [],
    demands: demands.results || [],
    tasks: tasks.results || [],
  };
}

async function insertEntity(DB, entity, input) {
  const config = ENTITIES[entity];
  const data = sanitizeEntity(entity, input);
  const placeholders = config.fields.map(() => "?").join(",");
  await DB.prepare(`INSERT INTO ${entity}(${config.fields.join(",")}) VALUES(${placeholders})`)
    .bind(...config.fields.map((field) => data[field])).run();
}

async function updateEntity(DB, entity, id, input) {
  const config = ENTITIES[entity];
  const data = sanitizeEntity(entity, input);
  const assignments = config.fields.map((field) => `${field}=?`).join(",");
  await DB.prepare(`UPDATE ${entity} SET ${assignments},updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(...config.fields.map((field) => data[field]), id).run();
}

async function deleteEntity(DB, entity, id) {
  if (entity === "customers") {
    await DB.prepare("UPDATE demands SET customer_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE customer_id=?").bind(id).run();
    await DB.prepare("UPDATE tasks SET customer_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE customer_id=?").bind(id).run();
  }
  if (entity === "properties") await DB.prepare("UPDATE tasks SET property_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE property_id=?").bind(id).run();
  await DB.prepare(`DELETE FROM ${entity} WHERE id=?`).bind(id).run();
}

async function restoreBackup(DB, body) {
  if (body.confirm !== "RSM CRM") throw new HttpError(400, "Geri yükleme onayı geçersiz.");
  const data = body.data;
  if (!data || typeof data !== "object") throw new HttpError(400, "Yedek dosyası geçersiz.");
  const emsalOnly = data.emsal_only === true;
  let emsalImported = 0;
  if (Array.isArray(data.emsal)) {
    const fields = ["id","ilan_no","baslik","ilan_tarihi","fiyat","il","ilce","mahalle","mevki","site_adi","brut","net","oda","bina_yasi","kat","kat_sayisi","esyali","kimden","malik_adi","malik_telefon","portfoy_yetkisi","malik_notu","konum_notu","aciklama","kaynak_metni","created_at","updated_at","analiz_notu","ilan_durumu","emlak_ofisi","islem_turu","ilan_tarihi_iso","sahibinden_mi","malik_adi_elle","malik_telefon_elle","ilan_bitis_tarihi","raw_json"];
    for (let i=0;i<data.emsal.length;i+=40) {
      const chunk=data.emsal.slice(i,i+40);
      await DB.batch(chunk.map((row)=>DB.prepare(`INSERT OR REPLACE INTO emsal_listings(${fields.join(",")}) VALUES(${fields.map(()=>"?").join(",")})`).bind(...fields.map((f)=>f==="raw_json"?JSON.stringify(row):row[f] ?? ""))));
      emsalImported += chunk.length;
    }
    if (Array.isArray(data.emsal_price_history)) {
      for (let i=0;i<data.emsal_price_history.length;i+=80) {
        const chunk=data.emsal_price_history.slice(i,i+80);
        await DB.batch(chunk.map((row)=>DB.prepare("INSERT OR REPLACE INTO emsal_price_history(id,ilan_id,eski_fiyat,yeni_fiyat,degisim_tarihi) VALUES(?,?,?,?,?)").bind(row.id ?? null,row.ilan_id ?? null,row.eski_fiyat ?? "",row.yeni_fiyat ?? "",row.degisim_tarihi ?? "")));
      }
    }
  }
  if (emsalOnly) return { ok: true, crmRestored: false, emsalImported };
  const total = Object.keys(ENTITIES).reduce((sum, entity) => {
    if (!Array.isArray(data[entity])) throw new HttpError(400, `${entity} listesi eksik.`);
    return sum + data[entity].length;
  }, 0);
  if (total > 5000) throw new HttpError(400, "Yedek dosyası tek işlem için çok büyük.");
  const statements = [DB.prepare("DELETE FROM tasks"),DB.prepare("DELETE FROM demands"),DB.prepare("DELETE FROM properties"),DB.prepare("DELETE FROM owners"),DB.prepare("DELETE FROM customers")];
  for (const entity of ["customers","owners","properties","demands","tasks"]) {
    const config = ENTITIES[entity];
    for (const record of data[entity]) {
      const clean = sanitizeEntity(entity, record, true);
      const fields = ["id", ...config.fields, "created_at", "updated_at"];
      const placeholders = fields.map(() => "?").join(",");
      statements.push(DB.prepare(`INSERT INTO ${entity}(${fields.join(",")}) VALUES(${placeholders})`).bind(cleanNumber(record.id,"id"),...config.fields.map((field)=>clean[field]),cleanText(record.created_at)||new Date().toISOString(),cleanText(record.updated_at)||cleanText(record.created_at)||new Date().toISOString()));
    }
  }
  await DB.batch(statements);
  return { ok: true, crmRestored: true, emsalImported };
}

async function handleAuth(request, DB, path) {
  if (path === "/api/auth/status" && request.method === "GET") return json({ authenticated: await isAuthenticated(request, DB) });

  if (path === "/api/auth/login" && request.method === "POST") {
    validateOrigin(request);
    const ipHash = await loginKey(request);
    const body = await readBody(request);
    if (!(await verifyPassword(DB, body.password))) {
      if (!(await loginAllowed(DB, ipHash))) throw new HttpError(429, "Çok fazla hatalı deneme yapıldı. 15 dakika sonra yeniden deneyin.");
      await DB.prepare("INSERT INTO login_attempts(ip_hash,attempted_at) VALUES(?,?)").bind(ipHash, nowSeconds()).run();
      throw new HttpError(401, "Parola hatalı (sürüm 09.09-C).");
    }
    await DB.prepare("DELETE FROM login_attempts WHERE ip_hash=?").bind(ipHash).run();
    const token = await createSession(DB);
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(token) });
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    validateOrigin(request);
    const token = parseCookies(request)[SESSION_COOKIE];
    if (token) await DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
    return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0) });
  }

  if (path === "/api/auth/change-password" && request.method === "POST") {
    validateOrigin(request);
    await requireAuth(request, DB);
    const body = await readBody(request);
    const nextPassword = String(body.new_password || "");
    if (!(await verifyPassword(DB, body.current_password))) throw new HttpError(401, "Mevcut parola hatalı.");
    if (nextPassword.length < 10) throw new HttpError(400, "Yeni parola en az 10 karakter olmalıdır.");
    const salt = randomToken(16);
    const hash = await derivePassword(nextPassword, salt);
    await DB.batch([
      DB.prepare("UPDATE app_settings SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key='password_salt'").bind(salt),
      DB.prepare("UPDATE app_settings SET value=?,updated_at=CURRENT_TIMESTAMP WHERE key='password_hash'").bind(hash),
      DB.prepare("UPDATE app_settings SET value='1',updated_at=CURRENT_TIMESTAMP WHERE key='bootstrap_used'"),
      DB.prepare("DELETE FROM sessions"),
    ]);
    const token = await createSession(DB);
    return json({ ok: true }, 200, { "set-cookie": sessionCookie(token) });
  }

  return null;
}


function emsalFileRows(text){
  const raw=String(text||"").replace(/\r/g,"");
  const lines=raw.split("\n").map(x=>x.trim()).filter(Boolean);
  const out=[];
  for(const line of lines){
    const clean=line.replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/\s+/g," ").trim();
    if(!clean) continue;
    const price=(clean.match(/([0-9]{1,3}(?:[.][0-9]{3})+|[0-9]{6,})\s*(?:TL|₺)/i)||[])[1]||"";
    const ilan=(clean.match(/(?:ilan no|ilan\s*#|listing)\s*[:#]?\s*([0-9]{7,})/i)||[])[1]||"";
    const m2=(clean.match(/([0-9]{2,4})\s*m²/i)||[])[1]||"";
    if(price||ilan||m2) out.push({baslik:clean.slice(0,500),ilan_no:ilan,fiyat:price,net:m2,kaynak_metni:clean,ilan_durumu:"Aktif ilan",il:"Konya"});
  }
  return out;
}

async function importEmsalFile(DB,request){
  const form=await request.formData(); const file=form.get("file"); const kind=cleanText(form.get("kind"),20);
  if(!(file instanceof File)) throw new HttpError(400,"Dosya bulunamadı.");
  let rows=[];
  if(kind==="json"){
    const body=JSON.parse(await file.text());
    const data=body.data||body; rows=Array.isArray(data.emsal)?data.emsal:Array.isArray(data.ilanlar)?data.ilanlar:[];
  }else if(kind==="excel"){
    const buffer=await file.arrayBuffer(); const wb=XLSX.read(buffer,{type:"array"});
    for(const name of wb.SheetNames){ const sheet=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:""}); rows.push(...sheet.map(r=>({baslik:r.baslik||r["Başlık"]||r["İlan Başlığı"]||r.title||"Emsal Excel",ilan_no:r.ilan_no||r["İlan No"]||r["İlan no"]||"",fiyat:r.fiyat||r["Fiyat"]||r.price||"",il:r.il||r["İl"]||"Konya",ilce:r.ilce||r["İlçe"]||"",mahalle:r.mahalle||r["Mahalle"]||"",site_adi:r.site_adi||r["Site"]||r["Site Adı"]||"",oda:r.oda||r["Oda"]||r["Oda Sayısı"]||"",brut:r.brut||r["Brüt m²"]||r["Brüt"]||"",net:r.net||r["Net m²"]||r["Net"]||"",kat:r.kat||r["Kat"]||"",ilan_durumu:r.ilan_durumu||r["Durum"]||"Aktif ilan",kaynak_metni:JSON.stringify(r)}))); }
  }else if(kind==="mht"){ rows=emsalFileRows(await file.text()); }
  if(!rows.length) throw new HttpError(400,"Dosyada aktarılabilir emsal kaydı bulunamadı.");
  const fields=["id","ilan_no","baslik","ilan_tarihi","fiyat","il","ilce","mahalle","mevki","site_adi","brut","net","oda","bina_yasi","kat","kat_sayisi","esyali","kimden","malik_adi","malik_telefon","portfoy_yetkisi","malik_notu","konum_notu","aciklama","kaynak_metni","created_at","updated_at","analiz_notu","ilan_durumu","emlak_ofisi","islem_turu","ilan_tarihi_iso","sahibinden_mi","malik_adi_elle","malik_telefon_elle","ilan_bitis_tarihi","raw_json"];
  let imported=0;
  for(let i=0;i<rows.length;i+=25){ const chunk=rows.slice(i,i+25); await DB.batch(chunk.map((row,j)=>{const normalized={...row,id:row.id??(Date.now()+i+j),raw_json:JSON.stringify(row),created_at:row.created_at||new Date().toISOString(),updated_at:new Date().toISOString()}; return DB.prepare(`INSERT OR REPLACE INTO emsal_listings(${fields.join(",")}) VALUES(${fields.map(()=>"?").join(",")})`).bind(...fields.map(f=>normalized[f]??""));})); imported+=chunk.length; }
  return {ok:true,imported};
}

async function handleApi(request, DB, path, env) {
  validateOrigin(request);
  await requireAuth(request, DB);

  if (path === "/api/all" && request.method === "GET") return json(await listAll(DB));
  if (path === "/api/emsal" && request.method === "GET") return json(await listEmsal(DB, new URL(request.url)));
  if (path === "/api/emsal/import-file" && request.method === "POST") return json(await importEmsalFile(DB, request));

  let emsalMatch = path.match(/^\/api\/emsal\/(\d+)\/import$/);
  if (emsalMatch && request.method === "POST") return json(await importEmsal(DB, Number(emsalMatch[1])));

  if (path === "/api/backup" && request.method === "GET") {
    const backup = { format: "rsm-crm-backup", version: 1, exported_at: new Date().toISOString(), data: await listAll(DB) };
    const date = new Date().toISOString().slice(0, 10);
    return json(backup, 200, { "content-disposition": `attachment; filename="rsm-crm-yedek-${date}.json"` });
  }

  if (path === "/api/restore" && request.method === "POST") {
    await restoreBackup(DB, await readBody(request));
    return json({ ok: true });
  }

  let match = path.match(/^\/api\/(customers|owners|properties|demands|tasks)$/);
  if (match && request.method === "POST") {
    await insertEntity(DB, match[1], await readBody(request));
    return json({ ok: true }, 201);
  }

  match = path.match(/^\/api\/(customers|owners|properties|demands|tasks)\/(\d+)$/);
  if (match && request.method === "PUT") {
    await updateEntity(DB, match[1], Number(match[2]), await readBody(request));
    return json({ ok: true });
  }
  if (match && request.method === "DELETE") {
    await deleteEntity(DB, match[1], Number(match[2]));
    return json({ ok: true });
  }

  match = path.match(/^\/api\/tasks\/(\d+)\/(done|reopen)$/);
  if (match && request.method === "POST") {
    const status = match[2] === "done" ? "Tamamlandı" : "Açık";
    await DB.prepare("UPDATE tasks SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(status, Number(match[1])).run();
    return json({ ok: true });
  }

  throw new HttpError(404, "İşlem bulunamadı.");
}

function staticResponse(body, type, cache = "public, max-age=3600") {
  return new Response(body, { headers: securityHeaders(type, cache) });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (request.method === "GET") {
        if (path === "/assets/app.css") return staticResponse(APP_CSS, "text/css; charset=utf-8");
        if (path === "/assets/app.js") return staticResponse(APP_JS, "text/javascript; charset=utf-8");
        if (path === "/manifest.webmanifest") return staticResponse(MANIFEST, "application/manifest+json; charset=utf-8");
        if (path === "/sw.js") return staticResponse(SERVICE_WORKER, "text/javascript; charset=utf-8", "no-cache");
        if (path === "/icon.svg") return staticResponse(ICON_SVG, "image/svg+xml; charset=utf-8", "public, max-age=86400");
      }

      if (!env.DB) throw new HttpError(500, "D1 bağlantısı eksik: DB isimli rsm-crm-db bağlantısı gerekli.");
      await ensureSchema(env.DB);

      if (path === "/" && request.method === "GET") return staticResponse(APP_HTML, "text/html; charset=utf-8", "no-store");

      if (path.startsWith("/api/auth/")) {
        const response = await handleAuth(request, env.DB, path);
        if (response) return response;
      }
      if (path.startsWith("/api/")) return await handleApi(request, env.DB, path, env);

      return new Response("Not found", { status: 404, headers: securityHeaders("text/plain; charset=utf-8") });
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error("RSM CRM error", error);
      return json({ error: "İşlem tamamlanamadı. Lütfen yeniden deneyin." }, 500);
    }
  },
};
