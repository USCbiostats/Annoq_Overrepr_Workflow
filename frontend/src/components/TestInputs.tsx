import * as React from "react";
import { useState } from "react";
import {
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Collapse,
  Divider,
  Typography,
  Stack,
  Box,
  Tooltip,
} from "@mui/material";
import {
  ALL_GENE_MAPPING_FIELDS,
  CorrectionType,
  GeneMappingField,
  InputTypes,
  TestType,
  Datasets,
} from "../constants";
import { buildSnpListPayload } from "../utils";
import { SAMPLE_VCF_FILE } from "./SampleVCF";
import { SAMPLE_RSID_LIST } from "./SampleRSIDList";
import SnpListInputPanel, { SnpListSample } from "./SnpListInputPanel";
import GeneMappingToolsSelector from "./GeneMappingToolsSelector";
import HelpTip, { TipList } from "./HelpTip";

// Use material ui components

type FormSectionProps = {
  number: number;
  title: string;
  description?: string;
  // Guidance shown in an info tooltip next to the title.
  tip?: React.ReactNode;
  children: React.ReactNode;
};

// A numbered, outlined block that groups related form controls.
const FormSection: React.FC<FormSectionProps> = ({
  number,
  title,
  description,
  tip,
  children,
}) => (
  <Box
    component="section"
    sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2.5 }}
  >
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {number}. {title}
      </Typography>
      {tip && <HelpTip label={`About ${title.toLowerCase()}`}>{tip}</HelpTip>}
    </Stack>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {description}
      </Typography>
    )}
    <Box sx={{ mt: 2 }}>{children}</Box>
  </Box>
);

// 100K-entry reference samples drawn from HRC r1.1, served from public/samples.
const SAMPLE_REFERENCE_VCF: SnpListSample = {
  url: `${import.meta.env.BASE_URL}samples/reference_sample_100K.vcf`,
  fileName: "reference_sample_100K.vcf",
};
const SAMPLE_REFERENCE_RSIDS: SnpListSample = {
  url: `${import.meta.env.BASE_URL}samples/reference_sample_100K_rsids.txt`,
  fileName: "reference_sample_100K_rsids.txt",
};
// One identifier per human gene from a PANTHER gene list export, mixing HGNC
// IDs, UniProt IDs, gene names and gene symbols.
const SAMPLE_REFERENCE_GENES: SnpListSample = {
  url: `${import.meta.env.BASE_URL}samples/reference_sample_genes.txt`,
  fileName: "reference_sample_genes.txt",
};

