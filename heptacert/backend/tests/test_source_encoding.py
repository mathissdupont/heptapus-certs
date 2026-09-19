from pathlib import Path


SOURCE_ROOT = Path(__file__).resolve().parents[1] / "src"

# These characters commonly appear when UTF-8 text is decoded as Windows-1252.
# Unicode escapes keep the detector itself from triggering the scan.
MOJIBAKE_MARKERS = (
    "\u00c2",
    "\u00c3",
    "\u00c4",
    "\u00c5",
    "\u00e2\u20ac",
    "\ufffd",
)


def test_python_sources_do_not_contain_mojibake() -> None:
    failures: list[str] = []

    for source_file in sorted(SOURCE_ROOT.rglob("*.py")):
        for line_number, line in enumerate(
            source_file.read_text(encoding="utf-8").splitlines(), start=1
        ):
            if any(marker in line for marker in MOJIBAKE_MARKERS):
                relative_path = source_file.relative_to(SOURCE_ROOT.parent)
                failures.append(f"{relative_path}:{line_number}: {line.strip()}")

    assert not failures, "Mojibake found in active backend sources:\n" + "\n".join(failures)
