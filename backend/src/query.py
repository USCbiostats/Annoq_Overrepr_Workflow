from enum import Enum
from pydantic import BaseModel


class InputType(Enum):
    gene = "gene"
    rsId = "rsId"
    rsIdList = "rsIdList"
    ids = "ids"
    keyword = "keyword"
    # Gene IDs sent to PANTHER as they are; only allowed for reference lists.
    geneList = "geneList"


class RsIdQuery(BaseModel):
    rsId: str


class RsIdListQuery(BaseModel):
    rsIdList: list[str]


class IdsQuery(BaseModel):
    ids: list[str]


class GeneQuery(BaseModel):
    gene: str


class KeywordQuery(BaseModel):
    keyword: str


class GeneListQuery(BaseModel):
    genes: list[str]
