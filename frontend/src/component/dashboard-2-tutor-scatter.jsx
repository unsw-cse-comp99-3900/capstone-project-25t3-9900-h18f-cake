import { useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import { ScatterChart } from "@mui/x-charts";

const formatNumber = (value, fractionDigits = 1) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    return Number(value).toFixed(fractionDigits);
};

export default function DashboardTutorScatter({ rows = [] }) {
    const hasRows = Array.isArray(rows) && rows.length > 0;
    const {
        byTutor,
        minVal,
        maxVal,
        summaryStats,
        tutorBreakdown,
    } = useMemo(() => {
        if (!hasRows) {
            return {
                byTutor: new Map(),
                minVal: 0,
                maxVal: 100,
                summaryStats: {
                    totalScripts: 0,
                    avgAi: null,
                    avgTutor: null,
                    avgGap: null,
                    needsReviewCount: 0,
                    avgFinal: null,
                },
                tutorBreakdown: [],
            };
        }

        const grouped = new Map();
        let minScore = 0;
        let maxScore = 100;
        let aiSum = 0;
        let tutorSum = 0;
        let diffSum = 0;
        let aiCount = 0;
        let tutorCount = 0;
        let pairedCount = 0;
        let needsReviewCount = 0;
        let finalSum = 0;
        let finalCount = 0;

        rows.forEach((r) => {
            const point = {
                id: r.studentID,
                x: r.aiMark,
                y: r.tutorMark,
                assignment: r.assignment,
            };
            const tutorName = r.markBy || "Unknown";
            if (!grouped.has(tutorName)) {
                grouped.set(tutorName, {
                    tutorName,
                    points: [],
                    aiSum: 0,
                    tutorSum: 0,
                    diffSum: 0,
                    count: 0,
                    flagged: 0,
                });
            }
            const bucket = grouped.get(tutorName);
            bucket.points.push(point);
            bucket.count += 1;
            bucket.flagged += r.needsReview ? 1 : 0;
            const ai = typeof r.aiMark === "number" ? r.aiMark : null;
            const tutor = typeof r.tutorMark === "number" ? r.tutorMark : null;
            if (ai !== null) {
                aiSum += ai;
                bucket.aiSum += ai;
                aiCount += 1;
                minScore = Math.min(minScore, ai);
                maxScore = Math.max(maxScore, ai);
            }
            if (tutor !== null) {
                tutorSum += tutor;
                bucket.tutorSum += tutor;
                tutorCount += 1;
                minScore = Math.min(minScore, tutor);
                maxScore = Math.max(maxScore, tutor);
            }
            if (ai !== null && tutor !== null) {
                const diff = ai - tutor;
                diffSum += diff;
                bucket.diffSum += diff;
                pairedCount += 1;
            }
            if (r.needsReview) {
                needsReviewCount += 1;
            }
            const finalMark =
                r.reviewMark !== null && r.reviewMark !== undefined && r.reviewMark !== ""
                    ? Number(r.reviewMark)
                    : typeof r.tutorMark === "number"
                        ? r.tutorMark
                        : null;
            if (finalMark !== null && !Number.isNaN(finalMark)) {
                finalSum += finalMark;
                finalCount += 1;
            }
        });

        const tutorBreakdown = Array.from(grouped.values())
            .map((entry) => ({
                tutor: entry.tutorName,
                count: entry.count,
                flagged: entry.flagged,
                avgAi: entry.aiSum / Math.max(1, entry.count),
                avgTutor: entry.tutorSum / Math.max(1, entry.count),
                avgGap: entry.count ? entry.diffSum / entry.count : 0,
                points: entry.points,
            }))
            .sort((a, b) => b.count - a.count);

        const summaryStats = {
            totalScripts: rows.length,
            avgAi: aiCount ? aiSum / aiCount : null,
            avgTutor: tutorCount ? tutorSum / tutorCount : null,
            avgGap: pairedCount ? diffSum / pairedCount : null,
            needsReviewCount,
            avgFinal: finalCount ? finalSum / finalCount : null,
        };

        return {
            byTutor: grouped,
            minVal: Math.floor(minScore),
            maxVal: Math.ceil(Math.max(maxScore, 5)),
            summaryStats,
            tutorBreakdown,
        };
    }, [rows, hasRows]);

    if (!hasRows) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    No data to display. Make sure to pass <code>rows</code> with aiMark and tutorMark.
                </Typography>
            </Box>
        );
    }

    const series = Array.from(byTutor.entries()).map(([tutor, bucket]) => ({
        id: tutor,
        label: tutor,
        data: bucket.points,
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
        <Stack spacing={3} sx={{ width: "100%", height: "100%" }}>
            <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                sx={{ width: "100%" }}
            >
                <Paper sx={{ flex: 1, p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Total Submission Marked by AI
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                        {summaryStats.totalScripts}
                    </Typography>
                </Paper>
                <Paper sx={{ flex: 1, p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Avg AI mark
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                        {formatNumber(summaryStats.avgAi)}
                    </Typography>
                </Paper>
            <Paper sx={{ flex: 1, p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Avg Tutor mark
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                    {formatNumber(summaryStats.avgTutor)}
                </Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Avg Final mark
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                    {formatNumber(summaryStats.avgFinal)}
                </Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Avg variance (AI - Tutor)
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                    {formatNumber(summaryStats.avgGap)}
                </Typography>
            </Paper>
            <Paper sx={{ flex: 1, p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                    Needs review
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                    {summaryStats.needsReviewCount}
                </Typography>
            </Paper>
        </Stack>

        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ width: "100%", flex: 1 }}>
            <Paper
                sx={{
                    flex: { xs: "unset", lg: 1 },
                    p: { xs: 1, md: 2 },
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    alignItems={{ xs: "flex-start", md: "center" }}
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ mb: 1 }}
                >
                    <Box>
                        <Typography variant="h6">AI vs Tutor comparison</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Each dot represents a submission (AI mark on x-axis, Tutor mark on y-axis).
                        </Typography>
                    </Box>
                    <Chip size="small" label="y = x shown as dashed line" color="primary" variant="outlined" />
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ flex: 1, minHeight: 360 }}>
                    <ScatterChart
                        width={undefined}
                        height={undefined}
                        series={[...series, benchmarkSeries]}
                        xAxis={[{ label: "AI mark", min: minVal, max: maxVal }]}
                        yAxis={[{ label: "Tutor mark", min: minVal, max: maxVal }]}
                        margin={{ top: 40, right: 30, bottom: 40, left: 60 }}
                        slotProps={{
                            legend: {
                                direction: "row",
                                position: { vertical: "top", horizontal: "center" },
                                padding: 16,
                            },
                        }}
                        sx={{
                            width: "100%",
                            height: "100%",
                            "& .MuiChartsAxis-label": {
                                fontWeight: 600,
                            },
                        }}
                    />
                </Box>
            </Paper>

            <Paper
                sx={{
                    flex: { xs: "unset", lg: 1 },
                    p: 2,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <Typography variant="h6" sx={{ mb: 1 }}>
                    Tutor snapshot
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Compare workloads and review counts per tutor.
                </Typography>
                <Table
                    size="small"
                    aria-label="Tutor summary table"
                    sx={{
                        "& tbody": { display: "block", maxHeight: 300, overflowY: "auto" },
                        "& thead, & tbody tr": { display: "table", width: "100%", tableLayout: "fixed" },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>Tutor</TableCell>
                            <TableCell align="right">Scripts</TableCell>
                            <TableCell align="right">Needs review</TableCell>
                            <TableCell align="right">Avg AI</TableCell>
                            <TableCell align="right">Avg Tutor</TableCell>
                            <TableCell align="right">Avg (AI - Tutor)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tutorBreakdown.map((row) => (
                            <TableRow key={row.tutor}>
                                <TableCell>{row.tutor}</TableCell>
                                <TableCell align="right">{row.count}</TableCell>
                                <TableCell align="right">{row.flagged}</TableCell>
                                <TableCell align="right">{formatNumber(row.avgAi)}</TableCell>
                                <TableCell align="right">{formatNumber(row.avgTutor)}</TableCell>
                                <TableCell
                                    align="right"
                                    sx={{
                                        color: row.avgGap > 0 ? "warning.main" : "success.main",
                                        fontWeight: 600,
                                    }}
                                >
                                    {formatNumber(row.avgGap)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Stack>
    </Stack>
);
}
