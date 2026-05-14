import re

from fastapi import HTTPException


_URL_RE = re.compile(r"https?://|www\.", re.IGNORECASE)
_REPEATED_CHAR_RE = re.compile(r"(.)\1{7,}", re.IGNORECASE)
_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")
_TOKEN_RE = re.compile(r"[a-z0-9]+")

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


def _clean_public_text(value: str) -> str:
    normalized = (value or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return ""
    lines = [re.sub(r"[ \t\f\v]+", " ", line).strip() for line in normalized.split("\n")]
    cleaned_lines: list[str] = []
    blank_count = 0
    for line in lines:
        if not line:
            blank_count += 1
            if blank_count <= 1 and cleaned_lines:
                cleaned_lines.append("")
            continue
        blank_count = 0
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines).strip()


def moderate_public_text(value: str) -> str:
    cleaned = _clean_public_text(value)
    if len(cleaned) < 2:
        raise HTTPException(status_code=422, detail="Icerik cok kisa.")

    normalized_text = cleaned.lower().translate(_LEETSPEAK_MAP).translate(_TR_MAP)
    normalized_tokens = {_normalize_for_match(token) for token in _TOKEN_RE.findall(normalized_text)}
    if any(term in normalized_tokens for term in _BLOCKED_TERMS):
        raise HTTPException(status_code=422, detail="Icerik topluluk kurallarina uymuyor.")

    url_count = len(_URL_RE.findall(cleaned))
    if url_count > 2:
        raise HTTPException(status_code=422, detail="Cok fazla baglanti iceren icerikler otomatik engellenir.")

    if _REPEATED_CHAR_RE.search(cleaned):
        raise HTTPException(status_code=422, detail="Tekrarlayan/spam gorunumlu icerik algilandi.")

    normalized = _normalize_for_match(cleaned)
    if len(normalized) >= 12 and len(set(normalized)) <= 3:
        raise HTTPException(status_code=422, detail="Anlamsiz veya spam gorunumlu icerik algilandi.")

    return cleaned
