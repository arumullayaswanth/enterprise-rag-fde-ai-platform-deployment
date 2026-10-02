"""Document loading from local disk or S3.

Returns a normalized list of Document dicts:
    {"id": str, "source": str, "text": str, "metadata": dict}
"""

from __future__ import annotations

import io
import json
import os
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Iterable, Iterator

import boto3

SUPPORTED_SUFFIXES = {".txt", ".md", ".pdf", ".json"}


@dataclass
class Document:
    id: str
    source: str
    text: str
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


def _decode(raw: bytes) -> str:
    return raw.decode("utf-8", errors="replace")


def _read_pdf(raw: bytes) -> str:
    # Imported lazily so text-only deployments do not pay the import cost.
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(raw))
    pages = [(page.extract_text() or "") for page in reader.pages]
    return "\n\n".join(pages)


def _flatten(value, prefix: str = "") -> list[str]:
    """Walk a nested JSON value into "key path: value" lines.

    A record like {"reporting_line": {"manager_name": "..."}} becomes
    "Reporting Line Manager Name: ...", which embeds and retrieves far better
    than a raw JSON blob full of braces and quotes.
    """
    lines: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            label = key.replace("_", " ").title()
            path = f"{prefix} {label}".strip()
            lines.extend(_flatten(child, path))
    elif isinstance(value, list):
        if all(not isinstance(v, (dict, list)) for v in value):
            lines.append(f"{prefix}: {', '.join(str(v) for v in value)}")
        else:
            for i, child in enumerate(value, start=1):
                lines.extend(_flatten(child, f"{prefix} {i}".strip()))
    else:
        lines.append(f"{prefix}: {value}")
    return lines


def _json_records(raw: bytes) -> list[dict]:
    """Return the top-level JSON records as a list (one entry per object)."""
    data = json.loads(_decode(raw))
    return data if isinstance(data, list) else [data]


def _render_record(record) -> str:
    """Render a single JSON record as readable "Key Path: value" lines."""
    return "\n".join(_flatten(record))


def _read_json(raw: bytes) -> str:
    """Render a JSON document (object or array of objects) as readable text."""
    return "\n\n".join(_render_record(r) for r in _json_records(raw))


def parse_bytes(raw: bytes, source: str) -> str:
    """Turn raw file bytes into plain text based on the file suffix."""
    suffix = Path(source).suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        raise ValueError(f"unsupported file type: {suffix or '<none>'} ({source})")
    if suffix == ".pdf":
        return _read_pdf(raw)
    if suffix == ".json":
        return _read_json(raw)
    return _decode(raw)


def _documents_from_bytes(raw: bytes, doc_id: str, source: str, metadata: dict) -> Iterator[Document]:
    """Turn raw file bytes into one or more Documents.

    A JSON array becomes one Document per record so each entry (an employee,
    a product, etc.) stays whole through chunking and is retrieved on its own
    rather than being split or merged with its neighbours.
    """
    if Path(source).suffix.lower() == ".json":
        records = _json_records(raw)
        for i, record in enumerate(records):
            text = _render_record(record)
            if not text.strip():
                continue
            # Prefer a stable, human-meaningful id when the record carries one.
            key = record.get("employee_id") or record.get("id") if isinstance(record, dict) else None
            rid = f"{doc_id}#{key}" if key else f"{doc_id}#{i}"
            yield Document(id=rid, source=source, text=text, metadata=dict(metadata))
        return
    text = parse_bytes(raw, source)
    if text.strip():
        yield Document(id=doc_id, source=source, text=text, metadata=dict(metadata))


def load_local(root: str | os.PathLike[str]) -> Iterator[Document]:
    """Yield documents for every supported file under ``root``."""
    root_path = Path(root)
    paths = [root_path] if root_path.is_file() else sorted(root_path.rglob("*"))
    for path in paths:
        if not path.is_file() or path.suffix.lower() not in SUPPORTED_SUFFIXES:
            continue
        doc_id = str(path.relative_to(root_path) if root_path.is_dir() else path.name)
        yield from _documents_from_bytes(
            path.read_bytes(),
            doc_id=doc_id,
            source=str(path),
            metadata={"bytes": path.stat().st_size},
        )


def load_s3(bucket: str, prefix: str = "", client=None) -> Iterator[Document]:
    """Yield documents for every supported object under ``s3://bucket/prefix``."""
    s3 = client or boto3.client("s3")
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            if key.endswith("/") or Path(key).suffix.lower() not in SUPPORTED_SUFFIXES:
                continue
            raw = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
            yield from _documents_from_bytes(
                raw,
                doc_id=key,
                source=f"s3://{bucket}/{key}",
                metadata={"bytes": obj.get("Size", len(raw))},
            )


def load(source: str) -> Iterable[Document]:
    """Dispatch on an ``s3://bucket/prefix`` URI or a local path."""
    if source.startswith("s3://"):
        bucket, _, prefix = source[len("s3://") :].partition("/")
        return load_s3(bucket, prefix)
    return load_local(source)
