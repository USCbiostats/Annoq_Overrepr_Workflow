# Create a basic fastapi server

from fastapi import FastAPI, Body
from fastapi.staticfiles import StaticFiles
from fastapi import status

from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import HTTPException

from src.annoq import get_unique_gene_list

from src.query import (
    InputType,
    ChromosomeQuery,
    RsIdQuery,
    RsIdListQuery,
    IdsQuery,
    GeneQuery,
    KeywordQuery,
)

from typing import Annotated, Any

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/gene_mappings")
def gene_mappings(
    input_type: Annotated[InputType, Body(...)],
    chrQuery: ChromosomeQuery | None = None,
    rsIdQuery: RsIdQuery | None = None,
    rsIdListQuery: RsIdListQuery | None = None,
    idsQuery: IdsQuery | None = None,
    geneQuery: GeneQuery | None = None,
    keywordQuery: KeywordQuery | None = None,
) -> list[str]:
    query: Any = None
    if input_type == InputType.chromosome:
        query = chrQuery
    elif input_type == InputType.rsId:
        query = rsIdQuery
    elif input_type == InputType.rsIdList:
        query = rsIdListQuery
    elif input_type == InputType.ids:
        query = idsQuery
    elif input_type == InputType.gene:
        query = geneQuery
    elif input_type == InputType.keyword:
        query = keywordQuery

    try:
        gene_list = get_unique_gene_list(input_type, query)
        
        return gene_list

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# Add the build folder that contains the react app
app.mount("/", StaticFiles(directory="dist", html=True))