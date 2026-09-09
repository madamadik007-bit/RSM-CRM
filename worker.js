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
  const total = Object.keys(ENTITIES).reduce((sum, entity) => {
    if (!Array.isArray(data[entity])) throw new HttpError(400, `${entity} listesi eksik.`);
    return sum + data[entity].length;
  }, 0);
  if (total > 5000) throw new HttpError(400, "Yedek dosyası tek işlem için çok büyük.");

  const statements = [
    DB.prepare("DELETE FROM tasks"),
    DB.prepare("DELETE FROM demands"),
    DB.prepare("DELETE FROM properties"),
    DB.prepare("DELETE FROM owners"),
    DB.prepare("DELETE FROM customers"),
  ];
  for (const entity of ["customers", "owners", "properties", "demands", "tasks"]) {
    const config = ENTITIES[entity];
    for (const record of data[entity]) {
      const clean = sanitizeEntity(entity, record, true);
      const fields = ["id", ...config.fields, "created_at", "updated_at"];
      const placeholders = fields.map(() => "?").join(",");
      statements.push(DB.prepare(`INSERT INTO ${entity}(${fields.join(",")}) VALUES(${placeholders})`)
        .bind(
          cleanNumber(record.id, "id"),
          ...config.fields.map((field) => clean[field]),
          cleanText(record.created_at) || new Date().toISOString(),
          cleanText(record.updated_at) || cleanText(record.created_at) || new Date().toISOString(),
        ));
    }
  }
  await DB.batch(statements);
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

async function handleApi(request, DB, path) {
  validateOrigin(request);
  await requireAuth(request, DB);

  if (path === "/api/all" && request.method === "GET") return json(await listAll(DB));

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
      if (path.startsWith("/api/")) return await handleApi(request, env.DB, path);

      return new Response("Not found", { status: 404, headers: securityHeaders("text/plain; charset=utf-8") });
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error("RSM CRM error", error);
      return json({ error: "İşlem tamamlanamadı. Lütfen yeniden deneyin." }, 500);
    }
  },
};
