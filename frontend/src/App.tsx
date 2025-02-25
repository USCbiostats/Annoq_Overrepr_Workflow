import * as React from "react";
import { useState } from "react";
import TestInputs from "./components/TestInputs";
import TopBar from "./components/TopBar";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { Stack, Typography } from "@mui/material";
import { CorrectionType, TestType } from "./constants";
import { getGeneMappings } from "./apis";

function App() {
  const [data, setData] = useState(undefined as any);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null as string | null);

  const onRunTest = async (
    payload: any,
    dataset: string,
    testType: TestType,
    correction: CorrectionType
  ) => {
    setIsLoading(true);
    setError(null);

    // Retrieve the data from the server
    try {
      const response = await getGeneMappings(payload);

      // Create a new unrendered Form with the action as https://pantherdb.org/webservices/go/overrep.jsp, method as POST and the payload as the input fields
      // Open the form in a new tab
      // Submit the form

      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://pantherdb.org/webservices/go/overrep.jsp";
      form.target = "_blank";

      const correctionField = document.createElement("input");
      correctionField.type = "hidden";
      correctionField.name = "correction";
      correctionField.value = correction;

      const datasetField = document.createElement("input");
      datasetField.type = "hidden";
      datasetField.name = "annotDataSet";
      datasetField.value = dataset;

      const datasetField2 = document.createElement("input");
      datasetField2.type = "hidden";
      datasetField2.name = "type";
      datasetField2.value = dataset;

      const testTypeField = document.createElement("input");
      testTypeField.type = "hidden";
      testTypeField.name = "testType";
      testTypeField.value = testType;

      const speciesField = document.createElement("input");
      speciesField.type = "hidden";
      speciesField.name = "species";
      speciesField.value = "HUMAN";

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
      inputField.name = "input";
      inputField.value = response.join("\n");

      form.appendChild(correctionField);
      form.appendChild(datasetField);
      form.appendChild(datasetField2);
      form.appendChild(testTypeField);
      form.appendChild(speciesField);
      form.appendChild(formatField);
      form.appendChild(resourceField);
      form.appendChild(inputField);

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      setData(response);
    } catch (error: any) {
      setError("Error occurred while fetching data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stack>
      <TopBar />
      <Stack spacing={2}>
        {isLoading && (
          <Stack
            alignItems={"center"}
            spacing={2}
            paddingTop={4}
            position={"absolute"}
            left={"0"}
            right={"0"}
            marginLeft={"auto"}
            marginRight={"auto"}
            zIndex={100}
            height={"100%"}
            style={{ backgroundColor: "rgba(240, 240, 240, 0.75)" }}
            sx={(theme) => ({ color: theme.palette.primary.main })}
          >
            <CircularProgress color="inherit"></CircularProgress>
            <Typography>Fetching Gene Information</Typography>
          </Stack>
        )}
        <TestInputs
          onRunTest={onRunTest}
          isLoading={isLoading}
          onReset={() => {
            setData(undefined);
            setError(null);
            setIsLoading(false);
          }}
        />
        {error !== null && (
          <Alert variant="outlined" severity="error">
            {error}
          </Alert>
        )}
      </Stack>
    </Stack>
  );
}

export default App;
