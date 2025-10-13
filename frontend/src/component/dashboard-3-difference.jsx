// src/components/MarkingDifferenceChart.jsx
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LabelList,
    Cell,
    ReferenceLine,
} from "recharts";

/**
 * rows: [
 *  { studentID, markBy, tutorMark, aiMark, difference?, comment, assignment }
 * ]
 */


const MarkingDifferenceChart = ({ rows = [] }) => {
    // Normalize -> recharts-friendly structure
    // - name: "#<studentID> – <tutor> (<assignment>)"
    // - aiMarked, tutorMarked, difference
    // - _idx: to keep uniqueness if there are duplicate studentIDs
    const chartData = rows.map((r, idx) => {
        const ai = Number(r.aiMark ?? 0);
        const tm = Number(r.tutorMark ?? 0);
        const diff = Number(
            r.difference !== undefined ? r.difference : ai - tm
        );

        const nameParts = [
            r.studentID != null ? `#${r.studentID}` : `row${idx + 1}`,
            r.markBy ? `- ${r.markBy}` : "",
            r.assignment ? `(${r.assignment})` : "",
        ]
            .filter(Boolean)
            .join(" ");

        return {
            _idx: idx, // internal key helper
            name: nameParts,
            aiMarked: ai,
            tutorMarked: tm,
            difference: diff,
        };
    });

    // Safer tooltip: look up by dataKey rather than payload index
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload || payload.length === 0) return null;

        const getVal = (key) =>
            payload.find((p) => p.dataKey === key)?.value ?? 0;

        const aiMarkValue = getVal("aiMarked");
        const tutorMarkValue = getVal("tutorMarked");
        const differenceValue = getVal("difference");

        return (
            <div
                className="custom-tooltip"
                style={{
                    backgroundColor: "#fff",
                    padding: "10px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
            >
                <p style={{ fontWeight: "bold", marginBottom: 5 }}>{label}</p>
                <p style={{ color: "#8884d8", margin: 0 }}>
                    AI Mark: {aiMarkValue}
                </p>
                <p style={{ color: "#82ca9d", margin: 0 }}>
                    Tutor Mark: {tutorMarkValue}
                </p>
                <p
                    style={{
                        color: differenceValue >= 0 ? "#0088fe" : "#ff7300",
                        fontWeight: "bold",
                        margin: 0,
                    }}
                >
                    Difference: {differenceValue}
                </p>
            </div>
        );
    };

    return (
        <div
            style={{
                backgroundColor: "white",
                padding: 20,
                borderRadius: 8,
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                marginBottom: 30,
            }}
        >
            <h3 style={{ marginTop: 0, marginBottom: 20 }}>
                Marking Difference Analysis
            </h3>

            {/* Chart 1: AI vs Tutor */}
            <div style={{ marginBottom: 30 }}>
                <h4 style={{ marginBottom: 15 }}>AI Mark vs Tutor Mark</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="aiMarked" name="AI Mark" fill="#8884d8" />
                        <Bar dataKey="tutorMarked" name="Tutor Mark" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 2: Difference */}
            <div>
                <h4 style={{ marginBottom: 15 }}>Marking Difference (AI − Tutor)</h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <ReferenceLine y={0} stroke="#999" /> {/* zero baseline */}
                        <Bar dataKey="difference" name="Difference">
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${entry._idx}`}
                                    fill={entry.difference >= 0 ? "#0088fe" : "#ff7300"}
                                />
                            ))}
                            <LabelList dataKey="difference" position="top" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default MarkingDifferenceChart;
