# LMS — Arşivlenmiş Backend Modülleri

Bu klasör, devre dışı bırakılan LMS (Learning Management System) özelliğinin backend API router'larını içerir.

## İçerik
- `lms_api.py` — Çekirdek LMS endpoint'leri (kurslar, modüller, kayıt, public course katalog)
- `lms_extended_api.py` — Genişletilmiş LMS (tartışmalar, takvim, not defteri, rubrikler vb.)

## Neden arşivlendi?
LMS sistemi üründen kaldırıldı. Router'lar `main.py`'da zaten yorum satırına alınmıştı; kod tabanını sadeleştirmek için fiziksel olarak `src/` paketinin dışına taşındılar. Böylece import edilmiyor, çalışmıyor ve teknik borç oluşturmuyorlar.

## ÖNEMLİ: Modeller burada DEĞİL
`lms_models.py` ve `lms_extended_models.py` hâlâ `backend/src/` içindedir ve **taşınmamıştır**. Sebebi: `marketplace_api` bu modelleri yükler ve `CourseEnrollment -> CourseGradeSummary` ilişkisi çözümlenemezse SQLAlchemy uygulama başlangıcında (startup) kilitlenir. Bu yüzden modeller yerinde bırakıldı.

## Yeniden aktive etmek için
1. Bu iki dosyayı tekrar `backend/src/` içine taşıyın.
2. `main.py` içinde LMS bölümüne router include satırlarını geri ekleyin:
   ```python
   from . import lms_api as _lms_api
   app.include_router(_lms_api.router)
   from . import lms_extended_api as _lms_extended_api
   app.include_router(_lms_extended_api.router)
   ```
3. Frontend tarafı için `frontend/_archive_lms/README.md`'ye bakın.
4. SQLAlchemy ilişki kilitlenmesini test edin (startup'ı doğrulayın).

## Ayrı proje yapmak için
Dosyalardaki `from .main import ...` ve `from .lms_extended_models import ...` göreli import'ları yeni projenin yapısına göre yeniden yazılmalıdır.
