import re

from fastapi import HTTPException


_URL_RE = re.compile(r"https?://|www\.", re.IGNORECASE)
_REPEATED_CHAR_RE = re.compile(r"(.)\1{7,}", re.IGNORECASE)
_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")

_BLOCKED_TERMS = {
    "amk",
    "aq",
    "oc",
    "orospu",
    "orospucocu",
    "pic",
    "sik",
    "sikis",
    "siktir",
    "yarrak",
    "gavat",
    "salak",
    "aptal",
    "gerizekali",
    "mal",
    "fuck",
    "fucking",
    "motherfucker",
    "bitch",
    "asshole",
    "dick",
    "pussy",
    "slut",
    "whore",
}

_LEETSPEAK_MAP = str.maketrans({
    "@": "a",
    "$": "s",
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
})

_TR_MAP = str.maketrans({
    "ç": "c",
    "ğ": "g",
    "ı": "i",
    "ö": "o",
    "ş": "s",
    "ü": "u",
})


def _normalize_for_match(value: str) -> str:
    compact = value.lower().translate(_LEETSPEAK_MAP).translate(_TR_MAP)
    return _NON_ALNUM_RE.sub("", compact)


def moderate_public_text(value: str) -> str:
    cleaned = " ".join((value or "").split()).strip()
    if len(cleaned) < 2:
        raise HTTPException(status_code=422, detail="Icerik cok kisa.")

    normalized = _normalize_for_match(cleaned)
    if any(term in normalized for term in _BLOCKED_TERMS):
        raise HTTPException(status_code=422, detail="Icerik topluluk kurallarina uymuyor.")

    url_count = len(_URL_RE.findall(cleaned))
    if url_count > 2:
        raise HTTPException(status_code=422, detail="Cok fazla baglanti iceren icerikler otomatik engellenir.")

    if _REPEATED_CHAR_RE.search(cleaned):
        raise HTTPException(status_code=422, detail="Tekrarlayan/spam gorunumlu icerik algilandi.")

    if len(normalized) >= 12 and len(set(normalized)) <= 3:
        raise HTTPException(status_code=422, detail="Anlamsiz veya spam gorunumlu icerik algilandi.")

    return cleaned
