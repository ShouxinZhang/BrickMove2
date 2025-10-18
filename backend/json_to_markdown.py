#!/usr/bin/env python3
"""
Convert structured JSON proof format to Markdown.
This enforces LLM to output structured JSON instead of freeform markdown.

Usage:
    python3 json_to_markdown.py input.json -o output.md
    python3 json_to_markdown.py input.json  # outputs to stdout
"""

import argparse
import json
import sys

from proof_markdown import build_markdown, validate_proof_json


def main():
    parser = argparse.ArgumentParser(
        description='Convert structured JSON proof to Markdown',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Example JSON format:
{
  "theorem_id": "100",
  "statement": "存在交换环 $R$ 使得 $\\\\text{Spec}(R)$ 有限但 $R$ 不是诺特环。",
  "steps": [
    {
      "title": "构造环",
      "description": "令 $R = \\\\mathbb{Z}[x_1, x_2, x_3, \\\\ldots]$，这是无穷多个变量的多项式环。",
      "apis": ["Polynomial", "MvPolynomial"]
    },
    {
      "description": "证明 $\\\\text{Spec}(R)$ 只包含零理想。",
      "apis": ["PrimeSpectrum", "Ideal.isPrime"]
    }
  ]
}
        """
    )
    parser.add_argument('input', help='Input JSON file')
    parser.add_argument('-o', '--output', help='Output markdown file (default: stdout)')
    parser.add_argument('--validate-only', action='store_true', help='Only validate JSON structure')

    args = parser.parse_args()

    try:
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File '{args.input}' not found", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON - {e}", file=sys.stderr)
        sys.exit(1)

    errors = validate_proof_json(data)
    if errors:
        print("❌ Validation errors:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)

    if args.validate_only:
        print("✅ JSON structure is valid")
        sys.exit(0)

    markdown = build_markdown(data)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(markdown)
        print(f"✅ Markdown written to {args.output}")
    else:
        print(markdown)


if __name__ == '__main__':
    main()
