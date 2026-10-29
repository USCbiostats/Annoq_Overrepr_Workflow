# List of gene extractors
import re
from functools import lru_cache
from pathlib import Path


def delimited_gene_extractor(gene_str: str, delimiter: str) -> list[str]:
    # Extract gene names from the gene string
    # Split the string by the delimiter
    gene_list = gene_str.split(delimiter)
    # Remove empty strings
    gene_list = [gene for gene in gene_list if len(gene.strip()) > 0]
    return gene_list


def extract_refseq_gene_ids(gene_str: str) -> list[str]:
    if not gene_str or gene_str.lower() == "nan":
        return []
    entry = re.sub(r"^CHR_START-?", "", gene_str)
    sub_entries = re.split(r"[|,]", entry)
    final_genes = []
    for sub in sub_entries:
        if "NONE" in sub.upper():
            continue
        sub = sub.split(":")[0]
        parts = sub.split("-")
        current = parts[0]
        for i in range(1, len(parts)):
            if current[-1].isdigit() and parts[i][0].isdigit():
                current += "-" + parts[i]
            elif re.match(r"AS\d+", parts[i]):
                current += "-" + parts[i]
            else:
                final_genes.append(current)
                current = parts[i]
        final_genes.append(current)
    return [g for g in final_genes if g]


def extract_ensembl_gene_ids(gene_str: str) -> list[str]:
    pattern = re.compile(r"ENSG\d+", re.IGNORECASE)
    return pattern.findall(gene_str)


# Fixed RefSeq extractor.
#
# extract_refseq_gene_ids splits every hyphen unless a digit-digit or "-AS<n>"
# continuation follows, so names such as HLA-C, HLA-DRB1 or LINC-PINT are cut
# into fragments. This variant applies dictionary longest-match segmentation
# first: within a hyphen-joined string it greedily consumes the longest
# hyphen-spanning candidate (two or more parts) found in lexicon_symbols.txt
# (HGNC symbol, alias and previous symbols, all locus groups; see
# data/README.md). Runs of parts the lexicon does not cover fall back to the
# extract_refseq_gene_ids rule unchanged.
#
# Readthrough rule: a hyphen-spanning lexicon match is kept whole UNLESS every
#   hyphen piece is itself a lexicon gene symbol of 3+ characters (".N" suffix
#   ignored), in which case it is split into the pieces. Readthrough loci
#   (TMEM110-MUSTN1, RTEL1-TNFRSF6B) therefore resolve to their constituent
#   genes, both retained.
# tRNA rule: a RefSeq tRNA name, TRNA<letters>-<3-letter anticodon> (e.g.
#   TRNAL-CAA), stays unsplit. It is not an HGNC symbol and remains one
#   unmatched ID downstream.
#
# Lookups are case-insensitive and tolerate a trailing ".N" version suffix
# (SnpEff writes e.g. HLA-C.7); emitted IDs keep the source text exactly.

LEXICON_FILE = Path(__file__).resolve().parents[1] / "data" / "lexicon_symbols.txt"


@lru_cache(maxsize=1)
def load_lexicon(path: str = str(LEXICON_FILE)) -> frozenset:
    with open(path, encoding="utf-8") as fh:
        return frozenset(line.strip().upper() for line in fh if line.strip())


TRNA_NAME = re.compile(r"TRNA[A-Za-z]+-[A-Za-z]{3}")


def _is_gene_piece(piece: str, lexicon: frozenset) -> bool:
    return len(re.sub(r"\.\d+$", "", piece)) >= 3 and _in_lexicon(piece, lexicon)


def _keep_whole(pieces: list[str], lexicon: frozenset) -> bool:
    """Lexicon span kept whole unless it is two or more genes joined (readthrough / flanking pair)."""
    return _in_lexicon("-".join(pieces), lexicon) and not all(_is_gene_piece(p, lexicon) for p in pieces)


def _in_lexicon(candidate: str, lexicon: frozenset) -> bool:
    c = candidate.upper()
    return c in lexicon or re.sub(r"\.\d+$", "", c) in lexicon


def _deployed_heuristic(parts: list[str]) -> list[str]:
    """The loop from extract_refseq_gene_ids, applied to a run of parts."""
    if not parts:
        return []
    out = []
    current = parts[0]
    for i in range(1, len(parts)):
        if current and current[-1].isdigit() and parts[i] and parts[i][0].isdigit():
            current += "-" + parts[i]
        elif re.match(r"AS\d+", parts[i]):
            current += "-" + parts[i]
        else:
            out.append(current)
            current = parts[i]
    out.append(current)
    return out


def segment(parts: list[str], lexicon: frozenset) -> list[str]:
    out, pending, i, n = [], [], 0, len(parts)
    while i < n:
        hit = next((j for j in range(n, i + 1, -1) if _keep_whole(parts[i:j], lexicon)), None)
        if hit is None:
            pending.append(parts[i])
            i += 1
            continue
        out.extend(_deployed_heuristic(pending))
        pending = []
        out.append("-".join(parts[i:hit]))
        i = hit
    out.extend(_deployed_heuristic(pending))
    return out


def extract_refseq_gene_ids_fixed(gene_str: str, lexicon: frozenset | None = None) -> list[str]:
    if lexicon is None:
        lexicon = load_lexicon()
    if not gene_str or gene_str.lower() == "nan":
        return []
    entry = re.sub(r"^CHR_START-?", "", gene_str)
    final_genes = []
    for sub in re.split(r"[|,]", entry):
        if "NONE" in sub.upper():
            continue
        sub = sub.split(":")[0]
        if TRNA_NAME.fullmatch(sub):
            final_genes.append(sub)
            continue
        final_genes.extend(segment(sub.split("-"), lexicon))
    return [g for g in final_genes if g]
