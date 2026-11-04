import asyncio
import dataclasses
import json

import httpx
import pandas as pd
import pytest

from src import annoq
from src.gene_cols import ALL_GENE_MAPPING_FIELDS
from src.input_report import VariantAccounting
from src.models import WorkflowOverrepresentationRequest
from src.query import IdsQuery, InputType, RsIdListQuery
from src.version import SNPWAY_VERSION

ALL_FIELDS = [field.value for field in ALL_GENE_MAPPING_FIELDS]


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


# Shape of AnnoQ's /annotations metadata: the variant fields carry the panel
# release, each tool's top-level entry carries the tool version, and the
# enhancer_linked_genes field's parent entry carries the PEREGRINE release.
ANNOQ_METADATA = {
    "results": [
        {"id": "1", "parent_id": "0", "leaf": False, "name": "Basic Info", "version": None},
        {"id": "7", "parent_id": "0", "leaf": False, "name": "IMAGE Enhancer Linked Functional Annotations", "version": "Initial Release"},
        {"id": "24", "parent_id": "7", "leaf": True, "name": "enhancer_linked_genes", "api_field": "enhancer_linked_genes", "version": None},
        {"id": "2", "parent_id": "1", "leaf": True, "name": "chr", "api_field": "chr", "version": "HRC.r1-1"},
        {"id": "6", "parent_id": "1", "leaf": True, "name": "rs_dbSNP151", "api_field": "rs_dbSNP151", "version": "HRC.r1-1"},
        {"id": "26", "parent_id": "0", "leaf": False, "name": "ANNOVAR", "version": "6/7/2020 23:56"},
        {"id": "36", "parent_id": "26", "leaf": True, "name": "ANNOVAR_ensembl_Gene_ID", "api_field": "ANNOVAR_ensembl_Gene_ID", "version": None},
        {"id": "132", "parent_id": "0", "leaf": False, "name": "VEP", "version": "ensembl-vep-release-107"},
        {"id": "208", "parent_id": "0", "leaf": False, "name": "SnpEff", "version": "4.3t"},
        {"id": "495", "parent_id": "0", "leaf": False, "name": "others", "version": "dbNSFP v4.3c"},
    ]
}


def _overrep_request(fields, reference=None):
    return WorkflowOverrepresentationRequest(
        input_type="rsIdList",
        rsIdListQuery={"rsIdList": ["rs1"]},
        annotDataSet="GO:0008150",
        geneMappingFields=fields,
        referenceList=reference,
    )


def test_load_annoq_metadata_reads_annoq_versions(main_module, monkeypatch):
    requested = []
    _fake_annoq_client(
        monkeypatch,
        {
            "/annotations": httpx.Response(200, json=ANNOQ_METADATA),
            "/version.json": httpx.Response(
                200, json={"version": "1.3.11", "releaseDate": "2026-11-03"}
            ),
            "/version": httpx.Response(200, json=ANNOQ_VERSION),
        },
    )
    real_get = httpx.AsyncClient.get

    async def recording_get(self, url, **kwargs):
        requested.append(url)
        return await real_get(self, url, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "get", recording_get)
    monkeypatch.setattr(annoq, "annoq_data_versions", {})
    monkeypatch.setattr(annoq, "annotator_versions", {})

    asyncio.run(annoq.load_annoq_metadata())

    versions = main_module._run_versions(_overrep_request(ALL_FIELDS))
    assert versions.annoq_version == "1.3.11"
    assert versions.genome_build == "GRCh37/hg19"
    assert versions.annoq_panel == "HRC.r1-1"
    assert versions.dbsnp_release == "151"
    assert versions.annotator_versions == {
        "ANNOVAR": "6/7/2020 23:56",
        "SnpEff": "4.3t",
        "VEP": "ensembl-vep-release-107",
        "PEREGRINE": "Initial Release",
    }
    assert requested == [
        "http://annoq.test/version",
        "http://annoq-site.test/version.json",
        "http://annoq.test/annotations",
    ]


