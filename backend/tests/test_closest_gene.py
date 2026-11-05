"""ANNOVAR closest-gene columns: parsing, fallback, provenance and selection."""
import asyncio

import pandas as pd

from src import annoq
from src.annoq import get_rsid_gene_mapping, get_rsid_gene_mapping_with_sources
from src.gene_cols import GENE_COLS, GeneColumn, GeneMappingField

# Cell formats as AnnoQ returns them (rs78341008, rs2155065, rs9271363 of the CRC SNP list)
ENSEMBL_CLOSEST = (
    "ENSG00000201253:ENST00000364383(dist=25750),"
    "ENSG00000206697:ENST00000383970(dist=9730)"
)
REFSEQ_CLOSEST = "KLF5:NM_001286818(dist=139874),LINC00392:NR_047009(dist=346827)"


def _annoq_row(**overrides: str) -> dict[str, str]:
    row = {"chr": "1", "pos": "100", "rs_dbSNP151": "rs1"}
    row.update({column.value: "" for column in GeneColumn})
    row.update(overrides)
    return row


def test_ensembl_closest_cell_gives_gene_ids_without_transcripts_or_distances():
    extract = GENE_COLS[GeneColumn.ANNOVAR_ensembl_closest]
    assert extract(ENSEMBL_CLOSEST) == ["ENSG00000201253", "ENSG00000206697"]


def test_refseq_closest_cell_gives_symbols_without_transcripts_or_distances():
    extract = GENE_COLS[GeneColumn.ANNOVAR_refseq_closest]
    assert extract(REFSEQ_CLOSEST) == ["KLF5", "LINC00392"]
    assert extract(
        "HLA-DRB1:NM_002124(dist=29119),HLA-DQA1:NM_002122(dist=18451)"
    ) == ["HLA-DRB1", "HLA-DQA1"]


def test_none_closest_cells_give_no_gene():
    assert GENE_COLS[GeneColumn.ANNOVAR_ensembl_closest]("NONE:NONE:NONE(dist=NONE)") == []
    assert GENE_COLS[GeneColumn.ANNOVAR_refseq_closest](
        "NONE:NONE(dist=NONE),KLF5:NM_001286818(dist=139874)"
    ) == ["KLF5"]


def test_closest_genes_map_a_variant_without_genic_annovar_gene():
    df = pd.DataFrame(
        [_annoq_row(ANNOVAR_refseq_Closest_gene=REFSEQ_CLOSEST, SnpEff_refseq_Gene_ID="KLF5")]
    )
    mapping, sources = get_rsid_gene_mapping_with_sources(df)

    assert sorted(mapping["rs1"]) == ["KLF5", "LINC00392"]
    assert sources["rs1"] == {
        "KLF5": [GeneColumn.ANNOVAR_refseq_closest, GeneColumn.SnpEff_refseq],
        "LINC00392": [GeneColumn.ANNOVAR_refseq_closest],
    }


def test_closest_genes_ignored_where_the_genic_column_has_a_gene():
    # AnnoQ fills the closest column only for intergenic variants; the fallback holds
    # even if a record carried both.
    df = pd.DataFrame(
        [
            _annoq_row(
                ANNOVAR_ensembl_Gene_ID="ENSG00000000001",
                ANNOVAR_ensembl_Closest_gene=ENSEMBL_CLOSEST,
                ANNOVAR_refseq_Gene_ID="GENEA",
                ANNOVAR_refseq_Closest_gene=REFSEQ_CLOSEST,
            )
        ]
    )
    mapping, sources = get_rsid_gene_mapping_with_sources(df)

    assert sorted(mapping["rs1"]) == ["ENSG00000000001", "GENEA"]
    assert sources["rs1"] == {
        "ENSG00000000001": [GeneColumn.ANNOVAR_ensembl],
        "GENEA": [GeneColumn.ANNOVAR_refseq],
    }


def test_fallback_is_per_gene_model():
    df = pd.DataFrame(
        [
            _annoq_row(
                ANNOVAR_ensembl_Gene_ID="ENSG00000000001",
                ANNOVAR_ensembl_Closest_gene=ENSEMBL_CLOSEST,
                ANNOVAR_refseq_Closest_gene=REFSEQ_CLOSEST,
            )
        ]
    )
    assert sorted(get_rsid_gene_mapping(df)["rs1"]) == ["ENSG00000000001", "KLF5", "LINC00392"]


def test_union_unchanged_for_variant_with_genic_annovar_genes():
    genic = _annoq_row(
        ANNOVAR_ensembl_Gene_ID="ENSG00000000001",
        ANNOVAR_refseq_Gene_ID="GENEA",
        SnpEff_refseq_Gene_ID="GENEB",
        enhancer_linked_genes="GENED",
    )
    with_closest = dict(
        genic,
        ANNOVAR_ensembl_Closest_gene=ENSEMBL_CLOSEST,
        ANNOVAR_refseq_Closest_gene=REFSEQ_CLOSEST,
    )
    assert get_rsid_gene_mapping_with_sources(
        pd.DataFrame([with_closest])
    ) == get_rsid_gene_mapping_with_sources(pd.DataFrame([genic]))


def test_selecting_annovar_includes_only_its_own_closest_column():
    df = pd.DataFrame(
        [
            _annoq_row(
                ANNOVAR_ensembl_Closest_gene=ENSEMBL_CLOSEST,
                ANNOVAR_refseq_Closest_gene=REFSEQ_CLOSEST,
                SnpEff_refseq_Gene_ID="GENEB",
            )
        ]
    )
    ensembl_only = get_rsid_gene_mapping(
        df, gene_mapping_fields=[GeneMappingField.ANNOVAR_ensembl]
    )
    assert sorted(ensembl_only["rs1"]) == ["ENSG00000201253", "ENSG00000206697"]

    snpeff_only = get_rsid_gene_mapping(
        df, gene_mapping_fields=[GeneMappingField.SnpEff_refseq]
    )
    assert snpeff_only == {"rs1": ["GENEB"]}


def test_closest_columns_are_queried_by_their_field_names():
    fields = annoq._get_query_fields()
    assert "ANNOVAR_ensembl_Closest_gene" in fields
    assert "ANNOVAR_refseq_Closest_gene" in fields


def test_download_header_display_names_are_mapped_to_field_names(monkeypatch):
    tsv = (
        "chr\tpos\tANNOVAR_refseq_Gene_ID\trs_dbSNP151\t"
        "ANNOVAR_refseq_Closest_gene(intergenic_only)\n"
        f"13\t73791554\t.\trs78341008\t{REFSEQ_CLOSEST}\n"
    )

    class FakeResponse:
        text = tsv

        def raise_for_status(self):
            return None

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return None

        async def get(self, url):
            return FakeResponse()

    monkeypatch.setattr(annoq.httpx, "AsyncClient", FakeClient)
    df = asyncio.run(annoq.download_data("https://example.invalid/file.tsv"))

    assert "ANNOVAR_refseq_Closest_gene" in df.columns
    assert df.loc[0, "ANNOVAR_refseq_Closest_gene"] == REFSEQ_CLOSEST
