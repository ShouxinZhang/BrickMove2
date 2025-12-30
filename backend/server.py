#!/usr/bin/env python3
"""
Local web server for Lean proof documentation editor.
Integrates API extraction with HTML interface.

Usage:
    python3 server.py
    Then open: http://localhost:5000
"""

import re
from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from proof_markdown import build_markdown, validate_proof_json
from markdown_to_json import markdown_to_json, MarkdownParseError
from csv_storage import (
    CsvStorageError,
    save_csv_file,
    get_default_directory,
    save_csv_content,
    save_md_content,
    save_json_content,
)

app = Flask(__name__, static_folder='../frontend')
CORS(app)

BASE_DIR = Path(__file__).parent.parent
DEFAULT_CSV_DIR = get_default_directory(BASE_DIR)


def is_likely_api(name):
    """Filter to identify likely API names."""
    excluded = {
        'intro', 'apply', 'exact', 'rw', 'simp', 'ring', 'field_simp',
        'have', 'let', 'by', 'sorry', 'theorem', 'lemma', 'def', 'Mathlib'
    }

    lower = name.lower()
    if any(ex in lower for ex in excluded):
        return False

    # Must have namespace (dot) OR be custom lemma (lowercase with underscore)
    if '.' in name:
        return name[0].isupper()

    # Unqualified: only allow lowercase_with_underscore (custom lemmas)
    if name[0].islower():
        return '_' in name and len(name) >= 5

    # Reject standalone uppercase words
    return False


def extract_local_vars(code):
    """Extract local variable names to filter out."""
    local_vars = set()
    
    var_patterns = [
        r'\b(?:let|have|intro|rcases|obtain|use)\s+([a-zA-Z_][a-zA-Z0-9_\']*)',
        r'\bfun\s+([a-zA-Z_][a-zA-Z0-9_\']*)\s*(?::|=>)',
    ]
    
    for pattern in var_patterns:
        for match in re.finditer(pattern, code):
            local_vars.add(match.group(1))
    
    sig_pattern = r'(?:theorem|lemma|def)\s+\w+[^:]*\(([^)]*)\)'
    for match in re.finditer(sig_pattern, code):
        params = match.group(1)
        for param in params.split(','):
            param_name = param.split(':')[0].strip()
            if param_name and re.match(r'^[a-zA-Z_]', param_name):
                local_vars.add(param_name)
    
    forall_pattern = r'∀\s*\(?([a-zA-Z_][a-zA-Z0-9_\']*)'
    for match in re.finditer(forall_pattern, code):
        local_vars.add(match.group(1))
    
    return local_vars


def extract_apis_from_code(code):
    """Extract API names from Lean code."""
    local_vars = extract_local_vars(code)
    apis = set()
    
    # Common documentation words that should not be treated as APIs
    doc_words = {
        'any', 'all', 'some', 'hence', 'thus', 'then', 'also',
        'helper', 'note', 'from', 'this', 'that', 'will', 'must',
        'can', 'may', 'should', 'would', 'could', 'the', 'and',
        'but', 'for', 'not', 'are', 'was', 'were', 'been', 'being',
        'there', 'exists'
    }
    
    # Lean tactics and commands to exclude
    tactics = {
        'set_option', 'push_neg', 'rcases', 'obtain', 'refine',
        'show', 'change', 'use', 'constructor', 'left', 'right'
    }
    
    def is_local_variable(name):
        """Check if name matches local variable patterns."""
        import re
        # h_, hx_, hn_, etc. are local hypotheses
        if re.match(r'^h[a-z]?_', name):
            return True
        # Single letter followed by underscore
        if re.match(r'^[a-z]_', name):
            return True
        return False
    
    # Track opened namespaces
    opened_namespaces = set()
    open_pattern = r'\bopen\s+([A-Z][a-zA-Z0-9_]*(?:\s+[A-Z][a-zA-Z0-9_]*)*)'
    for match in re.finditer(open_pattern, code):
        namespaces = match.group(1).split()
        opened_namespaces.update(namespaces)
    
    api_pattern = r'\b([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\b'
    
    for line in code.split('\n'):
        line = line.strip()
        if line.startswith('--') or line.startswith('import'):
            continue
        
        for match in re.finditer(api_pattern, line):
            api = match.group(1)

            first_part = api.split('.')[0]
            if first_part in local_vars:
                continue

            is_qualified = '.' in api
            starts_upper = api[0].isupper()
            starts_lower = api[0].islower()
            
            # Try to restore namespace from open statements
            if not is_qualified and opened_namespaces:
                for ns in opened_namespaces:
                    if starts_lower and '_' in api:
                        api = f"{ns}.{api}"
                        is_qualified = True
                        break

            # For unqualified names (no dot):
            # - Uppercase: skip (standalone types like Field, Finite)
            # - Lowercase: must have underscore AND be >= 5 chars
            if not is_qualified:
                if starts_lower:
                    if '_' not in api or len(api) < 5:
                        continue
                else:
                    # Skip standalone uppercase words
                    continue

            parts = api.split('.')
            if len(parts) == 2:
                common_fields = {
                    'FG', 'IsPrime', 'isPrime', 'asIdeal', 'toFun',
                    'toRingHom', 'toAlgHom', 'val', 'property'
                }
                if parts[1] in common_fields and parts[0][0].islower():
                    continue
            
            # Filter out common documentation words
            if api.lower() in doc_words:
                continue
            
            # Filter out tactics and commands
            if api.lower() in tactics:
                continue
            
            # Filter out local variable patterns
            if is_local_variable(api):
                continue

            if not any(part[0].isupper() for part in parts if part) and '_' not in api:
                continue

            if is_likely_api(api):
                # Remove Lean projection suffixes (.mp, .mpr, .1, .2, etc.)
                api = re.sub(r'\.(mp|mpr|\d+)$', '', api)
                apis.add(api)
    
    return sorted(apis)


