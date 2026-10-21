import asyncio
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

    async def fake_get_annoq_df(input_type, query):
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

    async def fake_get_panther_info(genes):
        return {}, {}

    async def fake_get_overrepresentation(**kwargs):
        calls["overrep"] = kwargs
        return {"results": {"result": []}}

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
