# Create a basic fastapi server

import asyncio
import warnings
from typing import Any, AsyncIterator, Awaitable, Callable

import orjson
from fastapi import FastAPI, Request, status
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse, StreamingResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from starlette.responses import FileResponse

from src.analytics import send_event
from src.annoq import get_annoq_df, get_rsid_gene_mapping
from src.models import (
    OverrepresentationResultItem,
    PantherGeneInfoResponse,
    SnpListInput,
    WorkflowGeneMappingsResponse,
    WorkflowInputRequest,
    WorkflowOverrepresentationRequest,
    WorkflowOverrepresentationResponse,
)
from src.panther import get_panther_info
from src.progress import ProgressCallback
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
    on_progress: ProgressCallback | None = None,
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

    df = await get_annoq_df(snp_list.input_type, query, on_progress=on_progress)
    force_chr_pos_keys = snp_list.input_type == InputType.ids

    rs_id_gene_mapping = get_rsid_gene_mapping(
        df,
        force_chr_pos_keys=force_chr_pos_keys,
        gene_mapping_fields=snp_list.geneMappingFields,
    )

    all_unique_genes = _build_unique_genes(rs_id_gene_mapping)
    _validate_panther_gene_limit(all_unique_genes, list_label)
    return all_unique_genes, rs_id_gene_mapping


# Runs one workflow stage: run_stage(stage name, make_coro) where make_coro
# receives the stage's progress callback (or None) and returns a coroutine.
StageRunner = Callable[
    [str, Callable[[ProgressCallback | None], Awaitable[Any]]], Awaitable[Any]
]


async def _run_untracked(
    stage: str, make_coro: Callable[[ProgressCallback | None], Awaitable[Any]]
) -> Any:
    return await make_coro(None)


async def _gather_or_cancel(*awaitables: Awaitable[Any]) -> list[Any]:
    """Like asyncio.gather, but cancels the rest as soon as one fails."""
    tasks = [asyncio.ensure_future(awaitable) for awaitable in awaitables]
    try:
        return await asyncio.gather(*tasks)
    except BaseException:
        for task in tasks:
            task.cancel()
        raise


async def _map_request_lists(
    request: WorkflowOverrepresentationRequest,
    run_stage: StageRunner = _run_untracked,
) -> tuple[list[str], dict[str, list[str]], list[str] | None]:
    """Map the input list and, if given, the reference list to genes."""
    reference_list = request.referenceList
    jobs = [
        run_stage(
            "input",
            lambda on_progress: _run_mapping_pipeline(
                request, on_progress=on_progress
            ),
        )
    ]
    if reference_list is not None:
        jobs.append(
            run_stage(
                "reference",
                lambda on_progress: _run_mapping_pipeline(
                    reference_list, "Reference list", on_progress
                ),
            )
        )

    results = await _gather_or_cancel(*jobs)
    all_unique_genes, rs_id_gene_mapping = results[0]
    if reference_list is None:
        return all_unique_genes, rs_id_gene_mapping, None

    reference_gene_list, _ = results[1]
    if not reference_gene_list:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No genes found for the custom reference list.",
        )
    return all_unique_genes, rs_id_gene_mapping, reference_gene_list


async def _run_overrepresentation_test(
    request: WorkflowOverrepresentationRequest,
    gene_list: list[str],
    reference_gene_list: list[str] | None,
) -> list[OverrepresentationResultItem]:
    overrepresentation_raw = await get_overrepresentation(
        gene_list=gene_list,
        annot_data_set=request.annotDataSet,
        correction=request.correction.value,
        enrichment_test_type=request.enrichmentTestType.value,
        ref_gene_list=reference_gene_list,
    )
    return parse_overrepresentation_results(overrepresentation_raw)


def _error_status_and_detail(exc: Exception) -> tuple[int, str]:
    if isinstance(exc, HTTPException):
        return exc.status_code, str(exc.detail)
    if isinstance(exc, PantherInputError):
        # PANTHER rejected the gene lists; pass its message back to the user.
        return status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)
    return status.HTTP_500_INTERNAL_SERVER_ERROR, str(exc)


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
        (
            all_unique_genes,
            rs_id_gene_mapping,
            reference_gene_list,
        ) = await _map_request_lists(request)

        if all_unique_genes:
            # Run the enrichment test first; gene details are only needed for
            # downloads.
            overrepresentation_results = await _run_overrepresentation_test(
                request, all_unique_genes, reference_gene_list
            )
            panther_gene_info_data, gene_panther_mapping_data = await get_panther_info(
                all_unique_genes
            )
        else:
            panther_gene_info_data = {}
            gene_panther_mapping_data = {}
            overrepresentation_results = []

        return WorkflowOverrepresentationResponse(
            gene_list=all_unique_genes,
            rsId_genes_map=rs_id_gene_mapping,
            panther_gene_info=panther_gene_info_data,
            gene_panther_mapping=gene_panther_mapping_data,
            overrepresentation_results=overrepresentation_results,
            reference_gene_list=reference_gene_list,
        )
    except Exception as e:
        status_code, detail = _error_status_and_detail(e)
        raise HTTPException(status_code=status_code, detail=detail)


