import asyncio
import dataclasses
import json

import httpx
import pandas as pd
import pytest

from src import annoq
from src.query import IdsQuery, InputType, RsIdListQuery


@pytest.fixture
def captured_batches(monkeypatch) -> list[dict]:
    """Replace AnnoQ calls with fakes and record each batch request."""
    batches: list[dict] = []

    async def fake_get_download_url(gql_query: str) -> str:
        # The query embeds the filter as JSON, e.g. rsIDs: ["rs1", ...]
        for key in ("rsIDs", "ids"):
            marker = f"{key}: "
            if marker in gql_query:
                start = gql_query.index(marker) + len(marker)
                values = json.JSONDecoder().raw_decode(gql_query[start:])[0]
                batches.append({"key": key, "values": values})
                return f"batch-{len(batches)}"
        raise AssertionError(f"Unexpected query: {gql_query}")

    async def fake_download_data(download_url: str) -> pd.DataFrame:
        batch = batches[int(download_url.split("-")[1]) - 1]
        return pd.DataFrame({"rs_dbSNP151": batch["values"]})

    monkeypatch.setattr(annoq, "get_download_url", fake_get_download_url)
    monkeypatch.setattr(annoq, "download_data", fake_download_data)
    return batches


def test_rsid_list_is_split_into_batches(captured_batches):
    rsids = [f"rs{i}" for i in range(12001)]

    df = asyncio.run(
        annoq.get_annoq_df(InputType.rsIdList, RsIdListQuery(rsIdList=rsids))
    )

    assert [len(b["values"]) for b in captured_batches] == [5000, 5000, 2001]
    assert all(b["key"] == "rsIDs" for b in captured_batches)
    assert df["rs_dbSNP151"].tolist() == rsids


def test_download_query_requests_the_configured_rsid_field(monkeypatch):
    monkeypatch.setattr(
        annoq, "config", dataclasses.replace(annoq.config, annoq_rsid_field="rs_dbSNP")
    )

    query = annoq.generate_gql_download_query("download_SNPs_by_RsIDs", {"rsIDs": ["rs1"]})

    assert '"rs_dbSNP"' in query
    assert "rs_dbSNP151" not in query


def test_rsid_list_drops_duplicates_and_blanks(captured_batches):
    asyncio.run(
        annoq.get_annoq_df(
            InputType.rsIdList,
            RsIdListQuery(rsIdList=["rs1", " rs2 ", "rs1", "", "rs3"]),
        )
    )

    assert captured_batches[0]["values"] == ["rs1", "rs2", "rs3"]


def test_ids_query_still_uses_ids_batches(captured_batches):
    asyncio.run(annoq.get_annoq_df(InputType.ids, IdsQuery(ids=["1:100"])))

    assert captured_batches[0]["key"] == "ids"
    # Each chr:pos expands to the 12 possible substitutions.
    values = captured_batches[0]["values"]
    assert len(values) == 12
    assert "1:100A>C" in values
    assert not any(v[-3] == v[-1] for v in values)  # no A>A, C>C, ...


def test_ids_with_alleles_are_sent_as_is(captured_batches):
    asyncio.run(
        annoq.get_annoq_df(
            InputType.ids,
            IdsQuery(ids=["1:100A>C", "1:100A>G", "2:200", "1:100A>C"]),
        )
    )

    values = captured_batches[0]["values"]
    # The two given variants once each, then 12 candidates for 2:200.
    assert values[:2] == ["1:100A>C", "1:100A>G"]
    assert len(values) == 2 + 12
    assert all(v.startswith("2:200") for v in values[2:])


def test_batch_failure_names_the_batch(monkeypatch):
    async def failing_get_download_url(gql_query: str) -> str:
        raise Exception(
            "Failed to retrieve download URL: AnnoQ returned HTTP 504 Gateway Time-out"
        )

    monkeypatch.setattr(annoq, "get_download_url", failing_get_download_url)

    with pytest.raises(Exception, match=r"rsID batch 1/2 \(size=5000\).*HTTP 504"):
        asyncio.run(
            annoq.get_annoq_df(
                InputType.rsIdList,
                RsIdListQuery(rsIdList=[f"rs{i}" for i in range(6000)]),
            )
        )


