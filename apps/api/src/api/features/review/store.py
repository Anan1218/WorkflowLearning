"""Review queue persistence with Postgres primary storage and JSON fallback."""

from __future__ import annotations

import os
import time
import uuid

from api.config import APP_STATE_DIR
from api.lib.json_store import JsonStore


def _guideline_ids(item: dict) -> list[str]:
    ids: list[str] = []
    for rationale in item.get("rationales", []):
        guideline_id = rationale.get("guideline_id")
        if guideline_id and guideline_id not in ids:
            ids.append(guideline_id)
    return ids


class JsonReviewStore:
    """JSON-file backed review queue for zero-setup local development."""

    def __init__(self) -> None:
        self._store = JsonStore(APP_STATE_DIR / "review_queue.json")
        if "items" not in self._store.data:
            self._store.data["items"] = {}

    def enqueue(
        self,
        document_text: str,
        submission: dict,
        flagged_fields: list[dict],
        rationales: list[dict],
        model_id: str,
    ) -> str:
        item_id = uuid.uuid4().hex[:12]
        self._store.data["items"][item_id] = {
            "id": item_id,
            "created_at": time.time(),
            "model_id": model_id,
            "status": "pending",
            "document_text": document_text,
            "submission": submission,
            "flagged_fields": flagged_fields,
            "rationales": rationales,
            "decisions": {},
        }
        self._store.save()
        return item_id

    def list_items(self, status: str | None = None) -> list[dict]:
        items = sorted(self._store.data["items"].values(), key=lambda i: i["created_at"], reverse=True)
        if status:
            items = [i for i in items if i["status"] == status]

        return [
            {
                "id": i["id"],
                "created_at": i["created_at"],
                "model_id": i["model_id"],
                "status": i["status"],
                "n_flagged": len(i["flagged_fields"]),
                "n_decided": len(i["decisions"]),
                "doc_preview": i["document_text"][:180],
                "principal": (i["submission"].get("principal") or {}).get("name"),
                "guideline_ids": _guideline_ids(i),
            }
            for i in items
        ]

    def get_item(self, item_id: str) -> dict | None:
        return self._store.data["items"].get(item_id)

    def apply_decisions(self, item_id: str, decisions: list[dict]) -> dict | None:
        item = self._store.data["items"].get(item_id)
        if not item:
            return None
        flagged_paths = {f["path"] for f in item["flagged_fields"]}
        for decision in decisions:
            if decision["path"] not in flagged_paths:
                continue
            item["decisions"][decision["path"]] = {
                "action": decision["action"],
                "override_value": decision.get("override_value"),
                "decided_at": time.time(),
            }
        if flagged_paths and flagged_paths <= set(item["decisions"]):
            item["status"] = "resolved"
        self._store.save()
        return item


