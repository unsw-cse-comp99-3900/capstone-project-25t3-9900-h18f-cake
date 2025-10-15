import { useMemo, useState, useEffect } from "react";
import {
    Box, Stack, IconButton, Typography,
    ToggleButton, ToggleButtonGroup,
    FormControl, InputLabel, Select, MenuItem, Tooltip
} from "@mui/material";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";

import DashboardStudent from "../component/dashboard-1-main";
import DashboardTutorScatter from "../component/dashboard-2-tutor-scatter";
import ExitConfirmPopup from "../component/exit-confirm";
import Sidebar, { SIDEBAR_WIDTH } from "../component/view-sidedrawer";

const TOPBAR_HEIGHT = 72;

// Demo data
const ALL_ROWS = [
    { studentID: 1, markBy: "Peter Zhang", tutorMark: 78, aiMark: 85, difference: 7, feedback: "Good improvement", assignment: "Assignment 1" },
    { studentID: 2, markBy: "Jessie Chen", tutorMark: 95, aiMark: 92, difference: -3, feedback: "Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback Long feedback ...", assignment: "Assignment 2" },
    { studentID: 3, markBy: "Tutor 4", tutorMark: 82, aiMark: 76, difference: -6, feedback: "", assignment: "Assignment 1" },
    { studentID: 4, markBy: "Tutor 3", tutorMark: 85, aiMark: 85, difference: 0, feedback: "", assignment: "Assignment 3" },
    { studentID: 4, markBy: "Tutor 3", tutorMark: 85, aiMark: 88, difference: 3, feedback: "", assignment: "Assignment 3" },
];

const ASSIGNMENTS = ["Assignment 1", "Assignment 2", "Assignment 3"];
const TUTORS = ["Peter Zhang", "Jessie Chen", "Tutor 3", "Tutor 4"];

export default function Dashboard() {
    const [searchParams] = useSearchParams();
    const [course, setCourse] = useState("");
    const [term, setTerm] = useState("");

    useEffect(() => {
        setCourse(searchParams.get("course") || "");
        setTerm(searchParams.get("term") || "");
    }, [searchParams]);

    const navigate = useNavigate();
    const { logout } = useAuth();
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [variant, setVariant] = useState("studentView");
    const [selectedAssignment, setSelectedAssignment] = useState("all");
    const [selectedTutor, setSelectedTutor] = useState("all");

    const filteredRows = useMemo(
        () =>
            ALL_ROWS.filter(
                (r) =>
                    (selectedAssignment === "all" || r.assignment === selectedAssignment) &&
                    (selectedTutor === "all" || r.markBy === selectedTutor)
            ),
        [selectedAssignment, selectedTutor]
    );

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* ── Title bar (full width) ── */}
            <Box
                sx={{
                    
                    position: "sticky",
                    top: 0,
                    height: TOPBAR_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: { xs: 2, md: 5 },
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    zIndex: (theme) => theme.zIndex.drawer + 1,

                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 800,
                        fontSize: { xs: 20, md: 32 },
                        lineHeight: 1.1,
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        pr: 2,
                    }}
                    title={`${course} ${term}`}
                >
                    {course} {term}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <Tooltip title="Back to Course Page" arrow>
                        <IconButton onClick={() => navigate("/courses", { replace: true })}>
                            <ArrowBackIcon sx={{ fontSize: 32 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Logout" arrow>
                        <IconButton onClick={() => setLogoutOpen(true)}>
                            <PowerSettingsNewIcon sx={{ fontSize: 32 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* ── Sidebar + Main content (same row) ── */}
            <Box sx={{ display: "flex", flexGrow: 1 }}>
                <Sidebar topOffset={TOPBAR_HEIGHT} />

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        ml: { md: `${SIDEBAR_WIDTH}px` },
                        width: { xs: "100%", md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
                        height: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
                        display: "flex",
                        flexDirection: "column",

                        // 🟩 Only top padding (no left/right/bottom)
                        pt: 4,    // ← padding-top: theme.spacing(2) = 16px
                        px: 4,    // ← padding-left/right: theme.spacing(2) = 16px
                        // 🟥 Optional: limit content width so it doesn't grow too wide
                        maxWidth: "1400px",
                        maxHeight: "70vh",
                        mx: "auto", // horizontally center ('margin-left/right: auto')
                    }}
                >
                    <ExitConfirmPopup
                        logoutOpen={logoutOpen}
                        setLogoutOpen={setLogoutOpen}
                        logout={logout}
                        navigate={navigate}
                    />

                    {/* Filters & toggles (auto height; won't shrink) */}
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        alignItems={{ xs: "flex-start", md: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: 2, gap: 2, flexShrink: 0, width: "100%" }}
                    >
                        <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                            sx={{ width: "100%", justifyContent: "center", mb: 1 }}
                        >
                            <FormControl size="small" sx={{ minWidth: 220 }}>
                                <InputLabel id="assignment-select-label">Choose assignment</InputLabel>
                                <Select
                                    labelId="assignment-select-label"
                                    label="Choose assignment"
                                    value={selectedAssignment}
                                    onChange={(e) => setSelectedAssignment(e.target.value)}
                                >
                                    <MenuItem value="all">All assignments</MenuItem>
                                    {ASSIGNMENTS.map((a) => (
                                        <MenuItem key={a} value={a}>{a}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl size="small" sx={{ minWidth: 220 }}>
                                <InputLabel id="tutor-select-label">Choose tutor</InputLabel>
                                <Select
                                    labelId="tutor-select-label"
                                    label="Choose tutor"
                                    value={selectedTutor}
                                    onChange={(e) => setSelectedTutor(e.target.value)}
                                >
                                    <MenuItem value="all">All tutors</MenuItem>
                                    {TUTORS.map((t) => (
                                        <MenuItem key={t} value={t}>{t}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <ToggleButtonGroup
                                size="small"
                                exclusive
                                value={variant}
                                aria-label="dashboard view"
                                onChange={(_, v) => { if (v) setVariant(v); }}
                            >
                                <ToggleButton value="studentView" aria-label="student view" type="button">
                                    Main
                                </ToggleButton>
                                <ToggleButton value="tutorView" aria-label="tutor view" type="button">
                                    Tutor
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                    </Stack>

                    {/* Content area fills remaining height and scrolls if needed */}
                    <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto" }}>
                        {variant === "studentView" ? (
                            <Box sx={{ width: "100%", height: "100%" }}>
                                <DashboardStudent variant="studentView" rows={filteredRows} />
                            </Box>
                        ) : (
                            <Box sx={{ width: "100%", height: "100%" }}>
                                <DashboardTutorScatter variant="tutorView" rows={filteredRows} />
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
