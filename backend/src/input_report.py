"""Input accounting: what happened to each submitted variant and gene identifier.

Reporting only; the gene mapping and the PANTHER test are unchanged.
"""
import re
from dataclasses import dataclass
from typing import Any

import pandas as pd

from src.annoq import _variant_id_to_chr_pos, variant_key
from src.models import (
    GeneIdentifierReportRow,
    InputReport,
    InputReportSummary,
    PantherMatch,
    VariantReportRow,
    VariantStatus,
)
from src.query import IdsQuery, InputType, RsIdListQuery, RsIdQuery

VERSION_SUFFIX = re.compile(r"\.\d+$")


@dataclass
class VariantAccounting:
    rows: list[VariantReportRow]
    records_not_matched_to_input: int


def submitted_variants(input_type: InputType, query: Any) -> list[str]:
    """Unique submitted variants in input order, as get_annoq_df reads them."""
    if input_type == InputType.rsIdList and isinstance(query, RsIdListQuery):
        values = query.rsIdList
    elif input_type == InputType.rsId and isinstance(query, RsIdQuery):
        values = [query.rsId]
    elif input_type == InputType.ids and isinstance(query, IdsQuery):
        values = query.ids
    else:
        return []
    return list(dict.fromkeys(str(v).strip() for v in values if str(v).strip()))


def _input_key(variant: str, force_chr_pos_keys: bool) -> str:
    # chr:pos inputs ("1:100", "chr1:100A>G") are keyed as the records are.
    return _variant_id_to_chr_pos(variant) if force_chr_pos_keys else variant


def account_for_variants(
    input_type: InputType,
    query: Any,
    annoq_df: pd.DataFrame,
    rs_id_gene_mapping: dict[str, list[str]],
    force_chr_pos_keys: bool,
) -> VariantAccounting:
    record_keys = [
        variant_key(row, force_chr_pos_keys) for _, row in annoq_df.iterrows()
    ]
    # A record's rsID field can hold merged rsIDs ("rs1;rs2"); each one finds it.
    key_lookup: dict[str, str] = {}
    for key in record_keys:
        if not key:
            continue
        parts = key.split(";") if not force_chr_pos_keys else [key]
        for part in parts:
            key_lookup.setdefault(part.strip(), key)

    rows: list[VariantReportRow] = []
    matched_keys: set[str] = set()
    for variant in submitted_variants(input_type, query):
        key = key_lookup.get(_input_key(variant, force_chr_pos_keys))
        if key is None:
            rows.append(
                VariantReportRow(
                    input=variant,
                    variant_key=None,
                    status=VariantStatus.no_record,
                    n_genes=0,
                )
            )
            continue
        matched_keys.add(key)
        genes = rs_id_gene_mapping.get(key)
        rows.append(
            VariantReportRow(
                input=variant,
                variant_key=key,
                status=VariantStatus.annotated if genes else VariantStatus.no_gene,
                n_genes=len(genes) if genes else 0,
            )
        )

    unmatched = sum(1 for key in record_keys if not key or key not in matched_keys)
    return VariantAccounting(rows=rows, records_not_matched_to_input=unmatched)


def gene_identifier_rows(
    gene_list: list[str], mapped_ids: list[str], unmapped_ids: list[str]
) -> list[GeneIdentifierReportRow]:
    mapped, unmapped = set(mapped_ids), set(unmapped_ids)
    rows: list[GeneIdentifierReportRow] = []
    for identifier in sorted(gene_list):
        # PANTHER lists some IDs without a ".N" suffix (HLA-C.7 as HLA-C).
        stripped = VERSION_SUFFIX.sub("", identifier)
        candidates = [(identifier, PantherMatch.exact)]
        if stripped != identifier:
            candidates.append((stripped, PantherMatch.version_suffix_removed))
        row = GeneIdentifierReportRow(
            identifier=identifier,
            mapped_by_panther="not_listed",
            panther_listed_as=None,
            panther_match=PantherMatch.not_listed,
        )
        for listed_as, match in candidates:
            if listed_as in mapped or listed_as in unmapped:
                row = GeneIdentifierReportRow(
                    identifier=identifier,
                    mapped_by_panther="yes" if listed_as in mapped else "no",
                    panther_listed_as=listed_as,
                    panther_match=match,
                )
                break
        rows.append(row)
    return rows


def build_input_report(
    variants: VariantAccounting,
    gene_list: list[str],
    panther_input_list: tuple[list[str], list[str]] | None,
) -> InputReport:
    """panther_input_list is None when no overrepresentation test was run."""
    statuses = [row.status for row in variants.rows]
    identifiers = (
        None
        if panther_input_list is None
        else gene_identifier_rows(gene_list, *panther_input_list)
    )

    def count(value: str) -> int | None:
        if identifiers is None:
            return None
        return sum(1 for row in identifiers if row.mapped_by_panther == value)

    return InputReport(
        summary=InputReportSummary(
            n_input=len(variants.rows),
            n_annotated=statuses.count(VariantStatus.annotated),
            n_no_record=statuses.count(VariantStatus.no_record),
            n_no_gene=statuses.count(VariantStatus.no_gene),
            n_records_not_matched_to_input=variants.records_not_matched_to_input,
            n_identifiers_submitted=len(gene_list),
            n_identifiers_mapped_by_panther=count("yes"),
            n_identifiers_not_mapped_by_panther=count("no"),
            n_identifiers_not_listed_by_panther=count("not_listed"),
        ),
        variants=variants.rows,
        gene_identifiers=identifiers,
    )
