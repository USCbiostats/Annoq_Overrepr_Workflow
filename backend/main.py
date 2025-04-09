# Create a basic fastapi server

import warnings
from typing import Annotated, Any

from fastapi import Body, FastAPI, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.annoq import get_annoq_df, get_rsid_gene_mapping
from src.models import GeneMappingsResponse
from src.panther import get_panther_info
from src.query import (
    ChromosomeQuery,
    GeneQuery,
    IdsQuery,
    InputType,
    KeywordQuery,
    RsIdListQuery,
    RsIdQuery,
)

warnings.filterwarnings("ignore")

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/gene_mappings")
async def gene_mappings(
    input_type: Annotated[InputType, Body(...)],
    chrQuery: ChromosomeQuery | None = None,
    rsIdQuery: RsIdQuery | None = None,
    rsIdListQuery: RsIdListQuery | None = None,
    idsQuery: IdsQuery | None = None,
    geneQuery: GeneQuery | None = None,
    keywordQuery: KeywordQuery | None = None,
) -> GeneMappingsResponse:
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
        df = await get_annoq_df(input_type, query)
        rs_id_gene_mapping = get_rsid_gene_mapping(df)

        # Get all unique genes
        all_unique_genes_set = set()
        for genes in rs_id_gene_mapping.values():
            all_unique_genes_set.update(genes)
        all_unique_genes = list(all_unique_genes_set)

        # Get PANTHER information for the unique genes
        panther_gene_info, gene_panther_mapping = await get_panther_info(
            all_unique_genes
        )

        return GeneMappingsResponse(
            gene_list=all_unique_genes,
            rsId_genes_map=rs_id_gene_mapping,
            panther_gene_info=panther_gene_info,
            gene_panther_mapping=gene_panther_mapping,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# Add the build folder that contains the react app
app.mount("/", StaticFiles(directory="dist", html=True))
