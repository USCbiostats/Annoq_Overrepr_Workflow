import { Link, Paper, Stack, Table, TableBody, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import * as React from 'react';
import { styled } from '@mui/material/styles';
import { useState } from 'react';
import { CorrectionTypes } from '../constants';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';

export type ResultsSecondProps = {
    data: any
}

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: 'rgb(220,220,220)',
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
    },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0,
    },
}));

const ResultsSecond: React.FC<ResultsSecondProps> = ({ data }) => {
    const [isAllDisplayed, setIsAllDisplayed] = useState(false)

    const significantResults = React.useMemo(() => {
        if (!data) {
            return []
        }

        return data.results.result.filter((result: any) => data.results.correction === CorrectionTypes.FDR ? result.fdr < 0.05 : result.pValue < 0.05)
    }, [data])

    const results = isAllDisplayed ? data.results.result : significantResults

    return (
        <Stack spacing={2} style={{ paddingTop: '20px' }}>
            <Typography>
                {isAllDisplayed ? <>Displaying all results</> : <>Displaying only results with {data.results.correction === CorrectionTypes.FDR ? "FDR" : ""} P {"<"} 0.05</>}
                &nbsp;
                &nbsp;
                <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                        setIsAllDisplayed(!isAllDisplayed)
                    }}
                >
                    {isAllDisplayed ? <>Show only results for {data.results.correction === CorrectionTypes.FDR ? "FDR" : ""} P {"<"} 0.05</> : <>Show all results</>}
                </Link>
            </Typography>
            <TableContainer component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <StyledTableCell>
                            </StyledTableCell>
                            <StyledTableCell>{data.results.reference.organism} (REF)</StyledTableCell>
                            <StyledTableCell colSpan={data.results.correction === CorrectionTypes.FDR ? 6 : 5} align='center'>Input List</StyledTableCell>
                        </TableRow>
                        <TableRow>
                            <StyledTableCell></StyledTableCell>
                            <StyledTableCell>#</StyledTableCell>
                            <StyledTableCell>#</StyledTableCell>
                            <StyledTableCell>Expected</StyledTableCell>
                            <StyledTableCell>Fold Enrichment</StyledTableCell>
                            <StyledTableCell>+/-</StyledTableCell>
                            <StyledTableCell>Raw P value</StyledTableCell>
                            {data.results.correction === CorrectionTypes.FDR && <StyledTableCell>FDR</StyledTableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.map((result: any, index: number) => {
                            return (
                                <StyledTableRow key={index}>
                                    <StyledTableCell>{result.term.label}</StyledTableCell>
                                    <StyledTableCell>{result.number_in_reference}</StyledTableCell>
                                    <StyledTableCell>{result.number_in_list}</StyledTableCell>
                                    <StyledTableCell>{result.expected.toFixed(2)}</StyledTableCell>
                                    <StyledTableCell>{result.fold_enrichment < 0.01 ? "< 0.01" : result.fold_enrichment.toFixed(2)}</StyledTableCell>
                                    <StyledTableCell>{result.plus_minus}</StyledTableCell>
                                    <StyledTableCell>{result.pValue.toExponential(2)}</StyledTableCell>
                                    {data.results.correction === CorrectionTypes.FDR && <StyledTableCell>{result.fdr.toExponential(2)}</StyledTableCell>}
                                </StyledTableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Stack>
    )
}


export default ResultsSecond