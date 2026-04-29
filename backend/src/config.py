import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    annotation_api_v2: str
    annotation_download_v2: str
    ga_measurement_id: str
    ga_api_secret: str


config = Config(
    annotation_api_v2=os.environ["ANNOTATION_API_V2"],
    annotation_download_v2=os.environ["ANNOTATION_DOWNLOAD_V2"],
    ga_measurement_id=os.environ["GA_MEASUREMENT_ID"],
    ga_api_secret=os.environ["GA_API_SECRET"],
)
