import asyncio
import json
from typing import Any

import pandas as pd
import pytest

from src import workflow
from src.gene_cols import GeneMappingField
from src.query import IdsQuery, RsIdListQuery


class _FakeResponse:
    text = ""

    def __init__(self, body: dict[str, Any] | None = None):
        self._body = body if body is not None else {"results": {"result": []}}

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict[str, Any]:
        return self._body


def _capture_panther_payload(
    monkeypatch, response_body: dict[str, Any] | None = None
) -> dict[str, Any]:
    captured: dict[str, Any] = {}

    class _FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return False

        async def post(self, url, data, headers):
            captured.update(data)
            return _FakeResponse(response_body)

    monkeypatch.setattr(workflow.httpx, "AsyncClient", _FakeAsyncClient)
    return captured


def test_default_reference_sends_no_ref_params(monkeypatch):
    payload = _capture_panther_payload(monkeypatch)

    asyncio.run(
        workflow.get_overrepresentation(["GENEA", "GENEB"], "GO:0008150", "FDR", "FISHER")
    )

    assert payload["geneInputList"] == "GENEA,GENEB"
    assert payload["organism"] == "9606"
    assert "refInputList" not in payload
    assert "refOrganism" not in payload


def test_custom_reference_sends_ref_params(monkeypatch):
    payload = _capture_panther_payload(monkeypatch)

    asyncio.run(
        workflow.get_overrepresentation(
            ["GENEA"],
            "GO:0008150",
            "FDR",
            "FISHER",
            ref_gene_list=["GENEA", "GENEB", "GENEC"],
        )
    )

    assert payload["refInputList"] == "GENEA,GENEB,GENEC"
    assert payload["refOrganism"] == "9606"


PANTHER_INPUT_ERROR = {
    "search": {
        "error": "Error, unable to process input",
        "search_type": "overrepresentation",
    }
}


def test_panther_search_error_raises_panther_input_error(monkeypatch):
    _capture_panther_payload(monkeypatch, PANTHER_INPUT_ERROR)

    with pytest.raises(workflow.PantherInputError, match="unable to process input"):
        asyncio.run(
            workflow.get_overrepresentation(
                ["GENEA"], "GO:0008150", "FDR", "FISHER", ref_gene_list=["GENEB"]
            )
        )


def _annoq_df(rows: list[dict[str, str]]) -> pd.DataFrame:
    full_rows = []
    for row in rows:
        full_row = {"chr": "1", "pos": "100", "rs_dbSNP151": ""}
        full_row.update({field.value: "" for field in GeneMappingField})
        full_row.update(row)
        full_rows.append(full_row)
    return pd.DataFrame(full_rows)


@pytest.fixture
def fake_services(main_module, monkeypatch):
    calls: dict[str, Any] = {}

    async def fake_get_annoq_df(input_type, query, on_progress=None):
        if on_progress is not None:
            on_progress(0, 2)
            on_progress(1, 2)
            on_progress(2, 2)
        if isinstance(query, RsIdListQuery) and query.rsIdList == ["rsREF"]:
            return _annoq_df(
                [
                    {
                        "rs_dbSNP151": "rsREF",
                        "ANNOVAR_refseq_Gene_ID": "REF1",
                        "enhancer_linked_genes": "REF2",
                    }
                ]
            )
        if isinstance(query, IdsQuery):
            return _annoq_df(
                [
                    {
                        "chr": "1",
                        "pos": "100",
                        "ANNOVAR_refseq_Gene_ID": "GENEA",
                        "enhancer_linked_genes": "GENEB",
                    }
                ]
            )
        return _annoq_df([])

    async def fake_get_panther_info(genes, on_progress=None):
        if on_progress is not None:
            on_progress(0, 1)
            on_progress(1, 1)
        calls["gene_details"] = genes
        return {}, {"GENEA": ["PTHR1:SF1"]}

    async def fake_get_overrepresentation(**kwargs):
        calls["overrep"] = kwargs
        return {
            "results": {
                "result": [
                    {
                        "term": {"id": "GO:1", "label": "process one"},
                        "number_in_reference": 10,
                        "number_in_list": 2,
                        "expected": 0.5,
                        "fold_enrichment": 4,
                        "plus_minus": "+",
                        "pValue": 0.001,
                        "fdr": 0.01,
                        "input_list": {"mapped_ids": "GENEA"},
                    }
                ]
            }
        }

    monkeypatch.setattr(main_module, "get_annoq_df", fake_get_annoq_df)
    monkeypatch.setattr(main_module, "get_panther_info", fake_get_panther_info)
    monkeypatch.setattr(
        main_module, "get_overrepresentation", fake_get_overrepresentation
    )
    return calls


