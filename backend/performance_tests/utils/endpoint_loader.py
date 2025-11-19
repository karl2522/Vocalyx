import os
import re
from typing import Any, Dict, List, Optional

import yaml

from config.settings import (
    PERF_SUITE,
    PERF_INCLUDE_TAGS,
    PERF_EXCLUDE_TAGS,
    PERF_INCLUDE_ENDPOINTS,
    PERF_EXCLUDE_ENDPOINTS,
    TEST_SHEET_IDS,
)
from utils.helpers import get_auth_headers, log_response_time, validate_response, safe_json_parse  # type: ignore
from config.settings import THRESHOLDS  # type: ignore


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


def _resolve_path_vars(raw: str, env_map: Dict[str, str]) -> Optional[str]:
    """Replace ${VAR} tokens in the path with env_map values. If any token missing, return None to skip."""
    def repl(match: re.Match) -> str:
        var = match.group(1)
        value = env_map.get(var)
        if value is None or value == "":
            raise KeyError(var)
        return value

    try:
        return re.sub(r"\$\{([^}]+)\}", repl, raw)
    except KeyError:
        return None


def load_endpoints_yaml(yaml_path: str) -> Dict[str, Any]:
    with open(yaml_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def select_endpoints(doc: Dict[str, Any], suite: str) -> List[Dict[str, Any]]:
    groups = doc.get("groups", {})
    # Support combined suite that merges current_get and high_priority_get
    if suite == "all":
        items = list(groups.get("current_get", [])) + list(groups.get("high_priority_get", []))
    else:
        items = groups.get(suite, [])

    # Apply tag filters
    if PERF_INCLUDE_TAGS:
        items = [ep for ep in items if set(ep.get("tags", [])).intersection(PERF_INCLUDE_TAGS)]
    if PERF_EXCLUDE_TAGS:
        items = [ep for ep in items if not set(ep.get("tags", [])).intersection(PERF_EXCLUDE_TAGS)]

    # Apply explicit include/exclude path filters
    if PERF_INCLUDE_ENDPOINTS:
        include_set = set(PERF_INCLUDE_ENDPOINTS)
        items = [ep for ep in items if ep.get("path") in include_set]
    if PERF_EXCLUDE_ENDPOINTS:
        exclude_set = set(PERF_EXCLUDE_ENDPOINTS)
        items = [ep for ep in items if ep.get("path") not in exclude_set]

    return items


def build_dynamic_tasks(user_cls, endpoints: List[Dict[str, Any]]):
    """Attach Locust tasks to the provided user class at runtime based on endpoints definitions."""
    # Prepare common env substitutions
    env_map: Dict[str, str] = {
        "TEST_SHEET_ID": (TEST_SHEET_IDS[0] if TEST_SHEET_IDS else ""),
        "TEST_SHEET_NAME": _env("TEST_SHEET_NAME", "Sheet1"),
        "TEST_CLASS_RECORD_ID": _env("TEST_CLASS_RECORD_ID", ""),
        "TEST_STUDENT_ID": _env("TEST_STUDENT_ID", ""),
        "TEST_GRADE_ID": _env("TEST_GRADE_ID", ""),
        "TEST_DRIVE_FILE_ID": _env("TEST_DRIVE_FILE_ID", ""),
    }

    for idx, ep in enumerate(endpoints):
        method = (ep.get("method") or "GET").upper()
        path = ep.get("path") or "/"
        name = ep.get("name") or f"{method} {path}"
        weight = int(ep.get("weight") or 1)
        tags = ep.get("tags") or []
        params = ep.get("params") or {}

        if method != "GET":
            continue  # This loader only builds GET tasks

        resolved_path = path
        # Resolve path variables like {sheet_id} after env substitution tokens are resolved
        # Support ${VAR} placeholder style in YAML first
        if "path_vars" in params:
            # Replace ${VAR} tokens inside path
            tmp = _resolve_path_vars(resolved_path, env_map)
            if tmp is None:
                # Skip endpoint if a required var is missing
                continue
            resolved_path = tmp

        # Also support curly placeholders that are already concrete via env_map
        # e.g., /api/sheets/{sheet_id}/data/ with env_map TEST_SHEET_ID
        resolved_path = resolved_path.replace("{sheet_id}", env_map.get("TEST_SHEET_ID", ""))
        resolved_path = resolved_path.replace("{sheet_name}", env_map.get("TEST_SHEET_NAME", ""))
        resolved_path = resolved_path.replace("{id}", env_map.get("TEST_CLASS_RECORD_ID", ""))

        if "{" in resolved_path or "}" in resolved_path:
            # Unresolved placeholders remain; skip safely
            continue

        # Create a unique function name per endpoint
        func_name = f"task_{idx}_{re.sub(r'[^a-zA-Z0-9_]', '_', name)}"

        def _make_task(path_final: str, task_name: str, task_weight: int):
            def _task(self):
                headers = get_auth_headers(getattr(self, "token", None))
                with self.client.get(
                    path_final,
                    headers=headers,
                    catch_response=True,
                    name=task_name,
                ) as response:
                    log_response_time(response, task_name, THRESHOLDS.get('read', 1000))
                    if response.status_code == 401:
                        response.failure("Authentication required")
                    else:
                        validate_response(response, 200)

            _task.locust_task_weight = task_weight  # type: ignore
            return _task

        task_func = _make_task(resolved_path, name, weight)
        setattr(user_cls, func_name, task_func)


