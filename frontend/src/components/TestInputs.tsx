import * as React from 'react';
import { useState } from 'react';
import { Button, TextField, Select, MenuItem, FormControl, InputLabel, FormGroup, FormControlLabel, Checkbox, Collapse, Accordion, Typography, AccordionSummary, AccordionDetails, AccordionActions, Stack } from '@mui/material';
import { CorrectionTypes, InputTypes, TestTypes } from '../constants';
import { process_rsids } from '../utils';
import { UploadFile } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Dataset, Organism } from '../models';


// Use material ui components

export type TestInputsProps = {
    onRunTest: (data: any) => void
    onReset: () => void
    isLoading: boolean
    orgs: Organism[] | null
    datasets: Dataset[] | null
}


const TestInputs: React.FC<TestInputsProps> = ({ onRunTest, isLoading, onReset, orgs, datasets }) => {

    const [inputType, setInputType] = useState(InputTypes.VCF);

    const [chromosome, setChromosome] = useState('');
    const [startPosition, setStartPosition] = useState('');
    const [endPosition, setEndPosition] = useState('');

    const [rsIds, setRsIds] = useState('');

    const [vcfFile, setVcfFile] = useState('');

    const [advancedOptions, setAdvancedOptions] = useState(false);
    const [testType, setTestType] = useState(TestTypes.FISCHER);
    const [organism, setOrganism] = useState('9606');
    const [annotDataSet, setAnnotDataSet] = useState('GO:0008150');
    const [correction, setCorrection] = useState(CorrectionTypes.FDR);


    const [isExpanded, setIsExpanded] = useState(true);

    const query_data = () => {
        const data: Record<string, any> = {}

        if (inputType === InputTypes.CHROMOSOME) {
            data['chr'] = chromosome
            data['start'] = startPosition
            data['end'] = endPosition

            return {
                input_type: inputType,
                chrQuery: data
            }
        }
        else if (inputType === InputTypes.VCF) {
            const ids = vcfFile.split("\n").map((s) => {
                const line = s.trim().split('\t');
                return line[2];
            }).filter((s) => {
                // RdIds are of the form rs1234567
                // Using a simple regex to match the pattern
                return s?.match(/^rs\d+$/);
            });

            data['rsIdList'] = ids

            return {
                input_type: InputTypes.RSIDS,
                rsIdListQuery: data
            }
        }
        else {
            data['rsIdList'] = process_rsids(rsIds)

            return {
                input_type: inputType,
                rsIdListQuery: data
            }
        }
    }

    const handleRunTest = () => {
        const data = {
            organism,
            annotDataSet,
            correction,
            enrichmentTestType: testType,
            ...query_data()
        };
        onRunTest(data);
        setIsExpanded(false)
    };

    const handleReset = () => {
        setInputType(InputTypes.RSIDS);
        setChromosome('');
        setStartPosition('');
        setEndPosition('');
        setRsIds('');
        setVcfFile('');
        setTestType(TestTypes.FISCHER);
        setOrganism('9606');
        setAnnotDataSet('GO:0008150');
        setCorrection(CorrectionTypes.FDR);
        setAdvancedOptions(false);
        onReset();
    };

    const readFileEvent = (event: React.ChangeEvent<HTMLInputElement>, callback: (text: string) => void) => {
        const reader = new FileReader();

        if (event.target.files && event.target.files.length) {
            const [file] = event.target.files;
            reader.readAsText(file);

            reader.onload = () => {
                callback((reader.result || '').toString());
                setRsIds((reader.result || '').toString());
            };
        }
    }



    return (
        <Accordion expanded={isExpanded} onChange={() => setIsExpanded(!isExpanded)}>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
            >
                <Typography variant="h6">Test Inputs</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <form>
                    <FormGroup>
                        <fieldset disabled={isLoading} style={{ border: "none" }}>
                            <Stack spacing={1}>
                                <FormControl component="fieldset" disabled={isLoading}>
                                    <InputLabel id="type-label">Retrieve SNP Data By</InputLabel>
                                    <Select
                                        style={{ width: '30%', }}
                                        labelId='type-label'
                                        label="Retrieve SNP Data By"
                                        value={inputType}
                                        onChange={(e) => {
                                            if (e.target.value === InputTypes.RSIDS) {
                                                setRsIds('');
                                            } else if (e.target.value === InputTypes.CHROMOSOME) {
                                                setChromosome('');
                                                setStartPosition('');
                                                setEndPosition('');
                                            } else {
                                                setVcfFile('');
                                            }

                                            setInputType(e.target.value);
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

                                    <>
                                        <TextField
                                            label="VCF File"
                                            value={vcfFile}
                                            onChange={(e) => setVcfFile(e.target.value)}
                                            multiline
                                            rows={4}
                                            placeholder='Enter VCF file content'
                                        />
                                        <Stack direction={"row"} spacing={2}>
                                            <Button variant="outlined" component="label">
                                                <UploadFile />
                                                Upload VCF File
                                                <input
                                                    accept=".txt"
                                                    style={{ display: 'none' }}
                                                    type="file"
                                                    onChange={(event) => {
                                                        readFileEvent(event, setVcfFile);
                                                    }}
                                                />
                                            </Button>
                                            <Button variant="outlined" color="secondary" onClick={() => setVcfFile('')}>
                                                Clear
                                            </Button>
                                        </Stack>
                                    </>

                                ) : (
                                    <>
                                        <TextField
                                            label="RsIds"
                                            value={rsIds}
                                            onChange={(e) => setRsIds(e.target.value)}
                                            multiline
                                            rows={4}
                                            placeholder='Enter rsIds separated by commas, spaces or new lines'
                                        />
                                        <Stack direction={"row"} spacing={2}>
                                            <Button variant="outlined" component="label">
                                                <UploadFile />
                                                Populate from File
                                                <input
                                                    accept=".txt, .csv, .tsv"
                                                    style={{ display: 'none' }}
                                                    type="file"
                                                    onChange={(event) => {
                                                        readFileEvent(event, setRsIds);
                                                    }}
                                                />
                                            </Button>
                                            <Button variant="outlined" color="secondary" onClick={() => setRsIds('')}>
                                                Clear
                                            </Button>
                                        </Stack>
                                    </>
                                )}
                                <FormControlLabel
                                    control={<Checkbox checked={advancedOptions} onChange={() => setAdvancedOptions(!advancedOptions)} />}
                                    label="See Advanced Options"
                                />
                                <Collapse in={advancedOptions}>
                                    <Stack direction={"row"} spacing={2}>
                                        <FormControl component={"fieldset"} disabled={isLoading}>
                                            <InputLabel id="test-type-label">Test Type</InputLabel>
                                            <Select
                                                labelId='test-type-label'
                                                label="Test Type"
                                                value={testType}
                                                onChange={(e) => setTestType(e.target.value)}
                                            >
                                                <MenuItem value={TestTypes.FISCHER}>Fischer</MenuItem>
                                                <MenuItem value={TestTypes.BINOMIAL}>Binomial</MenuItem>
                                            </Select>
                                        </FormControl>
                                        {
                                            orgs?.length ? (
                                                <FormControl component={"fieldset"} disabled={isLoading}>
                                                    <Select
                                                        labelId='test-organism-label'
                                                        label="Organism"
                                                        value={organism}
                                                        onChange={(e) => setTestType(e.target.value)}
                                                    >
                                                        {orgs.map((org) => (
                                                            <MenuItem key={org.taxon_id} value={org.taxon_id}>{org.name}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            ) : (
                                                <TextField
                                                    label="Organism"
                                                    value={organism}
                                                    onChange={(e) => setOrganism(e.target.value)} />
                                            )
                                        }
                                        {
                                            datasets?.length ? (
                                                <FormControl component={"fieldset"} disabled={isLoading}>
                                                    <Select
                                                        labelId='test-dataset-label'
                                                        label="Dataset"
                                                        value={annotDataSet}
                                                        onChange={(e) => setAnnotDataSet(e.target.value)}
                                                    >
                                                        {datasets.map((dataset) => (
                                                            <MenuItem key={dataset.id} value={dataset.id}>{dataset.label}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            ) : (
                                                <TextField
                                                    label="Annotation Dataset"
                                                    value={annotDataSet}
                                                    onChange={(e) => setAnnotDataSet(e.target.value)} />
                                            )
                                        }
                                        <FormControl component={"fieldset"} disabled={isLoading}>
                                            <InputLabel id="correction-label">Correction</InputLabel>
                                            <Select
                                                labelId='correction-label'
                                                label="Correction"
                                                value={correction}
                                                onChange={(e) => setCorrection(e.target.value)}
                                            >
                                                <MenuItem value={CorrectionTypes.BONFERRONI}>Bonferroni</MenuItem>
                                                <MenuItem value={CorrectionTypes.FDR}>FDR</MenuItem>
                                                <MenuItem value={CorrectionTypes.NONE}>None</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Stack>
                                </Collapse>
                                <Stack alignItems={'start'} direction="row" spacing={2}>
                                    <Button variant="contained" color="primary" onClick={handleRunTest} disabled={isLoading}>
                                        Run Test
                                    </Button>
                                    <Button variant="outlined" color="secondary" onClick={handleReset} disabled={isLoading}>
                                        Reset
                                    </Button>
                                </Stack>
                            </Stack>
                        </fieldset>
                    </FormGroup>
                </form>
            </AccordionDetails>
        </Accordion>
    );
};

export default TestInputs;