class PostgresReviewStore:
    """Supabase Postgres review queue store with append-only decision rows."""

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    def _connect(self):
        import psycopg
        from psycopg.rows import dict_row

        return psycopg.connect(self._dsn, row_factory=dict_row)

    @staticmethod
    def _jsonb(value):
        from psycopg.types.json import Jsonb

        return Jsonb(value)

    @staticmethod
    def _item_from_row(cur, row: dict) -> dict:
        item = dict(row)
        cur.execute(
            """
            select field_path, action, override_value,
                   extract(epoch from decided_at)::double precision as decided_at
            from review_decisions
            where item_id = %s
            order by decided_at, id
            """,
            (item["id"],),
        )
        item["decisions"] = {
            decision["field_path"]: {
                "action": decision["action"],
                "override_value": decision["override_value"],
                "decided_at": decision["decided_at"],
            }
            for decision in cur.fetchall()
        }
        return item

    @classmethod
    def _fetch_item(cls, cur, item_id: str) -> dict | None:
        cur.execute(
            """
            select id,
                   extract(epoch from created_at)::double precision as created_at,
                   model_id,
                   status,
                   document_text,
                   submission,
                   flagged_fields,
                   rationales
            from review_items
            where id = %s
            """,
            (item_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return cls._item_from_row(cur, row)

    def enqueue(
        self,
        document_text: str,
        submission: dict,
        flagged_fields: list[dict],
        rationales: list[dict],
        model_id: str,
    ) -> str:
        item_id = uuid.uuid4().hex[:12]
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    insert into review_items (
                        id, model_id, document_text, submission, flagged_fields, rationales
                    )
                    values (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        item_id,
                        model_id,
                        document_text,
                        self._jsonb(submission),
                        self._jsonb(flagged_fields),
                        self._jsonb(rationales),
                    ),
                )
        return item_id

    def list_items(self, status: str | None = None) -> list[dict]:
        where = "where status = %s" if status else ""
        params = (status,) if status else ()
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    select id,
                           extract(epoch from created_at)::double precision as created_at,
                           model_id,
                           status,
                           jsonb_array_length(flagged_fields) as n_flagged,
                           (
                               select count(distinct d.field_path)::int
                               from review_decisions d
                               where d.item_id = i.id
                           ) as n_decided,
                           left(document_text, 180) as doc_preview,
                           submission,
                           rationales
                    from review_items i
                    {where}
                    order by created_at desc
                    """,
                    params,
                )
                rows = cur.fetchall()

        return [
            {
                "id": row["id"],
                "created_at": row["created_at"],
                "model_id": row["model_id"],
                "status": row["status"],
                "n_flagged": row["n_flagged"],
                "n_decided": row["n_decided"],
                "doc_preview": row["doc_preview"],
                "principal": (row["submission"].get("principal") or {}).get("name"),
                "guideline_ids": _guideline_ids(row),
            }
            for row in rows
        ]

    def get_item(self, item_id: str) -> dict | None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                return self._fetch_item(cur, item_id)

    def apply_decisions(self, item_id: str, decisions: list[dict]) -> dict | None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "select flagged_fields from review_items where id = %s",
                    (item_id,),
                )
                row = cur.fetchone()
                if not row:
                    return None

                flagged_paths = {field["path"] for field in row["flagged_fields"]}
                for decision in decisions:
                    if decision["path"] not in flagged_paths:
                        continue
                    cur.execute(
                        """
                        insert into review_decisions (
                            item_id, field_path, action, override_value
                        )
                        values (%s, %s, %s, %s)
                        """,
                        (
                            item_id,
                            decision["path"],
                            decision["action"],
                            self._jsonb(decision.get("override_value")),
                        ),
                    )

                n_decided = 0
                if flagged_paths:
                    cur.execute(
                        """
                        select count(distinct field_path)::int as n_decided
                        from review_decisions
                        where item_id = %s
                          and field_path = any(%s::text[])
                        """,
                        (item_id, list(flagged_paths)),
                    )
                    n_decided = cur.fetchone()["n_decided"]

                if flagged_paths and n_decided >= len(flagged_paths):
                    cur.execute(
                        "update review_items set status = 'resolved' where id = %s",
                        (item_id,),
                    )

                return self._fetch_item(cur, item_id)


def _make_store() -> JsonReviewStore | PostgresReviewStore:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return PostgresReviewStore(database_url)
    return JsonReviewStore()


_store = _make_store()


def enqueue(
    document_text: str,
    submission: dict,
    flagged_fields: list[dict],
    rationales: list[dict],
    model_id: str,
) -> str:
    return _store.enqueue(document_text, submission, flagged_fields, rationales, model_id)


def list_items(status: str | None = None) -> list[dict]:
    return _store.list_items(status)


def get_item(item_id: str) -> dict | None:
    return _store.get_item(item_id)


def apply_decisions(item_id: str, decisions: list[dict]) -> dict | None:
    return _store.apply_decisions(item_id, decisions)
