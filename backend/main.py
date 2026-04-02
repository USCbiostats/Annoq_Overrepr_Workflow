# Create a basic fastapi server

import warnings
from typing import Annotated, Any

from fastapi import Body, FastAPI, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from src.annoq import get_annoq_df, get_rsid_gene_mapping
from src.models import (
    GeneMappingsResponse,
    PantherGeneInfoRequest,
    PantherGeneInfoResponse,
)
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


class NoCacheStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response: FileResponse = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


warnings.filterwarnings("ignore")

app = FastAPI()
MAX_PANTHER_GENE_COUNT = 100000

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _resolve_query(
    input_type: InputType,
    chrQuery: ChromosomeQuery | None,
    rsIdQuery: RsIdQuery | None,
    rsIdListQuery: RsIdListQuery | None,
    idsQuery: IdsQuery | None,
    geneQuery: GeneQuery | None,
    keywordQuery: KeywordQuery | None,
) -> Any:
    if input_type == InputType.chromosome:
        return chrQuery
    if input_type == InputType.rsId:
        return rsIdQuery
    if input_type == InputType.rsIdList:
        return rsIdListQuery
    if input_type == InputType.ids:
        return idsQuery
    if input_type == InputType.gene:
        return geneQuery
    if input_type == InputType.keyword:
        return keywordQuery
    return None


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
    query: Any = _resolve_query(
        input_type,
        chrQuery,
        rsIdQuery,
        rsIdListQuery,
        idsQuery,
        geneQuery,
        keywordQuery,
    )

    try:
        df = await get_annoq_df(input_type, query)
        force_chr_pos_keys = False
        if input_type == InputType.ids and idsQuery is not None:
            force_chr_pos_keys = True

        rs_id_gene_mapping = get_rsid_gene_mapping(
            df,
            force_chr_pos_keys=force_chr_pos_keys,
        )

        # Get all unique genes
        all_unique_genes_set = set()
        for genes in rs_id_gene_mapping.values():
            all_unique_genes_set.update(genes)
        all_unique_genes = list(all_unique_genes_set)

        if len(all_unique_genes) > MAX_PANTHER_GENE_COUNT:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Input exceeds PANTHER limit of 100,000 unique genes. "
                    f"Found {len(all_unique_genes)} unique genes."
                ),
            )

        return GeneMappingsResponse(
            gene_list=all_unique_genes,
            rsId_genes_map=rs_id_gene_mapping,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@app.post("/panther_gene_info")
async def panther_gene_info(
    request: PantherGeneInfoRequest,
) -> PantherGeneInfoResponse:
    try:
        unique_gene_list = list(dict.fromkeys(gene.strip() for gene in request.gene_list if gene.strip()))

        if len(unique_gene_list) > MAX_PANTHER_GENE_COUNT:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Input exceeds PANTHER limit of 100,000 unique genes. "
                    f"Found {len(unique_gene_list)} unique genes."
                ),
            )

        if not unique_gene_list:
            return PantherGeneInfoResponse(
                panther_gene_info={},
                gene_panther_mapping={},
            )

        panther_gene_info_data, gene_panther_mapping_data = await get_panther_info(
            unique_gene_list
        )

        return PantherGeneInfoResponse(
            panther_gene_info=panther_gene_info_data,
            gene_panther_mapping=gene_panther_mapping_data,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# Add the build folder that contains the react app
app.mount("/", NoCacheStaticFiles(directory="dist", html=True))
