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
2. `app/courses/` ve `app/admin/lms/` klasörlerini tekrar `frontend/src/app/` altına taşıyın.
3. Navigasyon linklerini geri açın:
   - `src/app/admin/_admin-layout-shell.tsx` — yorum satırına alınmış LMS menü öğeleri
   - `src/app/portal/layout.tsx` — `/portal/courses` linki ("LMS devre disi" yorumu)
4. Taşınan sayfalar `@/components`, `@/lib/api` gibi paylaşılan modülleri kullanır; bunlar `src/` içinde kaldığı için import'lar geri taşıma sonrası çalışır.

## Not: Portal kuplajı
`src/app/portal/` içindeki üye portalı (login + ana sayfa + takvim) hâlâ canlıdır ve bazı LMS endpoint'lerini (`/public/my-courses`, `/public/courses/{id}/calendar`) çağırır. Bu çağrılar `Promise.allSettled` / `try-catch` ile zarif şekilde boş sonuç döner, hata vermez. Portal LMS yeniden açılınca otomatik dolacaktır.
