import posixpath
from copy import deepcopy
import hashlib
import threading
import time
import uuid
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

from app.db.plugindata_oper import PluginDataOper
from app.core.event import Event, eventmanager
from app.log import logger
from app.plugins import _PluginBase
from app.schemas.types import EventType


try:
    TRANSFER_COMPLETE_EVENT = EventType.TransferComplete
except AttributeError:
    # Older or customized hosts may rename the transfer event. The handler keeps
    # a conservative parser and will silently ignore unrelated events.
    TRANSFER_COMPLETE_EVENT = getattr(EventType, "TransferFinished", EventType.NoticeMessage)


MEDIA_EXTS = {
    ".avi",
    ".flv",
    ".m2ts",
    ".m4v",
    ".mkv",
    ".mov",
    ".mp4",
    ".mpeg",
    ".mpg",
    ".rmvb",
    ".ts",
    ".webm",
    ".wmv",
}

SUBTITLE_EXTS = {".ass", ".srt", ".ssa", ".sub", ".sup", ".vtt"}
SCRAPING_EXTS = {
    ".banner",
    ".fanart",
    ".jpg",
    ".jpeg",
    ".nfo",
    ".png",
    ".poster",
    ".tbn",
    ".webp",
}
SHARED_SCRAPING_NAMES = {
    "movie.nfo",
    "tvshow.nfo",
    "season.nfo",
    "folder.jpg",
    "poster.jpg",
    "fanart.jpg",
    "banner.jpg",
    "thumb.jpg",
    "landscape.jpg",
    "clearlogo.png",
    "clearart.png",
    "logo.png",
    "disc.png",
}
DEFAULT_RULES = [
    {
        "enabled": False,
        "name": "示例规则",
        "media_dir": "/media/movies",
        "target_dir": "/MoviePilot/Movies",
        "api_interval": 0,
        "overwrite": "skip",
        "exclude_exts": ".tmp,.part",
        "include_scraping": True,
    }
]
RAPID_UPLOAD_ATTEMPTS = 2

@dataclass
class UploadFileItem:
    local_path: Path
    remote_path: str
    size: int


