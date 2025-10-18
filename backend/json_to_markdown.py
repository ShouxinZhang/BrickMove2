#!/usr/bin/env python3
"""
Convert structured JSON proof format to Markdown.
This enforces LLM to output structured JSON instead of freeform markdown.

Usage:
    python3 json_to_markdown.py input.json -o output.md
    python3 json_to_markdown.py input.json  # outputs to stdout
"""

import json
import sys
import argparse
from pathlib import Path


def validate_json_structure(data):
    """Validate the JSON proof structure."""
    errors = []
    
    # Check required top-level fields
    if 'theorem_id' not in data:
        errors.append("Missing required field: 'theorem_id'")
    if 'statement' not in data:
        errors.append("Missing required field: 'statement'")
    if 'steps' not in data:
        errors.append("Missing required field: 'steps'")
    
    # Validate steps
    if 'steps' in data:
        if not isinstance(data['steps'], list):
            errors.append("'steps' must be a list")
        else:
            for idx, step in enumerate(data['steps']):
                if not isinstance(step, dict):
                    errors.append(f"Step {idx+1} must be an object")
                    continue
                
                # Check step fields
                if 'description' not in step:
                    errors.append(f"Step {idx+1}: missing 'description'")
                
                # title is optional
                # apis is optional but if present must be list
                if 'apis' in step and not isinstance(step['apis'], list):
                    errors.append(f"Step {idx+1}: 'apis' must be a list of strings")
    
    return errors


def json_to_markdown(data):
    """Convert validated JSON to markdown format."""
    md_lines = []
    
    # Theorem header
    theorem_id = data.get('theorem_id', '')
    md_lines.append(f"### 定理 {theorem_id}\n")
    
    # Statement
    statement = data.get('statement', '').strip()
    md_lines.append(f"{statement}\n")
    md_lines.append("---\n")
    
    # Proof section
    md_lines.append("### 证明\n")
    
    # Steps
    steps = data.get('steps', [])
    for idx, step in enumerate(steps):
        step_num = idx + 1
        
        # Step header
        step_header = f"### Step {step_num}"
        if 'title' in step and step['title'].strip():
            step_header += f": {step['title'].strip()}"
        md_lines.append(f"{step_header}\n")
        
        # Step description (if exists)
        description = step.get('description', '').strip()
        if description:
            md_lines.append(f"{description}\n")
        
        # Check for substeps
        if 'substeps' in step and step['substeps']:
            # Render substeps as bullet list
            for substep in step['substeps']:
                substep_desc = substep.get('description', '').strip()
                if substep_desc:
                    md_lines.append(f"- {substep_desc}")
                    
                    # API2 (2分 - single exact)
                    if 'api2' in substep and substep['api2']:
                        api_list = [f"`{api.strip()}`" for api in substep['api2'] if api.strip()]
                        if api_list:
                            md_lines.append(f"  - API (2分): {', '.join(api_list)}")
                    
                    # API1 (1分 - combine exact)
                    if 'api1' in substep and substep['api1']:
                        api_list = [f"`{api.strip()}`" for api in substep['api1'] if api.strip()]
                        if api_list:
                            md_lines.append(f"  - API (1分): {', '.join(api_list)}")
            md_lines.append("")  # Empty line after substeps
        else:
            # Old format: APIs directly under step
            if 'apis' in step and step['apis']:
                api_list = [f"`{api.strip()}`" for api in step['apis'] if api.strip()]
                if api_list:
                    md_lines.append(f"API: {', '.join(api_list)}\n")
    
    return '\n'.join(md_lines)


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
    
    # Read input JSON
    try:
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File '{args.input}' not found", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON - {e}", file=sys.stderr)
        sys.exit(1)
    
    # Validate structure
    errors = validate_json_structure(data)
    if errors:
        print("❌ Validation errors:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        sys.exit(1)
    
    if args.validate_only:
        print("✅ JSON structure is valid")
        sys.exit(0)
    
    # Convert to markdown
    markdown = json_to_markdown(data)
    
    # Output
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(markdown)
        print(f"✅ Markdown written to {args.output}")
    else:
        print(markdown)


if __name__ == '__main__':
    main()
