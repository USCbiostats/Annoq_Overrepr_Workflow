import { useState } from "react";
import TestInputs from "../components/TestInputs";
import TopBar from "../components/TopBar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Typography,
  Container,
  Paper,
  Box,
  Snackbar,
  AlertTitle,
  LinearProgress,
  Fade,
  Link,
} from "@mui/material";
import { CorrectionType, TestType } from "../constants";
import { getGeneMappings } from "../apis";
import Footer from "../components/Footer";

function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null as string | null);
  const [success, setSuccess] = useState(false);

  const onRunTest = async (
    payload: any,
    dataset: string,
    testType: TestType,
    correction: CorrectionType
  ) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    // Retrieve the data from the server
    try {
      const response = await getGeneMappings(payload);

      const form = document.createElement("form");
      form.method = "POST";
      form.action =
        "https://pantherdb.org/services/oai/pantherdb/enrich/overrep";
      form.target = "_blank";

      const correctionField = document.createElement("input");
      correctionField.type = "hidden";
      correctionField.name = "correction";
      correctionField.value = correction;

      const datasetField = document.createElement("input");
      datasetField.type = "hidden";
      datasetField.name = "annotDataSet";
      datasetField.value = dataset;

      const testTypeField = document.createElement("input");
      testTypeField.type = "hidden";
      testTypeField.name = "enrichmentTestType";
      testTypeField.value = testType;

      const speciesField = document.createElement("input");
      speciesField.type = "hidden";
      speciesField.name = "organism";
      speciesField.value = "9606";

      const formatField = document.createElement("input");
      formatField.type = "hidden";
      formatField.name = "format";
      formatField.value = "html";

      const resourceField = document.createElement("input");
      resourceField.type = "hidden";
      resourceField.name = "resource";
      resourceField.value = "PANTHER";

      const inputField = document.createElement("input");
      inputField.type = "hidden";
      inputField.name = "geneInputList";
      inputField.value = response.gene_list.join(",");

      form.appendChild(correctionField);
      form.appendChild(datasetField);
      form.appendChild(testTypeField);
      form.appendChild(speciesField);
      form.appendChild(formatField);
      form.appendChild(resourceField);
      form.appendChild(inputField);

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      setSuccess(true);
    } catch (error: any) {
      setError("Error occurred while fetching data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <TopBar />

      {/* Loading indicator at the top of the page */}
      <Box
        sx={{ width: "100%", position: "fixed", top: 0, left: 0, zIndex: 9999 }}
      >
        <Fade in={isLoading} unmountOnExit>
          <LinearProgress color="primary" />
        </Fade>
      </Box>

      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 2 }}>
        <Paper
          elevation={3}
          sx={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 2,
            mb: 3,
          }}
        >
          {isLoading && (
            <Box
              sx={{
                p: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "primary.light",
                color: "primary.contrastText",
              }}
            >
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
              <Typography variant="body2">
                Processing your request, please wait...
              </Typography>
            </Box>
          )}

          <TestInputs
            onRunTest={onRunTest}
            isLoading={isLoading}
            onReset={() => {
              setError(null);
              setIsLoading(false);
            }}
          />
        </Paper>

        {error !== null && (
          <Alert
            variant="filled"
            severity="error"
            sx={{ mt: 2, borderRadius: 1 }}
            onClose={() => setError(null)}
          >
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        <Snackbar
          open={success}
          autoHideDuration={6000}
          onClose={handleCloseSuccess}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
          <Alert
            onClose={handleCloseSuccess}
            severity="success"
            variant="filled"
            sx={{ width: "100%" }}
          >
            <AlertTitle>Success</AlertTitle>
            Gene data processed successfully. Results opening in a new tab.
          </Alert>
        </Snackbar>

        <Box
          sx={{
            textAlign: "center",
            mt: 3,
            mb: 2,
            py: 1,
            borderRadius: 1,
            bgcolor: "rgba(0, 0, 0, 0.03)",
          }}
        >
          <Typography
            variant="body1"
            color="text.primary"
            sx={{ fontWeight: 500 }}
          >
            Powered by{" "}
            <Link
              href="https://annoq.org/"
              target="_blank"
              rel="noopener"
              underline="hover"
              sx={{ fontWeight: 600 }}
            >
              Annoq
            </Link>{" "}
            version 1.11 and{" "}
            <Link
              href="https://pantherdb.org/"
              target="_blank"
              rel="noopener"
              underline="hover"
              sx={{ fontWeight: 600 }}
            >
              PANTHER
            </Link>
            {". "}
            For the data version of individual tools in AnnoQ, please visit:{" "}
            <Link
              href="http://annoq.org/version"
              target="_blank"
              rel="noopener"
              underline="hover"
              sx={{ fontWeight: 600 }}
            >
              annoq.org/version
            </Link>
          </Typography>
        </Box>
      </Container>

      <Footer />
    </Box>
  );
}

export default Home;
