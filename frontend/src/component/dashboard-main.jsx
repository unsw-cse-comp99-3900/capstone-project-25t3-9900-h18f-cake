import Box from "@mui/material/Box";
import { DataGrid } from "@mui/x-data-grid";

const columns = [
    { field: "studentID", headerName: "Student ID", width: 100, align: "center", headerAlign: "center" },
    { field: "markBy", headerName: "Mark By", width: 200, align: "center", headerAlign: "center" },
    { field: "assignment", headerName: "Assignment", width: 200, align: "center", headerAlign: "center" },
    { field: "tutorMark", headerName: "Tutor mark", width: 150, type: "number", editable: true, align: "center", headerAlign: "center" },
    { field: "aiMark", headerName: "AI mark", width: 150, type: "number", editable: true, align: "center", headerAlign: "center" },
    {
        field: "difference",
        headerName: "Variation",
        type: "number",
        width: 150,
        align: "center",
        headerAlign: "center",
        valueGetter: (_val, row) => (row?.aiMark ?? 0) - (row?.tutorMark ?? 0),
    },
    {
        field: "comment",
        headerName: "Comment",
        flex: 1,
        editable: true,
        renderCell: (params) => (
            <div
                style={{
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    lineHeight: "1.4",
                    padding: "8px 0",
                }}
            >
                {params.value}
            </div>
        ),
    }
];


export default function DashboardStudent({ variant = "studentView", rows = [] }) {
    const isTutorView = variant === "tutorView";
    const density = isTutorView ? "compact" : "standard";
    const columnVisibilityModel = { comment: !isTutorView };

    return (
        <Box sx={{ height: isTutorView ? 420 : 480, width: "100%" }}>
            <DataGrid
                rows={rows}
                columns={columns}
                getRowHeight={() => "auto"}   // ✅ Allows each row to grow based on content
                getEstimatedRowHeight={() => 80} // (Optional) Improves performance
                getRowId={(row) =>
                    row.assignment ? `${row.assignment}-${row.studentID}` : row.studentID
                }
                density={density}
                columnVisibilityModel={columnVisibilityModel}

                // 🔕 remove all DataGrid filtering UI
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
                        alignItems: "center",   // ✅ Vertical center
                    },
                    "& .MuiDataGrid-columnHeaders": { fontWeight: 700 },
                    "& .MuiDataGrid-row:nth-of-type(odd)": {
                        backgroundColor: (theme) =>
                            isTutorView ? "transparent" : theme.palette.action.hover,
                    },
                    borderRadius: 2,
                }}
            />
        </Box>
    );
}
