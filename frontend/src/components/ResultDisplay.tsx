import React, { useMemo, useState } from "react";
import {
  Alert,
  CircularProgress,
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
  GeneMappingDownloadData,
  GeneMappingResponse,
  PantherGeneInfoResponse,
} from "../models";
import { createResultsTableData } from "../components/utils";
import { CorrectionType, Datasets } from "../constants";
import { getPantherGeneInfo } from "../apis";

interface ResultDisplayProps {
  response: GeneMappingResponse | null;
  overrepresentationResult: any;
  resetAnalysis: () => void;
  submitToPanther: () => void;
  annotationDataset: string;
  correctionType: CorrectionType;
}

// Define the structure of overrepresentation result items
interface OverrepResultItem {
  process: string;
  refCount: number;
  uploadCount: number;
  expected: number;
  foldEnrichment: number;
  overUnder: string;
  pValue: number;
  fdr: number;
  mapped_panther_ids: string[];
}

// Define column data structure
interface ColumnData {
  dataKey: keyof OverrepResultItem;
  label: string;
  numeric?: boolean;
  width?: number;
}

// Add type for sort direction
type SortDirection = "asc" | "desc";

const ResultDisplay: React.FC<ResultDisplayProps> = ({
  response,
  overrepresentationResult,
  annotationDataset,
  correctionType,
  resetAnalysis,
  submitToPanther,
}) => {
  // Add state to track whether to show all results
  const [showAllResults, setShowAllResults] = useState(false);

  // Add sort states
  const [sortBy, setSortBy] = useState<keyof OverrepResultItem>("process");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Add state for the download menu
  const [downloadMenuAnchor, setDownloadMenuAnchor] =
    useState<null | HTMLElement>(null);
  const isDownloadMenuOpen = Boolean(downloadMenuAnchor);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [isPreparingDownload, setIsPreparingDownload] = useState(false);
  const [pantherGeneInfoResponse, setPantherGeneInfoResponse] =
    useState<PantherGeneInfoResponse | null>(null);

  // Add state for download all columns option
  const [downloadAllColumns, setDownloadAllColumns] = useState(false);
  // Add state for showing/hiding advanced options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // Helper function to get appropriate term based on annotation dataset
  const getDatasetTerms = (datasetValue: string) => {
    const dataset = Datasets.find((d) => d.value === datasetValue);

    if (!dataset) return { singular: "term", plural: "terms" };

    const name = dataset.name.toLowerCase();

    if (name.includes("biological process")) {
      return { singular: "biological process", plural: "biological processes" };
    } else if (name.includes("molecular function")) {
      return { singular: "molecular function", plural: "molecular functions" };
    } else if (name.includes("cellular component")) {
      return { singular: "cellular component", plural: "cellular components" };
    } else if (name.includes("pathway")) {
      return { singular: "pathway", plural: "pathways" };
    } else if (name.includes("protein class")) {
      return { singular: "protein class", plural: "protein classes" };
    } else {
      return { singular: "term", plural: "terms" };
    }
  };

  // Get the appropriate term for the current dataset
  const { singular: datasetTerm, plural: datasetTermsPlural } =
    getDatasetTerms(annotationDataset);

  // Parse overrepresentation results
  const { tableData, filteredData } = useMemo(() => {
    if (!overrepresentationResult || !overrepresentationResult.results)
      return { tableData: [], filteredData: [] };

    // Extract the reference and input list info
    const { result } = overrepresentationResult.results;

    // Check if we have valid result data
    if (!result || !Array.isArray(result))
      return { tableData: [], filteredData: [] };

    // Extract the biological processes and their data from the API response
    const allData = result
      .filter((item) => item && typeof item === "object")
      .map((item, index) => {
        let processName = "";
        if (!item.term || !item.term.label) {
          processName = `Process ${index + 1}`;
        } else {
          processName = item.term.label;
        }

        return {
          process: processName,
          refCount: item.number_in_reference || 0,
          uploadCount: item.number_in_list || 0,
          expected:
            typeof item.expected === "number" ? +item.expected.toFixed(2) : 0,
          foldEnrichment:
            typeof item.fold_enrichment === "number"
              ? +item.fold_enrichment.toFixed(2)
              : 0,
          overUnder: item.plus_minus || "+",
          pValue:
            typeof item.pValue === "number" ? +item.pValue.toExponential(2) : 0,
          fdr: typeof item.fdr === "number" ? +item.fdr.toExponential(2) : 0,
          mapped_panther_ids:
            item.input_list?.mapped_panther_ids?.split(",") || [],
        };
      });

    // Filter the data based on correction type
    const filteredResults = allData.filter((item) => {
      if (correctionType === CorrectionType.FDR) {
        return item.fdr < 0.05;
      } else {
        return item.pValue < 0.05;
      }
    });

    return {
      tableData: allData,
      filteredData: filteredResults,
    };
  }, [overrepresentationResult, correctionType]);

  // Sort function for the data
  const sortData = (
    data: OverrepResultItem[],
    sortKey: keyof OverrepResultItem,
    direction: SortDirection
  ) => {
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      // Handle different data types
      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        // For numeric values
        return direction === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });
  };

  // Handle sort request
  const handleRequestSort = (property: keyof OverrepResultItem) => {
    const isAsc = sortBy === property && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortBy(property);
  };

  // Determine which data to display based on the showAllResults state and apply sorting
  const displayData = useMemo(() => {
    const dataToSort = showAllResults ? tableData : filteredData;
    return sortData(dataToSort, sortBy, sortDirection);
  }, [showAllResults, tableData, filteredData, sortBy, sortDirection]);

  const getDownloadData = async (): Promise<GeneMappingDownloadData | null> => {
    if (!response) {
      setDownloadMessage("No mapping response is available to download.");
      return null;
    }

    if (pantherGeneInfoResponse) {
      return {
        ...response,
        ...pantherGeneInfoResponse,
      };
    }

    setIsPreparingDownload(true);
    setDownloadMessage(
      "Preparing your download. This can take longer for large gene lists."
    );

    try {
      const lazyPantherData = await getPantherGeneInfo(response.gene_list);
      setPantherGeneInfoResponse(lazyPantherData);
      setDownloadMessage(null);
      return {
        ...response,
        ...lazyPantherData,
      };
    } catch (error: any) {
      setDownloadMessage(
        error?.message || "Failed to prepare download data. Please try again."
      );
      return null;
    } finally {
      setIsPreparingDownload(false);
    }
  };

  const handleDownloadCSV = async (
    pantherIdsToInclude?: string[],
    fileTitle?: string
  ) => {
    if (isPreparingDownload) {
      return;
    }

    const downloadData = await getDownloadData();
    if (!downloadData) {
      return;
    }

    setDownloadMessage(null);

    // Generate table data using the utility function - pass in the annotation dataset and download preference
    const tableData = createResultsTableData(
      downloadData,
      pantherIdsToInclude,
      downloadAllColumns ? undefined : annotationDataset
    );

    if (tableData.length === 0) {
      setDownloadMessage(
        "No rows matched this download selection. Try downloading all mappings or changing filters."
      );
      return;
    }

    // Convert the data to CSV format
    const headers = Object.keys(tableData[0] || {});
    const csvRows = [
      headers.join(","), // Header row
      ...tableData.map((row) =>
        headers
          .map((header) => {
            // Handle array fields and escape commas in text
            const value = row[header as keyof typeof row];
            if (Array.isArray(value)) {
              return `"${value.join(";")}"`;
            }
            return typeof value === "string"
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          })
          .join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");

    // Create a blob and download link
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

  // Handle menu open/close
  const handleOpenDownloadMenu = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchor(event.currentTarget);
  };

  const handleCloseDownloadMenu = () => {
    setDownloadMenuAnchor(null);
  };

  // Download handlers
  const handleDownloadAll = () => {
    void handleDownloadCSV();
    handleCloseDownloadMenu();
  };

  const handleDownloadSignificant = () => {
    // Always use filteredData (significant results) regardless of current view
    const significantIds = filteredData
      .flatMap((item) => item.mapped_panther_ids)
      .filter((id, index, self) => self.indexOf(id) === index);

    if (significantIds.length === 0) {
      setDownloadMessage(
        "No significant categories are available for download with the current settings."
      );
      handleCloseDownloadMenu();
      return;
    }

    void handleDownloadCSV(significantIds, `significant_gene_mappings.csv`);
    handleCloseDownloadMenu();
  };

  const correctionLabel =
    correctionType === CorrectionType.BONFERRONI
      ? "Bonferroni"
      : correctionType === CorrectionType.FDR
      ? "FDR"
      : "No";

  // Define table columns
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

  // Add FDR column if correction type is not Bonferroni
  if (correctionType === CorrectionType.FDR) {
    columns.push({
      width: 100,
      label: "FDR",
      dataKey: "fdr",
      numeric: true,
    });
  }

  // Define Virtuoso Table Components
  const VirtuosoTableComponents: TableComponents<OverrepResultItem> = {
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

  // Header content with sort functionality
  const fixedHeaderContent = () => {
    return (
      <>
        {/* First Header Row */}
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

        {/* Second Header Row with sort functionality */}
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

  // Row content
  const rowContent = (_index: number, row: OverrepResultItem) => {
    return (
      <>
        {columns.map((column, index) => {
          let content: React.ReactNode = row[column.dataKey];

          // Format numeric values
          if (
            column.dataKey === "expected" ||
            column.dataKey === "foldEnrichment"
          ) {
            content = (row[column.dataKey] as number).toFixed(2);
          } else if (column.dataKey === "pValue" || column.dataKey === "fdr") {
            content = (row[column.dataKey] as number).toExponential(2);
          }

          // Make uploadCount clickable for downloading specific mappings
          if (column.dataKey === "uploadCount") {
            return (
              <TableCell
                key={column.dataKey}
                align="center"
                onClick={() => {
                  if (
                    row.mapped_panther_ids &&
                    row.mapped_panther_ids.length > 0
                  ) {
                    void handleDownloadCSV(
                      row.mapped_panther_ids,
                      `${row.process}_gene_mappings.csv`
                    );
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
            {correctionLabel}{" "}
            correction
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

          {/* Download dropdown button */}
          <Button
            variant="outlined"
            color="primary"
            onClick={handleOpenDownloadMenu}
            disabled={!response || isPreparingDownload}
            startIcon={
              isPreparingDownload ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <DownloadIcon />
              )
            }
            endIcon={<KeyboardArrowDownIcon />}
            sx={{ mr: 1 }}
          >
            {isPreparingDownload ? "Preparing..." : "Download"}
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

      {/* Replace the prominent advanced options banner with subtle collapsible section */}
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

      {/* Download options menu */}
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
            Only Significant Mappings ({filteredData.length}{" "}
            {datasetTermsPlural})
          </Typography>
        </MenuItem>
      </Menu>

      {/* Overrepresentation Results Table */}
      {tableData.length > 0 && (
        <Box sx={{ mt: 4 }}>
          {/* Filter information and toggle */}
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
              {showAllResults
                ? "Show Significant Only"
                : "Click here to show all"}
            </Button>
          </Box>

          {/* Help text for clickable cells */}
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
