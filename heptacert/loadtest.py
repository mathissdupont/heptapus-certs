"""HeptaCert basit yük testi aracı.

Backend imajında httpx zaten kurulu olduğundan ekstra kuruluma gerek yok.
Compose ağına katılarak servise doğrudan `http://backend:8000` üzerinden vurur.

Çalıştırma (proje kökünde `heptacert/` içinde):

  # 1) SALT-OKUMA kapasite testi (veri yazmaz, en temiz kapasite göstergesi)
  docker compose run --rm -v "$(pwd)/loadtest.py:/tmp/lt.py" backend \
    python /tmp/lt.py --base http://backend:8000 --mode read --concurrency 50 --duration 20

  # 2) KAYIT yük testi (DB'ye gerçek attendee yazar — test/staging'de çalıştır!)
  docker compose run --rm -v "$(pwd)/loadtest.py:/tmp/lt.py" backend \
    python /tmp/lt.py --base http://backend:8000 --mode register --concurrency 50 --duration 20

Yorumlama: concurrency'yi kademeli artır (10 -> 50 -> 100 -> 200). p95 gecikmesi
aniden yükselmeye ya da hata oranı tırmanmaya başladığı nokta = doygunluk (kapasite
tavanı). Saniyedeki başarılı istek (RPS) o tavandaki gerçek taşıma kapasitendir.
"""

import argparse
import asyncio
import secrets
import statistics
import time

import httpx


async def _discover_event_ids(base: str) -> list[int]:
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(f"{base}/api/public/events")
        r.raise_for_status()
        data = r.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        ids = [int(e["id"]) for e in items if isinstance(e, dict) and e.get("id")]
        return ids


def _register_payload() -> dict:
    tag = secrets.token_hex(6)
    return {
        "name": f"Load Test {tag}",
        # example.com is a valid, reservable domain (passes EmailStr); .local is rejected.
        "email": f"load_{tag}@example.com",
        "kvkk_accepted": True,
        "organizer_notice_accepted": True,
        "cross_border_notice_read": True,
        "cross_border_transfer_consent": True,
    }


async def _worker(client, make_request, results, stop_at, error_samples):
    while time.monotonic() < stop_at:
        t0 = time.monotonic()
        try:
            r = await make_request(client)
            results.append((r.status_code, time.monotonic() - t0))
            # Capture a few non-2xx response bodies so failures are diagnosable.
            if not (200 <= r.status_code < 300) and len(error_samples) < 3:
                error_samples.append((r.status_code, r.text[:300]))
        except Exception as e:
            results.append((-1, time.monotonic() - t0))
            if len(error_samples) < 3:
                error_samples.append((-1, repr(e)[:300]))


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://backend:8000")
    ap.add_argument("--mode", choices=["read", "register"], default="read")
    ap.add_argument("--concurrency", type=int, default=50)
    ap.add_argument("--duration", type=int, default=20, help="saniye")
    args = ap.parse_args()

    event_ids: list[int] = []
    if args.mode == "register":
        event_ids = await _discover_event_ids(args.base)
        if not event_ids:
            print("HATA: register modu için public kayıt açık en az bir etkinlik gerekli.")
            return
        print(f"{len(event_ids)} etkinlik bulundu, kayıtlar bunlara dağıtılacak.")

    import itertools
    rr = itertools.cycle(event_ids) if event_ids else None

    async def make_request(client):
        if args.mode == "read":
            return await client.get(f"{args.base}/api/public/events", timeout=30)
        eid = next(rr)
        return await client.post(f"{args.base}/api/events/{eid}/register",
                                 json=_register_payload(), timeout=30)

    print(f"Mod={args.mode} eşzamanlılık={args.concurrency} süre={args.duration}s -> {args.base}")
    results: list[tuple[int, float]] = []
    error_samples: list[tuple[int, str]] = []
    stop_at = time.monotonic() + args.duration
    limits = httpx.Limits(max_connections=args.concurrency + 10,
                          max_keepalive_connections=args.concurrency + 10)
    async with httpx.AsyncClient(limits=limits) as client:
        await asyncio.gather(*[
            _worker(client, make_request, results, stop_at, error_samples)
            for _ in range(args.concurrency)
        ])

    total = len(results)
    if not total:
        print("Hiç istek tamamlanmadı.")
        return
    lats = sorted(dt for _, dt in results)
    ok = sum(1 for s, _ in results if 200 <= s < 300)
    codes: dict[int, int] = {}
    for s, _ in results:
        codes[s] = codes.get(s, 0) + 1

    def pct(p):
        return lats[min(len(lats) - 1, int(len(lats) * p))] * 1000

    print("\n===== SONUÇ =====")
    print(f"Toplam istek      : {total}")
    print(f"Başarılı (2xx)    : {ok} (%{100*ok/total:.1f})")
    print(f"Throughput (RPS)  : {total/args.duration:.1f} istek/sn")
    print(f"Gecikme p50/p95/p99: {pct(0.50):.0f} / {pct(0.95):.0f} / {pct(0.99):.0f} ms")
    print(f"Ortalama gecikme  : {statistics.mean(lats)*1000:.0f} ms")
    print(f"Durum kodu dağılımı: {dict(sorted(codes.items()))}  (-1 = bağlantı/timeout hatası)")
    if error_samples:
        print("\n--- İlk hata örnekleri (durum kodu | gövde) ---")
        for code, body in error_samples:
            print(f"[{code}] {body}")


if __name__ == "__main__":
    asyncio.run(main())