@app.route('/')
def index():
    """Serve the main HTML page."""
    return send_from_directory('../frontend', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files."""
    return send_from_directory('../frontend', path)


@app.route('/api/extract-apis', methods=['POST'])
def extract_apis():
    """Extract APIs from uploaded Lean code."""
    try:
        data = request.get_json()
        
        if 'code' in data:
            # Direct code input
            code = data['code']
        elif 'file' in data:
            # File path
            filepath = BASE_DIR / data['file']
            with open(filepath, 'r', encoding='utf-8') as f:
                code = f.read()
        else:
            return jsonify({'error': 'No code or file provided'}), 400
        
        apis = extract_apis_from_code(code)
        
        return jsonify({
            'success': True,
            'count': len(apis),
            'apis': apis
        })
    
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    """Save uploaded CSV files into the workspace csv_save directory."""
    uploaded = request.files.get('file')
    if uploaded is None or not uploaded.filename:
        return jsonify({'error': 'No file provided'}), 400

    requested_dir = request.form.get('target_dir') or request.args.get('target_dir')

    try:
        saved_path = save_csv_file(uploaded, BASE_DIR, requested_dir)
    except CsvStorageError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:  # Unexpected errors
        return jsonify({'error': str(exc)}), 500

    try:
        relative_path = saved_path.relative_to(BASE_DIR)
    except ValueError:
        relative_path = saved_path

    return jsonify({
        'success': True,
        'path': str(relative_path),
        'absolute_path': str(saved_path),
        'default_directory': str(DEFAULT_CSV_DIR),
        'requested_directory': requested_dir
    })


@app.route('/api/save-csv-content', methods=['POST'])
def save_csv_content_api():
    """Save CSV content posted from the client directly to disk."""
    try:
        payload = request.get_json()
        if not isinstance(payload, dict):
            return jsonify({'error': 'Invalid JSON payload'}), 400

        content = payload.get('content')
        if not isinstance(content, str):
            return jsonify({'error': 'Field "content" (string) is required'}), 400

        filename = payload.get('filename')
        requested_dir = payload.get('target_dir') or payload.get('directory')
        overwrite = bool(payload.get('overwrite', False))

        saved_path = save_csv_content(
            content,
            BASE_DIR,
            filename=filename,
            requested_directory=requested_dir,
            overwrite=overwrite,
        )

        try:
            relative_path = saved_path.relative_to(BASE_DIR)
        except ValueError:
            relative_path = saved_path

        return jsonify({
            'success': True,
            'path': str(relative_path),
            'absolute_path': str(saved_path),
            'default_directory': str(DEFAULT_CSV_DIR),
            'requested_directory': requested_dir
        })
    except CsvStorageError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/api/save-md-content', methods=['POST'])
def save_md_content_api():
    try:
        payload = request.get_json()
        if not isinstance(payload, dict):
            return jsonify({'error': 'Invalid JSON payload'}), 400
        content = payload.get('content')
        if not isinstance(content, str):
            return jsonify({'error': 'Field "content" (string) is required'}), 400
        filename = payload.get('filename')
        requested_dir = payload.get('target_dir') or payload.get('directory')
        overwrite = bool(payload.get('overwrite', False))
        saved_path = save_md_content(content, BASE_DIR, filename, requested_dir, overwrite)
        try:
            relative_path = saved_path.relative_to(BASE_DIR)
        except ValueError:
            relative_path = saved_path
        return jsonify({'success': True, 'path': str(relative_path), 'absolute_path': str(saved_path)})
    except CsvStorageError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/api/save-json-content', methods=['POST'])
def save_json_content_api():
    try:
        payload = request.get_json()
        if not isinstance(payload, dict):
            return jsonify({'error': 'Invalid JSON payload'}), 400
        # Accept "json" or "content"
        content = payload.get('json', payload.get('content'))
        if content is None:
            return jsonify({'error': 'Field "json" or "content" is required'}), 400
        filename = payload.get('filename')
        requested_dir = payload.get('target_dir') or payload.get('directory')
        overwrite = bool(payload.get('overwrite', False))
        saved_path = save_json_content(content, BASE_DIR, filename, requested_dir, overwrite)
        try:
            relative_path = saved_path.relative_to(BASE_DIR)
        except ValueError:
            relative_path = saved_path
        return jsonify({'success': True, 'path': str(relative_path), 'absolute_path': str(saved_path)})
    except CsvStorageError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@app.route('/api/convert-json-to-md', methods=['POST'])
def convert_json_to_md():
    """Convert proof JSON to Markdown."""
    try:
        data = request.get_json()
        
        if not isinstance(data, dict):
            return jsonify({'error': 'Invalid JSON payload'}), 400

        errors = validate_proof_json(data)
        if errors:
            return jsonify({'error': 'Invalid JSON structure', 'details': errors}), 400

        markdown = build_markdown(data)
        
        return jsonify({
            'success': True,
            'markdown': markdown
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/convert-md-to-json', methods=['POST'])
def convert_md_to_json():
    """Convert proof Markdown (generated by this tool) back to JSON."""
    try:
        payload = request.get_json()
        if not isinstance(payload, dict) or 'markdown' not in payload:
            return jsonify({'error': "请求体必须包含 'markdown' 字段"}), 400

        markdown_text = payload['markdown']
        try:
            proof_json = markdown_to_json(markdown_text)
        except MarkdownParseError as exc:
            return jsonify({'error': 'Markdown 解析失败', 'details': str(exc)}), 400

        errors = validate_proof_json(proof_json)
        if errors:
            return jsonify({'error': 'Invalid JSON structure', 'details': errors}), 400

        return jsonify({'success': True, 'proof': proof_json})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _resolve_dir(requested_dir: str | None) -> Path:
    if requested_dir:
        d = Path(requested_dir).expanduser()
        if not d.is_absolute():
            d = (BASE_DIR / d).resolve()
    else:
        d = DEFAULT_CSV_DIR
    d.mkdir(parents=True, exist_ok=True)
    return d


@app.route('/api/list-files', methods=['GET'])
def list_files_generic():
    try:
        requested_dir = request.args.get('dir')
        exts = request.args.get('exts', '.json,.md,.csv')
        limit = int(request.args.get('limit', '500'))

        target_dir = _resolve_dir(requested_dir)
        allowed = {e.strip().lower() for e in exts.split(',') if e.strip()}

        items = []
        for p in target_dir.iterdir():
            if not p.is_file():
                continue
            if allowed and p.suffix.lower() not in allowed:
                continue
            stat = p.stat()
            try:
                rel = p.relative_to(BASE_DIR)
                rel_str = str(rel)
            except Exception:
                rel_str = str(p)
            items.append({
                'name': p.name,
                'ext': p.suffix.lower(),
                'size': stat.st_size,
                'mtime': stat.st_mtime,
                'path': rel_str
            })
        items.sort(key=lambda x: x['mtime'], reverse=True)
        if limit:
            items = items[:limit]
        return jsonify({'success': True, 'dir': str(target_dir), 'items': items})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/read-file', methods=['GET'])
def read_file_generic():
    try:
        path_param = request.args.get('path')
        if not path_param:
            return jsonify({'error': 'path is required'}), 400
        p = Path(path_param).expanduser()
        if not p.is_absolute():
            p = (BASE_DIR / p).resolve()
        if not p.exists() or not p.is_file():
            return jsonify({'error': 'file not found'}), 404
        text = p.read_text(encoding='utf-8')
        try:
            rel = p.relative_to(BASE_DIR)
            rel_str = str(rel)
        except Exception:
            rel_str = str(p)
        return jsonify({'success': True, 'path': rel_str, 'absolute_path': str(p), 'content': text, 'ext': p.suffix.lower()})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/list-lean-files', methods=['GET'])
def list_lean_files():
    """List available Lean files."""
    try:
        lean_dir = BASE_DIR / 'data' / 'lean'
        if not lean_dir.exists():
            return jsonify({'files': []})
        
        files = [f.name for f in lean_dir.glob('*.lean')]
        return jsonify({'files': sorted(files)})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Lean Proof Documentation Server")
    print("=" * 60)
    print(f"📂 Working directory: {BASE_DIR}")
    print(f"🌐 Open browser to: http://localhost:5000")
    print("=" * 60)
    print("\nAvailable endpoints:")
    print("  GET  /                      - Main HTML editor")
    print("  POST /api/extract-apis      - Extract APIs from Lean code")
    print("  POST /api/convert-json-to-md - Convert JSON to Markdown")
    print("  GET  /api/list-lean-files   - List available Lean files")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
