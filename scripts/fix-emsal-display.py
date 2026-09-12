from pathlib import Path

p=Path('worker.js')
s=p.read_text(encoding='utf-8')
old='''  if (status) { where.push("ilan_durumu=?"); binds.push(status); }'''
new='''  if (status) {
    const statusMap = {
      "Aktif ilan": ["Aktif ilan", "Aktif"],
      "Fiyatı düştü": ["Fiyatı düştü", "Aktif ilan", "Aktif"],
      "Pasif ilan": ["Pasif ilan", "Pasif"],
      "Aktif": ["Aktif ilan", "Aktif"],
      "Pasif": ["Pasif ilan", "Pasif"],
    };
    const values = statusMap[status] || [status];
    where.push("ilan_durumu IN (" + values.map(() => "?").join(",") + ")");
    binds.push(...values);
  }'''
if old in s:
    s=s.replace(old,new,1)
elif 'const statusMap = {' not in s:
    raise SystemExit('worker status filter is neither old nor already patched')

old_count='''  const totalResult = await DB.prepare("SELECT COUNT(*) AS count FROM emsal_listings" + clause).bind(...binds).all();'''
new_count='''  const totalStatement = DB.prepare("SELECT COUNT(*) AS count FROM emsal_listings" + clause);
  const totalResult = binds.length ? await totalStatement.bind(...binds).all() : await totalStatement.all();'''
if old_count in s:
    s=s.replace(old_count,new_count,1)
elif 'const totalStatement = DB.prepare("SELECT COUNT(*) AS count FROM emsal_listings" + clause);' not in s:
    raise SystemExit('emsal total count query is neither old nor already patched')

p.write_text(s,encoding='utf-8')

u=Path('ui.js')
us=u.read_text(encoding='utf-8')
us=us.replace('money(item.price)','money(item.fiyat)')
us=us.replace('esc(item.gross_m2||"-")+" brüt · "+esc(item.net_m2||"-")','esc(item.brut||"-")+" brüt · "+esc(item.net||"-")')
us=us.replace('/assets/app.css?v=6','/assets/app.css?v=7')
us=us.replace('/assets/app.js?v=6','/assets/app.js?v=7')
us=us.replace('rsm-crm-v5','rsm-crm-v7')
u.write_text(us,encoding='utf-8')
print('Emsal display/API fix verified/applied')
