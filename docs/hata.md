# Hata Günlüğü

## ✅ ÇÖZÜLDÜ — DuplicateTableError: ix_lms_journeys_org_id (2026-06-08)

**Hata:**

```text
sqlalchemy.exc.ProgrammingError: relation "ix_lms_journeys_org_id" already exists
[SQL: CREATE INDEX ix_lms_journeys_org_id ON lms_journeys (org_id)]
```

**Sebep:**
`main.py` startup handler'ında `Base.metadata.create_all` `checkfirst=True` olmadan çağrılıyordu.
LMS modelleri import edildiğinde SQLAlchemy var olan index'leri yeniden oluşturmaya çalışıyor, crash oluyordu.

**Çözüm (main.py ~5710):**

```python
# ESKİ (bozuk)
await conn.run_sync(Base.metadata.create_all)

# YENİ (düzeltilmiş)
await conn.run_sync(lambda conn: Base.metadata.create_all(conn, checkfirst=True))
```

Backend artık başarıyla başlıyor.
