import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import {
    Box, Stack, IconButton, Typography,
    ToggleButton, ToggleButtonGroup,
    FormControl, InputLabel, Select, MenuItem, Tooltip,
    Paper, Button, Chip, Alert, Card, CardContent, TextField,
} from "@mui/material";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RateReviewIcon from "@mui/icons-material/RateReview";
import FlagIcon from "@mui/icons-material/Flag";
import AddTaskIcon from "@mui/icons-material/AddTask";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DownloadIcon from "@mui/icons-material/Download";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import API from "../api";

import DashboardStudent from "../component/dashboard-1-main";
import DashboardTutorScatter from "../component/dashboard-2-tutor-scatter";
import ExitConfirmPopup from "../component/exit-confirm";
import { toast } from "sonner";

const TOPBAR_HEIGHT = 72;

const makeRowKey = (zid, assignmentId, assignment) => {
    const assignmentKey = assignmentId ?? assignment ?? "unassigned";
    return `${zid}-${assignmentKey}`;
};

const parseReviewMark = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    return Number(num.toFixed(2));
};

const clampReviewMark = (value) => {
    if (value === "" || value === null || value === undefined) {
        throw new Error("Revised mark cannot be empty");
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
        throw new Error("Revised mark must be a valid number");
    }
    return Math.max(0, Math.min(100, Number(num.toFixed(2))));
};

