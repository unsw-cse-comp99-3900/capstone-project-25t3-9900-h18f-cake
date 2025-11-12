import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Stack,
    TextField,
    MenuItem,
    Button,
    Table,
    TableHead,
    TableRow,
    TableBody,
    TableCell,
    Chip,
    Alert,
    IconButton,
    Tooltip,
} from "@mui/material";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import DownloadIcon from "@mui/icons-material/Download";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import API from "../api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

const LEVELS = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];

const formatTimestamp = (value) => {
    if (!value) return "—";
    const normalize = (input) => {
        if (typeof input !== "string") return input;
        if (/[zZ]$/.test(input) || /[+-]\d{2}:\d{2}$/.test(input)) return input;
        return `${input}Z`;
    };
    try {
        const formatter = new Intl.DateTimeFormat("en-AU", {
            timeZone: "Australia/Sydney",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
            timeZoneName: "short",
        });
        return formatter.format(new Date(normalize(value)));
    } catch {
        return value;
    }
};

export default function AdminLogsPage() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [filters, setFilters] = useState({
        level: "",
        action: "",
        limit: 100,
    });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const requestParams = useMemo(() => {
        return {
            level: filters.level || undefined,
            action: filters.action || undefined,
            limit: filters.limit,
        };
    }, [filters]);

    const handleDownloadCsv = useCallback(() => {
        if (!logs.length) return;
        const headers = ["Timestamp", "Level", "Action", "Message", "User", "Course", "Assignment"];
        const formatCell = (value) => {
            if (value === null || value === undefined) return "";
            const str = String(value).replace(/\r?\n/g, " ").trim();
            return /[",]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        };
        const rows = logs.map((log) => [
            log.created_at ? log.created_at : "",
            log.level || "",
            log.action || "",
            log.message || "",
            log.user_name || log.user_id || "",
            log.course_name
                ? log.course_code
                    ? `${log.course_name} (${log.course_code})`
                    : log.course_name
                : log.course_code || log.course_id || "",
            log.assignment_title || log.assignment_id || "",
        ]);
        const content = [headers, ...rows].map((line) => line.map(formatCell).join(",")).join("\r\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `system_logs_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [logs]);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await API.systemLogs.list(requestParams);
            setLogs(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(e?.message || "Failed to load logs");
        } finally {
            setLoading(false);
        }
    }, [requestParams]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    return (
        <Box sx={{ px: { xs: 4, sm: 12, md: 25 }, py: { xs: 6, sm: 8, md: 10 }, maxWidth: 1400, mx: "auto" }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: 28, md: 48 }, lineHeight: 1.1 }}>
                    System Logs
                </Typography>
                <Stack direction="row" spacing={2}>
                    <Tooltip title="Back to courses">
                        <IconButton onClick={() => navigate("/courses")} sx={{ p: 1 }}>
                            <ExitToAppIcon sx={{ fontSize: 40 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Logout">
                        <IconButton
                            onClick={() => {
                                logout();
                                navigate("/", { replace: true });
                            }}
                            sx={{ p: 1 }}
                        >
                            <PowerSettingsNewIcon sx={{ fontSize: 40 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField
                        select
                        label="Level"
                        value={filters.level}
                        onChange={(e) => setFilters((prev) => ({ ...prev, level: e.target.value }))}
                        sx={{ minWidth: 160 }}
                    >
                        <MenuItem value="">All</MenuItem>
                        {LEVELS.map((level) => (
                            <MenuItem key={level} value={level}>
                                {level}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label="Action contains"
                        value={filters.action}
                        onChange={(e) => setFilters((prev) => ({ ...prev, action: e.target.value }))}
                        sx={{ minWidth: 220 }}
                    />
                    <TextField
                        label="Limit"
                        type="number"
                        value={filters.limit}
                        onChange={(e) =>
                            setFilters((prev) => ({
                                ...prev,
                                limit: Math.max(1, Math.min(500, Number(e.target.value) || 100)),
                            }))
                        }
                        sx={{ minWidth: 120 }}
                    />
                    <Button
                        variant="contained"
                        onClick={loadLogs}
                        disabled={loading}
                        sx={{ alignSelf: { xs: "stretch", md: "center" }, minWidth: 140 }}
                    >
                        {loading ? "Refreshing..." : "Refresh"}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleDownloadCsv}
                        disabled={!logs.length}
                        sx={{ alignSelf: { xs: "stretch", md: "center" }, minWidth: 160 }}
                    >
                        Export CSV
                    </Button>
                </Stack>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Level</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Message</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Course</TableCell>
                            <TableCell>Assignment</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>
                                    {formatTimestamp(log.created_at)}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={log.level}
                                        size="small"
                                        color={
                                            log.level === "ERROR" || log.level === "CRITICAL"
                                                ? "error"
                                                : log.level === "WARNING"
                                                    ? "warning"
                                                    : "default"
                                        }
                                    />
                                </TableCell>
                                <TableCell>{formatActionLabel(log.action)}</TableCell>
                                <TableCell sx={{ maxWidth: 260, whiteSpace: "normal" }}>{log.message}</TableCell>
                                <TableCell>{log.user_name || "—"}</TableCell>
                                <TableCell sx={{ whiteSpace: "normal" }}>
                                    {log.course_name
                                        ? log.course_code
                                            ? `${log.course_name} (${log.course_code})`
                                            : log.course_name
                                        : log.course_code || "—"}
                                </TableCell>
                                <TableCell>
                                    {log.assignment_title || "—"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!logs.length && !loading && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    No logs found for current filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
}
const formatActionLabel = (value) => {
    if (!value) return "—";
    return value
        .replace(/[._]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .replace(/\bAi\b/g, "AI");
};
