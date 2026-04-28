# Create a basic fastapi server

import warnings
from typing import Any

from fastapi import FastAPI, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from src.annoq import get_annoq_df, get_rsid_gene_mapping
from src.models import (
    WorkflowGeneMappingsResponse,
    WorkflowInputRequest,
    WorkflowOverrepresentationRequest,
    WorkflowOverrepresentationResponse,
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
from src.workflow import get_overrepresentation, parse_overrepresentation_results


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


def _build_unique_genes(rs_id_gene_mapping: dict[str, list[str]]) -> list[str]:
    all_unique_genes_set: set[str] = set()
    for genes in rs_id_gene_mapping.values():
        all_unique_genes_set.update(genes)
    return list(all_unique_genes_set)


def _validate_panther_gene_limit(gene_list: list[str]) -> None:
    if len(gene_list) > MAX_PANTHER_GENE_COUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Input exceeds PANTHER limit of 100,000 unique genes. "
                f"Found {len(gene_list)} unique genes."
            ),
        )


async def _run_mapping_pipeline(
    input_type: InputType,
    chrQuery: ChromosomeQuery | None,
    rsIdQuery: RsIdQuery | None,
    rsIdListQuery: RsIdListQuery | None,
    idsQuery: IdsQuery | None,
    geneQuery: GeneQuery | None,
    keywordQuery: KeywordQuery | None,
) -> tuple[list[str], dict[str, list[str]]]:
    query: Any = _resolve_query(
        input_type,
        chrQuery,
        rsIdQuery,
        rsIdListQuery,
        idsQuery,
        geneQuery,
        keywordQuery,
    )

    df = await get_annoq_df(input_type, query)
    force_chr_pos_keys = input_type == InputType.ids and idsQuery is not None

    rs_id_gene_mapping = get_rsid_gene_mapping(
        df,
        force_chr_pos_keys=force_chr_pos_keys,
    )

    all_unique_genes = _build_unique_genes(rs_id_gene_mapping)
    _validate_panther_gene_limit(all_unique_genes)
    return all_unique_genes, rs_id_gene_mapping


@app.post("/workflow/gene_mappings")
async def workflow_gene_mappings(
    request: WorkflowInputRequest,
) -> WorkflowGeneMappingsResponse:
    try:
        all_unique_genes, rs_id_gene_mapping = await _run_mapping_pipeline(
            request.input_type,
            request.chrQuery,
            request.rsIdQuery,
            request.rsIdListQuery,
            request.idsQuery,
            request.geneQuery,
            request.keywordQuery,
        )

        if not all_unique_genes:
            return WorkflowGeneMappingsResponse(
                gene_list=[],
                rsId_genes_map={},
                panther_gene_info={},
                gene_panther_mapping={},
            )

        panther_gene_info_data, gene_panther_mapping_data = await get_panther_info(
            all_unique_genes
        )

        return WorkflowGeneMappingsResponse(
            gene_list=all_unique_genes,
            rsId_genes_map=rs_id_gene_mapping,
            panther_gene_info=panther_gene_info_data,
            gene_panther_mapping=gene_panther_mapping_data,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@app.post("/workflow/overrepresentation")
async def workflow_overrepresentation(
    request: WorkflowOverrepresentationRequest,
) -> WorkflowOverrepresentationResponse:
    try:
        all_unique_genes, rs_id_gene_mapping = await _run_mapping_pipeline(
            request.input_type,
            request.chrQuery,
            request.rsIdQuery,
            request.rsIdListQuery,
            request.idsQuery,
            request.geneQuery,
            request.keywordQuery,
        )

        if all_unique_genes:
            panther_gene_info_data, gene_panther_mapping_data = await get_panther_info(
                all_unique_genes
            )
            overrepresentation_raw = await get_overrepresentation(
                gene_list=all_unique_genes,
                annot_data_set=request.annotDataSet,
                correction=request.correction.value,
                enrichment_test_type=request.enrichmentTestType.value,
            )
        else:
            panther_gene_info_data = {}
            gene_panther_mapping_data = {}
            overrepresentation_raw = {"results": {"result": []}}

        overrepresentation_results = parse_overrepresentation_results(
            overrepresentation_raw
        )

        return WorkflowOverrepresentationResponse(
            gene_list=all_unique_genes,
            rsId_genes_map=rs_id_gene_mapping,
            panther_gene_info=panther_gene_info_data,
            gene_panther_mapping=gene_panther_mapping_data,
            overrepresentation_results=overrepresentation_results,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# Add the build folder that contains the react app
app.mount("/", NoCacheStaticFiles(directory="dist", html=True))
