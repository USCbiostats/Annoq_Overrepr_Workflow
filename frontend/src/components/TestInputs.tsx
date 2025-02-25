import * as React from "react";
import { useState } from "react";
import {
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Collapse,
  Typography,
  Stack,
} from "@mui/material";
import { CorrectionType, InputTypes, TestType, Datasets } from "../constants";
import { process_rsids } from "../utils";
import { UploadFile } from "@mui/icons-material";
import { SAMPLE_VCF_FILE } from "./SampleVCF";
import { SAMPLE_RSID_LIST } from "./SampleRSIDList";

// Use material ui components

export type TestInputsProps = {
  onRunTest: (
    payload: any,
    dataset: string,
    testType: TestType,
    correction: CorrectionType
  ) => void;
  onReset: () => void;
  isLoading: boolean;
};

const TestInputs: React.FC<TestInputsProps> = ({
  onRunTest,
  isLoading,
  onReset,
}) => {
  const [inputType, setInputType] = useState(InputTypes.VCF);

  const [chromosome, setChromosome] = useState("");
  const [startPosition, setStartPosition] = useState("");
  const [endPosition, setEndPosition] = useState("");

  const [rsIds, setRsIds] = useState("");

  const [vcfFile, setVcfFile] = useState("");

  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [testType, setTestType] = useState(TestType.FISCHER);
  const [annotDataSet, setAnnotDataSet] = useState(Datasets[0].value);
  const [correction, setCorrection] = useState(CorrectionType.FDR);

  const query_data = () => {
    const data: Record<string, any> = {};

    if (inputType === InputTypes.CHROMOSOME) {
      data["chr"] = chromosome;
      data["start"] = startPosition;
      data["end"] = endPosition;

      return {
        input_type: inputType,
        chrQuery: data,
      };
    } else if (inputType === InputTypes.VCF) {
      const ids = vcfFile
        .split("\n")
        .map((s) => {
          const line = s.trim().split("\t");
          return line[2];
        })
        .filter((s) => {
          // RdIds are of the form rs1234567
          // Using a simple regex to match the pattern
          return s?.match(/^rs\d+$/);
        });

      data["rsIdList"] = ids;

      return {
        input_type: InputTypes.RSIDS,
        rsIdListQuery: data,
      };
    } else {
      data["rsIdList"] = process_rsids(rsIds);

      return {
        input_type: inputType,
        rsIdListQuery: data,
      };
    }
  };

  const handleRunTest = () => {
    const data = query_data();
    onRunTest(data, annotDataSet, testType, correction);
  };

  const handleReset = () => {
    setInputType(InputTypes.VCF);
    setChromosome("");
    setStartPosition("");
    setEndPosition("");
    setRsIds("");
    setVcfFile("");
    setTestType(TestType.FISCHER);
    setAnnotDataSet(Datasets[0].value);
    setCorrection(CorrectionType.FDR);
    setAdvancedOptions(false);
    onReset();
  };

  const readFileEvent = (
    event: React.ChangeEvent<HTMLInputElement>,
    callback: (text: string) => void
  ) => {
    const reader = new FileReader();

    if (event.target.files && event.target.files.length) {
      const [file] = event.target.files;
      reader.readAsText(file);

      reader.onload = () => {
        callback((reader.result || "").toString());
        setRsIds((reader.result || "").toString());
      };
    }
  };

  return (
    <Stack spacing={2} style={{ padding: "16px" }}>
      <Typography variant="h6">Test Inputs</Typography>

      <form>
        <FormGroup>
          <fieldset
            disabled={isLoading}
            style={{ border: "none", padding: "0px" }}
          >
            <Stack spacing={3}>
              <FormControl component="fieldset" disabled={isLoading}>
                <InputLabel id="type-label">Retrieve SNP Data By</InputLabel>
                <Select
                  style={{ width: "30%" }}
                  labelId="type-label"
                  label="Retrieve SNP Data By"
                  value={inputType}
                  onChange={(e) => {
                    if (e.target.value === InputTypes.RSIDS) {
                      setRsIds("");
                    } else if (e.target.value === InputTypes.CHROMOSOME) {
                      setChromosome("");
                      setStartPosition("");
                      setEndPosition("");
                    } else {
                      setVcfFile("");
                    }

                    setInputType(e.target.value as InputTypes);
                  }}
                >
                  <MenuItem value={InputTypes.VCF}>VCF File</MenuItem>
                  <MenuItem value={InputTypes.CHROMOSOME}>Chromosome</MenuItem>
                  <MenuItem value={InputTypes.RSIDS}>RsIds</MenuItem>
                </Select>
              </FormControl>
              {inputType === InputTypes.CHROMOSOME ? (
                <Stack direction={"row"} spacing={2}>
                  <TextField
                    label="Chromosome"
                    value={chromosome}
                    onChange={(e) => setChromosome(e.target.value)}
                  />
                  <TextField
                    label="Start Position"
                    value={startPosition}
                    onChange={(e) => setStartPosition(e.target.value)}
                  />
                  <TextField
                    label="End Position"
                    value={endPosition}
                    onChange={(e) => setEndPosition(e.target.value)}
                  />
                </Stack>
              ) : inputType === InputTypes.VCF ? (
                <Stack spacing={1}>
                  <TextField
                    label="VCF File"
                    value={vcfFile}
                    onChange={(e) => setVcfFile(e.target.value)}
                    multiline
                    rows={4}
                    placeholder="Enter VCF file content"
                  />
                  <Stack direction={"row"} spacing={2}>
                    <Button variant="outlined" component="label">
                      <UploadFile />
                      Upload VCF File
                      <input
                        accept=".txt"
                        style={{ display: "none" }}
                        type="file"
                        onChange={(event) => {
                          readFileEvent(event, setVcfFile);
                        }}
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => setVcfFile(SAMPLE_VCF_FILE)}
                    >
                      Sample VCF File
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setVcfFile("")}
                    >
                      Clear
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={1}>
                  <TextField
                    label="RsIds"
                    value={rsIds}
                    onChange={(e) => setRsIds(e.target.value)}
                    multiline
                    rows={4}
                    placeholder="Enter rsIds separated by commas, spaces or new lines"
                  />
                  <Stack direction={"row"} spacing={2}>
                    <Button variant="outlined" component="label">
                      <UploadFile />
                      Populate from File
                      <input
                        accept=".txt, .csv, .tsv"
                        style={{ display: "none" }}
                        type="file"
                        onChange={(event) => {
                          readFileEvent(event, setRsIds);
                        }}
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      color="warning"
                      onClick={() => setRsIds(SAMPLE_RSID_LIST)}
                    >
                      Sample rsID List
                    </Button>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setRsIds("")}
                    >
                      Clear
                    </Button>
                  </Stack>
                </Stack>
              )}
              <Stack direction={"row"}>
                <FormControl component={"fieldset"} disabled={isLoading}>
                  <InputLabel id="test-dataset-label">
                    Annotation Data Set
                  </InputLabel>
                  <Select
                    labelId="test-dataset-label"
                    label="Annotation Data Set"
                    value={annotDataSet}
                    onChange={(e) => setAnnotDataSet(e.target.value)}
                  >
                    {Datasets?.map((dataset) => (
                      <MenuItem key={dataset.value} value={dataset.value}>
                        {dataset.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={advancedOptions}
                    onChange={() => setAdvancedOptions(!advancedOptions)}
                  />
                }
                label="See Advanced Options"
              />
              <Collapse in={advancedOptions}>
                <Stack direction={"row"} spacing={2}>
                  <FormControl component={"fieldset"} disabled={isLoading}>
                    <InputLabel id="test-type-label">Test Type</InputLabel>
                    <Select
                      labelId="test-type-label"
                      label="Test Type"
                      value={testType}
                      onChange={(e) => setTestType(e.target.value as TestType)}
                    >
                      <MenuItem value={TestType.FISCHER}>
                        Fisher’s exact
                      </MenuItem>
                      <MenuItem value={TestType.BINOMIAL}>Binomial</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl component={"fieldset"} disabled={isLoading}>
                    <InputLabel id="correction-label">Correction</InputLabel>
                    <Select
                      labelId="correction-label"
                      label="Correction"
                      value={correction}
                      onChange={(e) =>
                        setCorrection(e.target.value as CorrectionType)
                      }
                    >
                      <MenuItem value={CorrectionType.FDR}>
                        Calculate False Discovery Rate
                      </MenuItem>
                      <MenuItem value={CorrectionType.BONFERRONI}>
                        Use the Bonferroni correction for multiple testing
                      </MenuItem>
                      <MenuItem value={CorrectionType.NONE}>
                        No correction
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Collapse>
              <Stack alignItems={"start"} direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleRunTest}
                  disabled={isLoading}
                >
                  Run Test
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  Reset
                </Button>
              </Stack>
            </Stack>
          </fieldset>
        </FormGroup>
      </form>
    </Stack>
  );
};

export default TestInputs;
