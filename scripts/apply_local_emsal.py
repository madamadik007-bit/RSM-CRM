from pathlib import Path
import re

worker = Path("worker.js")
wrangler = Path("wrangler.jsonc")
s = worker.read_text(encoding="utf-8")
ws = wrangler.read_text(encoding="utf-8")

# Remove the cross-account D1 binding.
ws2 = re.sub(r',\s*\{\s*"binding": "EMSAL_DB".*?\n    \}', '', ws, flags=re.S)
if ws2 != ws:
    wrangler.write_text(ws2, encoding="utf-8")

# Replace the cross-account Emsal API helpers with local-D1 versions.
start = s.index("async function listEmsal(")
end = s.index("async function ensureColumn", start)
block = r'''async function listEmsal(DB, url) {
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

'''
s = s[:start] + block + s[end:]

# Add local Emsal tables to the normal schema.
needle = '    "CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT DEFAULT CURRENT_TIMESTAMP)",'
insert = '''    "CREATE TABLE IF NOT EXISTS emsal_listings(id INTEGER PRIMARY KEY,ilan_no TEXT,baslik TEXT,ilan_tarihi TEXT,fiyat TEXT,il TEXT,ilce TEXT,mahalle TEXT,mevki TEXT,site_adi TEXT,brut TEXT,net TEXT,oda TEXT,bina_yasi TEXT,kat TEXT,kat_sayisi TEXT,esyali TEXT,kimden TEXT,malik_adi TEXT,malik_telefon TEXT,portfoy_yetkisi TEXT,malik_notu TEXT,konum_notu TEXT,aciklama TEXT,kaynak_metni TEXT,created_at TEXT,updated_at TEXT,analiz_notu TEXT,ilan_durumu TEXT,emlak_ofisi TEXT,islem_turu TEXT,ilan_tarihi_iso TEXT,sahibinden_mi INTEGER,malik_adi_elle TEXT,malik_telefon_elle TEXT,ilan_bitis_tarihi TEXT,raw_json TEXT NOT NULL)",
    "CREATE TABLE IF NOT EXISTS emsal_price_history(id INTEGER PRIMARY KEY,ilan_id INTEGER,eski_fiyat TEXT,yeni_fiyat TEXT,degisim_tarihi TEXT)",
    "CREATE INDEX IF NOT EXISTS idx_emsal_listing_no ON emsal_listings(ilan_no)",
    "CREATE INDEX IF NOT EXISTS idx_emsal_region ON emsal_listings(ilce,mahalle,site_adi)",
''' + needle
if 'CREATE TABLE IF NOT EXISTS emsal_listings' not in s:
    s = s.replace(needle, insert)

# Replace restore so an Emsal-only backup never wipes CRM data.
rs = s.index("async function restoreBackup(")
re_ = s.index("async function handleAuth", rs)
restore = r'''async function restoreBackup(DB, body) {
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

'''
s = s[:rs] + restore + s[re_:]
s = s.replace('return json(await listEmsal(env.EMSAL_DB, DB, new URL(request.url)));','return json(await listEmsal(DB, new URL(request.url)));')
s = s.replace('return json(await importEmsal(DB, env.EMSAL_DB, Number(emsalMatch[1])));','return json(await importEmsal(DB, Number(emsalMatch[1])));')
worker.write_text(s, encoding="utf-8")
print("Local Emsal patch applied")
