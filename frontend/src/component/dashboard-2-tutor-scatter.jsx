import { Box, Typography } from "@mui/material";
import { ScatterChart } from "@mui/x-charts";

export default function DashboardTutorScatter({ rows = [] }) {
    if (!rows || rows.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    No data to display. Make sure to pass <code>rows</code> with aiMark and tutorMark.
                </Typography>
            </Box>
        );
    }

    const byTutor = new Map();
    rows.forEach((r) => {
        const point = { id: r.studentID, x: r.aiMark, y: r.tutorMark, assignment: r.assignment };
        const key = r.markBy ?? "Unknown";
        if (!byTutor.has(key)) byTutor.set(key, []);
        byTutor.get(key).push(point);
    });

    const allX = rows.map(r => r.aiMark).filter(v => v != null);
    const allY = rows.map(r => r.tutorMark).filter(v => v != null);
    const minVal = Math.min(0, ...allX, ...allY);
    const maxVal = Math.max(100, ...allX, ...allY);

    const series = Array.from(byTutor.entries()).map(([tutor, data]) => ({
        id: tutor,
        label: tutor,
        data,
    }));

    const diagData = Array.from({ length: 101 }, (_, i) => {
        const t = i / 100;
        const val = minVal + t * (maxVal - minVal);
        return { x: val, y: val };
    });

    const benchmarkSeries = {
        id: "y=x",
        label: "Perfect Agreement (Tutor = AI)",
        type: "scatter",
        data: diagData,
        markerSize: 2,
        showMark: false,
    };

    return (
        <Box
            id="tutor-scatter"
            sx={{
                width: "100%",
                height: "100%",
                maxWidth: "90%",   // stops chart from overflowing
                mt: "5%",
                ml: "5%",
                display: "flex",
                justifyContent: "center",
            }}
        >
            <ScatterChart
                width={undefined}             // Responsive width
                height={undefined}            // Responsive height
                series={[...series, benchmarkSeries]}
                xAxis={[{ label: "AI mark", min: minVal, max: maxVal }]}
                yAxis={[{ label: "Tutor mark", min: minVal, max: maxVal }]}
                slotProps={{
                    legend: {
                        direction: "row",
                        position: { vertical: "top", horizontal: "center" },
                    },
                }}
            />
        </Box>
    );
}
