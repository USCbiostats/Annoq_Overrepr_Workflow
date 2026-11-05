import React from "react";
import {
  Box,
  Container,
  Divider,
  Link,
  List,
  ListItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import Footer from "../components/Footer";
import { MAX_OVERREP_GENE_COUNT } from "../apis";

const SNPWAY_URL = "https://snpway.annoq.org/";

const BulletList: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <List sx={{ listStyleType: "disc", pl: 4 }}>
    {items.map((item, index) => (
      <ListItem key={index} sx={{ display: "list-item", py: 0.25 }}>
        <Typography variant="body1">{item}</Typography>
      </ListItem>
    ))}
  </List>
);

const NumberedList: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <List component="ol" sx={{ listStyleType: "decimal", pl: 4 }}>
    {items.map((item, index) => (
      <ListItem key={index} sx={{ display: "list-item", py: 0.25 }}>
        <Typography variant="body1">{item}</Typography>
      </ListItem>
    ))}
  </List>
);

const MAPPING_FILE_COLUMNS: { column: number; contents: string }[] = [
  {
    column: 1,
    contents:
      "rsID for rsID-list input, or chromosome and position in chr:pos format for VCF input",
  },
  { column: 2, contents: "PANTHER gene identifier" },
  {
    column: 3,
    contents:
      "Gene identifiers returned by the selected mapping tools, including ANNOVAR, SnpEff, VEP, or PEREGRINE, and mapped to the PANTHER gene identifier in Column 2",
  },
  { column: 4, contents: "Annotation terms from the selected dataset" },
];

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
          <Typography variant="subtitle1" color="text.secondary">
            A step-by-step guide to mapping SNPs to genes and testing functional
            categories for enrichment
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            SNPWay is a web-based tool for SNP enrichment analysis. It maps
            variants to genes, tests selected annotation datasets, and reports
            biological categories that are overrepresented in the input list.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Open SNPWay at{" "}
            <Link href={SNPWAY_URL} target="_blank" rel="noopener noreferrer">
              {SNPWAY_URL}
            </Link>
            . Sample input files are available on the website if you want to
            test the workflow before analyzing your own data.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5">Before You Begin</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Prepare one of the following input files:
          </Typography>
          <BulletList items={["A VCF file", "A list of rsIDs"]} />
          <Typography variant="body1" sx={{ mt: 1 }}>
            <strong>Maximum input size.</strong> SNPWay supports up to{" "}
            {MAX_OVERREP_GENE_COUNT.toLocaleString()} unique genes per list, the
            maximum that PANTHER accepts for an overrepresentation test. There
            is no separate limit on the number of SNPs, but the genes they map
            to must stay within this limit. The limit applies to the input list
            and to a custom reference list. If a list exceeds it, SNPWay reports
            an error and you will need to reduce the number of variants.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            You will also choose an annotation dataset. The advanced options let
            you control SNP-to-gene mapping, define a custom reference list, and
            select a statistical test.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5">Analysis Workflow</Typography>

          <Typography variant="h6" sx={{ mt: 2 }}>
            Step 1: Upload the Input File
          </Typography>
          <NumberedList
            items={[
              "Upload your VCF file or rsID list.",
              "Confirm that the correct file has been selected.",
              <>
                To use the default settings, continue to Step 2. To control
                SNP-to-gene mapping or the reference list, select{" "}
                <strong>Show advanced options</strong>.
              </>,
            ]}
          />

          <Typography variant="h6" sx={{ mt: 3 }}>
            Step 2: Select an Annotation Dataset
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Choose one dataset for the enrichment analysis:
          </Typography>
          <BulletList
            items={[
              "GO Complete Annotation",
              "PANTHER GO-Slim Annotation",
              "PANTHER Pathway",
              "Reactome Pathway",
              "PANTHER Protein Class",
            ]}
          />

          <Typography variant="h6" sx={{ mt: 3 }}>
            Step 3: Choose SNP to Gene Mapping Tools
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            <strong>Advanced option.</strong> By default, SNPWay uses all
            available AnnoQ mapping tools. You may instead select one or more
            tools and, where applicable, a gene model.
          </Typography>
          <BulletList
            items={[
              "ANNOVAR with Ensembl and/or RefSeq",
              "SnpEff with Ensembl and/or RefSeq",
              "VEP with Ensembl and/or RefSeq",
              "PEREGRINE enhancer-linked genes",
            ]}
          />
          <Typography variant="body1" sx={{ mt: 1 }}>
            <strong>Selection requirement.</strong> At least one mapping tool
            must remain selected. For ANNOVAR, SnpEff, and VEP, select at least
            one gene model. Deselecting both Ensembl and RefSeq removes that tool
            from the analysis.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            SNPWay combines the gene mappings returned by all selected methods
            before performing the enrichment analysis.
          </Typography>

          <Typography variant="h6" sx={{ mt: 3 }}>
            Step 4: Choose the Reference List
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            <strong>Advanced option.</strong> The default reference is the full
            list of human genes used by PANTHER. A custom reference is
            appropriate when the variants that could have been observed are
            restricted, such as the SNPs represented on a genotyping array.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Select <strong>Use custom reference list</strong>, then provide
            either:
          </Typography>
          <BulletList
            items={[
              "A background SNP list in VCF format or as an rsID list",
              "A background gene list, preferably using UniProt identifiers",
            ]}
          />
          <Typography variant="body1" sx={{ mt: 1 }}>
            By default, a background SNP list is mapped with the same tools used
            for the input list. To use different mapping settings, clear{" "}
            <strong>Same as input list</strong> and select the desired tools.
            Using the same mapping procedure for the input and reference lists is
            generally recommended.
          </Typography>

          <Typography variant="h6" sx={{ mt: 3 }}>
            Step 5: Select a Statistical Test
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            <strong>Advanced option.</strong> SNPWay uses Fisher&apos;s exact
            test with false discovery rate correction by default. Open{" "}
            <strong>Show advanced options</strong> if you want to select another
            available statistical option.
          </Typography>

          <Typography variant="h6" sx={{ mt: 3 }}>
            Step 6: Run the Analysis
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Select <strong>Run test</strong> to start the enrichment analysis.
            Processing time depends on the size of the input file and the
            selected options.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            While the analysis runs, a <strong>Processing your request</strong>{" "}
            panel at the top of the form shows the status of each stage:
          </Typography>
          <BulletList
            items={[
              "Mapping the input list to genes (AnnoQ)",
              "Mapping or reading the reference list, if a custom reference list is used",
              "Running the PANTHER overrepresentation test",
            ]}
          />
          <Typography variant="body1" sx={{ mt: 1 }}>
            Each stage shows whether it is waiting, running, or complete, along
            with batch progress, elapsed time, and an estimate of the time
            remaining. When processing is complete, SNPWay opens the Results
            page.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5">Review the Results</Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            The Results page contains a summary table of the enrichment
            analysis. For definitions of the reported statistics and guidance on
            interpretation, see the{" "}
            <Link component={RouterLink} to="/tutorial/results-interpretation">
              Results Interpretation Guide
            </Link>
            .
          </Typography>

          <Typography variant="h6" sx={{ mt: 3 }}>
            Download Statistical Results from PANTHER
          </Typography>
          <NumberedList
            items={[
              <>
                Select <strong>View full results in PANTHER</strong>.
              </>,
              <>
                On the PANTHER results page, use <strong>Export</strong> to
                download the full statistical results.
              </>,
            ]}
          />

          <Typography variant="h6" sx={{ mt: 3 }}>
            Download Mapping Results from SNPWay
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Use <strong>Download</strong> on the SNPWay Results page to export
            either:
          </Typography>
          <BulletList
            items={[
              "All SNP-to-annotation mappings",
              "Only mappings associated with significant annotation categories",
            ]}
          />
          <Typography variant="body1" sx={{ mt: 1 }}>
            The download data may still be in preparation when the Results page
            opens. A status message at the top of the Results page shows its
            progress, and the Download options become available when it
            finishes.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            The downloaded mapping file contains four columns:
          </Typography>
          <TableContainer
            sx={{
              mt: 1,
              border: "1px solid",
              borderColor: "grey.400",
              borderRadius: 1,
            }}
          >
            <Table
              size="small"
              sx={{
                "& td, & th": { borderColor: "grey.400" },
                "& td:not(:last-child), & th:not(:last-child)": {
                  borderRight: "1px solid",
                  borderRightColor: "grey.400",
                },
                "& tbody tr:last-child td": { borderBottom: 0 },
              }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: "primary.main" }}>
                  <TableCell
                    align="center"
                    sx={{ color: "common.white", fontWeight: 600, width: 96 }}
                  >
                    Column
                  </TableCell>
                  <TableCell sx={{ color: "common.white", fontWeight: 600 }}>
                    Contents
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MAPPING_FILE_COLUMNS.map(({ column, contents }) => (
                  <TableRow key={column} sx={{ bgcolor: "#eef3f8" }}>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {column}
                    </TableCell>
                    <TableCell>{contents}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" sx={{ mt: 3 }}>
            Download Mappings for One Annotation Category
          </Typography>
          <NumberedList
            items={[
              <>
                In the results table, find the desired category and select the
                number in the &quot;#&quot; column under{" "}
                <strong>Input List</strong>.
              </>,
              "SNPWay downloads a file with the same four-column format described above.",
            ]}
          />
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default Tutorial;
