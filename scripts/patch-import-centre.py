from pathlib import Path

p=Path('ui.js')
s=p.read_text(encoding='utf-8')
old='<input id="restoreFile" type="file" accept="application/json,.json" hidden>'
new='''<input id="restoreFile" type="file" accept="application/json,.json" hidden>\n  <input id="emsalJsonFile" type="file" accept="application/json,.json" hidden>\n  <input id="emsalMhtFile" type="file" accept="multipart/related,.mht,.mhtml,text/html" hidden>\n  <input id="emsalExcelFile" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden>'''
if old not in s: raise SystemExit('file inputs marker not found')
s=s.replace(old,new)
old2='''<section class="settings-panel"><h3>Veri Yedeği</h3><p>Tüm CRM kayıtlarını JSON dosyası olarak indirin veya daha önce alınmış yedeği geri yükleyin. Geri yükleme mevcut kayıtların yerine geçer.</p><div class="actions"><button class="btn btn-soft" type="button" data-action="backup">Yedek İndir</button><button class="btn btn-danger" type="button" data-action="choose-restore">Yedek Yükle</button></div></section>'''
new2='''<section class="settings-panel"><h3>Veri Yedeği</h3><p>Tüm CRM kayıtlarını JSON dosyası olarak indirin veya daha önce alınmış CRM yedeğini geri yükleyin.</p><div class="actions"><button class="btn btn-soft" type="button" data-action="backup">Yedek İndir</button><button class="btn btn-danger" type="button" data-action="choose-restore">CRM JSON Yükle</button></div></section><section class="settings-panel"><h3>Emsal Veri Aktarımı</h3><p>Emsal Havuzu için dosyaları ayrı ayrı yükleyin. Bu aktarım mevcut müşteri, mülk sahibi, talep ve portföy kayıtlarını silmez.</p><div class="actions"><button class="btn btn-soft" type="button" data-action="choose-emsal-json">Emsal JSON Yükle</button><button class="btn btn-soft" type="button" data-action="choose-emsal-mht">MHT Yükle</button><button class="btn btn-soft" type="button" data-action="choose-emsal-excel">Excel Yükle</button></div><p class="muted">JSON: Emsal Analiz Pro yedeği · MHT: ilan sayfası · Excel: emsal listesi</p></section>'''
if old2 not in s: raise SystemExit('settings marker not found')
s=s.replace(old2,new2)
old3='''  el("restoreFile").addEventListener("change",restoreFile);'''
new3='''  el("restoreFile").addEventListener("change",restoreFile);\n  el("emsalJsonFile").addEventListener("change",function(e){importEmsalFile(e,"json")});\n  el("emsalMhtFile").addEventListener("change",function(e){importEmsalFile(e,"mht")});\n  el("emsalExcelFile").addEventListener("change",function(e){importEmsalFile(e,"excel")});'''
if old3 not in s: raise SystemExit('events marker not found')
s=s.replace(old3,new3)
old4='''    if(action==="choose-restore")el("restoreFile").click();'''
new4='''    if(action==="choose-restore")el("restoreFile").click();\n    if(action==="choose-emsal-json")el("emsalJsonFile").click();\n    if(action==="choose-emsal-mht")el("emsalMhtFile").click();\n    if(action==="choose-emsal-excel")el("emsalExcelFile").click();'''
if old4 not in s: raise SystemExit('choose marker not found')
s=s.replace(old4,new4)
anchor='''async function restoreFile(event){'''
fn='''async function importEmsalFile(event,kind){\n  var file=event.target.files&&event.target.files[0];event.target.value="";if(!file)return;\n  var labels={json:"Emsal JSON",mht:"MHT",excel:"Excel"};\n  if(!confirm(labels[kind]+" dosyası Emsal Havuzu'na aktarılacak. Mevcut CRM kayıtları silinmez. Devam edilsin mi?"))return;\n  busy(true);\n  try{\n    var form=new FormData();form.append("file",file);form.append("kind",kind);\n    var response=await fetch("/api/emsal/import-file",{method:"POST",credentials:"same-origin",body:form});\n    var payload={};try{payload=await response.json()}catch{}\n    if(!response.ok)throw new Error(payload.error||"Dosya aktarılamadı.");\n    await load();await loadEmsal();closeModal();toast((payload.imported||0)+" Emsal kaydı aktarıldı.");\n  }catch(error){toast(error.message,true)}finally{busy(false)}\n}\n\n'''
if anchor not in s: raise SystemExit('restore anchor not found')
s=s.replace(anchor,fn+anchor,1)
p.write_text(s,encoding='utf-8')

# worker: add xlsx dependency import and multipart endpoint helpers
w=Path('worker.js'); ws=w.read_text(encoding='utf-8')
if 'from "xlsx"' not in ws:
    ws='import * as XLSX from "xlsx";\n'+ws
