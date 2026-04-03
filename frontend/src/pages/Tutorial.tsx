import React from "react";
import {
  Box,
  Container,
  Divider,
  Link,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import Footer from "../components/Footer";

const Tutorial: React.FC = () => {
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
            SNPWay Tutorial
          </Typography>
          <Typography variant="h5" sx={{ mt: 3 }}>
            About
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            SNPWay is a web-based tool for SNP enrichment analysis. It allows users to upload SNP data, select functional annotation datasets, and perform statistical enrichment tests to identify significantly associated biological categories.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5">Workflow</Typography>

          <Typography variant="h6" sx={{ mt: 2 }}>
            Step 1: Prepare and Submit Your Input File
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Upload your SNP data file. SNPWay supports the following input formats:
          </Typography>
          <List sx={{ listStyleType: "disc", pl: 4 }}>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">VCF file</Typography>
            </ListItem>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">rsID list</Typography>
            </ListItem>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">Chromosomal region list</Typography>
            </ListItem>
          </List>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Sample input files are available on the website for testing purposes.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6">Step 2: Select an Annotation Dataset</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Choose one of the supported annotation datasets for enrichment analysis:
          </Typography>
          <List sx={{ listStyleType: "disc", pl: 4 }}>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">GO Complete Annotation</Typography>
            </ListItem>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">PANTHER GO-Slim Annotation</Typography>
            </ListItem>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">PANTHER Pathway</Typography>
            </ListItem>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">Reactome Pathway</Typography>
            </ListItem>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">PANTHER Protein Class</Typography>
            </ListItem>
          </List>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6">Step 3: Select a Statistical Test</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            By default, SNPWay performs Fisher&apos;s exact test with FDR correction.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            To access additional statistical testing options, click "Show advanced options".
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6">Step 4: Run the Analysis</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Click Run to start the enrichment analysis. Processing time may vary depending on the size of your input file.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5">Results Page</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            After the analysis is complete, you will be redirected to the Results page, which contains a summary table of the enrichment test results.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Detailed instructions on how to interpret the results are available here:
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            <Link component={RouterLink} to="/tutorial/results-interpretation">
              [Insert link to interpretation guide]
            </Link>
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5">Downloading Results</Typography>

          <Typography variant="h6" sx={{ mt: 2 }}>
            1. Download Statistical Results from PANTHER
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            To download the full statistical results:
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            1. Click "View full results in PANTHER".
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            2. Use the Export function on the PANTHER website to download the results.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6">2. Download Mapping Results from SNPWay</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Click the Download button to export:
          </Typography>
          <List sx={{ listStyleType: "disc", pl: 4 }}>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">All SNP-to-annotation mappings</Typography>
            </ListItem>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">or</Typography>
            </ListItem>
            <ListItem sx={{ display: "list-item", py: 0.25 }}>
              <Typography variant="body1">Only mappings within significant annotation categories</Typography>
            </ListItem>
          </List>
          <Typography variant="body1" sx={{ mt: 1 }}>
            The downloaded file contains four columns:
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            1. Column 1: rsID (rsID/chromosome input) or chr:pos (VCF input)
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            2. Column 2: PANTHER gene ID
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            3. Column 3: Gene IDs mapped by annotation tools (ANNOVAR, SnpEff, VEP). These IDs are mapped to the PANTHER gene ID (Column 2) using the PANTHER tool.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            4. Column 4: Annotated terms based on the selected dataset
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6">3. Download Mappings for a Specific Annotation Category</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            To download SNP mappings for a specific annotation category:
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            1. Click the number in the "#" column under "Input List".
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            2. The downloaded file will follow the same four-column format described above.
          </Typography>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default Tutorial;
