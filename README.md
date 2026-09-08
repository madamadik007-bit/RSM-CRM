# RSM Gayrimenkul CRM

RSM Gayrimenkul için Cloudflare Workers ve D1 üzerinde çalışan, telefon ve tablet uyumlu internet CRM uygulaması.

## Modüller

- Ana panel ve hızlı kayıt kısayolları
- Müşteri ve mülk sahibi yönetimi
- Satılık/kiralık portföy yönetimi
- Müşteri talep kayıtları
- Arama, görüşme ve portföy gösterimi takipleri
- Talep–portföy puanlı eşleştirme
- Kayıt ekleme, düzenleme ve silme
- Parolalı oturum, deneme sınırlaması ve güvenlik başlıkları
- JSON yedekleme ve geri yükleme
- PWA kurulumu

## Cloudflare kaynakları

- Worker: `rsm-gayrimenkul-crm`
- D1 binding: `DB`
- D1 database: `rsm-crm-db`
- D1 database ID: `427c40f7-ca93-49b4-bff0-7e3538dff3b2`

`main` dalına gönderilen değişiklikler Cloudflare Workers Builds bağlantısı tarafından üretime alınır. Şema geriye uyumlu biçimde Worker tarafından güncellenir; mevcut CRM kayıtları korunur.

## Yerel doğrulama

```sh
npm test
npm run check
npx wrangler deploy --dry-run
```

İlk giriş parolası depo dışında teslim edilir. İlk girişten sonra **Ayarlar → Parolayı Değiştir** bölümünden kişisel parola belirlenmelidir.
