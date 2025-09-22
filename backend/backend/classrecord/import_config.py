import re
from typing import Dict, List, Set


# Identity fields expected in the template
REQUIRED_IDENTITY_FIELDS: Set[str] = {
    "NO",
    "LASTNAME",
    "FIRSTNAME",
    "MIDDLENAME",
    "STUDENT ID",
}


# Synonyms map for header normalization and auto-matching
HEADER_SYNONYMS: Dict[str, str] = {
    # Row / Number
    "#": "NO",
    "NO": "NO",
    "NO.": "NO",
    "NUMBER": "NO",
    "ROW": "NO",
    "INDEX": "NO",

    # Names
    "LASTNAME": "LASTNAME",
    "LAST NAME": "LASTNAME",
    "SURNAME": "LASTNAME",
    "FAMILY NAME": "LASTNAME",

    "FIRSTNAME": "FIRSTNAME",
    "FIRST NAME": "FIRSTNAME",
    "GIVEN NAME": "FIRSTNAME",

    "MIDDLENAME": "MIDDLENAME",
    "MIDDLE NAME": "MIDDLENAME",
    "MI": "MIDDLENAME",

    # Student ID
    "ID": "STUDENT ID",
    "STUDENT ID": "STUDENT ID",
    "STUDENTID": "STUDENT ID",
    "SID": "STUDENT ID",
    "STUDENT NUMBER": "STUDENT ID",
}


# Patterns to identify assessment categories
ASSESSMENT_PATTERNS: List[re.Pattern] = [
    re.compile(r"^QUIZ\b", re.I),
    re.compile(r"^LAB\b", re.I),
    re.compile(r"^EXAM\b|^MIDTERM\b|^FINAL\b", re.I),
    re.compile(r"^ASSIGNMENT\b|^HW\b|^HOMEWORK\b", re.I),
    re.compile(r"^ATTENDANCE\b", re.I),
    re.compile(r"^PROJECT\b", re.I),
    re.compile(r"^RECITATION\b|^ORAL\b", re.I),
]


def normalize_header(raw: str) -> str:
    if raw is None:
        return ""
    # Remove extra spaces and punctuation, uppercase for matching
    cleaned = re.sub(r"[^A-Za-z0-9]+", " ", str(raw)).strip().upper()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def map_header_to_field(normalized: str) -> str:
    # Direct synonym map
    if normalized in HEADER_SYNONYMS:
        return HEADER_SYNONYMS[normalized]
    # If it matches assessment patterns, keep original for assessment column
    for pattern in ASSESSMENT_PATTERNS:
        if pattern.search(normalized):
            return normalized
    # Fallback: return original normalized (treated as assessment later)
    return normalized


def is_identity_field(field_name: str) -> bool:
    return field_name in REQUIRED_IDENTITY_FIELDS



