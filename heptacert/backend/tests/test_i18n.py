from starlette.requests import Request

from src.i18n import lang_from_request, normalize_message_lang, t
from src.main import list_builtin_badge_templates
from src.ai_content_api import EmailGenerateIn, _email_fallback


def _request(**headers: str) -> Request:
    encoded_headers = [(name.lower().encode(), value.encode()) for name, value in headers.items()]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": encoded_headers})


def test_explicit_non_turkish_app_locale_falls_back_to_english() -> None:
    assert lang_from_request(_request(**{"X-App-Lang": "de"})) == "en"
    assert lang_from_request(_request(**{"Accept-Language": "fr-FR,fr;q=0.9"})) == "en"
    assert t("event_not_found", "ru") == "Event not found."


def test_turkish_and_absent_language_keep_turkish_default() -> None:
    assert normalize_message_lang("tr-TR") == "tr"
    assert lang_from_request(_request(**{"X-App-Lang": "tr"})) == "tr"
    assert lang_from_request(_request()) == "tr"


def test_ai_email_fallback_uses_english_for_third_language() -> None:
    result = _email_fallback(EmailGenerateIn(intent="invitation", event_name="Demo", language="de"))
    assert result.subject == "Invitation: Demo"
    assert "Dear participant" in result.body


async def test_badge_templates_use_english_for_third_language() -> None:
    result = await list_builtin_badge_templates(lang="de")
    assert result["templates"][0]["name"] == "Early Bird"
