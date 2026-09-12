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
if old not in s: raise SystemExit('worker status marker not found')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

u=Path('ui.js'); us=u.read_text(encoding='utf-8')
us=us.replace('''<option value="Aktif ilan">Aktif ilan</option><option value="Fiyatı düştü">Fiyatı düştü</option><option value="Pasif ilan">Pasif ilan</option>''','''<option value="Aktif ilan">Aktif ilan</option><option value="Fiyatı düştü">Fiyatı düştü</option><option value="Pasif ilan">Pasif ilan</option>''')
us=us.replace('''money(item.price)''','''money(item.fiyat)''')
us=us.replace('''esc(item.gross_m2||"-")+" brüt · "+esc(item.net_m2||"-")''','''esc(item.brut||"-")+" brüt · "+esc(item.net||"-")''')
us=us.replace('''/assets/app.css?v=6''','''/assets/app.css?v=7''')
us=us.replace('''/assets/app.js?v=6''','''/assets/app.js?v=7''')
p.write_text(us,encoding='utf-8')

sw=Path('ui.js'); ss=sw.read_text(encoding='utf-8')
# Force the service worker to take the new UI instead of an older cached bundle.
ss=ss.replace('''rsm-crm-v5''','''rsm-crm-v7''')
sw.write_text(ss,encoding='utf-8')
print('Emsal display fix applied')
