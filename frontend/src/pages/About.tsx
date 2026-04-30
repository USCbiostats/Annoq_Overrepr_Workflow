import React from "react";
import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import Footer from "../components/Footer";

const About: React.FC = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <BrandHeader />
      <TopBar />

      <Container
        component="main"
        maxWidth="lg"
        sx={{ mt: 4, mb: 6, flexGrow: 1 }}
      >
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: { xs: 3, md: 4 },
            bgcolor: "white",
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 1 }}>
            About SNPWay
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            SNPWay provides a streamlined workflow from SNP-level input to
            gene-level overrepresentation analysis. Variant-to-gene mapping is
            performed with AnnoQ, and enrichment is calculated with PANTHER.
          </Typography>

          <Stack spacing={2} sx={{ mt: 3 }}>
            <Typography variant="h6">Workflow</Typography>
            <Typography variant="body2">
              1) Retrieve genes for your variants via{" "}
              <Link href="https://annoq.org/" target="_blank" rel="noopener">
                Annoq
              </Link>
              .
            </Typography>
            <Typography variant="body2">
              2) Run enrichment against curated datasets with{" "}
              <Link
                href="https://pantherdb.org/"
                target="_blank"
                rel="noopener"
              >
                PANTHER
              </Link>
              .
            </Typography>
            <Typography variant="body2">
              3) Interpret pathways, functions, and classes without leaving the
              workflow.
            </Typography>

            <Typography variant="h6" sx={{ pt: 1 }}>
              Learn more
            </Typography>
            <Typography variant="body2">
              Full workflow tutorial: <Link component={RouterLink} to="/tutorial">Tutorial</Link>
            </Typography>
            <Typography variant="body2">
              API endpoint reference: <Link component={RouterLink} to="/api">API Guide</Link>
            </Typography>
          </Stack>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default About;
