# Create a basic fastapi server

import asyncio
import warnings
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from src.analytics import send_event
from src.annoq import get_annoq_df, get_rsid_gene_mapping
from src.models import (
    SnpListInput,
    WorkflowGeneMappingsResponse,
    WorkflowInputRequest,
    WorkflowOverrepresentationRequest,
    WorkflowOverrepresentationResponse,
)
from src.panther import get_panther_info
from src.query import InputType
from src.workflow import (
    PantherInputError,
    get_overrepresentation,
    parse_overrepresentation_results,
)


class NoCacheStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response: FileResponse = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response


warnings.filterwarnings("ignore")

app = FastAPI(default_response_class=ORJSONResponse)
MAX_PANTHER_GENE_COUNT = 100000

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def ga_track_endpoints(request: Request, call_next):
    response = await call_next(request)
    route = request.scope.get("route")
    if isinstance(route, APIRoute):
        await send_event(
            "api_request",
            {
                "endpoint": route.path,
                "method": request.method,
                "status": response.status_code,
            },
        )
    return response


def _resolve_query(snp_list: SnpListInput) -> Any:
    input_type = snp_list.input_type
    if input_type == InputType.rsId:
        return snp_list.rsIdQuery
    if input_type == InputType.rsIdList:
        return snp_list.rsIdListQuery
    if input_type == InputType.ids:
        return snp_list.idsQuery
    if input_type == InputType.gene:
        return snp_list.geneQuery
    if input_type == InputType.keyword:
        return snp_list.keywordQuery
    return None


def _build_unique_genes(rs_id_gene_mapping: dict[str, list[str]]) -> list[str]:
    all_unique_genes_set: set[str] = set()
    for genes in rs_id_gene_mapping.values():
        all_unique_genes_set.update(genes)
    return list(all_unique_genes_set)


def _validate_panther_gene_limit(gene_list: list[str], list_label: str) -> None:
    if len(gene_list) > MAX_PANTHER_GENE_COUNT:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"{list_label} exceeds PANTHER limit of 100,000 unique genes. "
                f"Found {len(gene_list)} unique genes."
            ),
        )


async def _run_mapping_pipeline(
    snp_list: SnpListInput,
    list_label: str = "Input",
) -> tuple[list[str], dict[str, list[str]]]:
    query: Any = _resolve_query(snp_list)
    if query is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"{list_label} payload is missing for input_type "
                f"'{snp_list.input_type.value}'."
            ),
        )

    df = await get_annoq_df(snp_list.input_type, query)
    force_chr_pos_keys = snp_list.input_type == InputType.ids

    rs_id_gene_mapping = get_rsid_gene_mapping(
        df,
        force_chr_pos_keys=force_chr_pos_keys,
        gene_mapping_fields=snp_list.geneMappingFields,
    )

    all_unique_genes = _build_unique_genes(rs_id_gene_mapping)
    _validate_panther_gene_limit(all_unique_genes, list_label)
    return all_unique_genes, rs_id_gene_mapping


@app.post("/workflow/gene_mappings")
async def workflow_gene_mappings(
    request: WorkflowInputRequest,
) -> WorkflowGeneMappingsResponse:
    try:
        all_unique_genes, rs_id_gene_mapping = await _run_mapping_pipeline(request)

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
        reference_gene_list: list[str] | None = None
        if request.referenceList is None:
            all_unique_genes, rs_id_gene_mapping = await _run_mapping_pipeline(request)
        else:
            (
                (all_unique_genes, rs_id_gene_mapping),
                (reference_gene_list, _),
            ) = await asyncio.gather(
                _run_mapping_pipeline(request),
                _run_mapping_pipeline(request.referenceList, "Reference list"),
            )
            if not reference_gene_list:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="No genes found for the custom reference list.",
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
                ref_gene_list=reference_gene_list,
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
            reference_gene_list=reference_gene_list,
        )
    except HTTPException:
        raise
    except PantherInputError as e:
        # PANTHER rejected the gene lists; pass its message back to the user.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


# Add the build folder that contains the react app
app.mount("/", NoCacheStaticFiles(directory="dist", html=True))
