#!/bin/bash
# Batch extract APIs from all Lean files

cd "$(dirname "$0")/.."

LEAN_DIR="data/lean"
API_DIR="data/apis"
EXTRACTOR="backend/extract_apis_json.py"

mkdir -p "$API_DIR"

for lean_file in "$LEAN_DIR"/*.lean; do
    if [ -f "$lean_file" ]; then
        basename=$(basename "$lean_file" .lean)
        echo "Extracting APIs from $basename.lean..."
        python3 "$EXTRACTOR" "$lean_file" > "$API_DIR/$basename.json"
        echo "  ✅ Saved to $API_DIR/$basename.json"
    fi
done

echo "Done! Extracted APIs for all Lean files."
