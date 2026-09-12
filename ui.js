export const APP_HTML = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0b2347">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <title>RSM Gayrimenkul CRM</title>
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/assets/app.css?v=6">
  <script src="/assets/app.js?v=6" defer></script>
</head>
<body>
  <main id="loginView" class="auth-shell" hidden>
    <section class="auth-card" aria-labelledby="loginTitle">
      <div class="auth-logo">RSM</div>
      <p class="eyebrow">RSM GAYRİMENKUL</p>
      <h1 id="loginTitle">CRM Girişi</h1>
      <p class="muted">Müşteri ve portföy kayıtlarınıza güvenli biçimde erişin.</p>
      <form id="loginForm" class="stack">
        <label>Parola
          <input id="loginPassword" name="password" type="password" autocomplete="current-password" required autofocus>
        </label>
        <p id="loginError" class="form-error" role="alert" hidden></p>
        <button class="btn btn-primary btn-block" type="submit">Giriş Yap</button>
      </form>
    </section>
  </main>

  <div id="app" class="app" hidden>
    <aside id="sidebar" class="sidebar">
      <div class="brand">
        <div class="brand-logo">RSM</div>
        <div><strong>RSM Gayrimenkul</strong><small>CRM</small></div>
      </div>
      <nav class="nav" aria-label="Ana menü">
        <button class="nav-item active" data-tab="home"><span>⌂</span> Ana Panel</button>
        <button class="nav-item" data-tab="customers"><span>♙</span> Müşteriler</button>
        <button class="nav-item" data-tab="owners"><span>⌂</span> Mülk Sahipleri</button>
        <button class="nav-item" data-tab="properties"><span>▣</span> Portföyler</button>
        <button class="nav-item" data-tab="emsal"><span>≋</span> Emsal Havuzu</button>
        <button class="nav-item" data-tab="demands"><span>◎</span> Talepler</button>
        <button class="nav-item" data-tab="tasks"><span>✓</span> Takipler</button>
        <button class="nav-item" data-tab="matches"><span>◇</span> Eşleştirme</button>
      </nav>
      <div class="sidebar-foot">RSM Gayrimenkul<br><small>Güvenli internet CRM</small></div>
    </aside>

    <div id="drawerBackdrop" class="drawer-backdrop" hidden></div>
    <main class="main">
      <header class="topbar">
        <div class="title-row">
          <button id="menuButton" class="icon-btn mobile-only" type="button" aria-label="Menüyü aç">☰</button>
          <div><h1 id="pageTitle">Ana Panel</h1><p id="pageSubtitle">RSM Gayrimenkul müşteri ve portföy yönetimi</p></div>
        </div>
        <div class="top-actions">
          <button id="installButton" class="btn btn-soft" type="button" hidden>Uygulamayı Yükle</button>
          <button class="icon-btn" data-action="backup" type="button" title="Yedekle" aria-label="Yedekle">⇩</button>
          <button class="icon-btn" data-action="settings" type="button" title="Ayarlar" aria-label="Ayarlar">⚙</button>
          <button class="icon-btn" data-action="logout" type="button" title="Çıkış" aria-label="Çıkış">↪</button>
        </div>
      </header>

      <section id="home" class="section active">
        <div class="stat-grid">
          <article class="card stat"><span>Müşteri</span><strong id="nCustomers">0</strong><small id="nActiveCustomers">0 aktif</small></article>
          <article class="card stat"><span>Aktif Portföy</span><strong id="nProperties">0</strong><small id="nAllProperties">0 toplam</small></article>
          <article class="card stat"><span>Açık Takip</span><strong id="nTasks">0</strong><small id="nOverdue">0 geciken</small></article>
          <article class="card stat"><span>Aktif Talep</span><strong id="nDemands">0</strong><small>Eşleştirmeye hazır</small></article>
        </div>
        <div class="quick-grid">
          <button class="quick" data-action="new" data-kind="customer"><b>＋</b><span>Yeni Müşteri</span></button>
          <button class="quick" data-action="new" data-kind="property"><b>＋</b><span>Yeni Portföy</span></button>
          <button class="quick" data-action="new" data-kind="demand"><b>＋</b><span>Yeni Talep</span></button>
          <button class="quick" data-action="new" data-kind="task"><b>＋</b><span>Yeni Takip</span></button>
        </div>
        <div class="two-grid">
          <article class="card"><div class="card-head"><h2>Son Müşteriler</h2><button class="link-btn" data-tab="customers">Tümünü Gör</button></div><div id="recentCustomers" class="list"></div></article>
          <article class="card"><div class="card-head"><h2>Yaklaşan Takipler</h2><button class="link-btn" data-tab="tasks">Tümünü Gör</button></div><div id="recentTasks" class="list"></div></article>
        </div>
      </section>

      <section id="customers" class="section">
        <div class="toolbar"><input id="customerSearch" class="search" type="search" placeholder="Ad, telefon, ilçe veya mahalle ara"><button class="btn btn-primary" data-action="new" data-kind="customer">＋ Yeni Müşteri</button></div>
        <div class="card table-wrap"><table><thead><tr><th>Ad Soyad</th><th>Rol / Durum</th><th>Telefon</th><th>Bölge</th><th>Bütçe</th><th>Oda</th><th></th></tr></thead><tbody id="customerRows"></tbody></table></div>
      </section>

      <section id="owners" class="section">
        <div class="toolbar"><input id="ownerSearch" class="search" type="search" placeholder="Mülk sahibi ara"><button class="btn btn-primary" data-action="new" data-kind="owner">＋ Yeni Mülk Sahibi</button></div>
        <div class="card table-wrap"><table><thead><tr><th>Ad Soyad</th><th>Telefon</th><th>Bölge</th><th>Not</th><th></th></tr></thead><tbody id="ownerRows"></tbody></table></div>
      </section>

      <section id="properties" class="section">
        <div class="toolbar"><input id="propertySearch" class="search" type="search" placeholder="Başlık, ilan no, site veya bölge ara"><select id="propertyStatusFilter" class="compact-select"><option value="">Tüm Durumlar</option><option>Aktif</option><option>Pasif</option><option>Satıldı</option><option>Kiralandı</option><option>Beklemede</option></select><button class="btn btn-primary" data-action="new" data-kind="property">＋ Yeni Portföy</button></div>
        <div class="card table-wrap"><table><thead><tr><th>Portföy</th><th>Tür / Durum</th><th>Bölge</th><th>Fiyat</th><th>Oda / m²</th><th>Mülk Sahibi</th><th></th></tr></thead><tbody id="propertyRows"></tbody></table></div>
      </section>

      <section id="emsal" class="section">
        <div class="info-card"><b>Emsal Havuzu</b><span>Emsal Analiz Pro veritabanındaki ilanları doğrudan gösterir. İsterseniz tek tuşla RSM Portföylerine alabilirsiniz; aynı ilan numarası ikinci kez oluşturulmaz.</span></div>
        <div class="toolbar"><input id="emsalSearch" class="search" type="search" placeholder="İlan no, başlık, site, mahalle, malik ara"><select id="emsalStatusFilter" class="compact-select"><option value="">Tüm Durumlar</option><option value="Aktif ilan">Aktif ilan</option><option value="Fiyatı düştü">Fiyatı düştü</option><option value="Pasif ilan">Pasif ilan</option></select><button class="btn btn-soft" data-action="emsal-refresh" type="button">Yenile</button></div>
        <div class="card-head"><h2 id="emsalCount">Emsal kayıtları</h2><small class="muted">Son 250 eşleşme gösterilir.</small></div>
        <div class="card table-wrap"><table><thead><tr><th>İlan</th><th>Durum / Tür</th><th>Bölge / Site</th><th>Fiyat</th><th>Oda / m²</th><th>Malik</th><th></th></tr></thead><tbody id="emsalRows"></tbody></table></div>
      </section>

      <section id="demands" class="section">
        <div class="toolbar"><input id="demandSearch" class="search" type="search" placeholder="Müşteri veya bölge ara"><button class="btn btn-primary" data-action="new" data-kind="demand">＋ Yeni Talep</button></div>
        <div class="card table-wrap"><table><thead><tr><th>Müşteri</th><th>Tür</th><th>Bölge</th><th>Bütçe</th><th>Oda / Net</th><th>Durum</th><th></th></tr></thead><tbody id="demandRows"></tbody></table></div>
      </section>

      <section id="tasks" class="section">
        <div class="toolbar"><input id="taskSearch" class="search" type="search" placeholder="Takip, müşteri veya portföy ara"><select id="taskStatusFilter" class="compact-select"><option value="">Tüm Takipler</option><option value="Açık">Açık</option><option value="Tamamlandı">Tamamlandı</option></select><button class="btn btn-primary" data-action="new" data-kind="task">＋ Yeni Takip</button></div>
        <div id="taskRows" class="card list"></div>
      </section>

      <section id="matches" class="section">
        <div class="info-card"><b>Akıllı Eşleştirme</b><span>Aktif müşteri taleplerini aktif portföylerle; mahalle, ilçe, oda, bütçe, tür ve net m² ölçütlerine göre karşılaştırır.</span></div>
        <div id="matchRows"></div>
      </section>
    </main>
  </div>

  <div id="modal" class="modal" aria-hidden="true">
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-head"><div><p class="eyebrow">RSM CRM</p><h2 id="modalTitle">Yeni Kayıt</h2></div><button class="icon-btn" data-action="close-modal" type="button" aria-label="Kapat">×</button></div>
      <div id="modalBody"></div>
    </div>
  </div>

  <input id="restoreFile" type="file" accept="application/json,.json" hidden>
  <input id="emsalJsonFile" type="file" accept="application/json,.json" hidden>
  <input id="emsalMhtFile" type="file" accept="multipart/related,.mht,.mhtml,text/html" hidden>
  <input id="emsalExcelFile" type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden>
  <div id="busy" class="busy" hidden><div class="spinner"></div><span>İşlem yapılıyor…</span></div>
  <div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
