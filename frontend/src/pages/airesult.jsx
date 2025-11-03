import { useMemo, useState, useEffect } from "react";
import {
    Box, Stack, IconButton, Typography,
    ToggleButton, ToggleButtonGroup,
    FormControl, InputLabel, Select, MenuItem, Tooltip,
    Paper, Button, Chip, Alert, Card, CardContent, TextField
} from "@mui/material";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FlagIcon from "@mui/icons-material/Flag";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import API from "../api";

import DashboardStudent from "../component/dashboard-1-main";
import DashboardTutorScatter from "../component/dashboard-2-tutor-scatter";
import ExitConfirmPopup from "../component/exit-confirm";
import Sidebar, { SIDEBAR_WIDTH } from "../component/sidebar";

const TOPBAR_HEIGHT = 72;

// Review 组件
function ReviewDashboard({ rows }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [reviewComments, setReviewComments] = useState({});
    const [decisions, setDecisions] = useState({});
    const [selectedAssignment, setSelectedAssignment] = useState("all");

    // 筛选需要 Review 的项目
    const needsReviewRows = useMemo(() => {
        const filtered = rows.filter(row => 
            row.needsReview || Math.abs(row.difference) >= 5
        );
        
        if (selectedAssignment !== "all") {
            return filtered.filter(row => row.assignment === selectedAssignment);
        }
        
        return filtered;
    }, [rows, selectedAssignment]);

    const currentItem = needsReviewRows[currentIndex];

    const assignments = useMemo(() => 
        [...new Set(rows.map(item => item.assignment))], 
    [rows]);

    const handleDecision = (studentID, decision) => {
        setDecisions(prev => ({
            ...prev,
            [studentID]: { 
                decision, 
                comments: reviewComments[studentID] || "",
                timestamp: new Date().toLocaleString()
            }
        }));
        
        // 自动跳到下一个
        if (currentIndex < needsReviewRows.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleCommentChange = (studentID, comment) => {
        setReviewComments(prev => ({
            ...prev,
            [studentID]: comment
        }));
    };

    const getStatusChip = (status) => {
        const statusConfig = {
            pending: { color: "warning", label: "Needs Review" },
            approved: { color: "success", label: "Approved" },
            rejected: { color: "error", label: "Rejected" }
        };
        const config = statusConfig[status] || statusConfig.pending;
        return <Chip label={config.label} color={config.color} size="small" />;
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
            {/* Review Header */}
            <Paper sx={{ p: 2, mb: 2, bgcolor: "primary.main", color: "white" }}>
                <Typography variant="h4" gutterBottom>
                    Marking Review & Reconciliation
                </Typography>
                <Typography variant="body1">
                    Review submissions where AI and tutor marks differ significantly
                </Typography>
            </Paper>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 2 }}>
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

            {/* Review Progress */}
            <Paper sx={{ p: 2, mb: 2, bgcolor: "grey.100" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Progress: {currentIndex + 1} of {needsReviewRows.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {needsReviewRows.length - currentIndex - 1} remaining
                    </Typography>
                </Stack>
                <Box sx={{ width: "100%", height: 8, bgcolor: "white", borderRadius: 4, overflow: "hidden", mt: 1 }}>
                    <Box 
                        sx={{ 
                            height: "100%", 
                            bgcolor: "success.main", 
                            width: `${((currentIndex + 1) / needsReviewRows.length) * 100}%`,
                            transition: "width 0.3s ease"
                        }} 
                    />
                </Box>
            </Paper>

            {/* Current Item for Review */}
            {currentItem && (
                <Card sx={{ mb: 2, flexGrow: 1 ,overflowY: "auto"}}>
                    <CardContent sx={{ p: 3 }}>
                        <Stack spacing={3}>
                            {/* Header */}
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <Box>
                                    <Typography variant="h5" gutterBottom color="primary">
                                        {currentItem.studentName} ({currentItem.zid || `z${currentItem.studentID}`})
                                    </Typography>
                                    <Typography variant="h6" color="text.secondary">
                                        {currentItem.assignment} • Marked by: {currentItem.markBy}
                                    </Typography>
                                </Box>
                                {getStatusChip(currentItem.reviewStatus)}
                            </Box>

                            {/* Marks Comparison */}
                            <Paper variant="outlined" sx={{ p: 3, bgcolor: "grey.50" }}>
                                <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <FlagIcon color="warning" />
                                    Marks Comparison
                                </Typography>
                                <Stack direction="row" spacing={6} sx={{ mt: 2 }}>
                                    <Box sx={{ textAlign: "center" }}>
                                        <Typography variant="body1" color="text.secondary">Tutor Mark</Typography>
                                        <Typography variant="h3" color="primary.main" fontWeight="bold">
                                            {currentItem.tutorMark}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: "center" }}>
                                        <Typography variant="body1" color="text.secondary">AI Mark</Typography>
                                        <Typography variant="h3" color="secondary.main" fontWeight="bold">
                                            {currentItem.aiMark}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ textAlign: "center" }}>
                                        <Typography variant="body1" color="text.secondary">Difference</Typography>
                                        <Typography 
                                            variant="h3" 
                                            color={Math.abs(currentItem.difference) >= 5 ? "error.main" : "text.primary"}
                                            fontWeight="bold"
                                        >
                                            {currentItem.difference > 0 ? '+' : ''}{currentItem.difference}
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>

                            {/* Feedback */}
                            {currentItem.feedback && (
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="h6" gutterBottom>Tutor Feedback</Typography>
                                    <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                                        {currentItem.feedback}
                                    </Typography>
                                </Paper>
                            )}

                            {/* Review Comments */}
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6" gutterBottom>Your Review Comments</Typography>
                                <TextField
                                    multiline
                                    rows={4}
                                    value={reviewComments[currentItem.studentID] || ""}
                                    onChange={(e) => handleCommentChange(currentItem.studentID, e.target.value)}
                                    placeholder="Provide your assessment of the marking discrepancy and any additional comments..."
                                    fullWidth
                                    variant="outlined"
                                />
                            </Paper>

                            {/* Action Buttons */}
                            <Stack direction="row" spacing={2} justifyContent="flex-end">
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<CancelIcon />}
                                    onClick={() => handleDecision(currentItem.studentID, "rejected")}
                                    size="large"
                                    sx={{ minWidth: 140 }}
                                >
                                    Reject Marks
                                </Button>
                                <Button
                                    variant="contained"
                                    color="success"
                                    startIcon={<CheckCircleIcon />}
                                    onClick={() => handleDecision(currentItem.studentID, "approved")}
                                    size="large"
                                    sx={{ minWidth: 140 }}
                                >
                                    Approve Marks
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {/* Review Summary */}
            {Object.keys(decisions).length > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Review Summary</Typography>
                        <Stack spacing={2}>
                            {Object.entries(decisions).map(([studentID, decisionData]) => {
                                const item = rows.find((r) => String(r.studentID) === studentID);
                                return item ? (
                                    <Paper key={studentID} variant="outlined" sx={{ p: 2 }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight="bold">
                                                    {item.zid || `z${item.studentID}`} - {item.assignment}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {item.studentName} • {item.markBy}
                                                </Typography>
                                                {decisionData.comments && (
                                                    <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                                                        Comments: {decisionData.comments}
                                                    </Typography>
                                                )}
                                                <Typography variant="caption" color="text.secondary">
                                                    Reviewed: {decisionData.timestamp}
                                                </Typography>
                                            </Box>
                                            <Chip 
                                                label={decisionData.decision === "approved" ? "Approved" : "Rejected"} 
                                                color={decisionData.decision === "approved" ? "success" : "error"}
                                                size="medium"
                                            />
                                        </Stack>
                                    </Paper>
                                ) : null;
                            })}
                        </Stack>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}

export default function Airesult() {
    const [searchParams] = useSearchParams();
    const courseId = searchParams.get("courseId");
    const [course, setCourse] = useState("");
    const [term, setTerm] = useState("");
    const [dashboardOpen, setDashboardOpen] = useState("dashboard"); // "dashboard" or "review"
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState("");

    useEffect(() => {
        setCourse(searchParams.get("course") || "");
        setTerm(searchParams.get("term") || "");
    }, [searchParams]);

    useEffect(() => {
        if (!courseId) {
            setFetchError("缺少课程ID，请从课程列表进入查看。");
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

                    const needsReview =
                        item.needs_review !== undefined && item.needs_review !== null
                            ? item.needs_review
                            : Math.abs(diff ?? 0) >= 5;

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
                        needsReview,
                        reviewStatus: item.review_status || "pending",
                        reviewComments: item.review_comments || "",
                    };
                });

                setRows(mapped);
                setCourse((prev) => prev || data?.course || "");
                setTerm((prev) => prev || data?.term || "");
            })
            .catch((err) => {
                if (cancelled) return;
                setFetchError(err?.message || "加载AI结果失败，请稍后再试。");
                setRows([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [courseId]);

    const navigate = useNavigate();
    const { logout } = useAuth();
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [variant, setVariant] = useState("studentView");
    const [selectedAssignment, setSelectedAssignment] = useState("all");
    const [selectedTutor, setSelectedTutor] = useState("all");

    const availableAssignments = useMemo(() => {
        const uniq = new Set();
        rows.forEach((r) => {
            if (r.assignment) uniq.add(r.assignment);
        });
        return Array.from(uniq);
    }, [rows]);

    const availableTutors = useMemo(() => {
        const uniq = new Set();
        rows.forEach((r) => {
            if (r.markBy) uniq.add(r.markBy);
        });
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

    const filteredRows = useMemo(
        () =>
            rows.filter(
                (r) =>
                    (selectedAssignment === "all" || r.assignment === selectedAssignment) &&
                    (selectedTutor === "all" || r.markBy === selectedTutor)
            ),
        [rows, selectedAssignment, selectedTutor]
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

            {/* ── Sidebar + Main content ── */}
            <Box sx={{ display: "flex", flexGrow: 1 }}>
                <Sidebar topOffset={TOPBAR_HEIGHT} setDashboardOpen={setDashboardOpen}/>

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
                        // mx: "auto",
                        overflowY: "auto", // ✅ 关键：内容超出时显示垂直滚动条
                        scrollBehavior: "smooth",               
                        // maxHeight: "90vh",
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
                            正在加载AI评分结果...
                        </Alert>
                    )}
                    {fetchError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {fetchError}
                        </Alert>
                    )}
                    {!loading && !fetchError && rows.length === 0 && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            暂无评分记录。
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
                                            {availableTutors.map((t) => (
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

                            {/* Content area */}
                            <Box sx={{ flexGrow: 1, minHeight: 0, overflow: "auto" }}>
                                {variant === "studentView" ? (
                                    <Box sx={{ width: "100%", height: "100%" ,display: "flex", flexDirection: "column", overflowY: "auto"}}>
                                        <DashboardStudent variant="studentView" rows={filteredRows} />
                                    </Box>
                                ) : (
                                    <Box sx={{ width: "100%", height: "80%" ,display: "flex", flexDirection: "column", overflowY: "auto"}}>
                                        <DashboardTutorScatter variant="tutorView" rows={filteredRows} />
                                    </Box>
                                )}
                            </Box>
                        </>
                    ) : dashboardOpen === "review" ? (
                        // Review Dashboard
                        <ReviewDashboard rows={filteredRows} />
                    ) : (
                        <Typography variant="h4">Coming Soon...</Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
