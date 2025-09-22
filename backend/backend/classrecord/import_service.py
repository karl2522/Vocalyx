import io
import csv
from typing import Any, Dict, List, Tuple

import pandas as pd

from .import_config import (
    normalize_header,
    map_header_to_field,
    REQUIRED_IDENTITY_FIELDS,
    is_identity_field,
)


class ImportParseError(Exception):
    pass


def detect_and_map_headers(raw_headers: List[str]) -> Tuple[List[str], Dict[str, str], List[str]]:
    """
    Returns:
        - mapped_headers: list of canonical field names in order
        - mapping: dict original_header -> mapped_field
        - unmapped: list of headers that could not be matched to identity fields or assessments
    """
    mapping: Dict[str, str] = {}
    unmapped: List[str] = []
    mapped_headers: List[str] = []

    for header in raw_headers:
        normalized = normalize_header(header)
        mapped = map_header_to_field(normalized)
        mapping[header] = mapped
        mapped_headers.append(mapped)
        if not mapped:
            unmapped.append(str(header))

    return mapped_headers, mapping, unmapped


def read_csv_bytes(file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    text = file_bytes.decode("utf-8", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    headers = list(reader.fieldnames or [])
    rows = [row for row in reader]
    return headers, rows


def read_xlsx_bytes(file_bytes: bytes) -> Tuple[List[str], List[Dict[str, Any]]]:
    buffer = io.BytesIO(file_bytes)
    df = pd.read_excel(buffer, dtype=str)  # keep as string; numeric coercion later
    headers = list(df.columns.astype(str))
    rows = df.fillna("").astype(str).to_dict(orient="records")
    return headers, rows


def build_preview(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    lower = filename.lower()
    if lower.endswith(".csv"):
        headers, rows = read_csv_bytes(file_bytes)
    elif lower.endswith(".xlsx"):
        headers, rows = read_xlsx_bytes(file_bytes)
    else:
        raise ImportParseError("Unsupported file type. Use .csv or .xlsx")

    mapped_headers, mapping, unmapped = detect_and_map_headers(headers)

    # Take a small sample for preview
    sample_rows = rows[:10]
    return {
        "headers": headers,
        "mappedHeaders": mapped_headers,
        "mapping": mapping,
        "preview": sample_rows,
        "unmapped": unmapped,
    }


def validate_required_mappings(final_mapping: Dict[str, str]) -> List[str]:
    """Return list of missing required identity fields."""
    mapped_values = set(final_mapping.values())
    missing = [field for field in REQUIRED_IDENTITY_FIELDS if field not in mapped_values]
    return missing


def normalize_rows(rows: List[Dict[str, Any]], final_mapping: Dict[str, str]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Produce normalized rows, separating identity and assessment fields. Return (valid_rows, errors)
    """
    valid: List[Dict[str, Any]] = []
    errors: List[Dict[str, Any]] = []

    for idx, row in enumerate(rows, start=1):
        normalized_row: Dict[str, Any] = {"identity": {}, "assessments": {}}
        for original_header, value in row.items():
            mapped = final_mapping.get(original_header)
            if not mapped:
                continue
            if is_identity_field(mapped):
                normalized_row["identity"][mapped] = (value or "").strip()
            else:
                # assessments/others; coerce numeric when possible
                v = (value or "").strip()
                if v == "":
                    normalized_row["assessments"][mapped] = None
                else:
                    try:
                        normalized_row["assessments"][mapped] = float(v)
                    except ValueError:
                        normalized_row["assessments"][mapped] = v

        # Validate identity completeness
        missing_identity = [f for f in REQUIRED_IDENTITY_FIELDS if not normalized_row["identity"].get(f)]
        if missing_identity:
            errors.append({
                "rowNumber": idx,
                "error": f"Missing required fields: {', '.join(missing_identity)}",
                "row": row,
            })
            continue

        valid.append(normalized_row)

    return valid, errors



