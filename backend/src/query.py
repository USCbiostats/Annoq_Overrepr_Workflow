from enum import Enum
from pydantic import BaseModel


class InputType(Enum):
    chromosome = "chromosome"
    gene = "gene"
    rsId = "rsId"
    rsIdList = "rsIdList"
    ids = "ids"
    keyword = "keyword"


class ChromosomeQuery(BaseModel):
    chr: str
    start: int
    end: int


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
