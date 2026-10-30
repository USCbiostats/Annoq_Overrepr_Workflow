import pandas as pd
import pytest
from pydantic import ValidationError

from src.annoq import get_rsid_gene_mapping, get_rsid_gene_mapping_with_sources
from src.gene_cols import ALL_GENE_MAPPING_FIELDS, GeneMappingField
from src.models import ReferenceListInput, WorkflowInputRequest


def _annoq_row(**overrides: str) -> dict[str, str]:
    row = {"chr": "1", "pos": "100", "rs_dbSNP151": "rs1"}
    row.update({field.value: "" for field in GeneMappingField})
    row.update(overrides)
    return row


@pytest.fixture
def annoq_df() -> pd.DataFrame:
    return pd.DataFrame(
        [
            _annoq_row(
                ANNOVAR_ensembl_Gene_ID="ENSG00000000001",
                ANNOVAR_refseq_Gene_ID="GENEA",
                SnpEff_ensembl_Gene_ID="ENSG00000000002",
                SnpEff_refseq_Gene_ID="GENEB",
                VEP_ensembl_Gene_ID="ENSG00000000003",
                VEP_refseq_Gene_Name="GENEC",
                enhancer_linked_genes="GENED;GENEE",
            )
        ]
    )


def test_all_fields_used_by_default(annoq_df):
    mapping = get_rsid_gene_mapping(annoq_df)

    assert sorted(mapping["rs1"]) == [
        "ENSG00000000001",
        "ENSG00000000002",
        "ENSG00000000003",
        "GENEA",
        "GENEB",
        "GENEC",
        "GENED",
        "GENEE",
    ]


def test_only_selected_fields_are_used(annoq_df):
    mapping = get_rsid_gene_mapping(
        annoq_df,
        gene_mapping_fields=[
            GeneMappingField.VEP_ensembl,
            GeneMappingField.enhancer_linked_genes,
        ],
    )

    assert sorted(mapping["rs1"]) == ["ENSG00000000003", "GENED", "GENEE"]


def test_variant_without_genes_from_selected_fields_is_dropped(annoq_df):
    df = pd.DataFrame([_annoq_row(ANNOVAR_refseq_Gene_ID="GENEA")])

    mapping = get_rsid_gene_mapping(
        df, gene_mapping_fields=[GeneMappingField.SnpEff_ensembl]
    )

    assert mapping == {}


def test_chr_pos_keys(annoq_df):
    mapping = get_rsid_gene_mapping(
        annoq_df,
        force_chr_pos_keys=True,
        gene_mapping_fields=[GeneMappingField.ANNOVAR_refseq],
    )

    assert mapping == {"chr1:100": ["GENEA"]}


def test_sources_of_multi_source_and_enhancer_only_genes():
    df = pd.DataFrame(
        [
            _annoq_row(
                ANNOVAR_ensembl_Gene_ID="ENSG00000000001",
                ANNOVAR_refseq_Gene_ID="GENEA",
                VEP_refseq_Gene_Name="GENEA",
                enhancer_linked_genes="GENEA;GENED",
            )
        ]
    )

    mapping, sources = get_rsid_gene_mapping_with_sources(df)

    assert sources == {
        "rs1": {
            "ENSG00000000001": [GeneMappingField.ANNOVAR_ensembl],
            "GENEA": [
                GeneMappingField.ANNOVAR_refseq,
                GeneMappingField.VEP_refseq,
                GeneMappingField.enhancer_linked_genes,
            ],
            "GENED": [GeneMappingField.enhancer_linked_genes],
        }
    }
    assert mapping == get_rsid_gene_mapping(df)
    assert sorted(sources["rs1"]) == sorted(mapping["rs1"])


def test_sources_reflect_only_the_selected_fields(annoq_df):
    _, sources = get_rsid_gene_mapping_with_sources(
        annoq_df, gene_mapping_fields=[GeneMappingField.VEP_refseq]
    )

    assert sources == {"rs1": {"GENEC": [GeneMappingField.VEP_refseq]}}


def test_sources_follow_column_order_and_merge_records_of_one_variant():
    df = pd.DataFrame(
        [
            _annoq_row(enhancer_linked_genes="GENEA"),
            _annoq_row(ANNOVAR_refseq_Gene_ID="GENEA"),
        ]
    )

    _, sources = get_rsid_gene_mapping_with_sources(
        df,
        gene_mapping_fields=[
            GeneMappingField.enhancer_linked_genes,
            GeneMappingField.ANNOVAR_refseq,
        ],
    )

    assert sources == {
        "rs1": {
            "GENEA": [
                GeneMappingField.ANNOVAR_refseq,
                GeneMappingField.enhancer_linked_genes,
            ]
        }
    }


def test_request_defaults_to_all_gene_mapping_fields():
    request = WorkflowInputRequest(
        input_type="rsIdList", rsIdListQuery={"rsIdList": ["rs1"]}
    )

    assert request.geneMappingFields == ALL_GENE_MAPPING_FIELDS


def test_request_rejects_empty_gene_mapping_fields():
    with pytest.raises(ValidationError):
        WorkflowInputRequest(
            input_type="rsIdList",
            rsIdListQuery={"rsIdList": ["rs1"]},
            geneMappingFields=[],
        )


def test_request_dedupes_gene_mapping_fields():
    request = WorkflowInputRequest(
        input_type="rsIdList",
        rsIdListQuery={"rsIdList": ["rs1"]},
        geneMappingFields=["VEP_ensembl_Gene_ID", "VEP_ensembl_Gene_ID"],
    )

    assert request.geneMappingFields == [GeneMappingField.VEP_ensembl]


@pytest.mark.parametrize("input_type", ["rsId", "gene", "keyword"])
def test_reference_list_only_accepts_vcf_or_rsid_list(input_type):
    with pytest.raises(ValidationError):
        ReferenceListInput(input_type=input_type)
