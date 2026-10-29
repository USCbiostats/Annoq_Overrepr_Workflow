import json

import pandas as pd
import pytest

from src.annoq import get_rsid_gene_mapping
from src.gene_cols import GeneMappingField
from src.input_report import (
    account_for_variants,
    build_input_report,
    gene_identifier_rows,
    submitted_variants,
)
from src.models import VariantStatus
from src.query import IdsQuery, InputType, RsIdListQuery, RsIdQuery
from src.workflow import parse_panther_input_list


def _annoq_df(rows: list[dict[str, str]]) -> pd.DataFrame:
    full_rows = []
    for row in rows:
        full_row = {"chr": "1", "pos": "100", "rs_dbSNP151": ""}
        full_row.update({field.value: "" for field in GeneMappingField})
        full_row.update(row)
        full_rows.append(full_row)
    return pd.DataFrame(full_rows)


ANNOQ_DF = _annoq_df(
    [
        {"rs_dbSNP151": "rs1", "pos": "100", "ANNOVAR_refseq_Gene_ID": "GENEA"},
        # Only an enhancer gene: no_gene unless enhancer_linked_genes is selected.
        {"rs_dbSNP151": "rs2", "pos": "200", "enhancer_linked_genes": "GENEB"},
        {"rs_dbSNP151": "rs3", "pos": "300"},
    ]
)


def _account(
    input_type: InputType,
    query,
    df: pd.DataFrame = ANNOQ_DF,
    fields: list[GeneMappingField] | None = None,
):
    force_chr_pos_keys = input_type == InputType.ids
    mapping = get_rsid_gene_mapping(
        df, force_chr_pos_keys=force_chr_pos_keys, gene_mapping_fields=fields
    )
    return account_for_variants(input_type, query, df, mapping, force_chr_pos_keys)


def _statuses(accounting) -> dict[str, tuple[str, str | None, int]]:
    return {
        row.input: (row.status.value, row.variant_key, row.n_genes)
        for row in accounting.rows
    }


def test_each_status_for_rsid_list():
    accounting = _account(
        InputType.rsIdList,
        RsIdListQuery(rsIdList=["rs1", "rs2", "rs3", "rs404"]),
    )

    assert _statuses(accounting) == {
        "rs1": ("annotated", "rs1", 1),
        "rs2": ("annotated", "rs2", 1),
        "rs3": ("no_gene", "rs3", 0),
        "rs404": ("no_record", None, 0),
    }
    assert accounting.records_not_matched_to_input == 0


def test_enhancer_only_variant_is_no_gene_for_a_single_annotator():
    accounting = _account(
        InputType.rsIdList,
        RsIdListQuery(rsIdList=["rs1", "rs2"]),
        fields=[GeneMappingField.ANNOVAR_refseq],
    )

    assert _statuses(accounting)["rs2"] == ("no_gene", "rs2", 0)
    assert _statuses(accounting)["rs1"] == ("annotated", "rs1", 1)


def test_chr_pos_input_is_echoed_and_matched_to_records():
    accounting = _account(
        InputType.ids, IdsQuery(ids=["1:100", "chr1:200", "1:300", "1:999"])
    )

    assert _statuses(accounting) == {
        "1:100": ("annotated", "chr1:100", 1),
        "chr1:200": ("annotated", "chr1:200", 1),
        "1:300": ("no_gene", "chr1:300", 0),
        "1:999": ("no_record", None, 0),
    }


def test_several_records_at_one_position_count_once():
    df = _annoq_df(
        [
            {"pos": "100", "ANNOVAR_refseq_Gene_ID": "GENEA"},
            {"pos": "100", "ANNOVAR_refseq_Gene_ID": "GENEC"},
        ]
    )

    accounting = _account(InputType.ids, IdsQuery(ids=["1:100"]), df)

    assert _statuses(accounting) == {"1:100": ("annotated", "chr1:100", 2)}
    assert accounting.records_not_matched_to_input == 0


def test_merged_rsid_record_matches_each_of_its_rsids():
    df = _annoq_df(
        [{"rs_dbSNP151": "rs10;rs11", "ANNOVAR_refseq_Gene_ID": "GENEA"}]
    )

    accounting = _account(InputType.rsIdList, RsIdListQuery(rsIdList=["rs11"]), df)

    assert _statuses(accounting) == {"rs11": ("annotated", "rs10;rs11", 1)}


def test_records_that_match_no_input_are_counted():
    accounting = _account(InputType.rsIdList, RsIdListQuery(rsIdList=["rs1"]))

    assert accounting.records_not_matched_to_input == 2


def test_submitted_variants_are_unique_trimmed_and_in_input_order():
    query = RsIdListQuery(rsIdList=[" rs2", "rs1", "rs2", "", "  "])

    assert submitted_variants(InputType.rsIdList, query) == ["rs2", "rs1"]
    assert submitted_variants(InputType.rsId, RsIdQuery(rsId=" rs1 ")) == ["rs1"]


def test_gene_identifier_rows():
    rows = gene_identifier_rows(
        ["GENEA", "GENEX", "HLA-C.7", "LOST.2"],
        mapped_ids=["GENEA", "HLA-C"],
        unmapped_ids=["GENEX"],
    )

    assert [
        (r.identifier, r.mapped_by_panther, r.panther_listed_as, r.panther_match.value)
        for r in rows
    ] == [
        ("GENEA", "yes", "GENEA", "exact"),
        ("GENEX", "no", "GENEX", "exact"),
        ("HLA-C.7", "yes", "HLA-C", "version_suffix_removed"),
        ("LOST.2", "not_listed", None, "not_listed"),
    ]


