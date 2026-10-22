import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()

DEFAULT_PORT = 8002


def _read_port() -> int:
    raw_port = os.environ.get("PORT", "").strip()
    if not raw_port:
        return DEFAULT_PORT
    try:
        return int(raw_port)
    except ValueError:
        raise ValueError(f"PORT must be a number, got {raw_port!r}") from None


@dataclass(frozen=True)
class Config:
    annotation_api_v2: str
    annotation_download_v2: str
    ga_measurement_id: str
    ga_api_secret: str
    # Port used by `python main.py`; `uvicorn ... --port` overrides it.
    port: int


config = Config(
    annotation_api_v2=os.environ["ANNOTATION_API_V2"],
    annotation_download_v2=os.environ["ANNOTATION_DOWNLOAD_V2"],
    ga_measurement_id=os.environ["GA_MEASUREMENT_ID"],
    ga_api_secret=os.environ["GA_API_SECRET"],
    port=_read_port(),
)