def _fake_annoq_client(monkeypatch, response_or_error):
    class _FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc_info):
            return False

        async def _respond(self, method, url):
            outcome = response_or_error
            if isinstance(outcome, dict):
                # One outcome per URL, keyed by the URL's ending.
                outcome = next(v for k, v in outcome.items() if url.endswith(k))
            if isinstance(outcome, Exception):
                raise outcome
            outcome.request = httpx.Request(method, url)
            return outcome

        async def post(self, url, **kwargs):
            return await self._respond("POST", url)

        async def get(self, url, **kwargs):
            return await self._respond("GET", url)

    monkeypatch.setattr(annoq.httpx, "AsyncClient", _FakeAsyncClient)


def test_get_download_url_reports_annoq_status(monkeypatch):
    _fake_annoq_client(monkeypatch, httpx.Response(504))

    with pytest.raises(
        Exception,
        match="Failed to retrieve download URL: AnnoQ returned HTTP 504 Gateway Timeout",
    ):
        asyncio.run(annoq.get_download_url("query {}"))


def test_get_download_url_reports_timeout(monkeypatch):
    _fake_annoq_client(monkeypatch, httpx.ReadTimeout("timed out"))

    with pytest.raises(Exception, match="AnnoQ did not respond within 300 seconds"):
        asyncio.run(annoq.get_download_url("query {}"))


def test_annoq_version_url_sits_beside_graphql(monkeypatch):
    monkeypatch.setattr(
        annoq,
        "config",
        dataclasses.replace(annoq.config, annotation_api_v2="https://api-v2.annoq.org/graphql/"),
    )
    assert annoq.annoq_version_url() == "https://api-v2.annoq.org/version"


ANNOQ_VERSION = {
    "api_version": "2.5",
    "data_version": "HRC.r1-1",
    "genome_build": "GRCh37/hg19",
    "dbsnp_release": "151",
    "wgsa_version": "0.8",
}


def test_annoq_site_version_url_is_the_sites_version_json():
    # conftest sets ANNOQ_SITE_URL=http://annoq-site.test
    assert annoq.annoq_site_version_url() == "http://annoq-site.test/version.json"


def test_annoq_version_endpoint_adds_the_annoq_release(client, monkeypatch):
    _fake_annoq_client(
        monkeypatch,
        {
            "/version.json": httpx.Response(
                200, json={"version": "1.3.11", "releaseDate": "2026-11-03"}
            ),
            "/version": httpx.Response(200, json=ANNOQ_VERSION),
        },
    )

    response = client.get("/annoq/version")

    assert response.status_code == 200
    assert response.json() == {
        **ANNOQ_VERSION,
        "annoq_version": "1.3.11",
        "annoq_release_date": "2026-11-03",
        "annoq_site_url": "http://annoq-site.test",
    }


def test_annoq_version_endpoint_without_site_release_keeps_data_versions(
    client, monkeypatch
):
    # A site that does not publish /version.json (topmed.annoq.org, for now).
    _fake_annoq_client(
        monkeypatch,
        {
            "/version.json": httpx.Response(404),
            "/version": httpx.Response(200, json=ANNOQ_VERSION),
        },
    )

    response = client.get("/annoq/version")

    assert response.status_code == 200
    assert response.json() == {
        **ANNOQ_VERSION,
        "annoq_version": None,
        "annoq_release_date": None,
        "annoq_site_url": "http://annoq-site.test",
    }


def test_annoq_version_endpoint_reports_annoq_failure(client, monkeypatch):
    # An AnnoQ without /version (before annoq-api-v2 issue #80 is deployed).
    _fake_annoq_client(monkeypatch, httpx.Response(404))

    response = client.get("/annoq/version")

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Failed to retrieve AnnoQ version: AnnoQ returned HTTP 404 Not Found"
    )


def test_get_download_url_reports_unexpected_body(monkeypatch):
    _fake_annoq_client(
        monkeypatch, httpx.Response(200, json={"errors": [{"message": "bad query"}]})
    )

    with pytest.raises(Exception, match="unexpected AnnoQ response.*bad query"):
        asyncio.run(annoq.get_download_url("query {}"))


def test_download_data_reports_annoq_status(monkeypatch):
    _fake_annoq_client(monkeypatch, httpx.Response(404))

    with pytest.raises(
        Exception, match="Failed to download data: AnnoQ returned HTTP 404 Not Found"
    ):
        asyncio.run(annoq.download_data("http://annoq.test/downloads/x.txt"))