export type TestInputsProps = {
  onRunTest: (
    payload: any,
    dataset: string,
    testType: TestType,
    correction: CorrectionType,
    // Original VCF text, kept in the browser for the input variant report;
    // null for rsID input.
    inputVcfText: string | null
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
  const [inputText, setInputText] = useState("");
  const [inputMappingFields, setInputMappingFields] = useState<
    GeneMappingField[]
  >(ALL_GENE_MAPPING_FIELDS);

  const [useCustomReference, setUseCustomReference] = useState(false);
  const [refInputType, setRefInputType] = useState(InputTypes.VCF);
  const [refText, setRefText] = useState("");
  const [refSameAsInput, setRefSameAsInput] = useState(true);
  const [refMappingFields, setRefMappingFields] = useState<
    GeneMappingField[]
  >(ALL_GENE_MAPPING_FIELDS);

  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [testType, setTestType] = useState(TestType.FISHER);
  const [annotDataSet, setAnnotDataSet] = useState(Datasets[0].value);
  const [correction, setCorrection] = useState(CorrectionType.FDR);
  const [inputError, setInputError] = useState<string | null>(null);

  const effectiveRefMappingFields = refSameAsInput
    ? inputMappingFields
    : refMappingFields;

  // Gene lists go to PANTHER as they are, so mapping tools do not apply.
  const refIsGeneList = refInputType === InputTypes.GENES;

  const submitDisabled =
    isLoading ||
    !inputText.trim() ||
    inputMappingFields.length === 0 ||
    (useCustomReference &&
      (!refText.trim() ||
        (!refIsGeneList && effectiveRefMappingFields.length === 0)));

  // Explains why Run test is disabled, in the order the form is filled in.
  const runDisabledReason = !inputText.trim()
    ? "Provide an input list first."
    : inputMappingFields.length === 0
    ? "Select at least one SNP to gene mapping tool for the input list."
    : useCustomReference && !refText.trim()
    ? "Provide a custom reference list, or clear \"Use custom reference list\"."
    : "Select at least one SNP to gene mapping tool for the reference list.";

  const query_data = () => {
    const input = buildSnpListPayload(
      inputType,
      inputText,
      inputMappingFields
    );
    const warnings = [input.warning];

    let referenceList = undefined;
    if (useCustomReference) {
      const reference = buildSnpListPayload(
        refInputType,
        refText,
        effectiveRefMappingFields,
        "reference "
      );
      warnings.push(reference.warning);
      referenceList = reference.payload;
    }

    const warningText = warnings.filter(Boolean).join(" ");
    if (warningText) {
      setInputError(warningText);
    }

    return referenceList
      ? { ...input.payload, referenceList }
      : input.payload;
  };

  const handleRunTest = () => {
    setInputError(null);
    try {
      const data = query_data();
      onRunTest(
        data,
        annotDataSet,
        testType,
        correction,
        inputType === InputTypes.VCF ? inputText : null
      );
    } catch (error) {
      setInputError((error as Error).message);
    }
  };

  const handleRefSameAsInputChange = (checked: boolean) => {
    if (!checked) {
      // Start the reference selection from the input list's current selection.
      setRefMappingFields(inputMappingFields);
    }
    setRefSameAsInput(checked);
  };

  const handleReset = () => {
    setInputType(InputTypes.VCF);
    setInputText("");
    setInputMappingFields(ALL_GENE_MAPPING_FIELDS);
    setUseCustomReference(false);
    setRefInputType(InputTypes.VCF);
    setRefText("");
    setRefSameAsInput(true);
    setRefMappingFields(ALL_GENE_MAPPING_FIELDS);
    setTestType(TestType.FISHER);
    setAnnotDataSet(Datasets[0].value);
    setCorrection(CorrectionType.FDR);
    setAdvancedOptions(false);
    setInputError(null);
    onReset();
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ mb: 0.5 }}>
          Prepare your input
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose how you would like to provide SNP data, then pick the
          annotation dataset and statistical settings.
        </Typography>
      </Box>

      <form>
        <FormGroup>
          <fieldset disabled={isLoading} style={{ border: "none", padding: 0 }}>
            <Stack spacing={3}>
              <FormSection
                number={1}
                title="Input list"
                tip={
                  <>
                    Provide the SNPs to analyze as a VCF file or a list of
                    rsIDs. Upload a file, paste the content, or load a sample
                    to try the workflow first.
                  </>
                }
              >
                <SnpListInputPanel
                  idPrefix="input"
                  selectLabel="Retrieve SNP data by"
                  inputType={inputType}
                  onInputTypeChange={setInputType}
                  text={inputText}
                  onTextChange={setInputText}
                  sampleVcf={SAMPLE_VCF_FILE}
                  sampleRsIds={SAMPLE_RSID_LIST}
                  disabled={isLoading}
                />
              </FormSection>

              <FormSection
                number={2}
                title="Annotation data set"
                description="Select an annotation dataset to analyze."
                tip={
                  <>
                    Choose one dataset for the enrichment analysis. SNPWay
                    tests its categories for overrepresentation in the genes
                    mapped from your input list.
                    <TipList
                      items={Datasets.map((dataset) => dataset.name)}
                    />
                  </>
                }
              >
                <FormControl
                  component={"fieldset"}
                  disabled={isLoading}
                  fullWidth
                >
                  <InputLabel id="test-dataset-label">
                    Annotation data set
                  </InputLabel>
                  <Select
                    labelId="test-dataset-label"
                    label="Annotation data set"
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
              </FormSection>

              <Stack direction="row" alignItems="center">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={advancedOptions}
                      onChange={() => setAdvancedOptions(!advancedOptions)}
                    />
                  }
                  label="Show advanced options"
                  sx={{ mr: 0.5 }}
                />
                <HelpTip label="About advanced options">
                  Optional settings. Leave them closed to use the defaults:
                  <TipList
                    items={[
                      "SNP to gene mapping: all available AnnoQ mapping tools",
                      "Reference list: all human genes used by PANTHER",
                      "Statistical test: Fisher's exact test with false discovery rate correction",
                    ]}
                  />
                </HelpTip>
              </Stack>

              <Collapse in={advancedOptions}>
                <Stack spacing={3}>
                  <FormSection
                    number={3}
                    title="SNP to gene mapping annotation tools for input list"
                    description="Choose which annotation tools are used to map the input SNPs to genes."
                    tip={
                      <>
                        By default, all available AnnoQ mapping tools are used.
                        <TipList
                          items={[
                            "At least one mapping tool must remain selected.",
                            "For ANNOVAR, SnpEff, and VEP, select at least one gene model (Ensembl and/or RefSeq). Deselecting both removes that tool.",
                            "PEREGRINE maps SNPs to enhancer-linked genes and has no gene model.",
                            "Gene mappings from all selected tools are combined before the enrichment analysis.",
                          ]}
                        />
                      </>
                    }
                  >
                    <GeneMappingToolsSelector
                      title="Selected"
                      value={inputMappingFields}
                      onChange={setInputMappingFields}
                      disabled={isLoading}
                      collapsible={false}
                    />
                  </FormSection>

                  <FormSection
                    number={4}
                    title="Reference list"
                    description="By default PANTHER uses all human genes as the reference list. Provide the background SNPs (for example, all genotyped SNPs) to use their genes instead."
                    tip={
                      <>
                        A custom reference is appropriate when the variants that
                        could have been observed are restricted, such as the
                        SNPs on a genotyping array. Select &quot;Use custom
                        reference list&quot;, then provide either:
                        <TipList
                          items={[
                            "A background SNP list as a VCF file or rsID list",
                            "A background gene list, preferably using UniProt identifiers",
                          ]}
                        />
                      </>
                    }
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={useCustomReference}
                          onChange={(e) =>
                            setUseCustomReference(e.target.checked)
                          }
                        />
                      }
                      label="Use custom reference list"
                    />

                    <Collapse in={useCustomReference} unmountOnExit>
                      <Stack spacing={3} sx={{ mt: 2 }}>
                        <SnpListInputPanel
                          idPrefix="reference"
                          selectLabel="Reference list type"
                          inputType={refInputType}
                          onInputTypeChange={setRefInputType}
                          text={refText}
                          onTextChange={setRefText}
                          sampleVcf={SAMPLE_REFERENCE_VCF}
                          sampleRsIds={SAMPLE_REFERENCE_RSIDS}
                          sampleGenes={SAMPLE_REFERENCE_GENES}
                          allowGeneList
                          disabled={isLoading}
                        />
                        <Divider />
                        {refIsGeneList ? (
                          <Typography variant="body2" color="text.secondary">
                            Gene lists are sent to PANTHER as the reference
                            list as they are, so SNP to gene mapping tools do
                            not apply. Use gene IDs PANTHER recognizes, such as
                            gene symbols or Ensembl IDs.
                          </Typography>
                        ) : (
                          <GeneMappingToolsSelector
                            title="SNP to gene mapping annotation tools for reference list"
                            value={effectiveRefMappingFields}
                            onChange={setRefMappingFields}
                            disabled={isLoading}
                            collapsible={false}
                            sameAsInput={{
                              checked: refSameAsInput,
                              onChange: handleRefSameAsInputChange,
                            }}
                          />
                        )}
                      </Stack>
                    </Collapse>
                  </FormSection>

                  <FormSection
                    number={5}
                    title="Statistical test"
                    tip={
                      <>
                        The default is Fisher&apos;s exact test with false
                        discovery rate correction.
                        <TipList
                          items={[
                            "Test type: Fisher's exact or binomial",
                            "Correction for multiple testing: false discovery rate, Bonferroni, or none",
                          ]}
                        />
                      </>
                    }
                  >
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <FormControl
                        component={"fieldset"}
                        disabled={isLoading}
                        fullWidth
                      >
                        <InputLabel id="test-type-label">Test type</InputLabel>
                        <Select
                          labelId="test-type-label"
                          label="Test type"
                          value={testType}
                          onChange={(e) =>
                            setTestType(e.target.value as TestType)
                          }
                        >
                          <MenuItem value={TestType.FISHER}>
                            Fisher’s exact
                          </MenuItem>
                          <MenuItem value={TestType.BINOMIAL}>Binomial</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl
                        component={"fieldset"}
                        disabled={isLoading}
                        fullWidth
                      >
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
                            Calculate false discovery rate
                          </MenuItem>
                          <MenuItem value={CorrectionType.BONFERRONI}>
                            Use the Bonferroni correction for multiple testing
                          </MenuItem>
                          <MenuItem value={CorrectionType.NONE}>
                            No correction
                          </MenuItem>
                        </Select>
                        {correction === CorrectionType.NONE && (
                          <FormHelperText>
                            P-values will not be corrected for multiple
                            testing. The results page and downloads will say
                            so.
                          </FormHelperText>
                        )}
                      </FormControl>
                    </Stack>
                  </FormSection>
                </Stack>
              </Collapse>

              <Typography variant="body2" color="text.secondary">
                SNPWay is intended for predefined variant lists (lead SNPs,
                curated panels, credible sets) on GRCh37/hg19. For GWAS-derived
                inputs, provide LD-pruned or otherwise independent variants;
                correlated variants can give individual loci disproportionate
                weight in the enrichment test.
              </Typography>

              <Stack alignItems={"start"} direction="row" spacing={2}>
                <Tooltip
                  arrow
                  title={
                    submitDisabled && !isLoading
                      ? runDisabledReason
                      : "Start the enrichment analysis. Processing time depends on the size of the input and the selected options."
                  }
                >
                  {/* A span so the tooltip still works while the button is disabled. */}
                  <span>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleRunTest}
                      disabled={submitDisabled}
                    >
                      Run test
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  variant="text"
                  color="secondary"
                  onClick={handleReset}
                  disabled={isLoading}
                >
                  Reset
                </Button>
              </Stack>

              {inputError && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  {inputError}
                </Alert>
              )}
            </Stack>
          </fieldset>
        </FormGroup>
      </form>
    </Stack>
  );
};

export default TestInputs;
