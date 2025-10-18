#!/usr/bin/env python3
import argparse
import csv
import sys
from pathlib import Path
from typing import List, Tuple, Dict


def parse_blocks(md_path: Path):
    text = md_path.read_text(encoding="utf-8", errors="replace")
    lines = text.splitlines()
    blocks = []

    in_input = False
    input_lines: List[str] = []
    in_points = False
    current_points: List[Tuple[str, int]] = []

    def flush_block():
        nonlocal input_lines, current_points
        if input_lines or current_points:
            blocks.append({
                "search_input": "\n".join(input_lines).strip(),
                "points": list(current_points),
            })
        input_lines = []
        current_points = []

    for raw in lines:
        stripped = raw.strip()

        # Start of a new search input (be forgiving with stray quote placement)
        if stripped.startswith('"search input"') or stripped.startswith('search input"'):
            # New block starts; flush any previous
            if input_lines or current_points:
                flush_block()
            in_input = True
            in_points = False
            # capture this line sans the key prefix for cleanliness
            # Keep the text after the first colon, if present
            if ":" in raw:
                input_lines.append(raw.split(":", 1)[1].strip())
            else:
                input_lines.append(raw)
            continue

        # Start of search points
        if stripped.startswith('"search points"'):
            in_points = True
            in_input = False
            continue

        if in_input:
            # collect all lines of the input block until we see search points/new input
            input_lines.append(raw)
            continue

        if in_points:
            if stripped.startswith("-"):
                # Try parsing "- Name : 0" or "- Name: 0" or with full-width colon
                line = stripped[1:].strip()
                # Split at the last colon to be robust to colons in API names
                # Support ASCII ':' and full-width '：'
                if "：" in line:
                    sep = "："
                else:
                    sep = ":"
                if sep in line:
                    left, right = line.rsplit(sep, 1)
                    api = left.strip()
                    try:
                        point = int(right.strip())
                    except ValueError:
                        # skip unparseable
                        continue
                    current_points.append((api, point))
                continue
            # Blank line or something else ends the points block
            if stripped == "" or stripped.startswith('"search input"') or stripped.startswith('search input"'):
                in_points = False
                # If next block starts immediately, loop will handle it
                continue

    # flush trailing block
    if input_lines or current_points:
        flush_block()

    return blocks


def collect_rows(folder: Path):
    rows = []
    for md_path in sorted(folder.glob("*.md")):
        blocks = parse_blocks(md_path)
        for i, b in enumerate(blocks, start=1):
            si = b.get("search_input", "")
            for api, point in b.get("points", []):
                rows.append({
                    "file": md_path.name,
                    "block": i,
                    "api": api,
                    "point": point,
                    "search_input": si,
                })
    return rows


def write_xlsx(rows: List[Dict], out_path: Path):
    try:
        from openpyxl import Workbook  # type: ignore
    except Exception as e:
        return False, e
    wb = Workbook()
    ws = wb.active
    ws.title = "points"
    headers = ["file", "block", "api", "point", "search_input"]
    ws.append(headers)
    for r in rows:
        ws.append([r[h] for h in headers])
    wb.save(out_path)
    return True, None


def write_csv(rows: List[Dict], out_path: Path):
    headers = ["file", "block", "api", "point", "search_input"]
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        for r in rows:
            w.writerow(r)


def main():
    parser = argparse.ArgumentParser(description="Export search points from Markdown to Excel (.xlsx).")
    parser.add_argument("path", nargs="?", default="output", help="Folder with normalized Markdown files (default: output)")
    parser.add_argument("--out", default="points.xlsx", help="Output Excel filename (default: points.xlsx)")
    parser.add_argument("--csv-fallback", action="store_true", help="If openpyxl is missing, write CSV with the same basename.")
    args = parser.parse_args()

    folder = Path(args.path).resolve()
    if not folder.exists() or not folder.is_dir():
        print(f"Error: '{folder}' is not a directory.", file=sys.stderr)
        return 2

    rows = collect_rows(folder)
    if not rows:
        print(f"No rows found under {folder}.")
        return 0

    out_path = (folder / args.out) if not Path(args.out).is_absolute() else Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    ok, err = write_xlsx(rows, out_path)
    if ok:
        print(f"Wrote Excel: {out_path}")
        return 0
    if args.csv_fallback:
        csv_path = out_path.with_suffix(".csv")
        write_csv(rows, csv_path)
        print(f"openpyxl not available ({err}). Wrote CSV instead: {csv_path}")
        return 0
    print(
        "Failed to write .xlsx because 'openpyxl' is not installed. "
        "Install it with 'pip install openpyxl' or rerun with --csv-fallback.",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
