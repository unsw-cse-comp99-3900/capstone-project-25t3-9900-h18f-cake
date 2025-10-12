import { useMemo, useState } from "react";
import {
    Box, Stack, IconButton, Typography,
    ToggleButton, ToggleButtonGroup,
    FormControl, InputLabel, Select, MenuItem
} from "@mui/material";
import DashboardStudent from "../component/dashboard-main";
import DashboardTutorScatter from "../component/dashboard-tutor-scatter";
import Tooltip from "@mui/material/Tooltip";
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import ExitConfirmPopup from "../component/exit-confirm";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";



// Demo data with assignment
const ALL_ROWS = [
    { studentID: 1, markBy: "Tutor 1", tutorMark: 78, aiMark: 85, difference: 7, comment: "Good improvement", assignment: "Assignment 1" },
    { studentID: 2, markBy: "Tutor 2", tutorMark: 95, aiMark: 92, difference: -3, comment: "This is a very very long comment This is a very very long commentThis is a very very long commentThis is a very very long comment------------------------------", assignment: "Assignment 2" },
    { studentID: 3, markBy: "Tutor 2", tutorMark: 82, aiMark: 76, difference: -6, comment: "", assignment: "Assignment 1" },
    { studentID: 4, markBy: "Tutor 3", tutorMark: 85, aiMark: 88, difference: 3, comment: "", assignment: "Assignment 3" },
];

const ASSIGNMENTS = ["Assignment 1", "Assignment 2", "Assignment 3"];
const TUTORS = ["Tutor 1", "Tutor 2", "Tutor 3"];

export default function Dashboard() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [variant, setVariant] = useState("studentView"); // 'studentView' | 'tutorView'
    const [selectedAssignment, setSelectedAssignment] = useState("all");
    const [selectedTutor, setSelectedTutor] = useState("all");

    const handleViewChange = (e, newValue) => {
        e?.preventDefault();
        if (newValue) setVariant(newValue); // avoid null in exclusive mode
    };

    const filteredRows = useMemo(() => {
        return ALL_ROWS.filter((r) => {
            const byAssignment = selectedAssignment === "all" || r.assignment === selectedAssignment;
            const byTutor = selectedTutor === "all" || r.markBy === selectedTutor;
            return byAssignment && byTutor;
        });
    }, [selectedAssignment, selectedTutor]);

    const isStudentView = variant === "studentView";

    return (

        <Box sx={{ p: { xs: 2, md: 5 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>

                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: 28, md: 48 }, lineHeight: 1.1 }}>
                    Dashboard
                </Typography>
                <Stack direction="row" justifyContent="flex-end" sx={{ width: "100%", mb: 1 }}>

                    <Tooltip title="Back to Course Page" arrow>
                        <IconButton
                            sx={{
                                p: 1,                   // padding around icon
                                borderRadius: "12px",   // round edges
                                "&:hover": {
                                    backgroundColor: "grey.100",      // <- subtle MUI-style hover bg
                                    transform: "translateY(-2px)",     // <- slight lift
                                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.26)", // <- softer than before
                                }
                            }}
                            aria-label="Back to Course Page"
                            onClick={() => {
                                navigate("/courses", { replace: true });
                            }}
                        >
                            <ArrowBackIcon sx={{ fontSize: 50 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Logout" arrow>
                        <IconButton
                            sx={{
                                borderRadius: "12px",   // round edges
                                "&:hover": {
                                    backgroundColor: "grey.100",      // <- subtle MUI-style hover bg
                                    transform: "translateY(-2px)",     // <- slight lift
                                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.26)", // <- softer than before
                                }
                            }}
                            aria-label="logout"
                            onClick={() => {
                                setLogoutOpen(true);
                            }}
                        >
                            <PowerSettingsNewIcon sx={{ fontSize: 50 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            <ExitConfirmPopup
                logoutOpen={logoutOpen}
                setLogoutOpen={setLogoutOpen}
                logout={logout}
                navigate={navigate}
            />
            <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
                sx={{ mb: 2, gap: 2 }}
            >
                <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    sx={{ width: "100%", justifyContent: "center" }}
                >                    {/* Choose assignment */}
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

                    {/* Choose tutor */}
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

                    {/* View toggle */}
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={variant}
                        onChange={handleViewChange}
                        aria-label="dashboard view"
                    >
                        <ToggleButton value="studentView" aria-label="student view" type="button">
                            Main Board
                        </ToggleButton>
                        <ToggleButton value="tutorView" aria-label="tutor view" type="button">
                            Tutor Scatter
                        </ToggleButton>

                    </ToggleButtonGroup>
                </Stack>
            </Stack>

            {isStudentView ? (
                <Box sx={{ width: "100%", height: "100%" }}>
                    <DashboardStudent variant="studentView" rows={filteredRows} />
                </Box>
            ) : (
                <Box sx={{ width: "100%", height: "100%" }}>
                    <DashboardTutorScatter rows={filteredRows} size={500} />
                </Box>
            )}
        </Box>
    );
}
