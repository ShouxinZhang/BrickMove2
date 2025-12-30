from __future__ import annotations

from pathlib import Path

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename


class CsvStorageError(Exception):
    """Raised when a CSV upload cannot be processed."""


DEFAULT_SUBDIR = "csv_save"


def _resolve_directory(base_dir: Path, requested: str | None) -> Path:
    """
    Resolve the directory where CSV files should be stored.

    If ``requested`` is provided it may be an absolute path or a path
    relative to ``base_dir``. Relative paths are resolved under the workspace.
    The directory is created if it does not already exist.
    """
    if requested:
        target_dir = Path(requested).expanduser()
        if not target_dir.is_absolute():
            target_dir = (base_dir / target_dir).resolve()
    else:
        target_dir = (base_dir / DEFAULT_SUBDIR).resolve()

    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir


def save_csv_file(
    file_storage: FileStorage,
    base_dir: Path,
    requested_directory: str | None = None,
) -> Path:
    """
    Persist an uploaded ``FileStorage`` CSV to disk.

    Parameters
    ----------
    file_storage:
        The uploaded file (must be a CSV).
    base_dir:
        Root directory for workspace-relative paths.
    requested_directory:
        Optional directory path supplied by the client.

    Returns
    -------
    Path
        The path where the CSV was written.
    """
    if file_storage is None or not file_storage.filename:
        raise CsvStorageError("No CSV file provided")

    filename = secure_filename(file_storage.filename)
    if not filename.lower().endswith(".csv"):
        raise CsvStorageError("Only CSV files are supported")

    target_dir = _resolve_directory(base_dir, requested_directory)
    target_path = target_dir / filename

    stem = target_path.stem
    suffix = target_path.suffix or ".csv"
    counter = 1
    while target_path.exists():
        target_path = target_dir / f"{stem}_{counter}{suffix}"
        counter += 1

    file_storage.save(target_path)
    return target_path


def get_default_directory(base_dir: Path) -> Path:
    """Return the default CSV storage directory."""
    return (base_dir / DEFAULT_SUBDIR).resolve()


def _sanitize_filename_with_ext(name: str | None, default_base: str, ext: str) -> str:
    safe = secure_filename((name or '').strip())
    if not safe:
        safe = f"{default_base}{ext}"
    if not safe.lower().endswith(ext):
        safe = f"{safe}{ext}"
    return safe


def save_csv_content(
    content: str,
    base_dir: Path,
    filename: str | None = None,
    requested_directory: str | None = None,
    overwrite: bool = False,
) -> Path:
    """Write raw CSV text to disk and return the saved path.

    The target directory defaults to ``csv_save`` under ``base_dir`` unless
    ``requested_directory`` is provided. ``filename`` is sanitized and given a
    ``.csv`` extension if missing. When ``overwrite`` is ``False`` and the
    target path exists, a numeric suffix is appended to avoid clobbering.
    """
    if not isinstance(content, str):
        raise CsvStorageError('CSV content must be a string')

    target_dir = _resolve_directory(base_dir, requested_directory)
    filename = _sanitize_filename_with_ext(filename, 'export', '.csv')
    target_path = target_dir / filename

    if not overwrite:
        stem, suffix = target_path.stem, target_path.suffix or '.csv'
        n = 1
        while target_path.exists():
            target_path = target_dir / f"{stem}_{n}{suffix}"
            n += 1

    target_path.write_text(content, encoding='utf-8')
    return target_path


def save_md_content(
    content: str,
    base_dir: Path,
    filename: str | None = None,
    requested_directory: str | None = None,
    overwrite: bool = False,
) -> Path:
    if not isinstance(content, str):
        raise CsvStorageError('Markdown content must be a string')
    target_dir = _resolve_directory(base_dir, requested_directory)
    filename = _sanitize_filename_with_ext(filename, 'proof', '.md')
    target_path = target_dir / filename
    if not overwrite:
        stem, suffix = target_path.stem, target_path.suffix or '.md'
        n = 1
        while target_path.exists():
            target_path = target_dir / f"{stem}_{n}{suffix}"
            n += 1
    target_path.write_text(content, encoding='utf-8')
    return target_path


def save_json_content(
    content,  # str | dict | list
    base_dir: Path,
    filename: str | None = None,
    requested_directory: str | None = None,
    overwrite: bool = False,
) -> Path:
    import json

    if isinstance(content, (dict, list)):
        text = json.dumps(content, ensure_ascii=False, indent=2)
    elif isinstance(content, str):
        text = content
    else:
        raise CsvStorageError('JSON content must be a string, object, or array')

    target_dir = _resolve_directory(base_dir, requested_directory)
    filename = _sanitize_filename_with_ext(filename, 'proof', '.json')
    target_path = target_dir / filename

    if not overwrite:
        stem, suffix = target_path.stem, target_path.suffix or '.json'
        n = 1
        while target_path.exists():
            target_path = target_dir / f"{stem}_{n}{suffix}"
            n += 1

    target_path.write_text(text, encoding='utf-8')
    return target_path