const rowsMatchByIdentity = (row, target) => {
    if (!row || !target) return false;
    if (row.zid !== target.zid) return false;
    if (target.assignmentId !== null && target.assignmentId !== undefined) {
        return row.assignmentId === target.assignmentId;
    }
    return (row.assignment || "") === (target.assignment || "");
};

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
            ...(currentItem?.assignmentId != null
                ? { assignment_id: currentItem.assignmentId }
                : {}),
            review_mark: reviewMarks[studentID] ?? 0,
            review_comments: reviewComments[studentID] ?? "",
            review_status: "reviewed",
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
                toast.success("All submissions have been reviewed!");
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
                No submissions require review at this time.
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
                                    <Typography variant="body1" sx={{ lineHeight: 1.6, whiteSpace: "pre-line" }}>
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
    const [aiCompleted, setAiCompleted] = useState(true);
    const [statusChecking, setStatusChecking] = useState(false);
    const statusPollRef = useRef(null);
    const [selectedRowIds, setSelectedRowIds] = useState([]);

    // Check per-course AI status; poll until completed
    useEffect(() => {
        if (!courseId) return;
        let cancelled = false;
        setStatusChecking(true);
        // clear any previous poller
        if (statusPollRef.current) {
            clearInterval(statusPollRef.current);
            statusPollRef.current = null;
        }
        API.markingResults
            .status(courseId)
            .then((s) => {
                if (cancelled) return;
                const done = Boolean(s?.ai_completed);
                setAiCompleted(done);
                if (!done) {
                    statusPollRef.current = setInterval(async () => {
                        try {
                            const s2 = await API.markingResults.status(courseId);
                            if (s2?.ai_completed) {
                                setAiCompleted(true);
                                if (statusPollRef.current) {
                                    clearInterval(statusPollRef.current);
                                    statusPollRef.current = null;
                                }
                            }
                        } catch (e) {
                            // ignore transient errors
                        }
                    }, 5000);
                }
            })
            .catch(() => {
                // If status endpoint fails, fall back to allowing view
                setAiCompleted(true);
            })
            .finally(() => {
                if (!cancelled) setStatusChecking(false);
            });
        return () => {
            cancelled = true;
            if (statusPollRef.current) {
                clearInterval(statusPollRef.current);
                statusPollRef.current = null;
            }
        };
    }, [courseId]);

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
        // wait until AI completes for this course
        if (!aiCompleted) {
            setLoading(false);
            setFetchError("");
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
                // Normalize then de-duplicate by (zid, assignmentId||assignment)
                const normalized = items.map((item, index) => {
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

                    const statusLower = String(item.review_status || "").toLowerCase();
                    const reviewedDone = ["reviewed", "completed", "resolved", "checked"].includes(statusLower);
                    const needsReview = reviewedDone ? false : item.needs_review === true;
                    const zid = item.zid ? String(item.zid) : `z${index + 1}`;
                    const studentIdValue = zid.replace(/^z/i, "") || zid;
                    const rowKey = makeRowKey(zid, item.assignment_id, item.assignment);

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
                        reviewMark: parseReviewMark(item.review_mark),
                        reviewComments: item.review_comments ?? "",
                        reviewStatus: item.review_status || "pending",
                        _reviewedDone: reviewedDone,
                        _raw: item,
                        rowKey,
                    };
                });

                const pickBetter = (a, b) => {
                    if (!a) return b;
                    if (!b) return a;
                    if (a._reviewedDone && !b._reviewedDone) return a;
                    if (!a._reviewedDone && b._reviewedDone) return b;
                    const aBoth = a.aiMark != null && a.tutorMark != null;
                    const bBoth = b.aiMark != null && b.tutorMark != null;
                    if (aBoth && !bBoth) return a;
                    if (!aBoth && bBoth) return b;
                    const aAny = a.aiMark != null || a.tutorMark != null;
                    const bAny = b.aiMark != null || b.tutorMark != null;
                    if (aAny && !bAny) return a;
                    if (!aAny && bAny) return b;
                    return a;
                };

                const byKey = new Map();
                for (const r of normalized) {
                    const key = `${r.zid}::${r.assignmentId ?? ""}::${r.assignment}`;
                    byKey.set(key, pickBetter(byKey.get(key), r));
                }

                const mapped = Array.from(byKey.values()).map((r) => {
                    const { _raw, _reviewedDone, ...rest } = r;
                    return rest;
                });

                setRows(mapped);
                setSelectedRowIds([]);
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
    }, [courseId, dashboardOpen, aiCompleted]);

    const navigate = useNavigate();
    const { logout } = useAuth();
    const [logoutOpen, setLogoutOpen] = useState(false);
    const [variant, setVariant] = useState("studentView");
    const [selectedAssignment, setSelectedAssignment] = useState("all");
    const [selectedTutor, setSelectedTutor] = useState("all");
    const handleReviewed = useCallback(
        ({ zid, assignmentId, assignment, reviewMark, reviewComments }) => {
            if (!zid) return;
            const sanitizedMark =
                reviewMark === undefined ? undefined : reviewMark === "" ? "" : parseReviewMark(reviewMark);
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
                        reviewMark:
                            sanitizedMark === undefined ? row.reviewMark : sanitizedMark,
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

    useEffect(() => {
        setSelectedRowIds((prev) => {
            if (!prev.length) return prev;
            const valid = new Set(rowsForUI.map((row) => row.rowKey));
            const next = prev.filter((id) => valid.has(id));
            return next.length === prev.length ? prev : next;
        });
    }, [rowsForUI]);

    const visibleRowIds = useMemo(() => rowsForUI.map((row) => row.rowKey), [rowsForUI]);

    const toggleRowSelection = useCallback((rowKey) => {
        if (!rowKey) return;
        setSelectedRowIds((prev) =>
            prev.includes(rowKey) ? prev.filter((id) => id !== rowKey) : [...prev, rowKey]
        );
    }, []);

    const toggleAllVisibleRows = useCallback(() => {
        if (!visibleRowIds.length) return;
        setSelectedRowIds((prev) => {
            const allVisibleSelected = visibleRowIds.every((id) => prev.includes(id));
            if (allVisibleSelected) {
                return prev.filter((id) => !visibleRowIds.includes(id));
            }
            const union = new Set([...prev, ...visibleRowIds]);
            return Array.from(union);
        });
    }, [visibleRowIds]);

    const selectionConfig = useMemo(() => {
        const hasVisibleRows = visibleRowIds.length > 0;
        const allVisibleSelected = hasVisibleRows && visibleRowIds.every((id) => selectedRowIds.includes(id));
        const anyVisibleSelected = hasVisibleRows && visibleRowIds.some((id) => selectedRowIds.includes(id));
        return {
            selectedIds: selectedRowIds,
            allSelected: allVisibleSelected,
            indeterminate: anyVisibleSelected && !allVisibleSelected,
            onToggleRow: toggleRowSelection,
            onToggleAll: toggleAllVisibleRows,
            disableToggleAll: !hasVisibleRows,
        };
    }, [selectedRowIds, visibleRowIds, toggleRowSelection, toggleAllVisibleRows]);

    const handleInlineReviewUpdate = useCallback(
        async (newRow, oldRow) => {
            const newMarkRaw = newRow.reviewMark;
            const oldMarkRaw = oldRow.reviewMark;
            const newComments = newRow.reviewComments ?? "";
            const oldComments = oldRow.reviewComments ?? "";
            const markChanged = newMarkRaw !== oldMarkRaw;
            const commentsChanged = newComments !== oldComments;

            if (!markChanged && !commentsChanged) {
                return oldRow;
            }

            if (!courseId) {
                const error = new Error("Missing course information");
                toast.error(error.message);
                throw error;
            }

            if (
                !markChanged &&
                (oldMarkRaw === "" || oldMarkRaw === null || oldMarkRaw === undefined)
            ) {
                const error = new Error("Please set a revised mark before editing comments.");
                toast.error(error.message);
                throw error;
            }

            const sanitizedMark = clampReviewMark(markChanged ? newMarkRaw : oldMarkRaw);
            const normalizedComments = commentsChanged ? newComments : oldComments;

            const payload = {
                zid: newRow.zid,
                assignment: newRow.assignment ?? "",
                ...(newRow.assignmentId != null ? { assignment_id: newRow.assignmentId } : {}),
                review_mark: sanitizedMark,
                review_comments: normalizedComments,
                review_status: "reviewed",
            };

            try {
                await API.markingResults.upsert(courseId, payload);
            } catch (error) {
                throw error instanceof Error ? error : new Error("Failed to save revised mark");
            }

            const patchedRow = {
                ...oldRow,
                ...newRow,
                reviewMark: markChanged ? sanitizedMark : oldRow.reviewMark,
                reviewComments: normalizedComments,
                needsReview: false,
                reviewStatus: "completed",
            };

            setRows((prev) => prev.map((row) => (rowsMatchByIdentity(row, newRow) ? patchedRow : row)));

            toast.success(`Revised details updated for ${newRow.studentName || newRow.zid}`);
            return patchedRow;
        },
        [courseId]
    );

    const handleInlineReviewError = useCallback((error) => {
        const message = error?.message || "Failed to save revised mark";
        toast.error(message);
    }, []);

    const handleDownloadCsv = useCallback(() => {
        const rowsToExport = rowsForUI.filter((row) => selectedRowIds.includes(row.rowKey));

        if (!rowsToExport.length) {
            toast.info("Select at least one row to download.");
            return;
        }

        const formatCell = (value) => {
            if (value === null || value === undefined) return "";
            const str = String(value).replace(/\r?\n/g, " ").trim();
            return /[",]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const headers = [
            "Student ID",
            "zID",
            "Student Name",
            "Assignment",
            "Marked By",
            "Tutor Mark",
            "AI Mark",
            "Difference",
            "AI Feedback",
            "Final Mark",
            "Revised Mark",
            "Revised Comments",
        ];

        const lines = [
            headers,
            ...rowsToExport.map((row) => [
                row.studentID ?? "",
                row.zid ?? "",
                row.studentName ?? "",
                row.assignment ?? "",
                row.markBy ?? "",
                row.tutorMark ?? "",
                row.aiMark ?? "",
                row.difference ?? "",
                row.feedback ?? "",
                row.reviewMark !== null && row.reviewMark !== undefined && row.reviewMark !== ""
                    ? row.reviewMark
                    : row.tutorMark ?? "",
                row.reviewMark ?? "",
                row.reviewComments ?? "",
            ]),
        ];

        const csv = lines.map((line) => line.map(formatCell).join(",")).join("\r\n");
        const safeCourse = (course || "course").replace(/\s+/g, "_");
        const safeTerm = (term || "term").replace(/\s+/g, "_");
        const stamp = new Date().toISOString().split("T")[0];
        const filename = `dashboard_${safeCourse}_${safeTerm}_${stamp}.csv`;

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Dashboard data downloaded.");
    }, [rowsForUI, course, term, selectedRowIds]);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* ── Title bar ── */}
            <Box
                sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    flexShrink: 0,
                }}
            >
                <Box
                    sx={{
                        height: TOPBAR_HEIGHT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        pl: { xs: 2, md: 4 },
                        pr: { xs: 2, md: 5 },
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
                        <Tooltip title="Dashboard view" arrow>
                            <IconButton
                                color={dashboardOpen === "dashboard" ? "primary" : "default"}
                                onClick={() => setDashboardOpen("dashboard")}
                                aria-label="Open dashboard view"
                            >
                                <DashboardIcon sx={{ fontSize: 32 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Review view" arrow>
                            <IconButton
                                color={dashboardOpen === "review" ? "primary" : "default"}
                                onClick={() => setDashboardOpen("review")}
                                aria-label="Open review view"
                            >
                                <RateReviewIcon sx={{ fontSize: 32 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Logout" arrow>
                            <IconButton onClick={() => setLogoutOpen(true)}>
                                <PowerSettingsNewIcon sx={{ fontSize: 32 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                </Box>
            </Box>

            {/* ── Main content ── */}
            <Box
                sx={{
                    display: "flex",
                    flexGrow: 1,
                    alignItems: "stretch",
                    minHeight: { xs: "auto", md: `calc(100vh - ${TOPBAR_HEIGHT}px)` },
                    overflow: "hidden",
                }}
            >
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        width: "100%",
                        height: { xs: "auto", md: `calc(100vh - ${TOPBAR_HEIGHT}px)` },
                        minHeight: 0,
                        display: "flex",
                        flexDirection: "column",
                        pt: 4,
                        pb: 4,
                        px: { xs: 2, md: 4 },
                        overflow: "hidden",
                        backgroundColor: "background.default",
                        scrollBehavior: "smooth",
                    }}
                >
                    <ExitConfirmPopup
                        logoutOpen={logoutOpen}
                        setLogoutOpen={setLogoutOpen}
                        logout={logout}
                        navigate={navigate}
                    />

                    {(!aiCompleted || statusChecking) && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            AI grading in progress for this course. Please wait...
                        </Alert>
                    )}
                    {loading && aiCompleted && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Loading AI results...
                        </Alert>
                    )}
                    {fetchError && aiCompleted && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {fetchError}
                        </Alert>
                    )}
                    {!loading && aiCompleted && !fetchError && rows.length === 0 && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            No results found
                        </Alert>
                    )}

                    {aiCompleted && dashboardOpen === "dashboard" ? (
                        <>
                            {/* Filters & toggles */}
                            <Stack
                                direction={{ xs: "column", md: "row" }}
                                alignItems={{ xs: "stretch", md: "center" }}
                                justifyContent="space-between"
                                sx={{ mb: 2, gap: 2, flexShrink: 0, width: "100%" }}
                            >
                                <Stack
                                    direction={{ xs: "column", lg: "row" }}
                                    spacing={2}
                                    alignItems="center"
                                    flexWrap="wrap"
                                    sx={{
                                        width: "100%",
                                        justifyContent: { xs: "flex-start", lg: "flex-start" },
                                        mb: { xs: 1, md: 0 },
                                        "& > *": { flexGrow: { xs: 1, lg: 0 } },
                                    }}
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
                                            TABLE
                                        </ToggleButton>
                                        <ToggleButton value="tutorView" aria-label="tutor view" type="button">
                                            CHART
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Stack>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<DownloadIcon />}
                                        onClick={handleDownloadCsv}
                                        disabled={!selectedRowIds.length}
                                        sx={{
                                            alignSelf: { xs: "stretch", md: "center" },
                                            textTransform: "none",
                                        fontWeight: 600,
                                        minWidth: { md: 200 },
                                    }}
                                >
                                    Download CSV
                                </Button>
                            </Stack>

                            {/* Content area */}
                            <Box
                                sx={{
                                    flexGrow: 1,
                                    minHeight: 0,
                                    overflowY: "auto",
                                    overflowX: "auto",
                                }}
                            >
                                {variant === "studentView" ? (
                                    <Box
                                        sx={{
                                            minWidth: "100%",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            overflowY: "auto",
                                            pr: 1,
                                        }}
                                    >
                                        <DashboardStudent
                                            variant="studentView"
                                            rows={rowsForUI}
                                            allowInlineReviewEdit
                                            processRowUpdate={handleInlineReviewUpdate}
                                            onProcessRowUpdateError={handleInlineReviewError}
                                            selectionConfig={selectionConfig}
                                        />
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            minWidth: "100%",
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
                    ) : aiCompleted && dashboardOpen === "review" ? (
                        <ReviewDashboard rows={rowsForUI} courseId={courseId} onReviewed={handleReviewed} />
                    ) : (
                        <Typography variant="h4">Coming Soon...</Typography>
                    )}
                </Box>
            </Box>
        </Box>
    );
}
