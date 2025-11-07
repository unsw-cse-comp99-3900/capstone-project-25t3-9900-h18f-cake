import Box from "@mui/material/Box";
import { DataGrid } from "@mui/x-data-grid";

const columns = [
    { field: "studentID", headerName: "ID", width: 100, align: "center", headerAlign: "center" },
    { field: "markBy", headerName: "Mark By", width: 100, align: "center", headerAlign: "center" },
    { field: "assignment", headerName: "Assignment", width: 120, align: "center", headerAlign: "center" },
    { field: "tutorMark", headerName: "Tutor", width: 100, type: "number", align: "center", headerAlign: "center" },
    { field: "aiMark", headerName: "AI", width: 100, type: "number", align: "center", headerAlign: "center" },
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
        width: 120,
        align: "center",
        headerAlign: "center",
        valueGetter: (_val, row) => row?.reviewMark ?? "",
    },
    {
        field: "reviewComments",
        headerName: "Revised Feedback",
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
];

export default function DashboardStudent({ variant = "studentView", rows = [] }) {
    const isTutorView = variant === "tutorView";
    const density = isTutorView ? "compact" : "standard";
    const columnVisibilityModel = { feedback: !isTutorView };

    return (
        <Box sx={{ height: "90%", width: "100%" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                getRowHeight={() => "auto"}
                getEstimatedRowHeight={() => 80}
                getRowId={(row) => (row.assignment ? `${row.assignment}-${row.studentID}` : row.studentID)}
                density={density}
                columnVisibilityModel={columnVisibilityModel}
                disableColumnFilter
                disableColumnSelector
                disableDensitySelector
                hideFooterSelectedRowCount
                initialState={{
                    pagination: { paginationModel: { pageSize: isTutorView ? 10 : 5 } },
                }}
                pageSizeOptions={isTutorView ? [10, 25] : [5, 10]}
                checkboxSelection
                disableRowSelectionOnClick
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