@pytest.mark.parametrize(
    "fields, reference_fields, expected",
    [
        (ALL_FIELDS, None, ["ANNOVAR", "SnpEff", "VEP", "PEREGRINE"]),
        (["ANNOVAR_refseq_Gene_ID"], None, ["ANNOVAR"]),
        (["VEP_refseq_Gene_Name", "enhancer_linked_genes"], None, ["VEP", "PEREGRINE"]),
        (["enhancer_linked_genes"], None, ["PEREGRINE"]),
        # A SNP reference list adds the tools behind its own sources.
        (["enhancer_linked_genes"], ["SnpEff_ensembl_Gene_ID"], ["SnpEff", "PEREGRINE"]),
        (["SnpEff_refseq_Gene_ID"], ["enhancer_linked_genes"], ["SnpEff", "PEREGRINE"]),
    ],
)
def test_run_versions_list_only_the_tools_used(
    main_module, monkeypatch, fields, reference_fields, expected
):
    monkeypatch.setattr(annoq, "annoq_data_versions", ANNOQ_VERSION)
    monkeypatch.setattr(
        annoq, "annotator_versions", annoq.parse_annotator_versions(ANNOQ_METADATA)
    )
    reference = (
        None
        if reference_fields is None
        else {
            "input_type": "rsIdList",
            "rsIdListQuery": {"rsIdList": ["rs2"]},
            "geneMappingFields": reference_fields,
        }
    )

    versions = main_module._run_versions(_overrep_request(fields, reference))

    assert list(versions.annotator_versions) == expected
    assert versions.snpway_version == SNPWAY_VERSION
    assert versions.genome_build == "GRCh37/hg19"


def test_run_versions_unknown_when_metadata_failed(main_module, monkeypatch):
    _fake_annoq_client(monkeypatch, httpx.ConnectError("unreachable"))
    monkeypatch.setattr(annoq, "annoq_data_versions", {"genome_build": "stale"})
    monkeypatch.setattr(annoq, "annotator_versions", {"VEP": "stale"})

    asyncio.run(annoq.load_annoq_metadata())

    versions = main_module._run_versions(
        _overrep_request(["VEP_ensembl_Gene_ID", "enhancer_linked_genes"])
    )
    assert versions.annoq_version is None
    assert versions.genome_build is None
    assert versions.annoq_panel is None
    assert versions.dbsnp_release is None
    assert versions.annotator_versions == {"VEP": None, "PEREGRINE": None}


def test_load_annoq_metadata_replaces_versions_from_an_earlier_run(monkeypatch):
    # Versions read for an earlier run, before AnnoQ released 1.3.12.
    monkeypatch.setattr(
        annoq,
        "annoq_data_versions",
        {**ANNOQ_VERSION, "annoq_version": "1.3.11"},
    )
    monkeypatch.setattr(annoq, "annotator_versions", {"SnpEff": "4.3s"})
    _fake_annoq_client(
        monkeypatch,
        {
            "/annotations": httpx.Response(200, json=ANNOQ_METADATA),
            "/version.json": httpx.Response(200, json={"version": "1.3.12"}),
            "/version": httpx.Response(200, json=ANNOQ_VERSION),
        },
    )

    asyncio.run(annoq.load_annoq_metadata())

    assert annoq.annoq_data_versions["annoq_version"] == "1.3.12"
    assert annoq.annotator_versions["SnpEff"] == "4.3t"


def test_every_run_reads_the_annoq_versions(client, main_module, monkeypatch):
    loads = []

    async def recording_load():
        loads.append(True)

    async def no_genes(snp_list, list_label="Input", on_progress=None):
        return [], {}, {}, VariantAccounting(rows=[], records_not_matched_to_input=0)

    monkeypatch.setattr(main_module.annoq, "load_annoq_metadata", recording_load)
    monkeypatch.setattr(main_module, "_run_mapping_pipeline", no_genes)
    body = {
        "input_type": "rsIdList",
        "rsIdListQuery": {"rsIdList": ["rs1"]},
        "annotDataSet": "GO:0008150",
    }

    for path in ("/workflow/overrepresentation", "/workflow/overrepresentation/stream"):
        assert client.post(path, json=body).status_code == 200

    assert len(loads) == 2


def test_peregrine_version_prefers_the_field_version():
    metadata = {
        "results": [
            {"id": "7", "parent_id": "0", "leaf": False, "name": "IMAGE Enhancer Linked Functional Annotations", "version": "Initial Release"},
            {"id": "24", "parent_id": "7", "leaf": True, "name": "enhancer_linked_genes", "api_field": "enhancer_linked_genes", "version": "v2"},
        ]
    }

    assert annoq.parse_annotator_versions(metadata) == {"PEREGRINE": "v2"}