STREAM_HEARTBEAT_SECONDS = 15.0


def _stream_line(event: dict[str, Any]) -> bytes:
    return orjson.dumps(event) + b"\n"


@app.post("/workflow/overrepresentation/stream")
async def workflow_overrepresentation_stream(
    request: WorkflowOverrepresentationRequest,
) -> StreamingResponse:
    """Run the workflow and stream progress as newline-delimited JSON.

    Events, one JSON object per line:
      {"event": "stage", "stage": ..., "status": ..., "done": ..., "total": ...}
        stage: input | reference | overrepresentation | gene_details
        status: pending | running | done | failed
      {"event": "result", "data": <WorkflowOverrepresentationResponse>}
        Sent once the overrepresentation test finishes; panther_gene_info and
        gene_panther_mapping are empty until gene_details arrives.
      {"event": "gene_details", "data": <PantherGeneInfoResponse>}
      {"event": "error", "stage": ..., "status": <HTTP status>, "detail": ...}
        Before "result" the run has stopped; after it, only downloads are
        affected.
      {"event": "heartbeat"}
        Sent while nothing else happens, so proxies keep the connection open.
    """
    queue: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
    failed_stages: list[str] = []

    def emit(event: dict[str, Any]) -> None:
        queue.put_nowait(event)

    def emit_stage(
        stage: str, stage_status: str, done: int | None = None, total: int | None = None
    ) -> None:
        emit(
            {
                "event": "stage",
                "stage": stage,
                "status": stage_status,
                "done": done,
                "total": total,
            }
        )

    async def run_stage(
        stage: str, make_coro: Callable[[ProgressCallback | None], Awaitable[Any]]
    ) -> Any:
        emit_stage(stage, "running")
        try:
            result = await make_coro(
                lambda done, total: emit_stage(stage, "running", done, total)
            )
        except asyncio.CancelledError:
            raise
        except BaseException:
            failed_stages.append(stage)
            emit_stage(stage, "failed")
            raise
        emit_stage(stage, "done")
        return result

    def emit_error(exc: Exception, stage: str | None) -> None:
        error_status, detail = _error_status_and_detail(exc)
        emit({"event": "error", "stage": stage, "status": error_status, "detail": detail})

    async def run_workflow() -> None:
        stages = ["input"]
        if request.referenceList is not None:
            stages.append("reference")
        stages += ["overrepresentation", "gene_details"]
        for stage in stages:
            emit_stage(stage, "pending")

        try:
            (
                all_unique_genes,
                rs_id_gene_mapping,
                reference_gene_list,
            ) = await _map_request_lists(request, run_stage)

            if not all_unique_genes:
                emit(
                    {
                        "event": "result",
                        "data": WorkflowOverrepresentationResponse(
                            gene_list=[],
                            rsId_genes_map=rs_id_gene_mapping,
                            panther_gene_info={},
                            gene_panther_mapping={},
                            overrepresentation_results=[],
                            reference_gene_list=reference_gene_list,
                        ).model_dump(mode="json"),
                    }
                )
                return

            # Run the enrichment test first and send results as soon as it is
            # done; gene details (only needed for downloads) are fetched after.
            overrepresentation_results = await run_stage(
                "overrepresentation",
                lambda _: _run_overrepresentation_test(
                    request, all_unique_genes, reference_gene_list
                ),
            )

            emit(
                {
                    "event": "result",
                    "data": WorkflowOverrepresentationResponse(
                        gene_list=all_unique_genes,
                        rsId_genes_map=rs_id_gene_mapping,
                        panther_gene_info={},
                        gene_panther_mapping={},
                        overrepresentation_results=overrepresentation_results,
                        reference_gene_list=reference_gene_list,
                    ).model_dump(mode="json"),
                }
            )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            emit_error(exc, failed_stages[0] if failed_stages else None)
            return

        try:
            panther_gene_info_data, gene_panther_mapping_data = await run_stage(
                "gene_details",
                lambda on_progress: get_panther_info(
                    all_unique_genes, on_progress=on_progress
                ),
            )
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            emit_error(exc, "gene_details")
            return

        emit(
            {
                "event": "gene_details",
                "data": PantherGeneInfoResponse(
                    panther_gene_info=panther_gene_info_data,
                    gene_panther_mapping=gene_panther_mapping_data,
                ).model_dump(mode="json"),
            }
        )

    async def run_and_close() -> None:
        try:
            await run_workflow()
        finally:
            emit(None)

    async def stream() -> AsyncIterator[bytes]:
        worker = asyncio.create_task(run_and_close())
        try:
            while True:
                try:
                    event = await asyncio.wait_for(
                        queue.get(), timeout=STREAM_HEARTBEAT_SECONDS
                    )
                except asyncio.TimeoutError:
                    yield _stream_line({"event": "heartbeat"})
                    continue
                if event is None:
                    break
                yield _stream_line(event)
        finally:
            # Stops the work if the client disconnects.
            if not worker.done():
                worker.cancel()

    return StreamingResponse(
        stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# Add the build folder that contains the react app
app.mount("/", NoCacheStaticFiles(directory="dist", html=True))
