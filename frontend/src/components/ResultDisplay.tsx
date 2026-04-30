import React, { useMemo, useState } from "react";
import {
  Alert,
  Typography,
  Paper,
  Box,
  Button,
  Tooltip,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import DownloadIcon from "@mui/icons-material/Download";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { TableVirtuoso, TableComponents } from "react-virtuoso";
import {
  OverrepresentationResultItem,
  WorkflowOverrepresentationResponse,
} from "../models";
import { CorrectionType, Datasets, InputTypes } from "../constants";
import { createResultsTableData } from "./utils";

interface ResultDisplayProps {
  workflowResponse: WorkflowOverrepresentationResponse | null;
  resetAnalysis: () => void;
  submitToPanther: () => void;
  annotationDataset: string;
  correctionType: CorrectionType;
  inputTypeUsed: InputTypes | null;
}

interface ColumnData {
  dataKey: keyof OverrepresentationResultItem;
  label: string;
  numeric?: boolean;
  width?: number;
}

type SortDirection = "asc" | "desc";
type CsvRowValue = string | number | string[];
type CsvRow = Record<string, CsvRowValue>;

const filterRowsByGenes = (rows: CsvRow[], genesToInclude: string[]): CsvRow[] => {
  const normalizedGenes = new Set(
    genesToInclude.map((gene) => gene.trim()).filter((gene) => gene.length > 0)
  );

  if (normalizedGenes.size === 0) {
    return [];
  }

  return rows.filter((row) => {
    const mappedGenes = row.mappedGenes;
    if (!Array.isArray(mappedGenes)) {
      return false;
    }

    return mappedGenes.some((gene) => normalizedGenes.has(String(gene).trim()));
  });
};

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  workflowResponse,
  annotationDataset,
  correctionType,
  resetAnalysis,
  submitToPanther,
  inputTypeUsed,
}) => {
  const [showAllResults, setShowAllResults] = useState(false);
  const [sortBy, setSortBy] = useState<keyof OverrepresentationResultItem>(
    "process"
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [downloadMenuAnchor, setDownloadMenuAnchor] =
    useState<null | HTMLElement>(null);
  const isDownloadMenuOpen = Boolean(downloadMenuAnchor);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const [downloadAllColumns, setDownloadAllColumns] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const tableData = useMemo(
    () => workflowResponse?.overrepresentation_results || [],
    [workflowResponse]
  );

  const significantData = useMemo(() => {
    if (!workflowResponse) {
      return [];
    }

    return tableData.filter((row) => {
      if (correctionType === CorrectionType.FDR) {
        return row.fdr !== null && row.fdr < 0.05;
      }

      return row.pValue !== null && row.pValue < 0.05;
    });
  }, [workflowResponse, tableData, correctionType]);

  const getDatasetTerms = (datasetValue: string) => {
    const dataset = Datasets.find((d) => d.value === datasetValue);

    if (!dataset) return { singular: "term", plural: "terms" };

    const name = dataset.name.toLowerCase();

    if (name.includes("biological process")) {
      return { singular: "biological process", plural: "biological processes" };
    }
    if (name.includes("molecular function")) {
      return { singular: "molecular function", plural: "molecular functions" };
    }
    if (name.includes("cellular component")) {
      return { singular: "cellular component", plural: "cellular components" };
    }
    if (name.includes("pathway")) {
      return { singular: "pathway", plural: "pathways" };
    }
    if (name.includes("protein class")) {
      return { singular: "protein class", plural: "protein classes" };
    }
    return { singular: "term", plural: "terms" };
  };

  const { singular: datasetTerm, plural: datasetTermsPlural } =
    getDatasetTerms(annotationDataset);

  const sortData = (
    data: OverrepresentationResultItem[],
    sortKey: keyof OverrepresentationResultItem,
    direction: SortDirection
  ) => {
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return direction === "asc"
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
  };

  const handleRequestSort = (property: keyof OverrepresentationResultItem) => {
    const isAsc = sortBy === property && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortBy(property);
  };

  const displayData = useMemo(() => {
    const dataToSort = showAllResults ? tableData : significantData;
    return sortData(dataToSort, sortBy, sortDirection);
  }, [showAllResults, tableData, significantData, sortBy, sortDirection]);

  const allMappingRows = useMemo(() => {
    if (!workflowResponse) {
      return [];
    }

    return createResultsTableData(
      workflowResponse,
      undefined,
      downloadAllColumns ? undefined : annotationDataset
    ) as unknown as CsvRow[];
  }, [workflowResponse, annotationDataset, downloadAllColumns]);

  const significantPantherIds = useMemo(() => {
    if (!workflowResponse) {
      return [];
    }

    const genes = new Set<string>();

    for (const row of significantData) {
      for (const gene of row.mapped_ids) {
        const normalizedGene = gene.trim();
        if (normalizedGene.length > 0) {
          genes.add(normalizedGene);
        }
      }
    }

    const pantherIds = new Set<string>();
    for (const gene of genes) {
      const relatedPantherIds = workflowResponse.gene_panther_mapping[gene] || [];
      for (const pantherId of relatedPantherIds) {
        const normalizedPantherId = pantherId.trim();
        if (normalizedPantherId.length > 0) {
          pantherIds.add(normalizedPantherId);
        }
      }
    }

    return Array.from(pantherIds);
  }, [workflowResponse, significantData]);

  const significantMappingRows = useMemo(() => {
    if (!workflowResponse) {
      return [];
    }

    return createResultsTableData(
      workflowResponse,
      significantPantherIds,
      downloadAllColumns ? undefined : annotationDataset
    ) as unknown as CsvRow[];
  }, [workflowResponse, significantPantherIds, annotationDataset, downloadAllColumns]);

  const downloadRowsAsCSV = (rows: CsvRow[], fileTitle?: string) => {
    if (rows.length === 0) {
      setDownloadMessage(
        "No rows matched this download selection. Try changing filters or download options."
      );
      return;
    }

    setDownloadMessage(null);

    const headers = Object.keys(rows[0] || {});
    const csvHeaders = [...headers];

    if (inputTypeUsed === InputTypes.VCF && csvHeaders[0] === "rsId") {
      csvHeaders[0] = "chr:pos";
    }

    const csvRows = [
      csvHeaders.join(","),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (Array.isArray(value)) {
              return `"${value.join(";").replace(/"/g, '""')}"`;
            }
            if (typeof value === "string") {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      fileTitle ? fileTitle : "gene_mapping_results.csv"
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCSV = (fileTitle?: string, genesToInclude?: string[]) => {
    const allRows = allMappingRows;

    if (!genesToInclude || genesToInclude.length === 0) {
      downloadRowsAsCSV(allRows, fileTitle);
      return;
    }

    const filteredRows = filterRowsByGenes(allRows, genesToInclude);
    downloadRowsAsCSV(filteredRows, fileTitle);
  };

  const handleOpenDownloadMenu = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleCloseDownloadMenu = () => {
    setDownloadMenuAnchor(null);
  };

  const handleDownloadAll = () => {
    handleDownloadCSV();
    handleCloseDownloadMenu();
  };

  const handleDownloadSignificant = () => {
    const significantRows = significantMappingRows;

    if (significantRows.length === 0) {
      setDownloadMessage(
        "No significant categories are available for download with the current settings."
      );
      handleCloseDownloadMenu();
      return;
    }

    downloadRowsAsCSV(significantRows, "significant_gene_mappings.csv");
    handleCloseDownloadMenu();
  };

  const correctionLabel =
    correctionType === CorrectionType.BONFERRONI
      ? "Bonferroni"
      : correctionType === CorrectionType.FDR
      ? "FDR"
      : "No";

  const columns: ColumnData[] = [
    {
      width: 300,
      label:
        Datasets.find((dataset) => dataset.value === annotationDataset)?.name ||
        annotationDataset,
      dataKey: "process",
    },
    {
      width: 80,
      label: "#",
      dataKey: "refCount",
      numeric: true,
    },
    {
      width: 80,
      label: "#",
      dataKey: "uploadCount",
      numeric: true,
    },
    {
      width: 100,
      label: "expected",
      dataKey: "expected",
      numeric: true,
    },
    {
      width: 120,
      label: "Fold Enrichment",
      dataKey: "foldEnrichment",
      numeric: true,
    },
    {
      width: 60,
      label: "+/-",
      dataKey: "overUnder",
    },
    {
      width: 100,
      label:
        correctionType === CorrectionType.BONFERRONI
          ? "P Value"
          : "raw P value",
      dataKey: "pValue",
      numeric: true,
    },
  ];

  if (correctionType === CorrectionType.FDR) {
    columns.push({
      width: 100,
      label: "FDR",
      dataKey: "fdr",
      numeric: true,
    });
  }

  const VirtuosoTableComponents: TableComponents<OverrepresentationResultItem> = {
    Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
      <TableContainer component={Paper} {...props} ref={ref} />
    )),
    Table: (props) => (
      <Table
        {...props}
        sx={{ borderCollapse: "separate", tableLayout: "fixed" }}
      />
    ),
    TableHead: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
      <TableHead {...props} ref={ref} />
    )),
    TableRow,
    TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => (
      <TableBody {...props} ref={ref} />
    )),
  };

  const fixedHeaderContent = () => {
    return (
      <>
        <TableRow>
          <TableCell sx={{ width: 300 }}></TableCell>
          <TableCell
            colSpan={1}
            align="center"
            sx={{ borderLeft: "1px solid rgba(224, 224, 224, 1)" }}
          >
            <Typography variant="body2" fontWeight="bold">
              Homo sapiens (REF)
            </Typography>
          </TableCell>
          <TableCell
            colSpan={columns.length === 8 ? 6 : 5}
            align="center"
            sx={{ borderLeft: "1px solid rgba(224, 224, 224, 1)" }}
          >
            <Typography variant="body2" fontWeight="bold">
              Input List
            </Typography>
          </TableCell>
        </TableRow>

        <TableRow>
          {columns.map((column, index) => (
            <TableCell
              key={column.dataKey}
              variant="head"
              align={index === 0 ? "left" : "center"}
              style={{ width: column.width }}
              sx={{ backgroundColor: "#f5f5f5" }}
              onClick={() => handleRequestSort(column.dataKey)}
            >
              <TableSortLabel
                active={sortBy === column.dataKey}
                direction={sortBy === column.dataKey ? sortDirection : "asc"}
                hideSortIcon={false}
              >
                <Typography variant="body2" fontWeight="bold">
                  {column.label}
                </Typography>
              </TableSortLabel>
            </TableCell>
          ))}
        </TableRow>
      </>
    );
  };

  const rowContent = (_index: number, row: OverrepresentationResultItem) => {
    return (
      <>
        {columns.map((column, index) => {
          let content: React.ReactNode = row[column.dataKey];

          if (
            column.dataKey === "expected" ||
            column.dataKey === "foldEnrichment"
          ) {
            const value = row[column.dataKey];
            content = value == null ? "—" : value.toFixed(2);
          } else if (column.dataKey === "pValue" || column.dataKey === "fdr") {
            const value = row[column.dataKey];
            content = value == null ? "—" : value.toExponential(2);
          }

          if (column.dataKey === "uploadCount") {
            return (
              <TableCell
                key={column.dataKey}
                align="center"
                onClick={() => {
                  if (row.mapped_ids && row.mapped_ids.length > 0) {
                    handleDownloadCSV(`${row.process}_gene_mappings.csv`, row.mapped_ids);
                  }
                }}
                sx={{
                  cursor: "pointer",
                  color: "primary.main",
                  "&:hover": {
                    textDecoration: "underline",
                    fontWeight: "bold",
                  },
                }}
              >
                <Tooltip title="Click to download mappings for this process">
                  {content as any}
                </Tooltip>
              </TableCell>
            );
          }

          return (
            <TableCell
              key={column.dataKey}
              align={index === 0 ? "left" : "center"}
              sx={
                column.dataKey === "overUnder"
                  ? {
                      color: row.overUnder === "+" ? "green" : "red",
                      fontWeight: "bold",
                    }
                  : {}
              }
            >
              {content}
            </TableCell>
          );
        })}
      </>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 3, md: 4 },
        mb: 3,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5">Results</Typography>
          <Typography variant="body2" color="text.secondary">
            {Datasets.find((dataset) => dataset.value === annotationDataset)
              ?.name || annotationDataset}
            {" | "}
            {correctionLabel} correction
          </Typography>
        </Box>
        <Box>
          <Button
            variant="text"
            color="secondary"
            onClick={resetAnalysis}
            sx={{ mr: 1 }}
          >
            Back to input
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={handleOpenDownloadMenu}
            disabled={!workflowResponse}
            startIcon={<DownloadIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{ mr: 1 }}
          >
            Download
          </Button>

          <Button variant="contained" color="primary" onClick={submitToPanther}>
            View full results in PANTHER
          </Button>
        </Box>
      </Box>

      {downloadMessage && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          onClose={() => setDownloadMessage(null)}
        >
          {downloadMessage}
        </Alert>
      )}

      <Box
        sx={{
          mb: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            "&:hover": { color: "primary.main" },
          }}
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
        >
          {showAdvancedOptions ? "▼" : "►"} Advanced download options
        </Typography>

        {showAdvancedOptions && (
          <Box
            sx={{
              mt: 1,
              ml: 2,
              display: "flex",
              alignItems: "center",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={downloadAllColumns}
                  onChange={(e) => setDownloadAllColumns(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary">
                    Include all gene information columns in downloads
                  </Typography>
                  <Tooltip title="When enabled, all available gene annotation data will be included in download files, not just data from the selected dataset">
                    <InfoIcon
                      fontSize="small"
                      sx={{ ml: 0.5, fontSize: "0.875rem", color: "info.main" }}
                    />
                  </Tooltip>
                </Box>
              }
            />
          </Box>
        )}
      </Box>

      <Menu
        anchorEl={downloadMenuAnchor}
        open={isDownloadMenuOpen}
        onClose={handleCloseDownloadMenu}
      >
        <MenuItem onClick={handleDownloadAll}>
          <Typography variant="body2">All Mappings</Typography>
        </MenuItem>
        <MenuItem onClick={handleDownloadSignificant}>
          <Typography variant="body2">
            Only Significant Mappings ({significantData.length} {datasetTermsPlural})
          </Typography>
        </MenuItem>
      </Menu>

      {tableData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
              {showAllResults
                ? "Showing All Results"
                : correctionType === CorrectionType.FDR
                ? "Showing only results with FDR P < 0.05"
                : correctionType === CorrectionType.BONFERRONI
                ? "Showing only results with Bonferroni-corrected for P < 0.05"
                : "Showing only results with P value < 0.05"}
            </Typography>
            <Typography
              variant="body2"
              fontWeight="medium"
              color="primary"
              sx={{ mr: 2 }}
            >
              ({displayData.length} of {tableData.length} results)
            </Typography>
            <Button
              onClick={() => setShowAllResults(!showAllResults)}
              sx={{
                textTransform: "none",
                minWidth: "auto",
                padding: "2px 8px",
                fontSize: "0.875rem",
                fontWeight: "medium",
              }}
              color="primary"
            >
              {showAllResults ? "Show Significant Only" : "Click here to show all"}
            </Button>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
            <InfoIcon fontSize="small" color="info" sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              You can click on any number in the "#" column under "Input List"
              to download gene mappings specific to that {datasetTerm}.
            </Typography>
          </Box>

          <Paper sx={{ height: 500, width: "100%" }}>
            <TableVirtuoso
              data={displayData}
              components={VirtuosoTableComponents}
              fixedHeaderContent={fixedHeaderContent}
              itemContent={rowContent}
            />
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default ResultDisplay;