helper='''\nfunction emsalFileRows(text){\n  const raw=String(text||"").replace(/\\r/g,"");\n  const lines=raw.split("\\n").map(x=>x.trim()).filter(Boolean);\n  const out=[];\n  for(const line of lines){\n    const clean=line.replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/\\s+/g," ").trim();\n    if(!clean) continue;\n    const price=(clean.match(/([0-9]{1,3}(?:[.][0-9]{3})+|[0-9]{6,})\\s*(?:TL|₺)/i)||[])[1]||"";\n    const ilan=(clean.match(/(?:ilan no|ilan\\s*#|listing)\\s*[:#]?\\s*([0-9]{7,})/i)||[])[1]||"";\n    const m2=(clean.match(/([0-9]{2,4})\\s*m²/i)||[])[1]||"";\n    if(price||ilan||m2) out.push({baslik:clean.slice(0,500),ilan_no:ilan,fiyat:price,net:m2,kaynak_metni:clean,ilan_durumu:"Aktif ilan",il:"Konya"});\n  }\n  return out;\n}\n\nasync function importEmsalFile(DB,request){\n  const form=await request.formData(); const file=form.get("file"); const kind=cleanText(form.get("kind"),20);\n  if(!(file instanceof File)) throw new HttpError(400,"Dosya bulunamadı.");\n  let rows=[];\n  if(kind==="json"){\n    const body=JSON.parse(await file.text());\n    const data=body.data||body; rows=Array.isArray(data.emsal)?data.emsal:Array.isArray(data.ilanlar)?data.ilanlar:[];\n  }else if(kind==="excel"){\n    const buffer=await file.arrayBuffer(); const wb=XLSX.read(buffer,{type:"array"});\n    for(const name of wb.SheetNames){ const sheet=XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:""}); rows.push(...sheet.map(r=>({baslik:r.baslik||r["Başlık"]||r["İlan Başlığı"]||r.title||"Emsal Excel",ilan_no:r.ilan_no||r["İlan No"]||r["İlan no"]||"",fiyat:r.fiyat||r["Fiyat"]||r.price||"",il:r.il||r["İl"]||"Konya",ilce:r.ilce||r["İlçe"]||"",mahalle:r.mahalle||r["Mahalle"]||"",site_adi:r.site_adi||r["Site"]||r["Site Adı"]||"",oda:r.oda||r["Oda"]||r["Oda Sayısı"]||"",brut:r.brut||r["Brüt m²"]||r["Brüt"]||"",net:r.net||r["Net m²"]||r["Net"]||"",kat:r.kat||r["Kat"]||"",ilan_durumu:r.ilan_durumu||r["Durum"]||"Aktif ilan",kaynak_metni:JSON.stringify(r)}))); }\n  }else if(kind==="mht"){ rows=emsalFileRows(await file.text()); }\n  if(!rows.length) throw new HttpError(400,"Dosyada aktarılabilir emsal kaydı bulunamadı.");\n  const fields=["id","ilan_no","baslik","ilan_tarihi","fiyat","il","ilce","mahalle","mevki","site_adi","brut","net","oda","bina_yasi","kat","kat_sayisi","esyali","kimden","malik_adi","malik_telefon","portfoy_yetkisi","malik_notu","konum_notu","aciklama","kaynak_metni","created_at","updated_at","analiz_notu","ilan_durumu","emlak_ofisi","islem_turu","ilan_tarihi_iso","sahibinden_mi","malik_adi_elle","malik_telefon_elle","ilan_bitis_tarihi","raw_json"];\n  let imported=0;\n  for(let i=0;i<rows.length;i+=25){ const chunk=rows.slice(i,i+25); await DB.batch(chunk.map((row,j)=>{const normalized={...row,id:row.id??(Date.now()+i+j),raw_json:JSON.stringify(row),created_at:row.created_at||new Date().toISOString(),updated_at:new Date().toISOString()}; return DB.prepare(`INSERT OR REPLACE INTO emsal_listings(${fields.join(",")}) VALUES(${fields.map(()=>"?").join(",")})`).bind(...fields.map(f=>normalized[f]??""));})); imported+=chunk.length; }\n  return {ok:true,imported};\n}\n'''
marker='async function handleApi(request, DB, path, env) {'
if marker not in ws: raise SystemExit('handleApi marker not found')
ws=ws.replace(marker,helper+'\n'+marker,1)
oldapi='''  if (path === "/api/emsal" && request.method === "GET") return json(await listEmsal(DB, new URL(request.url)));'''
newapi='''  if (path === "/api/emsal" && request.method === "GET") return json(await listEmsal(DB, new URL(request.url)));\n  if (path === "/api/emsal/import-file" && request.method === "POST") return json(await importEmsalFile(DB, request));'''
if oldapi not in ws: raise SystemExit('api marker not found')
ws=ws.replace(oldapi,newapi,1)
w.write_text(ws,encoding='utf-8')

import json
pp=Path('package.json'); data=json.loads(pp.read_text(encoding='utf-8')); data.setdefault('dependencies',{})['xlsx']='^0.18.5'; pp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('patched')