def test_build_input_report_summary():
    accounting = _account(
        InputType.rsIdList, RsIdListQuery(rsIdList=["rs1", "rs2", "rs3", "rs404"])
    )

    report = build_input_report(
        accounting, ["GENEA", "GENEB"], (["GENEA"], ["GENEB"])
    )

    assert report.summary.model_dump() == {
        "n_input": 4,
        "n_annotated": 2,
        "n_no_record": 1,
        "n_no_gene": 1,
        "n_records_not_matched_to_input": 0,
        "n_identifiers_submitted": 2,
        "n_identifiers_mapped_by_panther": 1,
        "n_identifiers_not_mapped_by_panther": 1,
        "n_identifiers_not_listed_by_panther": 0,
    }


def test_build_input_report_without_overrepresentation_test():
    accounting = _account(InputType.rsIdList, RsIdListQuery(rsIdList=["rs1"]))

    report = build_input_report(accounting, ["GENEA"], None)

    assert report.gene_identifiers is None
    assert report.summary.n_identifiers_submitted == 1
    assert report.summary.n_identifiers_mapped_by_panther is None


def test_parse_panther_input_list():
    assert parse_panther_input_list(
        {"results": {"input_list": {"mapped_ids": "A,B", "unmapped_ids": "C"}}}
    ) == (["A", "B"], ["C"])
    assert parse_panther_input_list({"results": {"result": []}}) == ([], [])


@pytest.fixture
def fake_report_services(main_module, monkeypatch):
    async def fake_get_annoq_df(input_type, query, on_progress=None):
        return _annoq_df(
            [
                {"pos": "100", "ANNOVAR_refseq_Gene_ID": "GENEA"},
                {"pos": "200", "enhancer_linked_genes": "GENEB.2"},
            ]
        )

    async def fake_get_panther_info(genes, on_progress=None):
        return {}, {}

    async def fake_get_overrepresentation(**kwargs):
        return {
            "results": {
                "input_list": {"mapped_ids": "GENEA", "unmapped_ids": "GENEB"},
                "result": [],
            }
        }

    monkeypatch.setattr(main_module, "get_annoq_df", fake_get_annoq_df)
    monkeypatch.setattr(main_module, "get_panther_info", fake_get_panther_info)
    monkeypatch.setattr(
        main_module, "get_overrepresentation", fake_get_overrepresentation
    )


REPORT_REQUEST = {
    "input_type": "ids",
    "idsQuery": {"ids": ["1:100", "1:200", "1:300"]},
    "annotDataSet": "GO:0008150",
}


def test_endpoint_returns_input_report(client, fake_report_services):
    body = client.post("/workflow/overrepresentation", json=REPORT_REQUEST).json()

    report = body["input_report"]
    assert [(v["input"], v["status"]) for v in report["variants"]] == [
        ("1:100", "annotated"),
        ("1:200", "annotated"),
        ("1:300", "no_record"),
    ]
    assert [
        (g["identifier"], g["mapped_by_panther"], g["panther_match"])
        for g in report["gene_identifiers"]
    ] == [("GENEA", "yes", "exact"), ("GENEB.2", "no", "version_suffix_removed")]
    assert report["summary"]["n_input"] == 3
    assert report["summary"]["n_identifiers_mapped_by_panther"] == 1
    # Existing fields are unchanged.
    assert body["rsId_genes_map"] == {"chr1:100": ["GENEA"], "chr1:200": ["GENEB.2"]}


def test_endpoint_report_respects_gene_mapping_fields(client, fake_report_services):
    body = client.post(
        "/workflow/overrepresentation",
        json={**REPORT_REQUEST, "geneMappingFields": ["ANNOVAR_refseq_Gene_ID"]},
    ).json()

    statuses = {v["input"]: v["status"] for v in body["input_report"]["variants"]}
    assert statuses == {"1:100": "annotated", "1:200": "no_gene", "1:300": "no_record"}


def test_gene_mappings_endpoint_report_has_no_panther_lists(
    client, fake_report_services
):
    body = client.post(
        "/workflow/gene_mappings",
        json={"input_type": "ids", "idsQuery": {"ids": ["1:100", "1:300"]}},
    ).json()

    assert body["input_report"]["gene_identifiers"] is None
    assert body["input_report"]["summary"]["n_no_record"] == 1


def test_stream_result_carries_input_report(client, fake_report_services):
    response = client.post("/workflow/overrepresentation/stream", json=REPORT_REQUEST)
    events = [json.loads(line) for line in response.text.splitlines() if line]

    result = next(e for e in events if e["event"] == "result")["data"]
    assert result["input_report"]["summary"]["n_annotated"] == 2


def test_stream_reports_inputs_when_no_genes_are_found(
    client, fake_report_services, main_module, monkeypatch
):
    async def empty_get_annoq_df(input_type, query, on_progress=None):
        return _annoq_df([])

    monkeypatch.setattr(main_module, "get_annoq_df", empty_get_annoq_df)

    response = client.post("/workflow/overrepresentation/stream", json=REPORT_REQUEST)
    events = [json.loads(line) for line in response.text.splitlines() if line]

    report = next(e for e in events if e["event"] == "result")["data"]["input_report"]
    assert [v["status"] for v in report["variants"]] == ["no_record"] * 3
    assert report["gene_identifiers"] == []
