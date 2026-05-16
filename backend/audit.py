import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Mapping, Optional

import models
from sqlalchemy.orm import Session


def _json_default(value: Any):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return str(value)


def _serialize(payload: Optional[Any]) -> Optional[str]:
    if payload is None:
        return None
    return json.dumps(payload, default=_json_default, sort_keys=True)


def log_action(
    db: Session,
    user_id: int,
    action: str,
    table_name: str,
    record_id: int,
    old_value: Optional[Mapping[str, Any]] = None,
    new_value: Optional[Mapping[str, Any]] = None,
) -> models.AuditLog:
    audit_entry = models.AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        old_value=_serialize(old_value),
        new_value=_serialize(new_value),
    )
    db.add(audit_entry)
    return audit_entry
