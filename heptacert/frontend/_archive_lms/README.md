# LMS — Arşivlenmiş Frontend Sayfaları

Bu klasör, devre dışı bırakılan LMS özelliğinin frontend (Next.js App Router) sayfalarını içerir.

## İçerik
- `app/courses/` — Üye tarafı kurs sayfaları (katalog, kurs detay, modüller, syllabus, notlar, tartışmalar, takvim, duyurular) — 8 sayfa
- `app/admin/lms/` — Admin LMS yönetim paneli (kurslar, öğrenciler, not defteri, rubrikler, quizler, speedgrader, öğrenme yolları, rozetler, analitik, LTI, white-label, akademik kadro) — 19 sayfa

## Neden arşivlendi?
LMS backend router'ları devre dışı (bkz. `backend/_archive_lms/`). Bu sayfalar `/api/public/courses/...` ve `/admin/lms/...` endpoint'lerini çağırıyordu; backend kapalı olduğu için çağrıldıklarında 404 dönüyorlardı. Admin menüsündeki linkler de zaten yorum satırına alınmıştı (menüden görünmüyorlardı) ama route'lar URL ile hâlâ erişilebilirdi.

`src/app/` dışına taşındıkları için artık Next.js route'u değiller ve TypeScript derlemesine girmiyorlar (tsconfig sadece `src/**` derler).

## Yeniden aktive etmek için
1. Önce backend'i aktive edin (`backend/_archive_lms/README.md`).
2. `app/courses/`, `app/portal/` ve `app/admin/lms/` klasörlerini tekrar `frontend/src/app/` altına taşıyın.
3. Navigasyon linklerini geri açın:
   - `src/app/admin/_admin-layout-shell.tsx` — yorum satırına alınmış LMS menü öğeleri
   - Arşivdeki `app/portal/layout.tsx` — `/portal/courses` linki
4. Taşınan sayfalar `@/components`, `@/lib/api` gibi paylaşılan modülleri kullanır; bunlar `src/` içinde kaldığı için import'lar geri taşıma sonrası çalışır.

## Portal kuplajı
Eski üye portalı da `app/portal/` altına arşivlendi. Böylece kapalı LMS
endpoint'lerini çağıran `/portal` yüzeyi artık canlı bir Next.js route'u değildir.
MCP içindeki LMS araçları da aktif araç listesinden kaldırılmıştır.
