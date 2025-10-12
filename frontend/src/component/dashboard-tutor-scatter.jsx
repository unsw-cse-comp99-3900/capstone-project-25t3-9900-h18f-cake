import { Box, Typography } from "@mui/material";
import { ScatterChart } from "@mui/x-charts/ScatterChart";

export default function DashboardTutorScatter({ rows = [], size = 500 }) {
    // Guard: show a hint if no data
    if (!rows || rows.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    No data to display. Make sure you pass <code>rows</code> with aiMark and tutorMark.
                </Typography>
            </Box>
        );
    }

    // Group points by tutor for separate series/colors
    const byTutor = new Map();
    rows.forEach((r) => {
        const point = { id: r.studentID, x: r.aiMark, y: r.tutorMark, assignment: r.assignment };
        const key = r.markBy ?? "Unknown";
        if (!byTutor.has(key)) byTutor.set(key, []);
        byTutor.get(key).push(point);
    });

    // Axes domain (marks 0–100 by default, expand if needed)
    const allX = rows.map(r => r.aiMark).filter(v => v != null);
    const allY = rows.map(r => r.tutorMark).filter(v => v != null);
    const minVal = Math.min(0, ...allX, ...allY);
    const maxVal = Math.max(100, ...allX, ...allY);

    // Build series for ScatterChart (v6 API)
    const series = Array.from(byTutor.entries()).map(([tutor, data]) => ({
        id: tutor,
        label: tutor,
        data,
    }));

    return (
        <Box
            sx={{
                width: size,
                height: size,
                mx: "auto",           // Center horizontally
                mt: 3,                // Add top spacing
                borderRadius: 2,
            }}
        >
            <ScatterChart
                height={size}
                width={size}
                series={series}
                xAxis={[{ label: "AI mark", min: minVal, max: maxVal }]}
                yAxis={[{ label: "Tutor mark", min: minVal, max: maxVal }]}
                margin={{ top: 40, bottom: 60, }}
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
