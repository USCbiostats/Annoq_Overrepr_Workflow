import uuid
from typing import Any

import httpx

from src.config import config

GA_URL = "https://www.google-analytics.com/mp/collect"


async def send_event(name: str, params: dict[str, Any]) -> None:
    payload = {
        "client_id": str(uuid.uuid4()),
        "events": [{"name": name, "params": params}],
    }
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(
                GA_URL,
                params={
                    "measurement_id": config.ga_measurement_id,
                    "api_secret": config.ga_api_secret,
                },
                json=payload,
            )
    except Exception:
        pass
