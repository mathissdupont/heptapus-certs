# main.py God-Dosya Bölme Planı

> Durum: **PLAN — henüz uygulanmadı.** Onay sonrası adım adım yürütülecek.
> Tarih: 2026-06-14

## Sorun
`heptacert/backend/src/main.py` tek başına **~21.117 satır / 938 KB**:
- ~245 SQLAlchemy modeli (tümü tek `Base` registry)
- ~164 Pydantic şeması
- 230 doğrudan `@app.*` route (kalan ~464 route diğer `*_api.py` router'larında)
- 469 fonksiyon (auth dependency'leri, yardımcılar, scheduler job'ları, route handler'lar)

### Neden riskli?
main.py hem **uygulama giriş noktası** hem de **paylaşılan kütüphane**. Diğer tüm router dosyaları `from .main import (Model, get_db, get_current_user, ...)` yapıyor. Yani main.py merkezi hub. Ayrıca 245 model tek `Base` üzerinde ve ilişkiler (relationship) startup'ta çözümleniyor — LMS örneğinde görüldüğü gibi yanlış import sırası SQLAlchemy'yi başlangıçta kilitliyor.

Bu yüzden "hepsini bir gecede böl" yapılmaz. Aşağıdaki sıra **her adımda test edilen, geri alınabilir** bir yol izler.

## Hedef Mimari
```
backend/src/
  db.py            # Base, engine, SessionLocal, get_db
  config.py        # Settings (pydantic-settings)
  models/          # SQLAlchemy modelleri (domain bazlı dosyalar)
  schemas/         # Pydantic şemaları (domain bazlı)
  deps.py          # get_current_user, require_role, require_paid_plan, ...
  utils.py         # saf yardımcılar (sanitizer, token, format)
  routers/         # route grupları (events, certificates, auth, billing, surveys, raffles, ...)
  main.py          # SADECE: app oluşturma + middleware + include_router + scheduler
```

## Güvenlik Ağı
- `backend/tests/` mevcut (19 test dosyası: api, auth, security, generators, jobs). **Her adımdan sonra `pytest` çalıştır.**
- Her adım ayrı commit → sorun çıkarsa tek adım geri alınır.
- Her adımda backend'in **import edilip startup'ı geçtiğini** doğrula (uvicorn ile ayağa kaldır, `/api/health` 200).

## Adımlar (en düşük riskten en yükseğe)

### Adım 0 — Hazırlık (risksiz)
- Mevcut testlerin yeşil olduğunu doğrula (baseline).
- `import main` startup süresini ve `/api/health` çıktısını referans al.

### Adım 1 — Config çıkar (düşük risk)
- `Settings` sınıfını `config.py`'a taşı. main.py: `from .config import settings`.
- Test + startup doğrula, commit.

### Adım 2 — Saf yardımcıları çıkar (düşük risk)
- Stateless fonksiyonlar (rich-text sanitizer, token helper'ları, formatlayıcılar, `_client_ip_for_rate_limit` vb.) → `utils.py`.
- main.py geriye dönük `from .utils import *`.
- Test + commit.

### Adım 3 — Pydantic şemalarını çıkar (düşük-orta risk)
- 164 `BaseModel` → `schemas/` altında domain dosyalarına (events, certificates, members, crm...).
- main.py'da `from .schemas import *` ile isimleri koru (route'lar isimle referans veriyor).
- DB coupling yok → SQLAlchemy registry'yi etkilemez. Test + commit.

### Adım 4 — DB altyapısı + modelleri çıkar (ORTA-YÜKSEK risk — en kritik)
- `Base`, engine, `SessionLocal`, `get_db` → `db.py`.
- 245 modeli `models/` altına domain bazlı taşı. **TEK `Base`** kullanılmalı.
- `models/__init__.py` tüm modelleri import etsin ki SQLAlchemy registry app'ten önce dolsun (ilişki çözümü için kritik — LMS dersi).
- main.py + tüm `*_api.py` dosyalarındaki `from .main import <Model>` → `from .models import <Model>` olarak güncelle (toplu, dikkatli).
- **Bu adımdan sonra mutlaka tam startup + pytest.** Relationship kilitlenmesi en çok burada çıkar.

### Adım 5 — Auth dependency'lerini çıkar (orta risk)
- `get_current_user`, `get_current_public_member`, `require_role`, `require_paid_plan`, `require_email_system_access` → `deps.py`.
- `from .main import get_current_user` → `from .deps import get_current_user` (main + tüm router'lar).
- Test + commit.

### Adım 6 — Route gruplarını çıkar (orta risk, en büyük kazanç — parça parça)
- main.py'daki 230 route'u domain router'larına böl (mevcut `events_api.py` desenini izle):
  `routers/auth.py, events.py, certificates.py, billing.py, surveys.py, raffles.py, checkin.py, branding.py, ...`
- Her router `from .deps import ...`, `from .models import ...` kullanır (artık main'e bağımlı değil → döngüsel import çözülür).
- **Bir router taşı → include_router ekle → test → commit.** Teker teker, asla toplu değil.

### Adım 7 — main.py sadeleştir
- Geriye sadece: app oluşturma, middleware, scheduler kurulumu, `include_router` çağrıları kalsın (~300-500 satır hedef).

## Tahmini Efor
- Adım 1-3: ~yarım gün (düşük risk).
- Adım 4: ~yarım–1 gün (dikkatli, en riskli).
- Adım 5-6: ~1-2 gün (route grupları parça parça).
- **Toplam: çok-günlük bir refactor. Tek oturumda tamamı önerilmez.**

## Öneri
Bugün için: **Adım 1-3** (config + utils + schemas) güvenli ve hızlı kazanç — istenirse bugün yapılabilir. Adım 4+ (modeller + route'lar) ayrı, odaklı, test-ağırlıklı oturum(lar) gerektirir.