</body>
</html>`;

export const APP_CSS = `:root{--navy:#0b2347;--blue:#1459a6;--blue2:#1d6fc4;--bg:#f3f6fa;--card:#fff;--text:#17223b;--muted:#697386;--line:#dfe5ee;--danger:#b42318;--success:#067647;--warning:#b54708;--shadow:0 10px 30px rgba(16,24,40,.08)}
*{box-sizing:border-box}html{min-height:100%;background:var(--bg)}body{margin:0;min-height:100vh;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:var(--text);background:var(--bg)}button,input,select,textarea{font:inherit}button{touch-action:manipulation}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(29,111,196,.25);outline-offset:2px}[hidden]{display:none!important}
.auth-shell{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 80% 10%,#dcecff 0,transparent 35%),linear-gradient(145deg,#f7faff,#eaf1f9)}.auth-card{width:min(430px,100%);padding:36px;background:#fff;border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadow);text-align:center}.auth-logo,.brand-logo{display:grid;place-items:center;background:#fff;color:var(--navy);font-weight:900;letter-spacing:-1px}.auth-logo{width:72px;height:72px;margin:0 auto 20px;border:3px solid var(--navy);border-radius:22px;font-size:25px}.auth-card h1{margin:6px 0 8px;font-size:30px}.eyebrow{margin:0;color:var(--blue);font-size:11px;font-weight:800;letter-spacing:.16em}.muted{color:var(--muted)}.stack{display:grid;gap:14px;margin-top:24px;text-align:left}.form-error{margin:0;padding:10px 12px;color:var(--danger);background:#fff0ef;border-radius:10px;font-size:14px}
.app{min-height:100vh;display:grid;grid-template-columns:240px 1fr}.sidebar{position:sticky;top:0;height:100vh;padding:20px 16px;background:var(--navy);color:#fff;z-index:40}.brand{display:flex;align-items:center;gap:11px;padding:0 6px 23px}.brand-logo{width:48px;height:48px;border-radius:14px;font-size:17px}.brand strong{display:block;font-size:14px}.brand small{display:block;margin-top:3px;opacity:.65}.nav{display:grid;gap:5px}.nav-item{display:flex;align-items:center;gap:11px;width:100%;padding:11px 12px;border:0;border-radius:11px;background:transparent;color:#fff;text-align:left;cursor:pointer}.nav-item span{width:22px;text-align:center;font-size:18px}.nav-item:hover,.nav-item.active{background:rgba(255,255,255,.13)}.sidebar-foot{position:absolute;left:22px;right:22px;bottom:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,.13);font-size:12px;opacity:.75}.sidebar-foot small{opacity:.75}.drawer-backdrop{position:fixed;inset:0;background:rgba(5,15,31,.52);z-index:35}
.main{min-width:0;padding:22px 26px 42px}.topbar{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:20px}.title-row{display:flex;align-items:center;gap:10px}.topbar h1{margin:0;font-size:27px}.topbar p{margin:4px 0 0;color:var(--muted);font-size:14px}.top-actions{display:flex;align-items:center;gap:8px}.icon-btn{display:inline-grid;place-items:center;min-width:40px;height:40px;padding:0 10px;border:1px solid var(--line);border-radius:11px;background:#fff;color:var(--text);cursor:pointer}.icon-btn:hover{border-color:#b8c6d9;background:#f8fafc}.mobile-only{display:none}.section{display:none}.section.active{display:block}
.card{background:var(--card);border:1px solid var(--line);border-radius:17px;box-shadow:0 1px 2px rgba(16,24,40,.025)}.stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.stat{padding:18px}.stat span{display:block;color:var(--muted);font-size:13px;font-weight:650}.stat strong{display:block;margin:5px 0 1px;font-size:31px;letter-spacing:-.04em}.stat small{color:var(--muted)}.quick-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:13px 0}.quick{display:flex;align-items:center;gap:11px;padding:15px;border:1px solid #cddbeb;border-radius:14px;background:#edf5ff;color:var(--navy);cursor:pointer;text-align:left}.quick:hover{background:#e2efff}.quick b{display:grid;place-items:center;width:31px;height:31px;border-radius:10px;background:#fff;color:var(--blue);font-size:20px}.two-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.two-grid>.card{padding:18px}.card-head,.toolbar,.modal-head,.actions{display:flex;align-items:center}.card-head{justify-content:space-between;gap:12px;margin-bottom:9px}.card-head h2{margin:0;font-size:17px}.link-btn{border:0;background:transparent;color:var(--blue);font-weight:700;cursor:pointer}.list-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:13px 0;border-top:1px solid var(--line)}.list-row:first-child{border-top:0}.row-main{min-width:0}.row-main b{display:block}.row-main small{display:block;margin-top:4px;color:var(--muted);white-space:normal}.empty{padding:26px 12px;text-align:center;color:var(--muted)}
.toolbar{justify-content:flex-end;gap:9px;margin-bottom:12px}.search{min-width:240px;max-width:470px;margin-right:auto}.compact-select{width:auto;min-width:155px}.btn{min-height:40px;padding:9px 14px;border:1px solid transparent;border-radius:10px;font-weight:750;cursor:pointer;white-space:nowrap}.btn-primary{background:var(--blue);color:#fff}.btn-primary:hover{background:#0e4d93}.btn-soft{background:#edf4fc;color:var(--navy);border-color:#d4e2f1}.btn-danger{background:#fff0ef;color:var(--danger);border-color:#ffd5d2}.btn-small{min-height:34px;padding:7px 10px;font-size:13px}.btn-block{width:100%}.actions{justify-content:flex-end;gap:6px}.table-wrap{overflow:auto}table{width:100%;min-width:830px;border-collapse:collapse}th,td{padding:13px 14px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}tr:last-child td{border-bottom:0}th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);background:#fbfcfe}td{font-size:14px}td b{display:block}td small{display:block;margin-top:3px;color:var(--muted)}.badge{display:inline-block;padding:5px 8px;border-radius:999px;background:#edf4ff;color:#184a85;font-size:11px;font-weight:750}.badge.success{background:#ecfdf3;color:var(--success)}.badge.muted-badge{background:#f2f4f7;color:#475467}.badge.warning{background:#fff5e8;color:var(--warning)}a.phone,a.external{color:var(--blue);text-decoration:none;font-weight:650}a.external{font-size:12px}
.info-card{display:flex;gap:12px;align-items:flex-start;margin-bottom:13px;padding:15px 17px;border:1px solid #cde0f5;border-radius:14px;background:#edf6ff;color:#24476d}.info-card span{font-size:13px}.match-card{padding:17px;margin-bottom:12px}.match-card h3{margin:0 0 4px}.match-line{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:13px 0;border-top:1px solid var(--line)}.score{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;background:#eaf3ff;color:var(--blue);font-weight:900}.task-done{opacity:.58}.task-done .row-main b{text-decoration:line-through}.overdue{color:var(--danger)!important;font-weight:700}.actions{flex-wrap:wrap}
.modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(5,15,31,.62);z-index:80}.modal.open{display:flex}.modal-box{width:min(820px,100%);max-height:92vh;overflow:auto;padding:20px;background:#fff;border-radius:20px;box-shadow:var(--shadow)}.modal-head{justify-content:space-between;gap:15px;margin-bottom:17px}.modal-head h2{margin:3px 0 0}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.wide{grid-column:1/-1}label{display:grid;gap:6px;color:#344054;font-size:13px;font-weight:650}input,select,textarea{width:100%;padding:10px 11px;border:1px solid #cfd7e4;border-radius:10px;background:#fff;color:var(--text)}textarea{min-height:86px;resize:vertical}.form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:17px;padding-top:15px;border-top:1px solid var(--line)}.settings-grid{display:grid;gap:14px}.settings-panel{padding:16px;border:1px solid var(--line);border-radius:14px}.settings-panel h3{margin:0 0 5px}.settings-panel p{margin:0 0 13px;color:var(--muted);font-size:13px}
.busy{position:fixed;inset:0;display:grid;place-content:center;justify-items:center;gap:10px;background:rgba(255,255,255,.7);z-index:100;font-weight:700}.spinner{width:34px;height:34px;border:4px solid #d7e3f1;border-top-color:var(--blue);border-radius:50%;animation:spin .75s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.toast{position:fixed;right:20px;bottom:20px;max-width:min(390px,calc(100vw - 40px));padding:12px 15px;border-radius:12px;background:#17223b;color:#fff;box-shadow:var(--shadow);z-index:110;font-size:14px}.toast.error{background:var(--danger)}
@media(max-width:1050px){.stat-grid{grid-template-columns:1fr 1fr}.quick-grid{grid-template-columns:1fr 1fr}.two-grid{grid-template-columns:1fr}}
@media(max-width:820px){.app{display:block}.sidebar{position:fixed;left:-260px;width:240px;transition:left .2s ease}.app.drawer-open .sidebar{left:0}.mobile-only{display:inline-grid}.main{padding:15px}.topbar{align-items:flex-start}.topbar h1{font-size:23px}.topbar p{display:none}.top-actions .btn{display:none}.toolbar{flex-wrap:wrap}.search{order:1;min-width:100%;max-width:none}.toolbar .btn{margin-left:auto}.stat-grid{grid-template-columns:1fr 1fr}.modal-box{padding:16px}.form-grid{grid-template-columns:1fr}.wide{grid-column:auto}}
@media(max-width:520px){.stat-grid,.quick-grid{grid-template-columns:1fr 1fr}.stat{padding:14px}.stat strong{font-size:26px}.quick{padding:12px 10px;font-size:13px}.main{padding:12px}.topbar{margin-bottom:15px}.auth-card{padding:28px 22px}.compact-select{max-width:48%}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}}`;

export const APP_JS = String.raw`"use strict";
(function(){
var S={customers:[],owners:[],properties:[],demands:[],tasks:[]};
var E={ilanlar:[],toplam:0,bagli:false};
var emsalSearchTimer=null;
var currentTab="home";
var installPrompt=null;
var toastTimer=null;
var plural={customer:"customers",owner:"owners",property:"properties",demand:"demands",task:"tasks"};
var singular={customers:"customer",owners:"owner",properties:"property",demands:"demand",tasks:"task"};
var titles={home:"Ana Panel",customers:"Müşteriler",owners:"Mülk Sahipleri",properties:"Portföyler",emsal:"Emsal Havuzu",demands:"Talepler",tasks:"Takipler",matches:"Eşleştirme"};
var subtitles={home:"RSM Gayrimenkul müşteri ve portföy yönetimi",customers:"Alıcı, satıcı, kiracı ve yatırımcı kayıtları",owners:"Mülk sahibi iletişim kayıtları",properties:"Satılık ve kiralık portföyler",emsal:"Emsal Analiz Pro ilan havuzuna doğrudan erişim",demands:"Müşteri ihtiyaç ve bütçe kayıtları",tasks:"Arama, görüşme ve portföy takipleri",matches:"Aktif talepler için uygun portföyler"};
var kindNames={customer:"Müşteri",owner:"Mülk Sahibi",property:"Portföy",demand:"Talep",task:"Takip"};

function el(id){return document.getElementById(id)}
function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]})}
function value(record,key){return record&&record[key]!=null?record[key]:""}
function lower(value){return String(value||"").toLocaleLowerCase("tr-TR")}
function money(value){return value!==null&&value!==undefined&&value!==""?new Intl.NumberFormat("tr-TR").format(Number(value))+" TL":"-"}
function dateText(value){if(!value)return"Tarih yok";var date=new Date(value.length===10?value+"T00:00:00":value);return isNaN(date)?esc(value):date.toLocaleDateString("tr-TR")}
function phoneHref(value){return"tel:"+String(value||"").replace(/[^+\d]/g,"")}
function safeUrl(value){try{var url=new URL(value);return(url.protocol==="http:"||url.protocol==="https:")?url.href:"#"}catch(error){return"#"}}
function badge(text,type){return'<span class="badge '+(type||"")+'">'+esc(text||"-")+'</span>'}
function emptyRow(colspan,text){return'<tr><td colspan="'+colspan+'"><div class="empty">'+esc(text)+'</div></td></tr>'}
function busy(show){el("busy").hidden=!show}
function toast(message,isError){clearTimeout(toastTimer);var box=el("toast");box.textContent=message;box.classList.toggle("error",Boolean(isError));box.hidden=false;toastTimer=setTimeout(function(){box.hidden=true},3600)}

async function api(path,options){
  options=options||{};
  options.credentials="same-origin";
  options.headers=Object.assign({"content-type":"application/json"},options.headers||{});
  var response=await fetch("/api"+path,options);
  var text=await response.text();
  var data={};
  try{data=text?JSON.parse(text):{}}catch(error){data={error:text||"İşlem tamamlanamadı."}}
  if(response.status===401&&path.indexOf("/auth/")!==0){showLogin("Oturum süresi doldu. Yeniden giriş yapın.")}
  if(!response.ok)throw new Error(data.error||"İşlem tamamlanamadı.");
  return data;
}

function showLogin(message){
  el("app").hidden=true;el("loginView").hidden=false;
  el("loginError").hidden=!message;el("loginError").textContent=message||"";
  setTimeout(function(){el("loginPassword").focus()},0);
}
function showApp(){el("loginView").hidden=true;el("app").hidden=false}

async function boot(){
  bindEvents();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(function(){return null});
  try{
    var status=await api("/auth/status",{method:"GET"});
    if(!status.authenticated){showLogin();return}
    showApp();await load();
  }catch(error){showLogin("Sistem bağlantısı kurulamadı: "+error.message)}
}

async function login(event){
  event.preventDefault();busy(true);el("loginError").hidden=true;
  try{await api("/auth/login",{method:"POST",body:JSON.stringify({password:el("loginPassword").value})});el("loginPassword").value="";showApp();await load();toast("Giriş başarılı.")}
  catch(error){showLogin(error.message)}finally{busy(false)}
}

async function logout(){
  busy(true);try{await api("/auth/logout",{method:"POST",body:"{}"})}catch(error){}finally{busy(false);showLogin();toast("Oturum kapatıldı.")}
}

async function load(){
  busy(true);
  try{S=await api("/all",{method:"GET"});renderAll()}catch(error){toast(error.message,true)}finally{busy(false)}
}

function renderAll(){renderHome();renderCustomers();renderOwners();renderProperties();renderDemands();renderTasks();if(currentTab==="matches")renderMatches()}

function renderHome(){
  var activeProperties=S.properties.filter(function(item){return item.status==="Aktif"});
  var openTasks=S.tasks.filter(function(item){return item.status!=="Tamamlandı"});
  var today=new Date();today.setHours(0,0,0,0);
  var overdue=openTasks.filter(function(item){return item.due_date&&new Date(item.due_date+"T00:00:00")<today});
  el("nCustomers").textContent=S.customers.length;
  el("nActiveCustomers").textContent=S.customers.filter(function(item){return !item.status||item.status==="Aktif"}).length+" aktif";
  el("nProperties").textContent=activeProperties.length;el("nAllProperties").textContent=S.properties.length+" toplam";
  el("nTasks").textContent=openTasks.length;el("nOverdue").textContent=overdue.length+" geciken";
  el("nDemands").textContent=S.demands.filter(function(item){return item.status==="Aktif"}).length;
  el("recentCustomers").innerHTML=S.customers.slice(0,5).map(function(item){return'<div class="list-row"><div class="row-main"><b>'+esc(item.name)+'</b><small>'+esc(item.role||"Müşteri")+' · '+esc(item.district||"")+' '+esc(item.neighborhood||"")+'</small></div>'+(item.phone?'<a class="phone" href="'+phoneHref(item.phone)+'">'+esc(item.phone)+'</a>':"")+'</div>'}).join("")||'<div class="empty">Henüz müşteri kaydı yok.</div>';
  el("recentTasks").innerHTML=openTasks.slice(0,5).map(function(item){var late=item.due_date&&new Date(item.due_date+"T00:00:00")<today;return'<div class="list-row"><div class="row-main"><b>'+esc(item.title)+'</b><small class="'+(late?"overdue":"")+'">'+dateText(item.due_date)+' · '+esc(item.customer_name||item.property_title||"")+'</small></div><button class="btn btn-soft btn-small" data-action="toggle-task" data-id="'+item.id+'" data-status="'+esc(item.status)+'">Tamamla</button></div>'}).join("")||'<div class="empty">Açık takip yok.</div>';
}

function renderCustomers(){
  var query=lower(el("customerSearch").value);
  var rows=S.customers.filter(function(item){return!query||lower([item.name,item.phone,item.role,item.district,item.neighborhood,item.source].join(" ")).includes(query)});
  el("customerRows").innerHTML=rows.map(function(item){return'<tr><td><b>'+esc(item.name)+'</b><small>'+esc(item.source||item.notes||"")+'</small></td><td>'+badge(item.role||"Müşteri")+' '+badge(item.status||"Aktif",item.status==="Aktif"?"success":"muted-badge")+'</td><td>'+(item.phone?'<a class="phone" href="'+phoneHref(item.phone)+'">'+esc(item.phone)+'</a>':"-")+'</td><td>'+esc(item.district||"-")+'<small>'+esc(item.neighborhood||"")+'</small></td><td>'+money(item.budget_min)+'<small>'+money(item.budget_max)+'</small></td><td>'+esc(item.rooms||"-")+'</td><td><div class="actions"><button class="btn btn-primary btn-small" data-action="new-demand" data-customer-id="'+item.id+'">＋ Talep</button><button class="btn btn-soft btn-small" data-action="edit" data-kind="customer" data-id="'+item.id+'">Düzenle</button><button class="btn btn-danger btn-small" data-action="delete" data-kind="customer" data-id="'+item.id+'">Sil</button></div></td></tr>'}).join("")||emptyRow(7,"Müşteri kaydı bulunamadı.")
}

function renderOwners(){
  var query=lower(el("ownerSearch").value);
  var rows=S.owners.filter(function(item){return!query||lower([item.name,item.phone,item.district,item.neighborhood,item.notes].join(" ")).includes(query)});
  el("ownerRows").innerHTML=rows.map(function(item){return'<tr><td><b>'+esc(item.name)+'</b></td><td>'+(item.phone?'<a class="phone" href="'+phoneHref(item.phone)+'">'+esc(item.phone)+'</a>':"-")+'</td><td>'+esc(item.district||"-")+'<small>'+esc(item.neighborhood||"")+'</small></td><td>'+esc(item.notes||"-")+'</td><td><div class="actions"><button class="btn btn-soft btn-small" data-action="edit" data-kind="owner" data-id="'+item.id+'">Düzenle</button><button class="btn btn-danger btn-small" data-action="delete" data-kind="owner" data-id="'+item.id+'">Sil</button></div></td></tr>'}).join("")||emptyRow(5,"Mülk sahibi kaydı bulunamadı.")
}

function renderProperties(){
  var query=lower(el("propertySearch").value);var status=el("propertyStatusFilter").value;
  var rows=S.properties.filter(function(item){return(!status||item.status===status)&&(!query||lower([item.title,item.listing_no,item.site,item.city,item.district,item.neighborhood,item.owner_name,item.owner_phone].join(" ")).includes(query))});
  el("propertyRows").innerHTML=rows.map(function(item){var link=item.source_url&&safeUrl(item.source_url)!=="#"?'<a class="external" target="_blank" rel="noopener" href="'+esc(safeUrl(item.source_url))+'">İlanı aç ↗</a>':"";return'<tr><td><b>'+esc(item.title)+'</b><small>'+esc(item.listing_no?"İlan No: "+item.listing_no:item.site||"")+'</small>'+link+'</td><td>'+badge(item.type||"-")+' '+badge(item.status||"-",item.status==="Aktif"?"success":"muted-badge")+'<small>'+esc(item.property_type||"")+'</small></td><td>'+esc(item.district||"-")+'<small>'+esc(item.neighborhood||"")+' '+esc(item.site||"")+'</small></td><td><b>'+money(item.price)+'</b></td><td>'+esc(item.rooms||"-")+'<small>'+esc(item.gross_m2||"-")+" brüt · "+esc(item.net_m2||"-")+' net</small></td><td>'+esc(item.owner_name||"-")+'<small>'+esc(item.owner_phone||"")+'</small></td><td><div class="actions"><button class="btn btn-soft btn-small" data-action="edit" data-kind="property" data-id="'+item.id+'">Düzenle</button><button class="btn btn-danger btn-small" data-action="delete" data-kind="property" data-id="'+item.id+'">Sil</button></div></td></tr>'}).join("")||emptyRow(7,"Portföy kaydı bulunamadı.")
}

async function loadEmsal(){
  var query=encodeURIComponent(el("emsalSearch").value||"");var status=encodeURIComponent(el("emsalStatusFilter").value||"");
  el("emsalRows").innerHTML=emptyRow(7,"Emsal kayıtları yükleniyor…");
  try{E=await api("/emsal?q="+query+"&status="+status+"&limit=250",{method:"GET"});renderEmsal()}
  catch(error){E={ilanlar:[],toplam:0,bagli:false};el("emsalRows").innerHTML=emptyRow(7,error.message);el("emsalCount").textContent="Emsal bağlantısı kurulamadı";toast(error.message,true)}
}

function renderEmsal(){
  var rows=E.ilanlar||[];
  el("emsalCount").textContent=(E.toplam||rows.length)+" emsal kaydı";
  el("emsalRows").innerHTML=rows.map(function(item){
    var already=item.crm_property_id?badge("Portföyde","success"):"";
    return'<tr><td><b>'+esc(item.baslik||"Başlıksız ilan")+'</b><small>'+esc(item.ilan_no?"İlan No: "+item.ilan_no:"İlan no yok")+' · '+dateText(item.ilan_tarihi_iso||item.ilan_tarihi)+'</small></td><td>'+badge(item.ilan_durumu||"-",lower(item.ilan_durumu).includes("aktif")||lower(item.ilan_durumu).includes("düştü")?"success":"muted-badge")+' '+badge(item.islem_turu||"-")+'</td><td>'+esc(item.ilce||"-")+'<small>'+esc(item.mahalle||"")+' '+esc(item.site_adi||item.mevki||"")+'</small></td><td><b>'+money(item.price)+'</b></td><td>'+esc(item.oda||"-")+'<small>'+esc(item.gross_m2||"-")+" brüt · "+esc(item.net_m2||"-")+' net</small></td><td>'+esc(item.malik_adi||"-")+'<small>'+esc(item.malik_telefon||"")+'</small></td><td><div class="actions">'+already+'<button class="btn '+(item.crm_property_id?"btn-soft":"btn-primary")+' btn-small" data-action="emsal-import" data-id="'+item.id+'">'+(item.crm_property_id?"Güncelle":"Portföye Al")+'</button></div></td></tr>'
  }).join("")||emptyRow(7,"Bu filtreye uygun emsal bulunamadı.");
}

async function importEmsal(id){
  busy(true);
  try{var result=await api("/emsal/"+id+"/import",{method:"POST",body:"{}"});await load();await loadEmsal();toast(result.created?"Emsal RSM portföyüne alındı.":"Mevcut portföy emsal bilgileriyle güncellendi.")}
  catch(error){toast(error.message,true)}finally{busy(false)}
}

function renderDemands(){
  var query=lower(el("demandSearch").value);
  var rows=S.demands.filter(function(item){return!query||lower([item.customer_name,item.customer_phone,item.district,item.neighborhood,item.rooms,item.property_type].join(" ")).includes(query)});
  el("demandRows").innerHTML=rows.map(function(item){return'<tr><td><b>'+esc(item.customer_name||"Silinmiş müşteri")+'</b><small>'+esc(item.customer_phone||"")+'</small></td><td>'+esc(item.type||"-")+'<small>'+esc(item.property_type||"")+'</small></td><td>'+esc(item.district||"-")+'<small>'+esc(item.neighborhood||"")+'</small></td><td>'+money(item.budget_min)+'<small>'+money(item.budget_max)+'</small></td><td>'+esc(item.rooms||"-")+'<small>'+esc(item.net_min||"-")+" – "+esc(item.net_max||"-")+' net m²</small></td><td>'+badge(item.status||"-",item.status==="Aktif"?"success":"muted-badge")+'</td><td><div class="actions"><button class="btn btn-soft btn-small" data-action="edit" data-kind="demand" data-id="'+item.id+'">Düzenle</button><button class="btn btn-danger btn-small" data-action="delete" data-kind="demand" data-id="'+item.id+'">Sil</button></div></td></tr>'}).join("")||emptyRow(7,"Talep kaydı bulunamadı.")
}

function renderTasks(){
  var query=lower(el("taskSearch").value);var status=el("taskStatusFilter").value;var today=new Date();today.setHours(0,0,0,0);
  var rows=S.tasks.filter(function(item){return(!status||item.status===status)&&(!query||lower([item.title,item.type,item.customer_name,item.property_title,item.notes].join(" ")).includes(query))});
  el("taskRows").innerHTML=rows.map(function(item){var done=item.status==="Tamamlandı";var late=!done&&item.due_date&&new Date(item.due_date+"T00:00:00")<today;return'<div class="list-row '+(done?"task-done":"")+'"><div class="row-main"><b>'+esc(item.title)+'</b><small class="'+(late?"overdue":"")+'">'+dateText(item.due_date)+' · '+esc(item.type||"Takip")+' · '+esc(item.customer_name||"")+' '+esc(item.property_title||"")+'</small><small>'+esc(item.notes||"")+'</small></div><div class="actions"><button class="btn btn-soft btn-small" data-action="toggle-task" data-id="'+item.id+'" data-status="'+esc(item.status)+'">'+(done?"Tekrar Aç":"Tamamla")+'</button><button class="btn btn-soft btn-small" data-action="edit" data-kind="task" data-id="'+item.id+'">Düzenle</button><button class="btn btn-danger btn-small" data-action="delete" data-kind="task" data-id="'+item.id+'">Sil</button></div></div>'}).join("")||'<div class="empty">Takip kaydı bulunamadı.</div>'
}

function renderMatches(){
  var output="";
  S.demands.filter(function(item){return item.status==="Aktif"}).forEach(function(demand){
    var matches=[];
    S.properties.filter(function(item){return item.status==="Aktif"}).forEach(function(property){
      if(demand.type&&property.type&&lower(demand.type)!==lower(property.type))return;
      var score=0;var reasons=[];
      if(demand.district&&property.district&&lower(demand.district)===lower(property.district)){score+=20;reasons.push("ilçe")}
      if(demand.neighborhood&&property.neighborhood&&lower(demand.neighborhood)===lower(property.neighborhood)){score+=25;reasons.push("mahalle")}
      if(demand.rooms&&property.rooms&&lower(demand.rooms)===lower(property.rooms)){score+=15;reasons.push("oda")}
      if(demand.property_type&&property.property_type&&lower(demand.property_type)===lower(property.property_type)){score+=10;reasons.push("taşınmaz türü")}
      if(property.price&&(!demand.budget_min||property.price>=demand.budget_min)&&(!demand.budget_max||property.price<=demand.budget_max)){score+=20;reasons.push("bütçe")}
      if(property.net_m2&&(!demand.net_min||property.net_m2>=demand.net_min)&&(!demand.net_max||property.net_m2<=demand.net_max)){score+=10;reasons.push("net m²")}
      if(score>=40)matches.push({property:property,score:score,reasons:reasons})
    });
    matches.sort(function(a,b){return b.score-a.score});
    if(matches.length){
      output+='<article class="card match-card"><h3>'+esc(demand.customer_name||"Müşteri")+'</h3><p class="muted">'+esc(demand.district||"")+' '+esc(demand.neighborhood||"")+' · '+money(demand.budget_min)+' – '+money(demand.budget_max)+'</p>';
      matches.slice(0,8).forEach(function(match){output+='<div class="match-line"><div class="row-main"><b>'+esc(match.property.title)+'</b><small>'+esc(match.property.district||"")+' / '+esc(match.property.neighborhood||"")+' · '+money(match.property.price)+'</small><small>Uyum: '+esc(match.reasons.join(", "))+'</small></div><div class="score">%'+match.score+'</div></div>'});
      output+='</article>';
    }
  });
  el("matchRows").innerHTML=output||'<div class="card empty">Eşleşme bulunamadı. Aktif bir talep ve portföy ekleyin.</div>';
}

function optionList(items,selected,placeholder){var html=placeholder===false?"":'<option value="">Seçin</option>';items.forEach(function(item){var val=typeof item==="object"?item.value:item;var label=typeof item==="object"?item.label:item;html+='<option value="'+esc(val)+'" '+(String(val)===String(selected)?"selected":"")+'>'+esc(label)+'</option>'});return html}
function field(label,name,type,current,required,wide,placeholder){return'<label class="'+(wide?"wide":"")+'">'+esc(label)+'<input name="'+esc(name)+'" type="'+esc(type||"text")+'" value="'+esc(current)+'" '+(required?"required":"")+' placeholder="'+esc(placeholder||"")+'"></label>'}
function selectField(label,name,items,current,wide,placeholder,required){return'<label class="'+(wide?"wide":"")+'">'+esc(label)+'<select name="'+esc(name)+'" '+(required?"required":"")+'>'+optionList(items,current,placeholder)+'</select></label>'}
function textareaField(label,name,current){return'<label class="wide">'+esc(label)+'<textarea name="'+esc(name)+'" rows="3">'+esc(current)+'</textarea></label>'}

function findRecord(kind,id){return S[plural[kind]].find(function(item){return Number(item.id)===Number(id)})||{}}

var demandCustomerFields=["district","neighborhood","budget_min","budget_max","rooms","net_min","net_max","notes"];
function fillDemandFromCustomer(form,customerId){
  var customer=findRecord("customer",customerId);
  demandCustomerFields.forEach(function(name){var input=form.querySelector('[name="'+name+'"]');if(input)input.value=value(customer,name)});
  var typeInput=form.querySelector('[name="type"]');if(typeInput&&customer.role)typeInput.value=customer.role==="Kiracı"?"Kiralık":"Satılık";
}

function openForm(kind,id,presetCustomerId){
  var record=id?findRecord(kind,id):{};var html="";
  if(kind==="customer")html=field("Ad Soyad","name","text",value(record,"name"),true)+field("Telefon","phone","tel",value(record,"phone"))+selectField("Rol","role",["Alıcı","Satıcı","Kiracı","Mülk Sahibi","Yatırımcı","Diğer"],value(record,"role")||"Alıcı")+selectField("Durum","status",["Aktif","Pasif","Sonuçlandı"],value(record,"status")||"Aktif",false,false)+field("Kaynak","source","text",value(record,"source"),false,false,"Referans, sosyal medya…")+field("İlçe","district","text",value(record,"district"))+field("Mahalle","neighborhood","text",value(record,"neighborhood"))+field("Min. Bütçe","budget_min","number",value(record,"budget_min"))+field("Maks. Bütçe","budget_max","number",value(record,"budget_max"))+field("Oda Sayısı","rooms","text",value(record,"rooms"),false,false,"3+1")+field("Min. Net m²","net_min","number",value(record,"net_min"))+field("Maks. Net m²","net_max","number",value(record,"net_max"))+textareaField("Notlar","notes",value(record,"notes"));
  if(kind==="owner")html=field("Ad Soyad","name","text",value(record,"name"),true)+field("Telefon","phone","tel",value(record,"phone"))+field("İlçe","district","text",value(record,"district"))+field("Mahalle","neighborhood","text",value(record,"neighborhood"))+textareaField("Notlar","notes",value(record,"notes"));
  if(kind==="property")html=field("Portföy Başlığı","title","text",value(record,"title"),true,true)+selectField("İşlem Türü","type",["Satılık","Kiralık"],value(record,"type")||"Satılık",false,false)+selectField("Durum","status",["Aktif","Pasif","Satıldı","Kiralandı","Beklemede"],value(record,"status")||"Aktif",false,false)+selectField("Taşınmaz Türü","property_type",["Daire","Villa","Arsa","Dükkan","Ofis","Bina","Tarla","Diğer"],value(record,"property_type")||"Daire",false,false)+field("Şehir","city","text",value(record,"city")||"Konya")+field("İlçe","district","text",value(record,"district"))+field("Mahalle","neighborhood","text",value(record,"neighborhood"))+field("Site / Bina","site","text",value(record,"site"))+field("Fiyat","price","number",value(record,"price"))+field("Oda Sayısı","rooms","text",value(record,"rooms"),false,false,"3+1")+field("Brüt m²","gross_m2","number",value(record,"gross_m2"))+field("Net m²","net_m2","number",value(record,"net_m2"))+field("Kat","floor","text",value(record,"floor"))+field("İlan No","listing_no","text",value(record,"listing_no"))+field("İlan Tarihi","listing_date","date",value(record,"listing_date"))+field("İlan Linki","source_url","url",value(record,"source_url"),false,true,"https://…")+field("Mülk Sahibi Adı","owner_name","text",value(record,"owner_name"))+field("Mülk Sahibi Telefonu","owner_phone","tel",value(record,"owner_phone"))+textareaField("Konum Tarifi","location_text",value(record,"location_text"))+textareaField("Notlar","notes",value(record,"notes"));
  if(kind==="demand"){var customers=S.customers.map(function(item){return{value:item.id,label:item.name+(item.phone?" · "+item.phone:"")}});var selectedCustomerId=value(record,"customer_id")||presetCustomerId||"";var presetCustomer=!id&&presetCustomerId?findRecord("customer",presetCustomerId):{};var demandValue=function(name){return id?value(record,name):value(presetCustomer,name)};var demandType=value(record,"type")||(!id&&presetCustomer.role==="Kiracı"?"Kiralık":"Satılık");html=selectField("Müşteri","customer_id",customers,selectedCustomerId,false,null,true)+selectField("İşlem Türü","type",["Satılık","Kiralık"],demandType,false,false)+field("İlçe","district","text",demandValue("district"))+field("Mahalle","neighborhood","text",demandValue("neighborhood"))+field("Min. Bütçe","budget_min","number",demandValue("budget_min"))+field("Maks. Bütçe","budget_max","number",demandValue("budget_max"))+field("Oda Sayısı","rooms","text",demandValue("rooms"),false,false,"3+1")+selectField("Taşınmaz Türü","property_type",["Daire","Villa","Arsa","Dükkan","Ofis","Bina","Tarla","Diğer"],value(record,"property_type")||"Daire",false,false)+field("Min. Net m²","net_min","number",demandValue("net_min"))+field("Maks. Net m²","net_max","number",demandValue("net_max"))+selectField("Durum","status",["Aktif","Beklemede","Sonuçlandı"],value(record,"status")||"Aktif",false,false)+textareaField("Notlar","notes",demandValue("notes"))}
  if(kind==="task"){var customerOptions=S.customers.map(function(item){return{value:item.id,label:item.name}});var propertyOptions=S.properties.map(function(item){return{value:item.id,label:item.title}});html=field("Başlık","title","text",value(record,"title"),true,true)+field("Tarih","due_date","date",value(record,"due_date"))+selectField("Tür","type",["Telefon","WhatsApp","Görüşme","Portföy Gösterimi","Evrak","Fiyat Güncelleme","Diğer"],value(record,"type")||"Telefon",false,false)+selectField("Durum","status",["Açık","Tamamlandı"],value(record,"status")||"Açık",false,false)+selectField("Müşteri","customer_id",customerOptions,value(record,"customer_id"))+selectField("Portföy","property_id",propertyOptions,value(record,"property_id"))+textareaField("Notlar","notes",value(record,"notes"))}
  el("modalTitle").textContent=(id?"Kayıt Düzenle: ":"Yeni ")+kindNames[kind];
  el("modalBody").innerHTML='<form id="recordForm" data-kind="'+kind+'" data-id="'+(id||"")+'"><div class="form-grid">'+html+'</div><div class="form-actions"><button class="btn btn-soft" type="button" data-action="close-modal">Vazgeç</button><button class="btn btn-primary" type="submit">Kaydet</button></div></form>';
  openModal();
}

function openModal(){el("modal").classList.add("open");el("modal").setAttribute("aria-hidden","false");setTimeout(function(){var input=el("modalBody").querySelector("input,select,textarea");if(input)input.focus()},0)}
function closeModal(){el("modal").classList.remove("open");el("modal").setAttribute("aria-hidden","true");el("modalBody").innerHTML=""}

async function saveRecord(event){
  if(event.target.id!=="recordForm")return;event.preventDefault();
  var form=event.target;var kind=form.dataset.kind;var id=form.dataset.id;var data={};new FormData(form).forEach(function(val,key){data[key]=val});
  busy(true);try{await api("/"+plural[kind]+(id?"/"+id:""),{method:id?"PUT":"POST",body:JSON.stringify(data)});closeModal();await load();toast(kindNames[kind]+" kaydedildi.")}catch(error){toast(error.message,true)}finally{busy(false)}
}

async function deleteRecord(kind,id){
  if(!confirm(kindNames[kind]+" kaydı silinsin mi?"))return;
  busy(true);try{await api("/"+plural[kind]+"/"+id,{method:"DELETE",body:"{}"});await load();toast("Kayıt silindi.")}catch(error){toast(error.message,true)}finally{busy(false)}
}

async function toggleTask(id,status){
  busy(true);try{await api("/tasks/"+id+"/"+(status==="Tamamlandı"?"reopen":"done"),{method:"POST",body:"{}"});await load();toast(status==="Tamamlandı"?"Takip tekrar açıldı.":"Takip tamamlandı.")}catch(error){toast(error.message,true)}finally{busy(false)}
}

function changeTab(name){
  currentTab=name;document.querySelectorAll(".section").forEach(function(section){section.classList.toggle("active",section.id===name)});document.querySelectorAll(".nav-item").forEach(function(button){button.classList.toggle("active",button.dataset.tab===name)});el("pageTitle").textContent=titles[name];el("pageSubtitle").textContent=subtitles[name];el("app").classList.remove("drawer-open");el("drawerBackdrop").hidden=true;if(name==="matches")renderMatches();if(name==="emsal")loadEmsal();window.scrollTo(0,0)
}

async function downloadBackup(){
  busy(true);try{var response=await fetch("/api/backup",{credentials:"same-origin"});if(!response.ok)throw new Error("Yedek alınamadı.");var blob=await response.blob();var url=URL.createObjectURL(blob);var anchor=document.createElement("a");anchor.href=url;anchor.download="rsm-crm-yedek-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);toast("Yedek dosyası hazırlandı.")}catch(error){toast(error.message,true)}finally{busy(false)}
}

function openSettings(){
  el("modalTitle").textContent="Ayarlar";
  el("modalBody").innerHTML='<div class="settings-grid"><section class="settings-panel"><h3>Parolayı Değiştir</h3><p>En az 10 karakterli, size özel bir parola belirleyin.</p><form id="passwordForm"><div class="form-grid">'+field("Mevcut Parola","current_password","password","",true)+field("Yeni Parola","new_password","password","",true)+'</div><div class="form-actions"><button class="btn btn-primary" type="submit">Parolayı Değiştir</button></div></form></section><section class="settings-panel"><h3>Veri Yedeği</h3><p>Tüm CRM kayıtlarını JSON dosyası olarak indirin veya daha önce alınmış CRM yedeğini geri yükleyin.</p><div class="actions"><button class="btn btn-soft" type="button" data-action="backup">Yedek İndir</button><button class="btn btn-danger" type="button" data-action="choose-restore">CRM JSON Yükle</button></div></section><section class="settings-panel"><h3>Emsal Veri Aktarımı</h3><p>Emsal Havuzu için dosyaları ayrı ayrı yükleyin. Bu aktarım mevcut müşteri, mülk sahibi, talep ve portföy kayıtlarını silmez.</p><div class="actions"><button class="btn btn-soft" type="button" data-action="choose-emsal-json">Emsal JSON Yükle</button><button class="btn btn-soft" type="button" data-action="choose-emsal-mht">MHT Yükle</button><button class="btn btn-soft" type="button" data-action="choose-emsal-excel">Excel Yükle</button></div><p class="muted">JSON: Emsal Analiz Pro yedeği · MHT: ilan sayfası · Excel: emsal listesi</p></section></div>';
  openModal();
}

async function changePassword(event){
  if(event.target.id!=="passwordForm")return;event.preventDefault();var data=Object.fromEntries(new FormData(event.target).entries());
  busy(true);try{await api("/auth/change-password",{method:"POST",body:JSON.stringify(data)});closeModal();toast("Parola değiştirildi.")}catch(error){toast(error.message,true)}finally{busy(false)}
}

async function importEmsalFile(event,kind){
  var file=event.target.files&&event.target.files[0];event.target.value="";if(!file)return;
  var labels={json:"Emsal JSON",mht:"MHT",excel:"Excel"};
  if(!confirm(labels[kind]+" dosyası Emsal Havuzu'na aktarılacak. Mevcut CRM kayıtları silinmez. Devam edilsin mi?"))return;
  busy(true);
  try{
    var form=new FormData();form.append("file",file);form.append("kind",kind);
    var response=await fetch("/api/emsal/import-file",{method:"POST",credentials:"same-origin",body:form});
    var payload={};try{payload=await response.json()}catch{}
    if(!response.ok)throw new Error(payload.error||"Dosya aktarılamadı.");
    await load();await loadEmsal();closeModal();toast((payload.imported||0)+" Emsal kaydı aktarıldı.");
  }catch(error){toast(error.message,true)}finally{busy(false)}
}

async function restoreFile(event){
  var file=event.target.files&&event.target.files[0];event.target.value="";if(!file)return;
  try{
    var backup=JSON.parse(await file.text());
    if(backup.format!=="rsm-crm-backup"||!backup.data)throw new Error("Bu dosya geçerli bir RSM CRM yedeği değil.");
    var data=backup.data;
    var emsalOnly=data.emsal_only===true&&Array.isArray(data.emsal);
    if(emsalOnly){
      if(!confirm("Bu dosya Emsal Havuzu aktarımıdır. CRM müşterileri, talepleri ve portföyleri silinmez. Emsal kayıtları parça parça aktarılacak. Devam edilsin mi?"))return;
      busy(true);
      var total=data.emsal.length;
      var history=data.emsal_price_history||[];
      el("modalBody").insertAdjacentHTML("afterbegin","<p class=\"restore-progress muted\">Emsal aktarımı hazırlanıyor…</p>");
      var chunkSize=50;
      var done=0;
      for(var i=0;i<total;i+=chunkSize){
        var payload={emsal_only:true,customers:[],owners:[],properties:[],demands:[],tasks:[],emsal:data.emsal.slice(i,i+chunkSize),emsal_price_history:history.slice(Math.floor(i*history.length/total),Math.floor((i+chunkSize)*history.length/total))};
        await api("/restore",{method:"POST",body:JSON.stringify({confirm:"RSM CRM",data:payload})});
        done=Math.min(i+chunkSize,total);
        el("modalBody").querySelector(".restore-progress")?.replaceChildren(document.createTextNode("Emsal aktarılıyor: "+done+" / "+total));
      }
      closeModal();await load();await loadEmsal();toast(total+" Emsal kaydı CRM Emsal Havuzu'na aktarıldı.");
      return;
    }
    if(!confirm("Mevcut CRM kayıtları yedekteki kayıtlarla değiştirilecek. Devam edilsin mi?"))return;
    busy(true);await api("/restore",{method:"POST",body:JSON.stringify({confirm:"RSM CRM",data:data})});closeModal();await load();toast("Yedek başarıyla geri yüklendi.");
  }catch(error){toast(error.message,true)}finally{busy(false)}
}

function bindEvents(){
  el("loginForm").addEventListener("submit",login);
  document.addEventListener("submit",function(event){saveRecord(event);changePassword(event)});
  document.addEventListener("click",function(event){
    var button=event.target.closest("button");if(!button)return;
    if(button.dataset.tab){changeTab(button.dataset.tab);return}
    var action=button.dataset.action;if(!action)return;
    if(action==="new")openForm(button.dataset.kind);
    if(action==="new-demand"){changeTab("demands");openForm("demand","",button.dataset.customerId)}
    if(action==="edit")openForm(button.dataset.kind,button.dataset.id);
    if(action==="delete")deleteRecord(button.dataset.kind,button.dataset.id);
    if(action==="toggle-task")toggleTask(button.dataset.id,button.dataset.status);
    if(action==="emsal-import")importEmsal(button.dataset.id);
    if(action==="emsal-refresh")loadEmsal();
    if(action==="close-modal")closeModal();
    if(action==="backup")downloadBackup();
    if(action==="settings")openSettings();
    if(action==="choose-restore")el("restoreFile").click();
    if(action==="choose-emsal-json")el("emsalJsonFile").click();
    if(action==="choose-emsal-mht")el("emsalMhtFile").click();
    if(action==="choose-emsal-excel")el("emsalExcelFile").click();
    if(action==="logout")logout();
  });
  document.addEventListener("change",function(event){var form=event.target.closest&&event.target.closest("#recordForm");if(form&&form.dataset.kind==="demand"&&event.target.name==="customer_id")fillDemandFromCustomer(form,event.target.value)});
  document.addEventListener("keydown",function(event){if(event.key==="Escape")closeModal()});
  el("menuButton").addEventListener("click",function(){var open=el("app").classList.toggle("drawer-open");el("drawerBackdrop").hidden=!open});
  el("drawerBackdrop").addEventListener("click",function(){el("app").classList.remove("drawer-open");el("drawerBackdrop").hidden=true});
  el("customerSearch").addEventListener("input",renderCustomers);el("ownerSearch").addEventListener("input",renderOwners);el("propertySearch").addEventListener("input",renderProperties);el("propertyStatusFilter").addEventListener("change",renderProperties);el("demandSearch").addEventListener("input",renderDemands);el("taskSearch").addEventListener("input",renderTasks);el("taskStatusFilter").addEventListener("change",renderTasks);
  el("emsalSearch").addEventListener("input",function(){clearTimeout(emsalSearchTimer);emsalSearchTimer=setTimeout(loadEmsal,350)});el("emsalStatusFilter").addEventListener("change",loadEmsal);
  el("restoreFile").addEventListener("change",restoreFile);
  el("emsalJsonFile").addEventListener("change",function(e){importEmsalFile(e,"json")});
  el("emsalMhtFile").addEventListener("change",function(e){importEmsalFile(e,"mht")});
  el("emsalExcelFile").addEventListener("change",function(e){importEmsalFile(e,"excel")});
  window.addEventListener("beforeinstallprompt",function(event){event.preventDefault();installPrompt=event;el("installButton").hidden=false});
  el("installButton").addEventListener("click",async function(){if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;el("installButton").hidden=true});
}

document.addEventListener("DOMContentLoaded",boot);
})();`;

export const MANIFEST = JSON.stringify({
  name: "RSM Gayrimenkul CRM",
  short_name: "RSM CRM",
  description: "RSM Gayrimenkul müşteri ve portföy yönetimi",
  lang: "tr",
  start_url: "/",
  scope: "/",
  display: "standalone",
  background_color: "#f3f6fa",
  theme_color: "#0b2347",
  icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
});

export const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0b2347"/><rect x="80" y="80" width="352" height="352" rx="82" fill="#fff"/><text x="256" y="306" text-anchor="middle" font-family="Arial,sans-serif" font-size="128" font-weight="900" fill="#0b2347">RSM</text></svg>`;

export const SERVICE_WORKER = String.raw`var CACHE="rsm-crm-v5";var SHELL=["/","/assets/app.css?v=6","/assets/app.js?v=6","/manifest.webmanifest","/icon.svg"];self.addEventListener("install",function(event){event.waitUntil(caches.open(CACHE).then(function(cache){return cache.addAll(SHELL)}).then(function(){return self.skipWaiting()}))});self.addEventListener("activate",function(event){event.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(key){return key!==CACHE}).map(function(key){return caches.delete(key)}))}).then(function(){return self.clients.claim()}))});self.addEventListener("fetch",function(event){var request=event.request;var url=new URL(request.url);if(request.method!=="GET"||url.origin!==location.origin||url.pathname.indexOf("/api/")===0)return;if(request.mode==="navigate"){event.respondWith(fetch(request).then(function(response){var copy=response.clone();caches.open(CACHE).then(function(cache){cache.put("/",copy)});return response}).catch(function(){return caches.match("/")}));return}event.respondWith(caches.match(request).then(function(cached){var network=fetch(request).then(function(response){if(response.ok)caches.open(CACHE).then(function(cache){cache.put(request,response.clone())});return response});return cached||network}))});`;
