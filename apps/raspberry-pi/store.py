"""Small on-disk key/value store for the last known device state.

Kept in memory and written to disk only when a value changes, so hot loops
can read it freely. The file format (temperature, humidity, switch_<id>,
room_<id>) is the same as the old local_data/data.json, so existing files
keep working.
"""
import json
import logging
import os
import threading

log = logging.getLogger('store')


class Store:
    def __init__(self, path: str):
        self._path = path
        self._lock = threading.Lock()
        self._data = self._load()

    def _load(self) -> dict:
        try:
            with open(self._path) as f:
                data = json.load(f)
            return data if isinstance(data, dict) else {}
        except FileNotFoundError:
            return {}
        except Exception as e:
            log.warning('could not read %s (%s), starting empty', self._path, e)
            return {}

    def get(self, key: str, default=None):
        with self._lock:
            return self._data.get(key, default)

    def set(self, key: str, value) -> None:
        self.update({key: value})

    def update(self, values: dict) -> None:
        with self._lock:
            changed = {k: v for k, v in values.items()
                       if k not in self._data or self._data[k] != v}
            if not changed:
                return
            self._data.update(changed)
            # Written under the lock so an older snapshot can never land
            # on disk after a newer one.
            self._write(self._data)

    def _write(self, data: dict) -> None:
        tmp = self._path + '.tmp'
        try:
            os.makedirs(os.path.dirname(self._path), exist_ok=True)
            with open(tmp, 'w') as f:
                json.dump(data, f)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, self._path)
        except Exception as e:
            log.warning('could not save %s: %s', self._path, e)
