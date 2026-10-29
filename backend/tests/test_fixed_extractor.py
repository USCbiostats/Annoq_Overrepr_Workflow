"""Unit tests for the fixed RefSeq extractor (lead-author spec, 2026-10-10)."""
import unittest

from src.gene_extractors import extract_refseq_gene_ids as deployed
from src.gene_extractors import extract_refseq_gene_ids_fixed as fixed


class PreservedWhole(unittest.TestCase):
    def test_hyphenated_names_preserved(self):
        for name in ["HLA-C", "HLA-DQA1", "HLA-DRB1", "NKX2-1", "LINC-PINT"]:
            with self.subTest(name=name):
                self.assertEqual(fixed(name), [name])

    def test_antisense_names_preserved(self):
        for name in ["CDKN2B-AS1", "ZMIZ1-AS1", "TET2-AS1", "CCND2-AS1", "TBX5-AS1", "TMEM220-AS1"]:
            with self.subTest(name=name):
                self.assertEqual(fixed(name), [name])


class FlankingPairs(unittest.TestCase):
    def test_flanking_pair_still_splits(self):
        self.assertEqual(fixed("SMAD7-DYNAP"), ["SMAD7", "DYNAP"])

    def test_readthrough_loci_split_into_constituent_genes(self):
        self.assertEqual(fixed("TMEM110-MUSTN1"), ["TMEM110", "MUSTN1"])
        self.assertEqual(fixed("RTEL1-TNFRSF6B"), ["RTEL1", "TNFRSF6B"])

    def test_trna_name_kept_whole(self):
        self.assertEqual(fixed("TRNAL-CAA"), ["TRNAL-CAA"])
        self.assertEqual(fixed("TRNAL-CAA|HCG14"), ["TRNAL-CAA", "HCG14"])

    def test_nkx_pair_recovers_both(self):
        self.assertEqual(fixed("NKX2-1-NKX2-8"), ["NKX2-1", "NKX2-8"])


class ObservedFragmentStrings(unittest.TestCase):
    """Every AnnoQ token in the observed CRC set that the deployed extractor fragmented."""
    EXPECTED = {
        "HLA-B": ["HLA-B"],
        "HLA-B.5": ["HLA-B.5"],
        "HLA-C.7-HLA-B.5": ["HLA-C.7", "HLA-B.5"],
        "HLA-DRB1-HLA-DQA1": ["HLA-DRB1", "HLA-DQA1"],
        "HLA-G-HLA-H": ["HLA-G", "HLA-H"],
        "LINC-PINT": ["LINC-PINT"],
        "LRP1-AS": ["LRP1-AS"],
        "TRNAL-CAA": ["TRNAL-CAA"],
        "MICA.4-HCP5": ["MICA.4", "HCP5"],
    }

    def test_fragments_resolve(self):
        for token, expected in self.EXPECTED.items():
            with self.subTest(token=token, deployed=deployed(token)):
                self.assertEqual(fixed(token), expected)


class UnchangedBehaviour(unittest.TestCase):
    def test_deployed_preprocessing_kept(self):
        cell = "CHR_START-ZNF621|BMP4,NONE:dist=1|ADM:dist=5"
        self.assertEqual(fixed(cell), deployed(cell))

    def test_empty_and_nan(self):
        self.assertEqual(fixed(""), [])
        self.assertEqual(fixed("nan"), [])


if __name__ == "__main__":
    unittest.main()
