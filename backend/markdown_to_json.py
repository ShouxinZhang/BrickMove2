#!/usr/bin/env python3
"""
Parsing helpers for converting the Markdown emitted by ``proof_markdown.build_markdown``
back into the structured JSON format expected by the editor.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

__all__ = ["MarkdownParseError", "markdown_to_json"]


class MarkdownParseError(ValueError):
    """Raised when the Markdown proof cannot be parsed safely."""


STEP_HEADING_RE = re.compile(r"^###\s*Step\s+(\d+)(?::\s*(.*))?\s*$")
THEOREM_HEADING_RE = re.compile(r"^###\s*定理\s*(.*)$")
PROOF_HEADING_RE = re.compile(r"^###\s*证明\s*$")


def markdown_to_json(markdown: str) -> Dict:
    """
    Parse the constrained Markdown representation into a structured proof JSON object.

    The accepted Markdown is assumed to come from ``build_markdown``; parsing is therefore
    intentionally strict so that unexpected user edits are surfaced as errors instead of
    producing malformed JSON.
    """
    if not isinstance(markdown, str):
        raise MarkdownParseError("Markdown payload必须是字符串")

    # Normalise line endings and trim trailing whitespace for easier pattern matching.
    lines = [
        line.rstrip()
        for line in markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    ]
    if not any(line.strip() for line in lines):
        raise MarkdownParseError("Markdown 内容为空")

    index = 0
    total = len(lines)

    def current_line() -> Optional[str]:
        return lines[index] if index < total else None

    def advance() -> None:
        nonlocal index
        index += 1

    def skip_blank_lines() -> None:
        nonlocal index
        while index < total and lines[index].strip() == "":
            index += 1

    skip_blank_lines()
    line = current_line()
    if line is None:
        raise MarkdownParseError("Markdown 内容为空")

    match = THEOREM_HEADING_RE.match(line.strip())
    if not match:
        raise MarkdownParseError("缺少以 '### 定理' 开头的标题")
    theorem_id = match.group(1).strip()
    advance()

    # Collect statement until we encounter the horizontal rule (---).
    statement_lines: List[str] = []
    while index < total and lines[index].strip() != "---":
        statement_lines.append(lines[index])
        advance()

    if index >= total or lines[index].strip() != "---":
        raise MarkdownParseError("缺少分隔线 '---'")
    advance()  # consume '---'

    statement = "\n".join(statement_lines).strip()

    skip_blank_lines()
    if index >= total or not PROOF_HEADING_RE.match(lines[index].strip()):
        raise MarkdownParseError("缺少 '### 证明' 段落")
    advance()

    steps: List[Dict] = []

    while index < total:
        skip_blank_lines()
        if index >= total:
            break

        heading = lines[index].strip()
        if not heading:
            advance()
            continue

        step_match = STEP_HEADING_RE.match(heading)
        if not step_match:
            raise MarkdownParseError(f"无法解析的行: '{heading}'")

        step_title = (step_match.group(2) or "").strip()
        advance()

        skip_blank_lines()

        description_lines: List[str] = []
        while index < total:
            line = lines[index]
            stripped = line.strip()
            if not stripped:
                # Peek at the next meaningful line to decide whether the blank belongs to the
                # description or marks the start of the next block.
                lookahead = index + 1
                while lookahead < total and lines[lookahead].strip() == "":
                    lookahead += 1
                if lookahead >= total:
                    index = lookahead
                    break
                next_stripped = lines[lookahead].strip()
                if next_stripped.startswith("### Step") or next_stripped.startswith("- ") or next_stripped.startswith("API:"):
                    index = lookahead
                    break
                description_lines.append("")
                advance()
                continue

            if stripped.startswith("### Step") or stripped.startswith("- ") or stripped.startswith("API:"):
                break

            description_lines.append(line)
            advance()

        description = "\n".join(description_lines).strip()

        substeps, index = _consume_substeps(lines, index, total)

        # Consume trailing blank lines before checking for legacy API field.
        skip_blank_lines()

        legacy_apis: Optional[List[str]] = None
        if index < total and lines[index].strip().startswith("API:"):
            legacy_apis = _parse_api_list_line(lines[index])
            advance()

        skip_blank_lines()

        step_payload: Dict = {}
        if step_title:
            step_payload["title"] = step_title
        if description:
            step_payload["description"] = description

        if substeps:
            step_payload["substeps"] = substeps
        elif legacy_apis:
            step_payload["apis"] = legacy_apis
        # If neither substeps nor legacy APIs are present and description is empty, skip the step.
        has_meaningful_content = any(
            key in step_payload for key in ("description", "substeps", "apis")
        )
        if has_meaningful_content:
            steps.append(step_payload)

    return {
        "theorem_id": theorem_id,
        "statement": statement,
        "steps": steps,
    }


def _consume_substeps(lines: List[str], index: int, total: int) -> Tuple[List[Dict], int]:
    """Consume consecutive substep blocks and return (substeps, new_index)."""
    substeps: List[Dict] = []
    while index < total:
        line = lines[index]
        if line.strip() == "":
            index += 1
            continue

        if not line.startswith("- "):
            break

        substep, index = _consume_single_substep(lines, index, total)
        substeps.append(substep)

    return substeps, index


def _consume_single_substep(lines: List[str], index: int, total: int) -> Tuple[Dict, int]:
    """Parse one substep starting at ``index`` returning (payload, new_index)."""
    line = lines[index]
    description = line[2:].strip()
    index += 1

    api1: List[str] = []
    api2: List[str] = []

    while index < total:
        nested_line = lines[index]
        stripped = nested_line.strip()
        if not stripped:
            index += 1
            continue

        if nested_line.startswith("  - "):
            content = nested_line[4:].strip()
            if content.startswith("API (2分):"):
                api2 = _parse_api_list_line(content)
                index += 1
                continue
            if content.startswith("API (1分):"):
                api1 = _parse_api_list_line(content)
                index += 1
                continue

        break

    substep: Dict = {"description": description}
    if api2:
        substep["api2"] = api2
    if api1:
        substep["api1"] = api1
    return substep, index


def _parse_api_list_line(line: str) -> List[str]:
    """Extract API identifiers from a line such as ``API (2分): `foo`, `bar``."""
    if ":" in line:
        _, line = line.split(":", 1)
    text = line.strip()
    matches = [match.strip() for match in re.findall(r"`([^`]+)`", text)]
    if matches:
        return [entry for entry in matches if entry]

    # Fallback: split by comma if no backticks were found.
    entries = [entry.strip(" `") for entry in text.split(",")]
    return [entry for entry in entries if entry]
