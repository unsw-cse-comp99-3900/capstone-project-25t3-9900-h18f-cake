import { useMemo } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import { DataGrid } from "@mui/x-data-grid";

const createColumns = (allowInlineReviewEdit, selectionConfig) => {
    const columns = [
        { field: "studentID", headerName: "ID", width: 120, align: "center", headerAlign: "center" },
        { field: "markBy", headerName: "Mark By", width: 140, align: "center", headerAlign: "center" },
        { field: "assignment", headerName: "Assignment", width: 180, align: "center", headerAlign: "center" },
        { field: "tutorMark", headerName: "Tutor", width: 120, type: "number", align: "center", headerAlign: "center" },
        { field: "aiMark", headerName: "AI", width: 120, type: "number", align: "center", headerAlign: "center" },
    {
        field: "difference",
        headerName: "Variation",
        type: "number",
        width: 100,
        align: "center",
        headerAlign: "center",
        valueGetter: (_val, row) => (row?.aiMark ?? 0) - (row?.tutorMark ?? 0),
    },
    {
        field: "feedback",
        headerName: "AI Justification",
        minWidth: 260,
        flex: 1,
        renderCell: (params) => (
            <Box
                sx={{
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: 1.4,
                    py: 1,
                    overflow: "visible",
                }}
            >
                {params.value}
            </Box>
        ),
    },
    {
        field: "reviewMark",
        headerName: "Revised Mark",
        width: 180,
        align: "center",
        headerAlign: "center",
        type: "number",
        editable: allowInlineReviewEdit,
        valueFormatter: (params = {}) => {
            const value = params?.value;
            return value === null || value === undefined ? "" : value;
        },
        renderCell: (params) => {
            const value = params.row?.reviewMark;
            return (
                <Box sx={{ width: "100%", textAlign: "center" }}>
                    {value === null || value === undefined || value === "" ? "" : value}
                </Box>
            );
        },
    },
    {
        field: "reviewComments",
        headerName: "Revised Feedback",
        minWidth: 220,
        flex: 1,
        editable: allowInlineReviewEdit,
        renderCell: (params) => (
            <Box
                sx={{
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: 1.4,
                    py: 1,
                    overflow: "visible",
                }}
            >
                {params.value}
            </Box>
        ),
        renderEditCell: (params) => {
            const value = params?.value ?? "";
            const handleChange = (event) => {
                params?.api?.setEditCellValue(
                    { id: params.id, field: params.field, value: event.target.value },
                    event
                );
            };
            return (
                <Box
                    sx={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "stretch",
                        py: 0,
                    }}
                >
                    <TextField
                        multiline
                        minRows={3}
                        fullWidth
                        autoFocus
                        value={value}
                        onChange={handleChange}
                        sx={{
                            width: "100%",
                            height: "100%",
                            "& .MuiInputBase-root": {
                                width: "100%",
                                height: "100%",
                                alignItems: "flex-start",
                                py: 1,
                            },
                            "& textarea": {
                                height: "100% !important",
                                boxSizing: "border-box",
                            },
                        }}
                    />
                </Box>
            );
        },
    },
    ];

    if (selectionConfig) {
        columns.unshift({
            field: "__select__",
            headerName: "",
            width: 48,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderHeader: () => (
                <Checkbox
                    size="small"
                    indeterminate={selectionConfig.indeterminate}
                    checked={selectionConfig.allSelected}
                    disabled={selectionConfig.disableToggleAll}
                    onChange={selectionConfig.onToggleAll}
                    inputProps={{ "aria-label": "Select all rows" }}
                />
            ),
            renderCell: (params) => (
                <Checkbox
                    size="small"
                    disabled={!params.row?.rowKey}
                    checked={
                        params.row?.rowKey
                            ? selectionConfig.selectedIds.includes(params.row.rowKey)
                            : false
                    }
                    onChange={() => params.row?.rowKey && selectionConfig.onToggleRow(params.row.rowKey)}
                    inputProps={{ "aria-label": `Select row ${params.row.studentID}` }}
                />
            ),
        });
    }

    return columns;
};

export default function DashboardStudent({
    variant = "studentView",
    rows = [],
    allowInlineReviewEdit = false,
    processRowUpdate,
    onProcessRowUpdateError,
    selectionConfig = null,
}) {
    const isTutorView = variant === "tutorView";
    const density = isTutorView ? "compact" : "standard";
    const columnVisibilityModel = { feedback: !isTutorView };
    const columns = useMemo(
        () => createColumns(allowInlineReviewEdit, selectionConfig),
        [allowInlineReviewEdit, selectionConfig]
    );
    const editingProps = allowInlineReviewEdit
        ? {
            processRowUpdate,
            onProcessRowUpdateError,
            editMode: "cell",
            experimentalFeatures: { newEditingApi: true },
        }
        : {};
    return (
        <Box sx={{ height: "90%", width: "100%" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                getRowHeight={() => "auto"}
                getEstimatedRowHeight={() => 80}
                getRowId={(row) => row.rowKey ?? (row.assignment ? `${row.assignment}-${row.studentID}` : row.studentID)}
                density={density}
                columnVisibilityModel={columnVisibilityModel}
                disableColumnFilter
                disableColumnSelector
                disableDensitySelector
                hideFooterSelectedRowCount
                {...editingProps}
                initialState={{
                    pagination: { paginationModel: { pageSize: isTutorView ? 10 : 5 } },
                }}
                pageSizeOptions={isTutorView ? [10, 25] : [5, 10]}
                sx={{
                    "& .MuiDataGrid-cell": {
                        display: "flex",
                        alignItems: "center",
                        whiteSpace: "normal !important",
                    },
                    "& .MuiDataGrid-row": {
                        maxHeight: "none !important",
                    },
                    "& .MuiDataGrid-virtualScrollerRenderZone": {
                        "& .MuiDataGrid-row": {
                            maxHeight: "none !important",
                        },
                    },
                }}
            />
        </Box>
    );
}
