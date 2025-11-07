import { useMemo, useState, useEffect, useCallback } from "react";
import {
    Box, Stack, IconButton, Typography,
    ToggleButton, ToggleButtonGroup,
    FormControl, InputLabel, Select, MenuItem, Tooltip,
    Paper, Button, Chip, Alert, Card, CardContent, TextField,
} from "@mui/material";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FlagIcon from "@mui/icons-material/Flag";
import AddTaskIcon from "@mui/icons-material/AddTask";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import API from "../api";

import DashboardStudent from "../component/dashboard-1-main";
import DashboardTutorScatter from "../component/dashboard-2-tutor-scatter";
import ExitConfirmPopup from "../component/exit-confirm";
import Sidebar, { SIDEBAR_WIDTH } from "../component/sidebar";
import { toast } from "sonner";

const TOPBAR_HEIGHT = 72;

/** ─────────────────────────────────────────────────────────────────────────────
 * ReviewDashboard
 * - Now posts to API instead of only logging
 * - Receives `courseId` so the backend can identify the context
 * ────────────────────────────────────────────────────────────────────────────*/
function ReviewDashboard({ rows, courseId, onReviewed = () => {} }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [reviewComments, setReviewComments] = useState({});
    const [selectedAssignment, setSelectedAssignment] = useState("all");
    const [reviewMarks, setReviewMarks] = useState({});
    const [saving, setSaving] = useState(false);

    const needsReviewRows = useMemo(() => {
        return rows.filter(
            (row) =>
                row.needsReview === true &&
                (selectedAssignment === "all" || row.assignment === selectedAssignment)
        );
    }, [rows, selectedAssignment]);


    const currentItem = needsReviewRows[currentIndex];

    const assignments = useMemo(
        () => [...new Set(rows.map((item) => item.assignment))],
        [rows]
    );

    // ⟵ UPDATED: call API to persist revised mark/comments
    const handleDecision = async (studentID) => {
        const totalBefore = needsReviewRows.length;
        const payload = {
            zid: currentItem?.zid ?? String(studentID),
            assignment: currentItem?.assignment ?? "",
            assignment_id: currentItem?.assignmentId ?? null,
            needsReview: false,
            review_mark: reviewMarks[studentID] ?? 0,
            review_comments: reviewComments[studentID] ?? "",
        };

        try {
            setSaving(true);
            await API.markingResults.upsert(courseId, payload); 
            toast.success(
                `Revised mark saved for course: ${courseId} ` +
                `assignment: ${payload.assignment} ` +
                `ZID: ${payload.zid} — ` +
                `Mark: ${payload.review_mark} ` +
                `Comments: ${payload.review_comments}`
                );

            onReviewed({
                zid: payload.zid,
                assignmentId: payload.assignment_id,
                assignment: payload.assignment,
                reviewMark: payload.review_mark,
                reviewComments: payload.review_comments,
            });

            const remaining = Math.max(0, totalBefore - 1);
            if (remaining === 0) {
                toast.success("🎉 All submissions have been reviewed!");
                setCurrentIndex(0);
            } else {
                setCurrentIndex((prev) => Math.min(prev, Math.max(0, remaining - 1)));
            }
        } catch (e) {
            toast.error(e?.message || "Failed to save revised mark");
        } finally {
            setSaving(false);
        }
    };

    const handleMarkChange = (studentID, revisedMark) => {
        const n = revisedMark === "" ? "" : Number(revisedMark);
        const clamped =
            revisedMark === "" || Number.isNaN(n) ? "" : Math.max(0, Math.min(100, n));
        setReviewMarks((prev) => ({ ...prev, [studentID]: clamped }));
    };

    const handleCommentChange = (studentID, comment) => {
        setReviewComments((prev) => ({ ...prev, [studentID]: comment }));
    };

    if (needsReviewRows.length === 0) {
        return (
            <Alert severity="success" sx={{ mt: 2 }}>
                No submissions require review at this time. All marks are within acceptable range.
            </Alert>
        );
    }

    return (
        <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <Paper sx={{ p: 2, bgcolor: "primary.main", color: "white" }}>
                <Typography variant="h6" gutterBottom>
                    Marking Review & Reconciliation
                </Typography>
            </Paper>

            {/* Filters */}
            <Paper sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Filter by Assignment</InputLabel>
                        <Select
                            value={selectedAssignment}
                            onChange={(e) => {
                                setSelectedAssignment(e.target.value);
                                setCurrentIndex(0);
                            }}
                            label="Filter by Assignment"
                        >
                            <MenuItem value="all">All Assignments</MenuItem>
                            {assignments.map((assignment) => (
                                <MenuItem key={assignment} value={assignment}>
                                    {assignment}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Chip
                        label={`${needsReviewRows.length} items need review`}
                        color="warning"
                        variant="outlined"
                    />
                </Stack>
            </Paper>

            {/* Progress */}
            <Paper sx={{ p: 2, bgcolor: "grey.100" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Progress: {currentIndex + 1} of {needsReviewRows.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {needsReviewRows.length - currentIndex - 1} remaining
                    </Typography>
                </Stack>
                <Box sx={{ width: "100%", height: 8, bgcolor: "white", borderRadius: 4, overflow: "hidden" }}>
                    <Box
                        sx={{
                            height: "100%",
                            bgcolor: "success.main",
                            width: `${((currentIndex + 1) / needsReviewRows.length) * 100}%`,
                            transition: "width 0.3s ease",
                        }}
                    />
                </Box>
            </Paper>

            {/* Current item */}
            {currentItem && (
                <Card sx={{ flexGrow: 1, overflowY: "auto" }}>
                    <CardContent >
                        <Stack spacing={3}>
                            {/* Header */}
                                <Box sx={{ mb: 0, mt: 0, p: 0 }}>
                                    <Typography
                                        sx = {{ fontSize: "1.2rem"}}
                                        gutterBottom
                                        color="primary"
                                    >
                                        Student ID: {currentItem.studentName} Assignment Name: {currentItem.assignment}
                                    </Typography>
                            </Box>

                            {/* Marks Comparison */}
                            <Paper variant="outlined" sx={{p: 2, bgcolor: "grey.50" }}>
                                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <FlagIcon color="warning" />
                                    Marks Comparison
                                </Typography>
                                <Stack direction="row" spacing={6} >
                                    <Box sx={{ textAlign: "center" }}>
                                        <Typography variant="body1" color="text.secondary">Tutor Mark</Typography>
                                        <Typography variant="h4" color="primary.main" fontWeight="bold">
                                            {currentItem.tutorMark}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: "center" }}>
                                        <Typography variant="body1" color="text.secondary">AI Mark</Typography>
                                        <Typography variant="h4" color="secondary.main" fontWeight="bold">
                                            {currentItem.aiMark}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: "center" }}>
                                        <Typography variant="body1" color="text.secondary">Difference</Typography>
                                        <Typography
                                            variant="h4"
                                            color={Math.abs(currentItem.difference ?? 0) >= 5 ? "error.main" : "text.primary"}
                                            fontWeight="bold"
                                        >
                                            {(currentItem.difference ?? 0) > 0 ? "+" : ""}
                                            {currentItem.difference ?? 0}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>

                            {/* Feedback */}
                            {!!currentItem.feedback && (
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                                    <Typography variant="h6" gutterBottom>AI Marking Feedback</Typography>
                                    <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                                        {currentItem.feedback}
                                    </Typography>
                                </Paper>
                            )}

                            {/* Review */}
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <AddTaskIcon color="warning" />
                                    Review
                                </Typography>

                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 2,
                                        alignItems: "stretch",
                                        flexDirection: { xs: "column", sm: "row" },
                                    }}
                                >
                                    {/* Left: Revised mark */}
                                    <TextField
                                        label="Revised Marks"
                                        type="number"
                                        value={reviewMarks[currentItem.studentID] ?? ""}
                                        onChange={(e) => handleMarkChange(currentItem.studentID, e.target.value)}
                                        variant="outlined"
                                        inputProps={{ min: 0, max: 100, step: 1 }}
                                        sx={{ width: { xs: "100%", sm: 180 } }}
                                        helperText="0-100"
                                    />

                                    {/* Right: Comments */}
                                    <TextField
                                        label="Your Review Comments"
                                        multiline
                                        rows={4}
                                        value={reviewComments[currentItem.studentID] ?? ""}
                                        onChange={(e) => handleCommentChange(currentItem.studentID, e.target.value)}
                                        placeholder="Provide your assessment of the marking discrepancy and any additional comments..."
                                        fullWidth
                                        variant="outlined"
                                    />
                                </Box>
                            </Paper>

                            {/* Actions */}
                            <Stack direction="row" spacing={2} justifyContent="flex-end">
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircleIcon />}
                                    onClick={() => handleDecision(currentItem.studentID)}
                                    size="large"
                                    sx={{ minWidth: 200 }}
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Submit with revised mark"}
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}

/** ─────────────────────────────────────────────────────────────────────────────
 * Airesult page
 * ────────────────────────────────────────────────────────────────────────────*/
export default function Airesult() {
    const [searchParams] = useSearchParams();
    const courseId = searchParams.get("courseId");
    const [course, setCourse] = useState("");
    const [term, setTerm] = useState("");
    const [dashboardOpen, setDashboardOpen] = useState("dashboard");
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState("");

    useEffect(() => {
        setCourse(searchParams.get("course") || "");
        setTerm(searchParams.get("term") || "");
    }, [searchParams]);

    useEffect(() => {
        if (!courseId) {
            setFetchError("Missing course ID, please try again.");
            setRows([]);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setFetchError("");
        setRows([]);

        API.markingResults
            .byCourseId(courseId)
            .then((data) => {
                if (cancelled) return;
                const items = Array.isArray(data?.marking_results) ? data.marking_results : [];
                const mapped = items.map((item, index) => {
                    const aiRaw = item.ai_total ?? item.aiMark ?? null;
                    const tutorRaw = item.tutor_total ?? item.tutorMark ?? null;
                    const ai = aiRaw !== null && aiRaw !== undefined ? Number(aiRaw) : null;
                    const tutor = tutorRaw !== null && tutorRaw !== undefined ? Number(tutorRaw) : null;
                    const hasAi = ai !== null && !Number.isNaN(ai);
                    const hasTutor = tutor !== null && !Number.isNaN(tutor);

                    let diff = item.difference;
                    if (diff !== undefined && diff !== null) {
                        const diffNum = Number(diff);
                        diff = Number.isNaN(diffNum) ? 0 : Number(diffNum.toFixed(2));
                    } else if (hasAi && hasTutor) {
                        diff = Number((ai - tutor).toFixed(2));
                    } else {
                        diff = 0;
                    }

                    const needsReview = item.needs_review === true;
                    const zid = item.zid ? String(item.zid) : `z${index + 1}`;
                    const studentIdValue = zid.replace(/^z/i, "") || zid;

                    return {
                        studentID: studentIdValue,
                        zid,
                        studentName: item.student_name || item.studentName || zid,
                        markBy: item.marked_by || item.markBy || "Unknown",
                        tutorMark: hasTutor ? Number(tutor.toFixed(2)) : null,
                        aiMark: hasAi ? Number(ai.toFixed(2)) : null,
                        difference: diff,
                        feedback: item.ai_feedback || item.feedback || "",
                        assignment: item.assignment || "Unassigned",
                        assignmentId: item.assignment_id ?? null,
                        needsReview,
                        reviewMark: item.review_mark ?? "",
                        reviewComments: item.review_comments ?? "",
                        reviewStatus: item.review_status || "pending",
                    };
                });

                setRows(mapped);
                setCourse((prev) => prev || data?.course || "");
                setTerm((prev) => prev || data?.term || "");
            })
            .catch((err) => {
                if (cancelled) return;
                setFetchError(err?.message || "Loading AI failed");
                setRows([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [courseId, dashboardOpen]);

    const navigate = useNavigate();
    const { logout } = useAuth();
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [variant, setVariant] = useState("studentView");
    const [selectedAssignment, setSelectedAssignment] = useState("all");
    const [selectedTutor, setSelectedTutor] = useState("all");
    const handleReviewed = useCallback(
        ({ zid, assignmentId, assignment, reviewMark, reviewComments }) => {
            if (!zid) return;
            setRows((prev) =>
                prev.map((row) => {
                    if (row.zid !== zid) return row;
                    const matchesAssignment =
                        assignmentId != null
                            ? row.assignmentId === assignmentId
                            : assignment
                                ? row.assignment === assignment
                                : true;
                    if (!matchesAssignment) return row;
                    return {
                        ...row,
                        needsReview: false,
                        reviewMark: reviewMark ?? row.reviewMark,
                        reviewComments: reviewComments ?? row.reviewComments,
                        reviewStatus: "completed",
                    };
                })
            );
        },
        []
    );

    // ⟵ UPDATED: derive purely from API rows
    const availableAssignments = useMemo(() => {
        const uniq = new Set();
        rows.forEach((r) => r.assignment && uniq.add(r.assignment));
        return Array.from(uniq);
    }, [rows]);

    const availableTutors = useMemo(() => {
        const uniq = new Set();
        rows.forEach((r) => r.markBy && uniq.add(r.markBy));
        return Array.from(uniq);
    }, [rows]);

    useEffect(() => {
        if (selectedAssignment !== "all" && !availableAssignments.includes(selectedAssignment)) {
            setSelectedAssignment("all");
        }
    }, [availableAssignments, selectedAssignment]);

    useEffect(() => {
        if (selectedTutor !== "all" && !availableTutors.includes(selectedTutor)) {
            setSelectedTutor("all");
        }
    }, [availableTutors, selectedTutor]);

    // ⟵ UPDATED: filter only from real rows
    const filteredRows = useMemo(() => {
        return rows.filter(
            (r) =>
                (selectedAssignment === "all" || r.assignment === selectedAssignment) &&
                (selectedTutor === "all" || r.markBy === selectedTutor)
        );
    }, [rows, selectedAssignment, selectedTutor]);

    // Keep difference consistent; if it already exists, keep it; else compute defensively
    const rowsForUI = useMemo(
        () =>
            filteredRows.map((r) => {
                if (typeof r.difference === "number") return r;
                const ai = r.aiMark ?? null;
                const tutor = r.tutorMark ?? null;
                const diff =
                    ai !== null && tutor !== null && !Number.isNaN(ai) && !Number.isNaN(tutor)
                        ? Number((ai - tutor).toFixed(2))
                        : 0;
                return { ...r, difference: diff };
            }),
        [filteredRows]
    );

    return (
        <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            {/* ── Title bar ── */}
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

                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }} alignItems="center">
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

            {/* ── Sidebar + Main content ── */}
            <Box sx={{ display: "flex", flexGrow: 1 }}>
                <Sidebar topOffset={TOPBAR_HEIGHT} setDashboardOpen={setDashboardOpen} />

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        ml: { md: `${SIDEBAR_WIDTH}px` },
                        width: { xs: "100%", md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
                        height: `calc(100vh - ${TOPBAR_HEIGHT}px)`,
                        display: "flex",
                        flexDirection: "column",
                        pt: 4,
                        px: 4,
                        maxWidth: "90vw",
                        overflowY: "auto",
                        scrollBehavior: "smooth",
                        mx: "auto",
                    }}
                >
                    <ExitConfirmPopup
                        logoutOpen={logoutOpen}
                        setLogoutOpen={setLogoutOpen}
                        logout={logout}
                        navigate={navigate}
                    />

                    {loading && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Loading AI results...
                        </Alert>
                    )}
                    {fetchError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {fetchError}
                        </Alert>
                    )}
                    {!loading && !fetchError && rows.length === 0 && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            No results found
                        </Alert>
                    )}

                    {dashboardOpen === "dashboard" ? (
                        <>
                            {/* Filters & toggles */}
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
                                            {availableAssignments.map((a) => (
                                                <MenuItem key={a} value={a}>
                                                    {a}
                                                </MenuItem>
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
                                            {availableTutors.map((t) => (
                                                <MenuItem key={t} value={t}>
                                                    {t}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <ToggleButtonGroup
                                        size="small"
                                        exclusive
                                        value={variant}
                                        aria-label="dashboard view"
                                        onChange={(_, v) => {
                                            if (v) setVariant(v);
                                        }}
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

                            {/* Content area */}
                            <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto" }}>
                                {variant === "studentView" ? (
                                    <Box
                                        sx={{
                                            width: "100%",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            overflowY: "auto",
                                        }}
                                    >
                                        <DashboardStudent variant="studentView" rows={rowsForUI} />
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            width: "100%",
                                            height: "80%",
                                            display: "flex",
                                            flexDirection: "column",
                                            overflowY: "auto",
                                        }}
                                    >
                                        <DashboardTutorScatter variant="tutorView" rows={rowsForUI} />
                                    </Box>
                                )}
                            </Box>
                        </>
                    ) : dashboardOpen === "review" ? (
                        <ReviewDashboard rows={rowsForUI} courseId={courseId} onReviewed={handleReviewed} />
                    ) : (
                        <Typography variant="h4">Coming Soon...</Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
