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
            SNPWay now serves as the shared workflow UI for the Python package
            annoq-py and the R package AnnoQR. Both libraries call the same backend
            workflow, which returns a compact payload containing the SNP-to-gene
            mappings, PANTHER metadata, and normalized overrepresentation rows.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Typography variant="h6">Python</Typography>
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

print(mapping["gene_list"])
print(len(workflow["overrepresentation_results"]))
print(len(workflow["overrepresentation_significant_results"]))`}
            </Box>

            <Typography variant="h6">R</Typography>
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
length(workflow$overrepresentation_results)
length(workflow$overrepresentation_significant_results)`}
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
              The workflow response contains only the compact data needed by the
              clients: gene_list, rsId_genes_map, panther_gene_info,
              gene_panther_mapping, and overrepresentation_results.
            </Typography>
          </Stack>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default API;