BASE_REQUEST = {
    "input_type": "ids",
    "idsQuery": {"ids": ["1:100"]},
    "annotDataSet": "GO:0008150",
}


def test_endpoint_without_reference(client, fake_services):
    response = client.post("/workflow/overrepresentation", json=BASE_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert sorted(body["gene_list"]) == ["GENEA", "GENEB"]
    assert body["reference_gene_list"] is None
    assert fake_services["overrep"]["ref_gene_list"] is None


def test_endpoint_applies_input_gene_mapping_fields(client, fake_services):
    response = client.post(
        "/workflow/overrepresentation",
        json={**BASE_REQUEST, "geneMappingFields": ["enhancer_linked_genes"]},
    )

    assert response.status_code == 200
    assert response.json()["gene_list"] == ["GENEB"]


def test_endpoint_with_custom_reference(client, fake_services):
    response = client.post(
        "/workflow/overrepresentation",
        json={
            **BASE_REQUEST,
            "referenceList": {
                "input_type": "rsIdList",
                "rsIdListQuery": {"rsIdList": ["rsREF"]},
                "geneMappingFields": ["ANNOVAR_refseq_Gene_ID"],
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reference_gene_list"] == ["REF1"]
    assert fake_services["overrep"]["ref_gene_list"] == ["REF1"]


def test_endpoint_rejects_reference_without_genes(client, fake_services):
    response = client.post(
        "/workflow/overrepresentation",
        json={
            **BASE_REQUEST,
            "referenceList": {
                "input_type": "rsIdList",
                "rsIdListQuery": {"rsIdList": ["rsUNKNOWN"]},
            },
        },
    )

    assert response.status_code == 422
    assert "reference" in response.json()["detail"].lower()


def test_endpoint_returns_panther_input_error_as_422(
    client, fake_services, main_module, monkeypatch
):
    async def rejecting_get_overrepresentation(**kwargs):
        raise workflow.PantherInputError(
            "PANTHER overrepresentation error: Error, unable to process input"
        )

    monkeypatch.setattr(
        main_module, "get_overrepresentation", rejecting_get_overrepresentation
    )

    response = client.post("/workflow/overrepresentation", json=BASE_REQUEST)

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "PANTHER overrepresentation error: Error, unable to process input"
    )


def test_endpoint_rejects_reference_without_payload(client, fake_services):
    response = client.post(
        "/workflow/overrepresentation",
        json={**BASE_REQUEST, "referenceList": {"input_type": "ids"}},
    )

    assert response.status_code == 422
    assert "Reference list payload is missing" in response.json()["detail"]


def _stream_events(client, body) -> list[dict[str, Any]]:
    response = client.post("/workflow/overrepresentation/stream", json=body)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/x-ndjson")
    return [json.loads(line) for line in response.text.splitlines() if line]


def _event_names(events) -> list[str]:
    return [e["event"] for e in events]


def test_stream_sends_progress_then_result_then_gene_details(client, fake_services):
    events = _stream_events(client, BASE_REQUEST)

    names = _event_names(events)
    assert names.index("result") < names.index("gene_details")
    assert names[-1] == "gene_details"
    assert "error" not in names

    stages = [e for e in events if e["event"] == "stage"]
    assert {e["stage"] for e in stages} == {
        "input",
        "overrepresentation",
        "gene_details",
    }
    input_progress = [
        (e["done"], e["total"])
        for e in stages
        if e["stage"] == "input" and e["done"] is not None
    ]
    assert input_progress == [(0, 2), (1, 2), (2, 2)]
    for stage in ("input", "overrepresentation", "gene_details"):
        assert [e["status"] for e in stages if e["stage"] == stage][-1] == "done"

    result = next(e for e in events if e["event"] == "result")["data"]
    assert sorted(result["gene_list"]) == ["GENEA", "GENEB"]
    assert result["overrepresentation_results"][0]["process"] == "process one"
    assert result["panther_gene_info"] == {}
    assert result["gene_panther_mapping"] == {}

    gene_details = next(e for e in events if e["event"] == "gene_details")["data"]
    assert gene_details["gene_panther_mapping"] == {"GENEA": ["PTHR1:SF1"]}


def test_stream_runs_enrichment_before_gene_details(client, fake_services):
    events = _stream_events(client, BASE_REQUEST)

    def position(stage, status):
        return next(
            i
            for i, e in enumerate(events)
            if e["event"] == "stage" and e["stage"] == stage and e["status"] == status
        )

    names = _event_names(events)
    assert position("overrepresentation", "done") < names.index("result")
    assert names.index("result") < position("gene_details", "running")


def test_stream_matches_regular_endpoint(client, fake_services):
    regular = client.post("/workflow/overrepresentation", json=BASE_REQUEST).json()
    events = _stream_events(client, BASE_REQUEST)

    streamed = next(e for e in events if e["event"] == "result")["data"]
    streamed.update(next(e for e in events if e["event"] == "gene_details")["data"])
    for body in (regular, streamed):
        body["gene_list"] = sorted(body["gene_list"])
    assert streamed == regular


def test_stream_with_reference_reports_reference_stage(client, fake_services):
    events = _stream_events(
        client,
        {
            **BASE_REQUEST,
            "referenceList": {
                "input_type": "rsIdList",
                "rsIdListQuery": {"rsIdList": ["rsREF"]},
            },
        },
    )

    reference_statuses = [
        e["status"] for e in events if e.get("stage") == "reference"
    ]
    assert reference_statuses[0] == "pending"
    assert reference_statuses[-1] == "done"
    result = next(e for e in events if e["event"] == "result")["data"]
    assert sorted(result["reference_gene_list"]) == ["REF1", "REF2"]
    assert fake_services["overrep"]["ref_gene_list"] == result["reference_gene_list"]


def test_stream_gene_details_failure_keeps_results(
    client, fake_services, main_module, monkeypatch
):
    async def failing_get_panther_info(genes, on_progress=None):
        raise RuntimeError("Failed to fetch PANTHER geneinfo for batch 1")

    monkeypatch.setattr(main_module, "get_panther_info", failing_get_panther_info)

    events = _stream_events(client, BASE_REQUEST)

    names = _event_names(events)
    assert "result" in names
    assert "gene_details" not in names
    error = events[-1]
    assert error["event"] == "error"
    assert error["stage"] == "gene_details"
    assert error["status"] == 500
    assert "geneinfo" in error["detail"]


def test_stream_panther_rejection_is_reported_as_422(
    client, fake_services, main_module, monkeypatch
):
    async def rejecting_get_overrepresentation(**kwargs):
        raise workflow.PantherInputError(
            "PANTHER overrepresentation error: Error, unable to process input"
        )

    monkeypatch.setattr(
        main_module, "get_overrepresentation", rejecting_get_overrepresentation
    )

    events = _stream_events(client, BASE_REQUEST)

    assert "result" not in _event_names(events)
    error = events[-1]
    assert error == {
        "event": "error",
        "stage": "overrepresentation",
        "status": 422,
        "detail": "PANTHER overrepresentation error: Error, unable to process input",
    }


def test_stream_reports_reference_without_genes(client, fake_services):
    events = _stream_events(
        client,
        {
            **BASE_REQUEST,
            "referenceList": {
                "input_type": "rsIdList",
                "rsIdListQuery": {"rsIdList": ["rsUNKNOWN"]},
            },
        },
    )

    assert "result" not in _event_names(events)
    assert events[-1]["event"] == "error"
    assert events[-1]["status"] == 422
    assert "reference" in events[-1]["detail"].lower()


def test_stream_rejects_invalid_request_before_streaming(client, fake_services):
    response = client.post(
        "/workflow/overrepresentation/stream",
        json={**BASE_REQUEST, "geneMappingFields": []},
    )

    assert response.status_code == 422
