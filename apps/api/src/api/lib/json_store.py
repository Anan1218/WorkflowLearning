"""Atomic JSON file persistence for demo state (survives container restarts)."""

from __future__ import annotations

import json
import os
import tempfile
import threading
from pathlib import Path


class JsonStore:
    """A dict persisted to one JSON file with atomic writes."""

    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()
        self.data: dict = {}
        if path.exists():
            self.data = json.loads(path.read_text())

    def save(self) -> None:
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            fd, tmp = tempfile.mkstemp(dir=self.path.parent, suffix=".tmp")
            try:
                with os.fdopen(fd, "w") as f:
                    json.dump(self.data, f, indent=2)
                os.replace(tmp, self.path)
            finally:
                if os.path.exists(tmp):
                    os.unlink(tmp)
