import { Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import * as React from 'react';

import ResultsSecond from './ResultsSecond';

export type ResultsProps = {
    data: any
}

const Results: React.FC<ResultsProps> = ({ data }) => {

    if (!data) {
        return <Stack style={{ padding: "20px" }}><Typography variant="h6">No data to display.</Typography></Stack>
    }

    return (
        <Stack spacing={2} style={{ padding: '20px' }}>
            <Typography variant='h5'>Results</Typography>
            <TableContainer>
                <Table size="small" style={{ width: '40%' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell></TableCell>
                            <TableCell>Reference list</TableCell>
                            <TableCell>Input list</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell>Uniquely Mapped IDS:</TableCell>
                            {/* TODO: WEIRD OUT OF */}
                            <TableCell>{data.results.reference.mapped_count} out of {data.results.reference.mapped_count}</TableCell>
                            <TableCell>{data.results.input_list.mapped_count} out of {data.results.input_list.mapped_count}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Unmapped IDs:</TableCell>
                            <TableCell>{data.results.reference.unmapped_count}</TableCell>
                            <TableCell>{data.results.input_list.unmapped_count}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>Multiple mapping information:</TableCell>
                            {/* TODO: ADD MULTIPLE MAPPING */}
                            <TableCell>{0}</TableCell>
                            <TableCell>{0}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            <ResultsSecond data={data} />
        </Stack>
    );
}

export default Results;