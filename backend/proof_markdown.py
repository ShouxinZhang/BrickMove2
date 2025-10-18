#!/usr/bin/env python3
"""
Shared helpers for converting structured Lean proof JSON into Markdown.

This module is consumed both by the CLI tool (json_to_markdown.py) and the
Flask server so that we have a single authoritative implementation of the
Markdown format.
"""

from __future__ import annotations

from typing import Iterable, List, Mapping, Sequence


def validate_proof_json(data: Mapping) -> List[str]:
    """Return a list of validation error messages for the proof JSON payload."""
    errors: List[str] = []

    def require_field(name: str) -> None:
        if name not in data:
            errors.append(f"Missing required field: '{name}'")

    require_field("theorem_id")
    require_field("statement")
    require_field("steps")

    steps = data.get("steps")
    if steps is None:
        return errors

    if not isinstance(steps, Sequence) or isinstance(steps, (str, bytes)):
        errors.append("'steps' must be a list")
        return errors

    for idx, step in enumerate(steps, start=1):
        if not isinstance(step, Mapping):
            errors.append(f"Step {idx} must be an object")
            continue

        if "description" not in step and not step.get("substeps"):
            errors.append(f"Step {idx}: missing 'description'")

        if "apis" in step and not isinstance(step["apis"], Sequence):
            errors.append(f"Step {idx}: 'apis' must be a list of strings")

        substeps = step.get("substeps")
        if substeps and (not isinstance(substeps, Sequence) or isinstance(substeps, (str, bytes))):
            errors.append(f"Step {idx}: 'substeps' must be a list")
            continue

        if isinstance(substeps, Sequence):
            for sub_idx, substep in enumerate(substeps, start=1):
                if not isinstance(substep, Mapping):
                    errors.append(f"Step {idx} 子步骤 {sub_idx} 必须是对象")
                    continue
                if "description" not in substep:
                    errors.append(f"Step {idx} 子步骤 {sub_idx}: missing 'description'")

    return errors


def build_markdown(data: Mapping) -> str:
    """
    Convert a validated proof JSON mapping to Markdown.

    The structure mirrors the front-end preview and supports both the legacy
    ``apis`` field and the newer ``substeps`` format with ``api2``/``api1``.
    """
    lines: List[str] = []

    theorem_id = (data.get("theorem_id") or "").strip()
    lines.append(f"### 定理 {theorem_id}")
    lines.append("")

    statement = (data.get("statement") or "").strip()
    lines.append(statement)
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("### 证明")
    lines.append("")

    steps = data.get("steps")
    if not isinstance(steps, Sequence) or isinstance(steps, (str, bytes)):
        return "\n".join(lines)

    for idx, step in enumerate(steps, start=1):
        if not isinstance(step, Mapping):
            continue

        has_description = bool((step.get("description") or "").strip())
        substeps = step.get("substeps") if isinstance(step.get("substeps"), Sequence) else []
        if not has_description and not substeps:
            continue

        heading = f"### Step {idx}"
        title = (step.get("title") or "").strip()
        if title:
            heading += f": {title}"
        lines.append(heading)
        lines.append("")

        if has_description:
            lines.append((step.get("description") or "").strip())
            lines.append("")

        if substeps:
            appended_substeps = False
            for s_idx, substep in enumerate(substeps):
                if not isinstance(substep, Mapping):
                    continue
                description = (substep.get("description") or "").strip()
                if not description:
                    continue

                lines.append(f"- {description}")
                appended_substeps = True

                api2 = _format_api_list(substep.get("api2"))
                if api2:
                    lines.append(f"  - API (2分): {api2}")

                api1 = _format_api_list(substep.get("api1"))
                if api1:
                    lines.append(f"  - API (1分): {api1}")

            if appended_substeps:
                lines.append("")
        else:
            legacy_api = _format_api_list(step.get("apis") or step.get("api"))
            if legacy_api:
                lines.append(f"API: {legacy_api}")
                lines.append("")

    return "\n".join(lines)


def _format_api_list(raw: object) -> str:
    if raw is None:
        return ""

    if isinstance(raw, str):
        entries = raw.split(",")
    elif isinstance(raw, Iterable):
        entries = list(raw)
    else:
        return ""

    cleaned = [
        str(entry).strip()
        for entry in entries
        if isinstance(entry, (str, bytes)) or isinstance(entry, (int, float))
    ]
    cleaned = [entry for entry in cleaned if entry]

    if not cleaned:
        return ""

    return ", ".join(f"`{entry}`" for entry in cleaned)


__all__ = ["build_markdown", "validate_proof_json"]
