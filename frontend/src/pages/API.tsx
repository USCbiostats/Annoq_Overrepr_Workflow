import React from "react";
import {
  Box,
  Container,
  Divider,
  Link,
  Stack,
  Typography,
} from "@mui/material";
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
            SNPWay API Guide
          </Typography>
          <Typography variant="body1" color="text.secondary">
            SNPWay uses a two-step backend workflow. First, it returns fast rsID to
            gene mappings. Then, only when a download is requested, it fetches
            PANTHER gene metadata in a separate call.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Typography variant="h6">Backend endpoints</Typography>
            <Typography variant="body2">
              <strong>POST</strong> /gene_mappings
            </Typography>
            <Typography variant="body2">
              <strong>POST</strong> /panther_gene_info
            </Typography>
            <Typography variant="body2">
              Local docs when backend is running: <Link href="http://localhost:8002/docs" target="_blank" rel="noopener">http://localhost:8002/docs</Link>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Both endpoints enforce a maximum of 100,000 unique genes and return
              HTTP 422 when exceeded.
            </Typography>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Typography variant="h6">Request examples</Typography>

            <Typography variant="subtitle2">rsID list input</Typography>
            <Box component="pre" sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}>
{`{
  "input_type": "rsIdList",
  "rsIdListQuery": {
    "rsIdList": ["rs1219648", "rs2912774", "rs2981582"]
  }
}`}
            </Box>

            <Typography variant="subtitle2">VCF-derived IDs input</Typography>
            <Box component="pre" sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}>
{`{
  "input_type": "ids",
  "idsQuery": {
    "ids": ["1:115921355A>G", "1:12046063G>T"]
  }
}`}
            </Box>

            <Typography variant="subtitle2">Chromosome region input</Typography>
            <Box component="pre" sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}>
{`{
  "input_type": "chromosome",
  "chrQuery": {
    "chr": "1",
    "start": 100000,
    "end": 200000
  }
}`}
            </Box>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Typography variant="h6">Response shape: /gene_mappings</Typography>
            <Box component="pre" sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}>
{`{
  "gene_list": ["FGFR2", "..."],
  "rsId_genes_map": {
    "rs1219648": ["FGFR2"],
    "chr1:115921355": ["GENE_X"]
  }
}`}
            </Box>
            <Typography variant="body2" color="text.secondary">
              For rsID-list input, keys in rsId_genes_map are rsIDs. For
              VCF-derived ids input, keys in rsId_genes_map use chr:pos.
            </Typography>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Typography variant="h6">Request/response: /panther_gene_info</Typography>
            <Box component="pre" sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}>
{`{
  "gene_list": ["FGFR2", "BRCA1", "TP53"]
}`}
            </Box>

            <Box component="pre" sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}>
{`{
  "panther_gene_info": {
    "PTHR12345:SF1": {
      "PANTHER_ID": "PTHR12345:SF1",
      "PANTHER_family": "...",
      "PANTHER_Subfamily": "...",
      "PANTHER_Pathway": "...",
      "Protein_Class": "...",
      "Reactome_Pathway": "...",
      "GO_database_MF_complete": "...",
      "GO_database_BP_complete": "...",
      "GO_database_CC_complete": "...",
      "PANTHER_GO_slim_Molecular_Function": "...",
      "PANTHER_GO_slim_Biological_Process": "...",
      "PANTHER_GO_slim_Cellular_Component": "..."
    }
  },
  "gene_panther_mapping": {
    "FGFR2": ["PTHR12345:SF1"]
  }
}`}
            </Box>
            <Typography variant="body2" color="text.secondary">
              This endpoint is used by the frontend during download preparation.
              Internally, the backend queries PANTHER geneinfo in sequential
              batches of 1000 genes.
            </Typography>
          </Stack>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={2}>
            <Typography variant="h6">cURL examples</Typography>
            <Box component="pre" sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}>
{`curl -X POST http://localhost:8002/gene_mappings \\
  -H "Content-Type: application/json" \\
  -d '{
    "input_type": "rsIdList",
    "rsIdListQuery": {"rsIdList": ["rs1219648", "rs2912774"]}
  }'`}
            </Box>

            <Box component="pre" sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}>
{`curl -X POST http://localhost:8002/panther_gene_info \\
  -H "Content-Type: application/json" \\
  -d '{
    "gene_list": ["FGFR2", "BRCA1", "TP53"]
  }'`}
            </Box>

            <Typography variant="h6">Frontend enrichment endpoint</Typography>
            <Typography variant="body2">
              SNPWay frontend submits gene lists to PANTHER overrepresentation:
              <Link
                href="https://pantherdb.org/services/oai/pantherdb/enrich/overrep"
                target="_blank"
                rel="noopener"
                sx={{ ml: 1 }}
              >
                pantherdb.org/services/oai/pantherdb/enrich/overrep
              </Link>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              PANTHER overrepresentation supports up to 100,000 genes. SNPWay
              validates this before making the enrichment request.
            </Typography>
          </Stack>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default API;
