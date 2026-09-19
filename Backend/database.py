from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "Data"
DATABASE_FILE = DATA_DIR / "netveda.db"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def normalize_phone(phone: str) -> str:
    digits = "".join(character for character in str(phone or "") if character.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    return digits


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_FILE)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_database() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS customers (
                customer_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone_number TEXT NOT NULL UNIQUE,
                email TEXT,
                product TEXT,
                source_surface TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_active_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tickets (
                ticket_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL REFERENCES customers(customer_id),
                query_text TEXT NOT NULL,
                category TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                resolution_notes TEXT,
                source_surface TEXT NOT NULL,
                handled_by TEXT NOT NULL DEFAULT 'bot',
                priority TEXT NOT NULL DEFAULT 'medium',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chat_logs (
                log_id TEXT PRIMARY KEY,
                customer_id TEXT REFERENCES customers(customer_id),
                employee_id TEXT,
                ticket_id TEXT REFERENCES tickets(ticket_id),
                message TEXT NOT NULL,
                sender TEXT NOT NULL,
                source_surface TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS employees (
                employee_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                sso_id TEXT NOT NULL UNIQUE
            );

            CREATE TABLE IF NOT EXISTS chatbot_configs (
                chatbot_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                public_token TEXT NOT NULL UNIQUE,
                backend_origin TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS knowledge_sources (
                source_id TEXT PRIMARY KEY,
                chatbot_id TEXT NOT NULL REFERENCES chatbot_configs(chatbot_id),
                source_type TEXT NOT NULL,
                source_url TEXT,
                content TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_customers_phone
                ON customers(phone_number);
            CREATE INDEX IF NOT EXISTS idx_tickets_customer
                ON tickets(customer_id);
            """
        )


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def find_customer_by_phone(phone: str) -> dict[str, Any] | None:
    normalized = normalize_phone(phone)
    if not normalized:
        return None
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM customers WHERE phone_number = ?",
            (normalized,),
        ).fetchone()
    return row_to_dict(row)


def find_customer(customer_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM customers WHERE customer_id = ?",
            (customer_id.strip(),),
        ).fetchone()
    return row_to_dict(row)


def find_customer_by_query(query: str) -> list[dict[str, Any]]:
    pattern = f"%{query.strip()}%"
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT * FROM customers
            WHERE phone_number LIKE ? OR name LIKE ?
            ORDER BY last_active_at DESC
            """,
            (pattern, pattern),
        ).fetchall()
    return [dict(row) for row in rows]


def create_customer(
    name: str,
    phone: str,
    email: str | None = None,
    product: str | None = None,
    source_surface: str = "website",
) -> dict[str, Any]:
    normalized = normalize_phone(phone)
    now = utc_now()
    customer = {
        "customer_id": _new_id("CUS"),
        "name": name.strip(),
        "phone_number": normalized,
        "email": email.strip() if email else None,
        "product": product.strip() if product else None,
        "source_surface": source_surface,
        "created_at": now,
        "last_active_at": now,
    }
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO customers (
                customer_id, name, phone_number, email, product,
                source_surface, created_at, last_active_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(customer.values()),
        )
    return customer


def touch_customer(customer_id: str) -> None:
    with get_connection() as connection:
        connection.execute(
            "UPDATE customers SET last_active_at = ? WHERE customer_id = ?",
            (utc_now(), customer_id),
        )


def get_customer_history(customer_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM tickets WHERE customer_id = ? ORDER BY created_at DESC",
            (customer_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def create_ticket(
    customer_id: str,
    query_text: str,
    category: str = "general",
    source_surface: str = "website",
    priority: str = "medium",
    handled_by: str = "bot",
) -> dict[str, Any]:
    now = utc_now()
    ticket = {
        "ticket_id": _new_id("TKT"),
        "customer_id": customer_id,
        "query_text": query_text.strip(),
        "category": category,
        "status": "open",
        "resolution_notes": None,
        "source_surface": source_surface,
        "handled_by": handled_by,
        "priority": priority,
        "created_at": now,
        "updated_at": now,
    }
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO tickets (
                ticket_id, customer_id, query_text, category, status,
                resolution_notes, source_surface, handled_by, priority,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(ticket.values()),
        )
    return ticket


def get_ticket(ticket_id: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM tickets WHERE ticket_id = ?",
            (ticket_id.strip(),),
        ).fetchone()
    return row_to_dict(row)


def update_ticket(ticket_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
    allowed = {"status", "resolution_notes", "priority", "handled_by"}
    updates = {key: value for key, value in values.items() if key in allowed}
    if not updates:
        return get_ticket(ticket_id)

    assignments = ", ".join(f"{key} = ?" for key in updates)
    parameters = [*updates.values(), utc_now(), ticket_id.strip()]
    with get_connection() as connection:
        connection.execute(
            f"UPDATE tickets SET {assignments}, updated_at = ? WHERE ticket_id = ?",
            parameters,
        )
    return get_ticket(ticket_id)


def get_or_create_chatbot(name: str = "NetVeda AI", backend_origin: str | None = None) -> dict[str, Any]:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM chatbot_configs WHERE name = ? ORDER BY created_at LIMIT 1",
            (name,),
        ).fetchone()
        if row:
            return dict(row)

        chatbot = {
            "chatbot_id": _new_id("BOT"),
            "name": name,
            "public_token": uuid.uuid4().hex,
            "backend_origin": backend_origin,
            "created_at": utc_now(),
        }
        connection.execute(
            """
            INSERT INTO chatbot_configs (
                chatbot_id, name, public_token, backend_origin, created_at
            ) VALUES (?, ?, ?, ?, ?)
            """,
            tuple(chatbot.values()),
        )
    return chatbot


def get_chatbot_by_token(public_token: str) -> dict[str, Any] | None:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM chatbot_configs WHERE public_token = ?",
            (public_token.strip(),),
        ).fetchone()
    return row_to_dict(row)


def save_knowledge_source(
    chatbot_id: str,
    source_type: str,
    source_url: str | None,
    content: str,
    status: str = "trained",
) -> dict[str, Any]:
    now = utc_now()
    source = {
        "source_id": _new_id("SRC"),
        "chatbot_id": chatbot_id,
        "source_type": source_type,
        "source_url": source_url,
        "content": content,
        "status": status,
        "created_at": now,
        "updated_at": now,
    }
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO knowledge_sources (
                source_id, chatbot_id, source_type, source_url, content,
                status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            tuple(source.values()),
        )
    return source


def get_knowledge_sources(chatbot_id: str) -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM knowledge_sources WHERE chatbot_id = ? ORDER BY created_at DESC",
            (chatbot_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def log_message(
    message: str,
    sender: str,
    source_surface: str,
    customer_id: str | None = None,
    employee_id: str | None = None,
    ticket_id: str | None = None,
) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO chat_logs (
                log_id, customer_id, employee_id, ticket_id, message,
                sender, source_surface, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _new_id("LOG"),
                customer_id,
                employee_id,
                ticket_id,
                message,
                sender,
                source_surface,
                utc_now(),
            ),
        )


init_database()
