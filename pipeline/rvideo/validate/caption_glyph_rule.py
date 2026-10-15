"""Which combining marks the burned-in caption fonts (Inter, Noto Sans SC) display correctly."""
from __future__ import annotations

import unicodedata

# Verified in headless Chrome with the player's fonts at caption size: these sit centred over Latin letters.
# U+0304 (macron) is absent from the list: it renders invisibly over "f" and offset to the right over "B";
# write a bar with U+0305 instead.
ALLOWED_COMBINING_MARKS: frozenset[int] = frozenset({0x0302, 0x0303, 0x0305})


class CaptionGlyphRule:
    @staticmethod
    def violations(text: str) -> list[str]:
        """One message per combining mark outside ALLOWED_COMBINING_MARKS, naming the mark and its base letter."""
        found: list[str] = []
        for i, ch in enumerate(text):
            if unicodedata.combining(ch) and ord(ch) not in ALLOWED_COMBINING_MARKS:
                base = text[i - 1] if i > 0 else ""
                found.append(f"U+{ord(ch):04X} {unicodedata.name(ch, '?').lower()} after {base!r} at {i}")
        return found
