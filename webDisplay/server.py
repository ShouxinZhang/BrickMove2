import json
import mimetypes
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Event
from urllib.parse import parse_qs, urlparse, quote
import subprocess
import os
import shlex

ROOT_DIR = Path(__file__).resolve().parent  # webDisplay/
PUBLIC_DIR = ROOT_DIR / 'public'
CACHE_DIR = ROOT_DIR / 'cache'
CACHE_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_PORT = 4173
STATUS_MESSAGES = {
    'missing_fields': 'Missing fileName or entries in request body.',
    'import_failure': 'Failed to import JSON file.',
    'invalid_file': 'Invalid file path.',
}


class ProofServerHandler(BaseHTTPRequestHandler):
    server_version = 'ProofServer/0.1'

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        self._write_cors_headers()
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/import':
            self._handle_import()
        elif parsed.path == '/api/open-in-vscode':
            self._handle_open_in_vscode()
        else:
            self.send_error(HTTPStatus.NOT_FOUND)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/api/stream':
            self._handle_stream(parsed)
        else:
            self._serve_static(parsed.path)

    # --- Request Handlers -------------------------------------------------

    def _handle_import(self):
        try:
            content_length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            content_length = 0
        body = self.rfile.read(content_length).decode('utf-8') if content_length else ''

        try:
            payload = json.loads(body or '{}')
        except json.JSONDecodeError:
            self._json_response({'error': STATUS_MESSAGES['import_failure']}, HTTPStatus.BAD_REQUEST)
            return

        file_name = payload.get('fileName')
        entries = payload.get('entries')

        if not file_name or entries is None:
            self._json_response({'error': STATUS_MESSAGES['missing_fields']}, HTTPStatus.BAD_REQUEST)
            return

        if not isinstance(entries, list):
            entries = [entries]

        # Create a single batch subfolder inside cache: <jsonFilename>-lean-<YYYYMMDD-HHMMSS>
        base = Path(file_name).stem
        timestamp = time.strftime('%Y%m%d-%H%M%S')
        batch_folder_name = _sanitize_segment(f"{base}-lean-{timestamp}")
        batch_dir = CACHE_DIR / batch_folder_name
        batch_dir.mkdir(parents=True, exist_ok=True)

        lean_results = []
        for index, entry in enumerate(entries):
            entry_id = _string_id(entry.get('id') if isinstance(entry, dict) else None, index + 1)

            formal_statement = ''
            if isinstance(entry, dict):
                formal_statement = str(entry.get('formal_statement') or '')

            # Each entry becomes a separate file inside the batch folder
            file_stem = _sanitize_segment(f"entry-{entry_id}")
            lean_path = batch_dir / f"{file_stem}.lean"
            lean_path.write_text(formal_statement.rstrip() + '\n', encoding='utf-8')

            lean_results.append({
                'id': entry_id,
                'batchFolder': batch_folder_name,
                'fileName': lean_path.name,
                'relativeLeanPath': lean_path.relative_to(CACHE_DIR).as_posix(),
                'absPath': str(lean_path.resolve()),
                'vscodeUri': _build_vscode_uri(lean_path),
            })

        self._json_response({
            'ok': True,
            'cacheDir': str(CACHE_DIR),
            'batchFolder': batch_folder_name,
            'leanFiles': lean_results,
        })

    def _handle_open_in_vscode(self):
        try:
            content_length = int(self.headers.get('Content-Length', '0'))
        except ValueError:
            content_length = 0
        body = self.rfile.read(content_length).decode('utf-8') if content_length else ''

        try:
            payload = json.loads(body or '{}')
        except json.JSONDecodeError:
            self._json_response({'error': 'Invalid JSON body.'}, HTTPStatus.BAD_REQUEST)
            return

        path_str = payload.get('path')
        if not path_str:
            self._json_response({'error': 'Missing path.'}, HTTPStatus.BAD_REQUEST)
            return

        target = Path(path_str).resolve()
        if not _is_within_directory(target, CACHE_DIR):
            self._json_response({'error': STATUS_MESSAGES['invalid_file']}, HTTPStatus.FORBIDDEN)
            return

        if not target.exists():
            self._json_response({'error': 'File not found.'}, HTTPStatus.NOT_FOUND)
            return

        # Try to open in VS Code using CLI.
        cli_argv = _resolve_vscode_cli()
        if not cli_argv:
            self._json_response({'error': 'VS Code CLI (code/codium) not found in PATH.'}, HTTPStatus.NOT_IMPLEMENTED)
            return

        try:
            # Use -g to open at line:column 1:1 for reliability
            cmd = list(cli_argv) + ['-g', f"{str(target)}:1"]
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError as exc:
            self._json_response({'error': f'Failed to launch VS Code: {exc}'}, HTTPStatus.INTERNAL_SERVER_ERROR)
            return

        self._json_response({'ok': True})

    def _handle_stream(self, parsed):
        query = parse_qs(parsed.query)
        relative = query.get('file', [''])[0]
        if not relative:
            self._json_response({'error': 'Missing file query parameter.'}, HTTPStatus.BAD_REQUEST)
            return

        target_path = (CACHE_DIR / relative).resolve()
        if not _is_within_directory(target_path, CACHE_DIR):
            self._json_response({'error': STATUS_MESSAGES['invalid_file']}, HTTPStatus.FORBIDDEN)
            return

        self.send_response(HTTPStatus.OK)
        self._write_cors_headers()
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()

        stop_event = Event()

        try:
            _stream_file(self.wfile, target_path, stop_event)
        except ConnectionError:
            pass
        finally:
            stop_event.set()

    def _serve_static(self, raw_path: str):
        path_part = raw_path or '/'
        if path_part == '/':
            candidate = PUBLIC_DIR / 'index.html'
        else:
            candidate = (PUBLIC_DIR / path_part.lstrip('/')).resolve()
            if not _is_within_directory(candidate, PUBLIC_DIR):
                self.send_error(HTTPStatus.FORBIDDEN)
                return
            if candidate.is_dir():
                candidate = candidate / 'index.html'

        if not candidate.exists() or not candidate.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        mime_type, _ = mimetypes.guess_type(str(candidate))
        self.send_response(HTTPStatus.OK)
        self._write_cors_headers()
        self.send_header('Content-Type', mime_type or 'application/octet-stream')
        self.send_header('Content-Length', str(candidate.stat().st_size))
        self.end_headers()
        with candidate.open('rb') as file_obj:
            self.wfile.write(file_obj.read())

    # --- Utilities --------------------------------------------------------

    def _json_response(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self._write_cors_headers()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _write_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        # Quiet default logging to reduce noise.
        return


def _stream_file(wfile, path: Path, stop_event: Event):
    last_payload = None

    while not stop_event.is_set():
        try:
            content = path.read_text(encoding='utf-8')
            payload = {'content': content}
        except FileNotFoundError:
            payload = {'error': 'Could not read Lean file.'}
        except OSError:
            payload = {'error': 'Error accessing Lean file.'}

        if payload != last_payload:
            _send_sse_message(wfile, payload)
            last_payload = payload

        try:
            wfile.flush()
        except (BrokenPipeError, ConnectionError):
            raise ConnectionError from None

        time.sleep(0.5)


def _send_sse_message(wfile, payload):
    message = f"data: {json.dumps(payload)}\n\n".encode('utf-8')
    try:
        wfile.write(message)
    except (BrokenPipeError, ConnectionError):
        raise ConnectionError from None


def _build_vscode_uri(path: Path) -> str:
    # URL-encode the absolute path but keep '/' characters intact
    p = quote(path.as_posix(), safe='/')
    return f"vscode://file/{p}"


def _which_first(candidates):
    for name in candidates:
        exe = _which(name)
        if exe:
            return exe
    return None


def _which(name: str):
    # Simple which implementation to avoid importing shutil for a single call
    path_env = os.environ.get('PATH', '')
    for folder in path_env.split(':'):
        candidate = Path(folder) / name
        if candidate.exists() and candidate.is_file() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def _resolve_vscode_cli():
    # Allow override via env var, supports compound commands like "flatpak run com.visualstudio.code"
    override = os.environ.get('VS_CODE_CLI')
    if override:
        parts = shlex.split(override)
        if parts:
            return parts

    exe = _which_first(['code', 'code-insiders', 'codium'])
    if exe:
        return [exe]
    return None


def _sanitize_segment(value: str) -> str:
    clean = ''.join(ch if ch.isalnum() or ch in '._-' else '-' for ch in value)
    clean = '-'.join(filter(None, clean.split('-')))
    return clean or 'entry'


def _string_id(value, fallback) -> str:
    if value is None:
        return str(fallback)
    return str(value)


def _is_within_directory(target: Path, directory: Path) -> bool:
    try:
        target.relative_to(directory)
        return True
    except ValueError:
        return False


def run(port: int = DEFAULT_PORT):
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, ProofServerHandler)
    print(f"Web interface available at http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down...')
    finally:
        httpd.server_close()


if __name__ == '__main__':
    run()
