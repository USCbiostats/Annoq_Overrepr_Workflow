import React from "react";
import { Box, Container, Divider, Stack, Typography } from "@mui/material";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import Footer from "../components/Footer";

const API: React.FC = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <BrandHeader />
      <TopBar />

      <Container component="main" maxWidth="lg" sx={{ mt: 4, mb: 6, flexGrow: 1 }}>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: { xs: 3, md: 4 },
            bgcolor: "white",
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            AnnoQ Libraries
          </Typography>
          <Typography variant="body1" color="text.secondary">
            SNPWay workflow can be called directly from the python package <a href="https://github.com/USCbiostats/annoq-py" target="_blank" rel="noopener noreferrer">annoq-py</a> and the R package <a href="https://github.com/USCbiostats/AnnoQR" target="_blank" rel="noopener noreferrer">AnnoQR</a>. Both libraries call the same backend
            workflow as the UI.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Typography variant="h6"><a href="https://github.com/USCbiostats/annoq-py" target="_blank" rel="noopener noreferrer">Python</a></Typography>
            <Box
              component="pre"
              sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}
            >
{`import annoq

mapping = annoq.get_snpway_gene_mappings(
    rsid_list=["rs1219648", "rs2912774"]
)

workflow = annoq.run_snpway_overrepresentation_workflow(
    rsid_list=["rs1219648", "rs2912774"],
    annot_data_set="GO:0008150",
    correction="FDR",
    enrichment_test_type="FISHER",
)

print(mapping["mapping"]["gene_list"])
print(len(workflow["overrepresentation"]["results"]))
print(len(workflow["overrepresentation"]["significant_results"]))`}
            </Box>

            <Typography variant="h6"><a href="https://github.com/USCbiostats/AnnoQR" target="_blank" rel="noopener noreferrer">R</a></Typography>
            <Box
              component="pre"
              sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}
            >
{`library(AnnoQR)

mapping <- snpwayGeneMappingsQuery(
  rsid_list = c("rs1219648", "rs2912774")
)

workflow <- snpwayOverrepresentationWorkflowQuery(
  rsid_list = c("rs1219648", "rs2912774"),
  annot_data_set = "GO:0008150",
  correction = "FDR",
  enrichment_test_type = "FISHER"
)

names(mapping)
length(workflow$overrepresentation$results)
length(workflow$overrepresentation$significant_results)`}
            </Box>

            <Typography variant="body2" color="text.secondary">
              The backend base URL can be overridden with ANNOQ_SNPWAY_BASE_URL.
              The clients derive significant results and CSV rows locally so the
              wire payload stays small.
            </Typography>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Typography variant="h6">Shared workflow payload</Typography>
            <Typography variant="body2" color="text.secondary">
              The library responses are nested to group related data and reduce
              confusion. Each section has a specific purpose:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ml: 2}}>
              <strong>mapping:</strong> SNP-to-gene associations (gene_list: unique genes found; variant_gene_map: rsID/chr:pos to genes)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ml: 2}}>
              <strong>panther:</strong> Gene annotations (gene_info: families, pathways, GO terms; gene_to_panther_map: gene to ID cross-reference)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ml: 2}}>
              <strong>overrepresentation:</strong> Enrichment analysis (results: all terms; significant_results: filtered; settings: parameters; significance_cutoff: threshold)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ml: 2}}>
              <strong>csv:</strong> Export tables (all_mappings/significant_mappings with filtered/all columns)
            </Typography>
            <Box
              component="pre"
              sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}
            >
{`{
  "mapping": {
    "gene_list": ["FGFR2", "..."],
    "variant_gene_map": {"rs1219648": ["FGFR2"], "1:115921355": ["GENE_X"]}
  },
  "panther": {
    "gene_info": {"PTHR12345:SF1": {"PANTHER_ID": "PTHR12345:SF1", "PANTHER_family": "..."}},
    "gene_to_panther_map": {"FGFR2": ["PTHR12345:SF1"]}
  },
  "overrepresentation": {
    "results": [...],
    "significant_results": [...],
    "settings": {"annot_data_set": "GO:0008150", "correction": "FDR", "enrichment_test_type": "FISHER"},
    "significance_cutoff": {"field": "fdr", "p_value": 0.05}
  },
  "csv": {
    "all_mappings": [...],
    "all_mappings_all_columns": [...],
    "significant_mappings": [...],
    "significant_mappings_all_columns": [...]
  }
}`}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Use the mapping section for the SNP to gene associations, panther
              for metadata, overrepresentation for term results and filters, and
              csv for export-ready rows. The same structure is returned by both
              annoq-py and AnnoQR.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The mapping workflow returns only mapping + panther. The
              overrepresentation workflow returns mapping + panther +
              overrepresentation + csv.
            </Typography>
          </Stack>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default API;