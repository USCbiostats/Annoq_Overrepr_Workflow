import React from "react";
import { Box, Container, Divider, Typography } from "@mui/material";
import TopBar from "../components/TopBar";
import BrandHeader from "../components/BrandHeader";
import Footer from "../components/Footer";

const ResultsInterpretation: React.FC = () => {
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
            Results Interpretation Guide
          </Typography>

          <Typography variant="body1" sx={{ mt: 1 }}>
            On the Results page, there is a table with eight essential columns of data. The default output is sorted by Hierarchy of the categories. By default, only the categories with p-value better than 0.05 are displayed. In the hierarchy view, the results are sorted by the Fold Enrichment of the most specific categories, with their parent terms (p-value better than 0.05) indented directly below. Results with all p-values can be displayed by clicking the click here to display all results link.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body1" sx={{ mt: 1 }}>
            1. The first column contains the name of the annotation data category, such as PANTHER GO-slim, GO or PANTHER pathway. If you are doing this analysis in terms of pathways, you can click on the pathway name to view the corresponding pathway diagram.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            2. The second column contains the number of genes in the reference list that map to this particular annotation data category.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            3. The third column contains the number of genes in your uploaded list that map to this annotation data category.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            4. The fourth column contains the expected value, which is the number of genes you would expect in your list for this category, based on the reference list.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            5. The fifth column shows the Fold Enrichment of the genes observed in the uploaded list over the expected (number in your list divided by the expected number). If it is greater than 1, it indicates that the category is overrepresented in your experiment. Conversely, the category is underrepresented if it is less than 1.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            6. The sixth column has either a + or -. A plus sign indicates over-representation of this category in your experiment: you observed more genes than expected based on the reference list (for this category, the number of genes in your list is greater than the expected value). Conversely, a negative sign indicates under-representation.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            7. The seventh column is the raw p-value as determined by Fishers exact test or Binomial statistic. This is the probability that the number of genes you observed in this category occurred by chance (randomly), as determined by your reference list.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1 }}>
            8. The eighth column is the False Discovery Rate as calculated by the Benjamini-Hochberg procedure. By default a critical value of 0.05 is used to filter results, so all results shown are valid for an overall FDR&lt;0.05 even if the FDR for an individual comparison is greater than that value.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body1" sx={{ mt: 1 }}>
            The table can be sorted by clicking the column header. An arrow will appear at the column header to indicate the sort order. When the table is order by the column header, the hierarchy structure of the ontology terms is lost. The table is ordered only based on the values in the sorted column. To return to the Hierarchy view, simply click the 'Hierarchy' link at the top of the table.
          </Typography>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
};

export default ResultsInterpretation;