class DirectOpenListClient:
    """
    Direct OpenList uploader that follows the official frontend behavior:
    upload through `/api/fs/put` and include hash headers so OpenList drivers
    can attempt rapid upload before falling back to normal streaming.
    """

    def __init__(self, conf: Dict[str, Any]):
        self.base_url = str(
            conf.get("base_url")
            or conf.get("url")
            or conf.get("host")
            or conf.get("endpoint")
            or ""
        ).rstrip("/")
        self.token = str(
            conf.get("token")
            or conf.get("access_token")
            or conf.get("authorization")
            or conf.get("Authorization")
            or ""
        ).replace("Bearer ", "")
        self._hash_cache: Dict[Tuple[str, int, int], Dict[str, str]] = {}
        self._hash_lock = threading.RLock()

    def available(self) -> bool:
        return bool(self.base_url and self.token)

    @property
    def client_name(self) -> str:
        return "direct_openlist_api"

    def _headers(self, extra: Dict[str, str] = None) -> Dict[str, str]:
        headers = {
            "Authorization": self.token,
            "Content-Type": "application/json",
        }
        if extra:
            headers.update(extra)
        return headers

    def _request_json(self, method: str, api: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        import requests

        url = f"{self.base_url}{api}"
        resp = requests.request(
            method=method,
            url=url,
            headers=self._headers(),
            data=self._json_dumps(payload),
            timeout=30,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"OpenList HTTP {resp.status_code}: {resp.text[:200]}")
        data = resp.json()
        code = data.get("code")
        if code not in (None, 200):
            raise RuntimeError(f"OpenList API {code}: {data.get('message')}")
        return data

    def _json_dumps(self, payload: Dict[str, Any]) -> bytes:
        import json

        return json.dumps(payload, ensure_ascii=False).encode("utf-8")

    def exists(self, remote_path: str) -> bool:
        try:
            self._request_json("POST", "/api/fs/get", {"path": remote_path})
            return True
        except Exception:
            return False

    def _file_hashes(self, local_path: Path) -> Dict[str, str]:
        import hashlib

        md5_hash = hashlib.md5()
        sha1_hash = hashlib.sha1()
        sha256_hash = hashlib.sha256()
        with open(local_path, "rb") as fp:
            while True:
                chunk = fp.read(1024 * 1024)
                if not chunk:
                    break
                md5_hash.update(chunk)
                sha1_hash.update(chunk)
                sha256_hash.update(chunk)
        hashes = {
            "md5": md5_hash.hexdigest(),
            "sha1": sha1_hash.hexdigest(),
            "sha256": sha256_hash.hexdigest(),
        }
        return hashes

    def _upload_once(
        self,
        local_path: Path,
        remote_path: str,
        overwrite: str,
        rapid_hashes: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        import requests

        stat = local_path.stat()
        headers = self._headers(
            {
                "Content-Type": "application/octet-stream",
                "File-Path": quote(remote_path),
                "Overwrite": "true" if overwrite == "overwrite" else "false",
                "Content-Length": str(stat.st_size),
                "Last-Modified": str(int(stat.st_mtime * 1000)),
            }
        )
        if rapid_hashes:
            headers["X-File-Md5"] = rapid_hashes["md5"]
            headers["X-File-Sha1"] = rapid_hashes["sha1"]
            headers["X-File-Sha256"] = rapid_hashes["sha256"]
        url = f"{self.base_url}/api/fs/put"
        with open(local_path, "rb") as fp:
            resp = requests.put(
                url,
                headers=headers,
                data=fp,
                timeout=None,
            )
        if resp.status_code >= 400:
            raise RuntimeError(f"OpenList \u4e0a\u4f20 HTTP {resp.status_code}: {resp.text[:200]}")
        try:
            data = resp.json()
        except Exception:
            data = {}
        code = data.get("code")
        if code not in (None, 200):
            raise RuntimeError(f"OpenList \u4e0a\u4f20\u8fd4\u56de\u9519\u8bef {code}: {data.get('message')}")
        mode = "rapid" if rapid_hashes else "stream"
        return {
            "status": "success",
            "remote_path": remote_path,
            "message": data.get("message", ""),
            "upload_mode": mode,
        }

    def upload(self, local_path: Path, remote_path: str, overwrite: str) -> Dict[str, Any]:
        storage, remote_dir, remote_name = self._prepare_target(remote_path)
        if overwrite == "skip" and self.exists(remote_path):
            return {
                "status": "skipped",
                "remote_path": remote_path,
                "message": "\u76ee\u6807\u6587\u4ef6\u5df2\u5b58\u5728",
            }
        if overwrite == "rename" and self.exists(remote_path):
            original_remote_path = remote_path
            remote_path = self._next_available_remote_path(remote_path)
            storage, remote_dir, remote_name = self._prepare_target(remote_path)
            logger.info(
                f"媒体整理 OpenList 上传：目标文件已存在，改为重命名上传 original={original_remote_path} renamed={remote_path}"
            )
        try:
            storage.makedirs(remote_dir)
        except Exception as err:
            raise RuntimeError(f"\u83b7\u53d6\u6216\u521b\u5efa OpenList \u76ee\u5f55\u5931\u8d25: {remote_dir}") from err
        if overwrite == "overwrite" and self.exists(remote_path):
            try:
                storage.remove(remote_path)
            except Exception as err:
                raise RuntimeError(f"\u76ee\u6807\u6587\u4ef6\u5df2\u5b58\u5728\u4e0a\u4f20\u5931\u8d25?: {remote_path}") from err
        try:
            result = storage.upload_file(local_path.as_posix(), remote_dir)
        except TypeError:
            result = storage.upload_file(local_path.as_posix(), remote_path)
        if not result:
            raise RuntimeError(f"OpenList \u4e0a\u4f20\u5931\u8d25: {local_path}")
        return {
            "status": "success",
            "remote_path": remote_path,
            "message": "",
            "upload_mode": "storage",
        }


class MediaOpenListUpload(_PluginBase):
    plugin_name = "媒体整理OpenList上传"
    plugin_desc = "在 MoviePilot 整理媒体文件后，按规则将媒体文件上传到 OpenList。"
    plugin_icon = "cloud.png"
    plugin_color = "#1976D2"
    plugin_version = "1.25"
    plugin_author = "ALBUM"
    author_url = ""
    plugin_config_prefix = "mediaopenlistupload_"
    plugin_order = 99
    auth_level = 1

    _enabled = False
    _openlist_id = ""
    _merge_delay = 60
    _max_retries = 3
    _retry_interval = 30
    _default_overwrite = "skip"
    _default_exclude_exts = ""
    _default_include_scraping = True
    _rules: List[Dict[str, Any]] = []
    _tasks: List[Dict[str, Any]] = []
    _pending_batches: Dict[str, Dict[str, Any]] = {}
    _timer: Optional[threading.Timer] = None
    _running_keys = set()
    _lock = threading.RLock()
    _stop_event = threading.Event()
    _history_limit = 100

    def init_plugin(self, config: dict = None):
        self.stop_service()
        self._lock = threading.RLock()
        self._stop_event = threading.Event()
        self._stop_timer()
        self._stop_event.clear()
        self._pending_batches = {}
        self._running_keys = set()

        config = config or {}
        self._enabled = bool(config.get("enabled", False))
        self._openlist_id = str(config.get("openlist_id") or "")
        self._merge_delay = self._to_int(config.get("merge_delay"), 60, minimum=0)
        self._max_retries = self._to_int(config.get("max_retries"), 3, minimum=0)
        self._retry_interval = self._to_int(config.get("retry_interval"), 30, minimum=0)
        self._rules = self._load_rules(config)
        self._tasks = self._load_tasks()

        candidates = self._get_openlist_candidates()
        if not self._openlist_id and candidates:
            self._openlist_id = candidates[0]["id"]

        if self._enabled and not self._enabled_rules():
            logger.warning("媒体整理OpenList上传：插件已启用，但没有生效的上传规则")

    def get_state(self) -> bool:
        return bool(self._enabled and self._enabled_rules())

    @staticmethod
    def get_command() -> List[Dict[str, Any]]:
        return []

    def get_api(self) -> List[Dict[str, Any]]:
        return [
            {
                "path": "/tasks",
                "endpoint": self.api_tasks,
                "methods": ["GET"],
                "summary": "获取上传任务列表",
                "auth": "bear",
            },
            {
                "path": "/tasks/{task_id}",
                "endpoint": self.api_task_detail,
                "methods": ["GET"],
                "summary": "获取上传任务详情",
                "auth": "bear",
            },
            {
                "path": "/tasks/{task_id}/retry",
                "endpoint": self.api_retry_task,
                "methods": ["POST"],
                "summary": "重试失败任务",
                "auth": "bear",
            },
            {
                "path": "/tasks/clear",
                "endpoint": self.api_clear_tasks,
                "methods": ["POST"],
                "summary": "清空上传任务历史",
                "auth": "bear",
            },
            {
                "path": "/openlists",
                "endpoint": self.api_openlists,
                "methods": ["GET"],
                "summary": "获取已配置的 OpenList 列表",
                "auth": "bear",
            },
        ]

    def get_form(self) -> Tuple[List[dict], Dict[str, Any]]:
        openlists = self._get_openlist_candidates()
        openlist_items = [
            {"title": item.get("name") or item.get("id"), "value": item.get("id")}
            for item in openlists
        ] or [{"title": "使用 MoviePilot 内置 Alist/OpenList 配置", "value": "default"}]
        defaults = self._build_form_defaults(openlist_items)
        return [], defaults

    def get_render_mode(self) -> Tuple[str, str]:
        return "vue", "dist/assets"

    def get_page(self) -> List[dict]:
        rows = self._task_rows(limit=20)
        return [
            {
                "component": "VAlert",
                "props": {
                    "type": "info",
                    "variant": "tonal",
                    "text": "\u76ee\u6807\u6587\u4ef6\u5df2\u5b58\u5728\u76ee\u6807\u6587\u4ef6\u5df2\u5b58\u5728\u4e0a\u4f20\u5931\u8d25 API /tasks/{task_id}/retry ???",
                },
            },
            {
                "component": "VTable",
                "content": [
                    {
                        "component": "thead",
                        "content": [
                            {
                                "component": "tr",
                                "content": [
                                    {"component": "th", "text": "\u65f6\u95f4"},
                                    {"component": "th", "text": "\u89c4\u5219"},
                                    {"component": "th", "text": "\u72b6\u6001"},
                                    {"component": "th", "text": "\u6587\u4ef6\u6570"},
                                    {"component": "th", "text": "\u9519\u8bef\u4fe1\u606f"},
                                ],
                            }
                        ],
                    },
                    {
                        "component": "tbody",
                        "content": [
                            {
                                "component": "tr",
                                "content": [
                                    {"component": "td", "text": row["created_at"]},
                                    {"component": "td", "text": row["rule_name"]},
                                    {"component": "td", "text": row["status"]},
                                    {"component": "td", "text": str(row["file_count"])},
                                    {"component": "td", "text": row.get("error") or ""},
                                ],
                            }
                            for row in rows
                        ],
                    },
                ],
            },
        ]

    @eventmanager.register(TRANSFER_COMPLETE_EVENT)
    def on_transfer_complete(self, event: Event):
        if not self.get_state():
            return
        event_data = getattr(event, "event_data", None)
        if not event_data:
            return
        media_path = self._extract_local_path(event_data)
        if not media_path:
            return
        rule = self._match_rule(media_path)
        if not rule:
            return
        source_dir = media_path.parent if media_path.is_file() else media_path
        batch_key = f"{rule['_id']}::{source_dir.as_posix()}"
        with self._lock:
            batch = self._pending_batches.setdefault(
                batch_key,
                {
                    "key": batch_key,
                    "rule": rule,
                    "source_dir": source_dir.as_posix(),
                    "display_name": self._derive_display_name(source_dir, rule, event_data),
                    "paths": set(),
                    "first_at": time.time(),
                    "updated_at": time.time(),
                },
            )
            if not batch.get("display_name"):
                batch["display_name"] = self._derive_display_name(source_dir, rule, event_data)
            batch["paths"].add(media_path.as_posix())
            batch["updated_at"] = time.time()
            self._reset_timer_locked()

    def api_tasks(self, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        page = self._to_int(page, 1, minimum=1)
        page_size = self._to_int(page_size, 20, minimum=1)
        self._sync_tasks_from_store()
        with self._lock:
            total = len(self._tasks)
            start = (page - 1) * page_size
            end = start + page_size
            items = list(reversed(self._tasks))[start:end]
        return {"total": total, "page": page, "page_size": page_size, "items": items}

    def api_task_detail(self, task_id: str = "") -> Dict[str, Any]:
        self._sync_tasks_from_store()
        task = self._find_task(task_id)
        return {"task": task} if task else {"task": None, "message": "task not found"}

    def api_retry_task(self, task_id: str = "") -> Dict[str, Any]:
        self._sync_tasks_from_store()
        task = self._find_task(task_id)
        if not task:
            return {"success": False, "message": "task not found"}
        if task.get("status") != "failed":
            return {"success": False, "message": "only failed tasks can retry"}
        logger.info(f"媒体整理 OpenList 上传：收到任务重试请求 task_id={task_id}")
        retry_task = deepcopy(task)
        retry_task["id"] = self._new_task_id()
        retry_task["status"] = "pending"
        retry_task["created_at"] = self._now_text()
        retry_task["updated_at"] = retry_task["created_at"]
        retry_task["error"] = ""
        retry_task["retry_of"] = task_id
        for file_info in retry_task.get("files", []):
            file_info["status"] = "pending"
            file_info["message"] = ""
        self._append_task(retry_task)
        threading.Thread(target=self._run_task, args=(retry_task,), daemon=True).start()
        return {"success": True, "task_id": retry_task["id"]}

    def api_clear_tasks(self) -> Dict[str, Any]:
        with self._lock:
            self._tasks = []
            self._save_tasks()
        return {"success": True}

    def api_openlists(self) -> Dict[str, Any]:
        return {"items": self._get_openlist_candidates(sanitize=True)}

    def stop_service(self):
        self._stop_event.set()
        self._stop_timer()

    def _load_rules(self, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        raw_rules = config.get("rules") or []
        if not isinstance(raw_rules, list):
            raw_rules = []
        rules = []
        for index, rule in enumerate(raw_rules):
            if not isinstance(rule, dict):
                continue
            normalized = {
                "_id": str(rule.get("id") or rule.get("name") or index),
                "enabled": bool(rule.get("enabled", False)),
                "name": str(rule.get("name") or f"规则 {index + 1}"),
                "media_dir": self._normalize_local_dir(rule.get("media_dir")),
                "target_dir": self._normalize_remote_dir(rule.get("target_dir")),
                "api_interval": self._to_int(rule.get("api_interval"), 0, minimum=0),
                "overwrite": self._normalize_overwrite(rule.get("overwrite") or "skip"),
                "exclude_exts": str(rule.get("exclude_exts", "")),
                "include_scraping": bool(rule.get("include_scraping", True)),
            }
            if normalized["media_dir"] and normalized["target_dir"]:
                rules.append(normalized)
        return rules

    def _build_form_defaults(self, openlist_items: List[Dict[str, Any]]) -> Dict[str, Any]:
        defaults = {
            "enabled": False,
            "openlist_id": openlist_items[0]["value"] if openlist_items else "",
            "merge_delay": 60,
            "max_retries": 3,
            "retry_interval": 30,
            "rules": [],
            "openlist_items": openlist_items,
        }
        return defaults

    def _enabled_rules(self) -> List[Dict[str, Any]]:
        return [rule for rule in self._rules if rule.get("enabled")]

    def _match_rule(self, media_path: Path) -> Optional[Dict[str, Any]]:
        try:
            media_resolved = media_path.resolve()
        except Exception:
            media_resolved = media_path
        for rule in self._enabled_rules():
            media_dir = Path(rule["media_dir"])
            try:
                media_resolved.relative_to(media_dir.resolve())
                return rule
            except Exception:
                continue
        return None

    def _extract_local_path(self, data: Any) -> Optional[Path]:
        candidates = self._collect_local_path_candidates(data)
        for item in candidates:
            path = Path(item)
            if path.exists():
                return path
        for item in candidates:
            if self._looks_like_local_path(item):
                return Path(item)
        return None

    def _collect_local_path_candidates(self, data: Any) -> List[str]:
        candidates: List[str] = []

        def add_candidate(value: Any):
            text = str(value or "").strip()
            if text and text not in candidates:
                candidates.append(text)

        def walk(value: Any):
            if value is None:
                return
            if isinstance(value, dict):
                preferred = [
                    "transferinfo",
                    "target_item",
                    "target_diritem",
                    "fileitem",
                    "target_path",
                    "dest_path",
                    "destination",
                    "target_file",
                    "file_path",
                    "path",
                ]
                for key in preferred:
                    if key in value:
                        walk(value.get(key))
                for key, sub_value in value.items():
                    if key not in preferred:
                        walk(sub_value)
                return
            if isinstance(value, (list, tuple, set)):
                for item in value:
                    walk(item)
                return
            if isinstance(value, Path):
                add_candidate(value.as_posix())
                return
            if isinstance(value, str):
                add_candidate(value)
                return

            # Support MoviePilot runtime models such as TransferInfo / FileItem.
            file_list_new = getattr(value, "file_list_new", None)
            if isinstance(file_list_new, (list, tuple, set)):
                for item in file_list_new:
                    walk(item)

            target_item = getattr(value, "target_item", None)
            if target_item is not None:
                walk(target_item)

            target_diritem = getattr(value, "target_diritem", None)
            if target_diritem is not None:
                walk(target_diritem)

            target_path = getattr(value, "target_path", None)
            if target_path is not None:
                walk(target_path)

            path_value = getattr(value, "path", None)
            if path_value is not None:
                walk(path_value)

            file_list = getattr(value, "file_list", None)
            if isinstance(file_list, (list, tuple, set)):
                for item in file_list:
                    walk(item)

            fileitem = getattr(value, "fileitem", None)
            if fileitem is not None:
                walk(fileitem)

        walk(data)
        return candidates

    def _looks_like_local_path(self, value: str) -> bool:
        if value.startswith(("/", "\\")):
            return True
        return len(value) > 2 and value[1] == ":" and value[2] in ("\\", "/")

    def _reset_timer_locked(self):
        if self._timer:
            self._timer.cancel()
        delay = max(self._merge_delay, 0)
        self._timer = threading.Timer(delay, self._flush_pending_batches)
        self._timer.daemon = True
        self._timer.start()

    def _flush_pending_batches(self):
        with self._lock:
            batches = list(self._pending_batches.values())
            self._pending_batches = {}
            self._timer = None
        for batch in batches:
            if self._stop_event.is_set():
                return
            task = self._build_task(batch)
            self._append_task(task)
            threading.Thread(target=self._run_task, args=(task,), daemon=True).start()

    def _build_task(self, batch: Dict[str, Any]) -> Dict[str, Any]:
        rule = batch["rule"]
        source_dir = Path(batch["source_dir"])
        matched_paths = [Path(path) for path in sorted(batch.get("paths") or [])]
        files = self._collect_files(source_dir, rule, matched_paths=matched_paths)
        task = {
            "id": self._new_task_id(),
            "key": batch["key"],
            "rule_id": rule["_id"],
            "rule_name": rule["name"],
            "display_name": batch.get("display_name") or self._derive_display_name(source_dir, rule),
            "source_dir": source_dir.as_posix(),
            "target_dir": rule["target_dir"],
            "status": "pending",
            "created_at": self._now_text(),
            "updated_at": self._now_text(),
            "file_count": len(files),
            "success_count": 0,
            "failed_count": 0,
            "skipped_count": 0,
            "error": "",
            "files": [self._file_item_to_dict(item) for item in files],
            "rule": {key: value for key, value in rule.items() if not key.startswith("_")},
        }
        logger.info(
            f"媒体整理 OpenList 上传：创建上传任务 task_id={task['id']} "
            f"title={task['display_name']} files={len(files)} "
            f"matched_paths={len(matched_paths)} source={source_dir.as_posix()}"
        )
        return task

    def _derive_display_name(
        self,
        source_dir: Path,
        rule: Dict[str, Any],
        event_data: Any = None,
    ) -> str:
        event_title = self._extract_media_title(event_data)
        if event_title:
            return event_title
        try:
            media_root = Path(rule.get("media_dir") or "").resolve()
            relative = source_dir.resolve().relative_to(media_root)
            if relative.parts:
                return relative.parts[0]
        except Exception:
            pass
        if source_dir.name.lower().startswith("season ") and source_dir.parent.name:
            return source_dir.parent.name
        return source_dir.name or source_dir.as_posix()

    def _extract_media_title(self, data: Any) -> str:
        candidates: List[str] = []

        def add_candidate(value: Any):
            text = str(value or "").strip()
            if text and text not in candidates:
                candidates.append(text)

        def walk(value: Any, depth: int = 0):
            if value is None or depth > 2:
                return
            if isinstance(value, dict):
                for key in ("mediainfo", "media_info", "meta", "title", "name", "cn_name", "original_title"):
                    if key in value:
                        walk(value.get(key), depth + 1)
                return
            if isinstance(value, str):
                add_candidate(value)
                return
            for attr in ("mediainfo", "media_info", "meta", "title", "name", "cn_name", "original_title"):
                if hasattr(value, attr):
                    walk(getattr(value, attr, None), depth + 1)

        walk(data)
        for title in candidates:
            if not self._looks_like_local_path(title):
                return title
        return ""

    def _collect_files(
        self,
        source_dir: Path,
        rule: Dict[str, Any],
        matched_paths: Optional[List[Path]] = None,
    ) -> List[UploadFileItem]:
        excludes = self._parse_exts(rule.get("exclude_exts"))
        include_scraping = bool(rule.get("include_scraping"))
        files = []
        candidates: List[Path] = []
        seen = set()

        def add_candidate(path: Path):
            normalized = path.as_posix()
            if normalized in seen:
                return
            if not path.exists() or not path.is_file():
                return
            seen.add(normalized)
            candidates.append(path)

        if matched_paths:
            for matched_path in matched_paths:
                local_path = Path(matched_path)
                add_candidate(local_path)
                parent = local_path.parent
                if not parent.exists() or not parent.is_dir():
                    continue
                stem_lower = local_path.stem.lower()
                for sibling in parent.iterdir():
                    if not sibling.is_file() or sibling == local_path:
                        continue
                    sibling_name = sibling.name.lower()
                    sibling_stem = sibling.stem.lower()
                    sibling_suffix = sibling.suffix.lower()
                    if sibling_suffix in SUBTITLE_EXTS and sibling_stem.startswith(stem_lower):
                        add_candidate(sibling)
                        continue
                    if not include_scraping:
                        continue
                    if sibling_suffix in SCRAPING_EXTS and sibling_stem.startswith(stem_lower):
                        add_candidate(sibling)
                        continue
                    if sibling_name in SHARED_SCRAPING_NAMES:
                        add_candidate(sibling)
                        continue
                    if sibling_suffix in SCRAPING_EXTS and sibling_stem.startswith("season"):
                        add_candidate(sibling)

        if not candidates:
            if source_dir.is_file():
                candidates = [source_dir]
            else:
                candidates = [path for path in source_dir.iterdir() if path.is_file()] if source_dir.exists() else []
        media_dir = Path(rule["media_dir"])
        for local_path in candidates:
            suffix = local_path.suffix.lower()
            if suffix in excludes:
                continue
            if suffix not in MEDIA_EXTS and suffix not in SUBTITLE_EXTS:
                if not include_scraping or suffix not in SCRAPING_EXTS:
                    continue
            try:
                relative_dir = local_path.parent.resolve().relative_to(media_dir.resolve()).as_posix()
            except Exception:
                relative_dir = local_path.parent.name
            remote_dir = self._join_remote(rule["target_dir"], relative_dir)
            remote_path = self._join_remote(remote_dir, local_path.name)
            files.append(
                UploadFileItem(
                    local_path=local_path,
                    remote_path=remote_path,
                    size=local_path.stat().st_size if local_path.exists() else 0,
                )
            )
        return files

    def _run_task(self, task: Dict[str, Any]):
        with self._lock:
            if task["key"] in self._running_keys:
                task["status"] = "skipped"
                task["error"] = "duplicate task skipped because same directory task is running"
                task["updated_at"] = self._now_text()
                self._save_tasks()
                return
            self._running_keys.add(task["key"])
        try:
            if not task["files"]:
                self._update_task(task["id"], status="skipped", error="no files matched filters")
                return
            self._update_task(task["id"], status="running", error="")
            api_interval = self._to_int(task["rule"].get("api_interval"), 0, minimum=0)
            client = self._build_upload_client()
            if not client:
                raise RuntimeError("\u672a\u627e\u5230\u53ef\u7528\u7684 MoviePilot OpenList/Alist \u914d\u7f6e")
            success_count = skipped_count = failed_count = 0
            last_error = ""
            for i, file_info in enumerate(task["files"]):
                if self._stop_event.is_set():
                    self._update_file(task["id"], file_info["local_path"], "cancelled", "plugin stopped")
                    continue

                # Apply API interval between requests, except for the first request
                if i > 0 and api_interval > 0:
                    time.sleep(api_interval)

                local_path = Path(file_info["local_path"])
                try:
                    result = self._upload_with_retries(
                        client=client,
                        local_path=local_path,
                        remote_path=file_info["remote_path"],
                        overwrite=task["rule"].get("overwrite", "skip"),
                    )
                    status = result.get("status", "success")
                    if status == "skipped":
                        skipped_count += 1
                    else:
                        success_count += 1
                    self._update_file(
                        task["id"],
                        local_path.as_posix(),
                        status,
                        result.get("message", ""),
                        result.get("remote_path"),
                    )
                except Exception as err:
                    failed_count += 1
                    last_error = str(err)
                    logger.error(
                        f"媒体整理 OpenList 上传：文件上传失败 task_id={task['id']} "
                        f"file={local_path.as_posix()} error={err}"
                    )
                    self._update_file(task["id"], local_path.as_posix(), "failed", last_error)
            final_status = "success"
            if failed_count:
                final_status = "failed"
            elif skipped_count and not success_count:
                final_status = "skipped"
            self._update_task(
                task["id"],
                status=final_status,
                success_count=success_count,
                failed_count=failed_count,
                skipped_count=skipped_count,
                error=last_error,
            )
            logger.info(
                f"媒体整理 OpenList 上传：任务完成 task_id={task['id']} status={final_status} "
                f"success={success_count} skipped={skipped_count} failed={failed_count}"
            )
        except Exception as err:
            logger.error(f"媒体整理 OpenList 上传：任务执行失败 task_id={task['id']} error={err}")
            self._update_task(task["id"], status="failed", error=str(err))
        finally:
            with self._lock:
                self._running_keys.discard(task["key"])

    def _upload_with_retries(
        self,
        client: Any,
        local_path: Path,
        remote_path: str,
        overwrite: str,
    ) -> Dict[str, Any]:
        attempts = max(self._max_retries, 0) + 1
        for index in range(attempts):
            try:
                return client.upload(local_path, remote_path, overwrite)
            except Exception as err:
                if index >= attempts - 1:
                    logger.error(
                        f"媒体整理 OpenList 上传：达到最大重试次数 "
                        f"file={local_path.as_posix()} target={remote_path} "
                        f"attempt={index + 1}/{attempts} error={err}"
                    )
                    raise
                wait_seconds = self._retry_interval * (index + 1)
                logger.warning(
                    f"媒体整理 OpenList 上传：上传失败，准备重试 "
                    f"file={local_path.as_posix()} target={remote_path} "
                    f"attempt={index + 1}/{attempts} wait={wait_seconds}s error={err}"
                )
                time.sleep(wait_seconds)
        raise RuntimeError("\u4e0a\u4f20\u5931\u8d25")

    def _build_upload_client(self):
        conf = self._selected_openlist_conf()
        direct = DirectOpenListClient(conf)
        if direct.available():
            logger.info("媒体整理 OpenList 上传：使用 OpenList API 直连上传")
            return direct
        try:
            client = MoviePilotStorageClient()
            if client.available():
                logger.info("OpenList API unavailable, fallback to MoviePilot built-in Alist/OpenList storage upload")
                return client
        except Exception as err:
            logger.warning(f"媒体整理 OpenList 上传：创建 MoviePilot 存储上传客户端失败 error={err}")
        return None

    def _selected_openlist_conf(self) -> Dict[str, Any]:
        candidates = self._get_openlist_candidates()
        for item in candidates:
            if item.get("id") == self._openlist_id:
                return item.get("config") or {}
        return candidates[0].get("config") if candidates else {}

    def _get_openlist_candidates(self, sanitize: bool = False) -> List[Dict[str, Any]]:
        candidates = []
        try:
            from app.helper.storage import StorageHelper

            helper = StorageHelper()
            for schema in self._storage_schema_candidates():
                try:
                    conf = helper.get_storage(schema)
                    if not conf:
                        continue
                    item_conf = getattr(conf, "config", None) or {}
                    item = {
                        "id": str(getattr(conf, "storage", None) or schema),
                        "name": str(getattr(conf, "name", None) or schema),
                        "config": dict(item_conf) if isinstance(item_conf, dict) else {},
                    }
                    candidates.append(item)
                except Exception:
                    continue
        except Exception as err:
            logger.debug(f"媒体整理 OpenList 上传：读取宿主存储配置失败 error={err}")
        if not candidates:
            candidates.append({"id": "default", "name": "MoviePilot 内置 Alist/OpenList", "config": {}})
        if sanitize:
            return [
                {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "configured": bool(item.get("config")),
                }
                for item in candidates
            ]
        return candidates

    def _storage_schema_candidates(self) -> List[str]:
        values = ["alist", "openlist", "Alist", "OpenList"]
        try:
            from app.schemas.types import StorageSchema

            for name in ("Alist", "OpenList"):
                schema = getattr(StorageSchema, name, None)
                if schema is not None:
                    values.insert(0, getattr(schema, "value", schema))
        except Exception:
            pass
        result = []
        for value in values:
            text = str(value)
            if text not in result:
                result.append(text)
        return result

    def _append_task(self, task: Dict[str, Any]):
        with self._lock:
            self._tasks.append(task)
            self._tasks = self._tasks[-self._history_limit :]
            self._save_tasks()

    def _find_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for task in self._tasks:
                if task.get("id") == task_id:
                    return task
        return None

    def _update_task(self, task_id: str, **updates):
        with self._lock:
            for task in self._tasks:
                if task.get("id") == task_id:
                    task.update(updates)
                    task["updated_at"] = self._now_text()
                    self._save_tasks()
                    break

    def _update_file(
        self,
        task_id: str,
        local_path: str,
        status: str,
        message: str = "",
        remote_path: str = None,
    ):
        with self._lock:
            for task in self._tasks:
                if task.get("id") != task_id:
                    continue
                for file_info in task.get("files", []):
                    if file_info.get("local_path") == local_path:
                        file_info["status"] = status
                        file_info["message"] = message
                        if remote_path:
                            file_info["remote_path"] = remote_path
                        file_info["updated_at"] = self._now_text()
                        self._save_tasks()
                        return

    def _load_tasks(self) -> List[Dict[str, Any]]:
        try:
            data = PluginDataOper().get_data(self.__class__.__name__, "tasks")
            if isinstance(data, list):
                return data[-self._history_limit :]
        except Exception as err:
            logger.debug(f"媒体整理 OpenList 上传：读取任务历史失败 error={err}")
        return []

    def _sync_tasks_from_store(self):
        if getattr(self, "_db_save_failed", False):
            return
        latest = self._load_tasks()
        with self._lock:
            if not latest and self._tasks:
                return
            if len(self._tasks) > len(latest):
                return
            if latest != self._tasks:
                self._tasks = latest

    def _save_tasks(self):
        try:
            PluginDataOper().save(
                self.__class__.__name__,
                "tasks",
                self._tasks[-self._history_limit :],
            )
            self._db_save_failed = False
        except Exception as err:
            self._db_save_failed = True
            logger.error(f"媒体整理 OpenList 上传：任务历史持久化失败 error={err}")

    def _task_rows(self, limit: int = 20) -> List[Dict[str, Any]]:
        self._sync_tasks_from_store()
        with self._lock:
            tasks = list(reversed(self._tasks[-limit:]))
        return [
            {
                "id": task.get("id"),
                "created_at": task.get("created_at", ""),
                "display_name": task.get("display_name", ""),
                "rule_name": task.get("rule_name", ""),
                "source_dir": task.get("source_dir", ""),
                "status": task.get("status", ""),
                "file_count": task.get("file_count", 0),
                "success_count": task.get("success_count", 0),
                "failed_count": task.get("failed_count", 0),
                "error": task.get("error", ""),
            }
            for task in tasks
        ]

    def _file_item_to_dict(self, item: UploadFileItem) -> Dict[str, Any]:
        return {
            "local_path": item.local_path.as_posix(),
            "remote_path": item.remote_path,
            "size": item.size,
            "status": "pending",
            "message": "",
        }

    def _stop_timer(self):
        with self._lock:
            if self._timer:
                self._timer.cancel()
                self._timer = None

    def _normalize_local_dir(self, value: Any) -> str:
        text = str(value or "").strip()
        if not text:
            return ""
        return Path(text).as_posix()

    def _normalize_remote_dir(self, value: Any) -> str:
        text = str(value or "").strip().replace("\\", "/")
        if not text:
            return ""
        if not text.startswith("/"):
            text = f"/{text}"
        return posixpath.normpath(text)

    def _normalize_overwrite(self, value: Any) -> str:
        text = str(value or "skip").strip().lower()
        return text if text in ("skip", "overwrite", "rename") else "skip"

    def _parse_exts(self, value: Any) -> set:
        result = set()
        for part in str(value or "").replace("，", ",").replace(";", ",").split(","):
            ext = part.strip().lower()
            if not ext:
                continue
            if not ext.startswith("."):
                ext = f".{ext}"
            result.add(ext)
        return result

    def _join_remote(self, *parts: str) -> str:
        cleaned = []
        for part in parts:
            text = str(part or "").replace("\\", "/").strip("/")
            if text and text != ".":
                cleaned.append(text)
        return "/" + posixpath.join(*cleaned) if cleaned else "/"

    def _to_int(self, value: Any, default: int, minimum: int = None) -> int:
        try:
            number = int(value)
        except Exception:
            number = default
        if minimum is not None:
            number = max(number, minimum)
        return number

    def _new_task_id(self) -> str:
        return uuid.uuid4().hex

    def _now_text(self) -> str:
        return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
