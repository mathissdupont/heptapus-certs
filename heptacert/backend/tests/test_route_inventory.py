"""Route envanteri invariant'i — routers refactor (Adim 4d) guvenlik agi.

Uygulamadaki tum (method, path) ciftlerini dondurulmus bir baseline ile
karsilastirir. Mekanik bir tasima (handler'lari main.py'dan router modullerine
tasimak) route KUMESINI degistirmemeli. Bir route kaybolur veya yolu degisirse
bu test aninda kirilir -> refactor sirasinda regresyon yakalanir.

Baseline ilk calistirmada otomatik uretilir (tests/_route_baseline.json).
Bilerek yeni endpoint eklenince: dosyayi sil, testi bir kez calistir, yeni
baseline'i commit et.
"""
import json
import os

from src.main import app

BASELINE = os.path.join(os.path.dirname(__file__), "_route_baseline.json")
_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE"}


def _current_routes() -> list[str]:
    out = set()
    for r in app.routes:
        methods = getattr(r, "methods", None)
        path = getattr(r, "path", None)
        if not methods or not path:
            continue
        for m in methods:
            if m in _METHODS:
                out.add(f"{m} {path}")
    return sorted(out)


def test_route_inventory_no_routes_lost():
    current = _current_routes()
    if not os.path.exists(BASELINE):
        with open(BASELINE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2, ensure_ascii=False)
    with open(BASELINE, encoding="utf-8") as f:
        baseline = json.load(f)

    cur, base = set(current), set(baseline)
    missing = sorted(base - cur)   # kaybolan / yolu degisen route'lar
    added = sorted(cur - base)     # yeni route'lar (bilgi amacli)

    # Refactor invariant'i: hicbir route kaybolmamali.
    assert not missing, (
        f"{len(missing)} route KAYBOLDU/yolu degisti:\n  " + "\n  ".join(missing)
        + (f"\n(Yeni eklenenler: {added})" if added else "")
    )


def test_route_inventory_count_sane():
    # Kaba bir guvenlik: route sayisi beklenmedik sekilde dusmemeli (baseline 578).
    assert len(_current_routes()) >= 560
