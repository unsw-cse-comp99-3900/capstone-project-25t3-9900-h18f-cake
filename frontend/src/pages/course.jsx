import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { Box, Stack, Grid, IconButton, Typography, Tooltip } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CourseCard from "../component/course-card";
import CourseAdd from "../component/course-add";
import CourseDelete from "../component/course-delete";
import CourseActionDialog from "../component/course-action";
import ExitConfirmPopup from "../component/exit-confirm";
import { toast } from "sonner";
import API from "../api";

const TOKEN_KEY = "token";

export default function CoursesPage() {
    const [termCourse, setTermCourse] = useState([]);

    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isLoggedIn = user !== null || !!localStorage.getItem(TOKEN_KEY);

    useEffect(() => {
        if (!isLoggedIn) {
            navigate("/");
            return;
        }

        API.courses
            .list()
            .then((data) => {
                const mapped = (Array.isArray(data) ? data : []).map((c) => ({
                    _id: c.id,
                    code: c.code,
                    title: c.name,
                    year_term: c.term || "untitled",
                }));
                setTermCourse(mapped);
            })
            .catch((err) => {
                toast.error(err?.message || "Failed to fetch courses");
            });
    }, [isLoggedIn, navigate]);

    const [showDeleteCourse, setShowDeleteCourse] = useState(false);
    const [ShowManageCourse, setShowManageCourse] = useState(false);
    const [addCourse, setAddCourse] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const [logoutOpen, setLogoutOpen] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [statusPollId, setStatusPollId] = useState(null);

    // AI status per course id: { [id]: { loading, aiCompleted, pendingAssignments, stuckAssignments, error } }
    const [aiStatusById, setAiStatusById] = useState({});

    const fetchCourseStatus = async (courseId) => {
        if (!courseId) return;
        setAiStatusById((prev) => ({
            ...prev,
            [courseId]: {
                ...(prev[courseId] || {}),
                loading: true,
                error: undefined,
            },
        }));
        try {
            const data = await API.markingResults.status(courseId);
            const aiCompleted = Boolean(data?.ai_completed);
            setAiStatusById((prev) => ({
                ...prev,
                [courseId]: {
                    loading: false,
                    aiCompleted,
                    pendingAssignments: data?.pending_assignments || [],
                    stuckAssignments: data?.stuck_assignments || [],
                },
            }));
        } catch (e) {
            setAiStatusById((prev) => ({
                ...prev,
                [courseId]: {
                    loading: false,
                    aiCompleted: false,
                    error: e?.message || "",
                    pendingAssignments: [],
                    stuckAssignments: [],
                },
            }));
        }
    };

    const grouped = useMemo(() => {
        return termCourse.reduce((acc, c) => {
            (acc[c.year_term] ||= []).push(c);
            return acc;
        }, {});
    }, [termCourse]);

    const requestDelete = (course) => {
        setPendingDelete(course);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!pendingDelete) return;
        setTermCourse((prev) => prev.filter((c) => c.code !== pendingDelete.code));
        setConfirmOpen(false);

        const id = pendingDelete._id;
        const deletedTitle = pendingDelete.title;
        setPendingDelete(null);

        API.courses
            .remove(id)
            .then(() => {
                toast.success(`Successfully deleted course ${deletedTitle}`);
            })
            .catch((e) => {
                toast.error(e?.message || "Delete failed");
            });
    };

    const handleCancelDelete = () => {
        setConfirmOpen(false);
        setPendingDelete(null);
    };

    const handleAddCourse = (newCourse) => {
        const code = (newCourse?.code || "").trim();
        const name = (newCourse?.title || newCourse?.name || "").trim();
        const term = (newCourse?.year_term || newCourse?.term || "").trim();
        if (!code) { toast.error("Course code is required"); return; }
        if (!name) { toast.error("Course name is required"); return; }

        API.courses
            .create({ code, name, term: term || undefined })
            .then((created) => {
                const mapped = {
                    _id: created.id,
                    code: created.code,
                    title: created.name,
                    year_term: created.term || "untitled",
                };
                setTermCourse((prev) => [...prev, mapped]);
                setAddCourse(false);
                toast.success(`Created course: ${mapped.title}`);
            })
            .catch((err) => {
                toast.error(err?.message || "Create failed");
            });
    };

    const openActions = (course) => {
        setSelectedCourse(course);
        setDialogOpen(true);
        if (course?._id) {
            // Optimistically set loading state so the View button is disabled immediately
            setAiStatusById((prev) => ({ ...prev, [course._id]: { ...(prev[course._id] || {}), loading: true, aiCompleted: false } }));
        }
        // Fetch latest AI status for this course
        fetchCourseStatus(course?._id);
        // Start polling while dialog is open to keep status fresh
        if (course?._id) {
            if (statusPollId) clearInterval(statusPollId);
            const id = setInterval(() => fetchCourseStatus(course._id), 5000);
            setStatusPollId(id);
        }
    };

    const closeActions = () => {
        setDialogOpen(false);
        setSelectedCourse(null);
        if (statusPollId) {
            clearInterval(statusPollId);
            setStatusPollId(null);
        }
    };

    const goUpload = () => {
        const c = selectedCourse;
        const term = c.term || c.year_term || "";
        closeActions();
        navigate(
            `/fileupload?course=${encodeURIComponent(c.code)}&term=${encodeURIComponent(term)}`,
            { replace: false }
        );
    };

    const goView = async () => {
        const c = selectedCourse;
        if (!c?._id) {
            toast.error("Missing course identifier.");
            return;
        }
        // Refresh status just before navigating to avoid stale cache
        let freshDone = null;
        try {
            const fresh = await API.markingResults.status(c._id);
            freshDone = !!fresh?.ai_completed;
            setAiStatusById((prev) => ({
                ...prev,
                [c._id]: {
                    aiCompleted: freshDone,
                    loading: false,
                    pendingAssignments: fresh?.pending_assignments || [],
                    stuckAssignments: fresh?.stuck_assignments || [],
                },
            }));
        } catch (e) {
            // if status check fails, be conservative and block navigation
            freshDone = false;
        }
        const term = c.term || c.year_term || "";
        // if (!freshDone) {
        //     toast.info("Results are still being prepared for this course. Please try again shortly.");
        //     return;
        // }
        closeActions();
        navigate(
            `/airesult?course=${encodeURIComponent(c.code)}&term=${encodeURIComponent(term)}&courseId=${encodeURIComponent(c._id)}`,
            { replace: false }
        );
    };


    const headerIconSx = {
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "3px solid",
        borderColor: "grey.500",
        color: "grey.700",
        "&:hover": { bgcolor: "grey.100" },
    };

    return (
        <Box sx={{ px: { xs: 4, sm: 12, md: 25 }, py: { xs: 6, sm: 8, md: 10 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: 28, md: 48 }, lineHeight: 1.1 }}>
                    Courses
                </Typography>
                <Stack direction="row" spacing={2}>
                    <>
                    
                        {/* add course icon */}
                        <IconButton
                            sx={headerIconSx}
                            aria-label="add course"
                            onClick={() => {
                                setAddCourse(true);
                                setShowDeleteCourse(false);
                                setShowManageCourse(false);
                            }}
                        >
                            <AddCircleOutlineIcon />
                        </IconButton>

                        {/* Remove course icon */}
                        <IconButton
                            sx={headerIconSx}
                            aria-label="toggle delete mode"
                            onClick={() => {
                                setShowDeleteCourse((p) => !p);
                                setShowManageCourse(false);
                            }}
                        >
                            <RemoveCircleOutlineIcon />
                        </IconButton>

                        {/* logout icon */}
                        <IconButton
                            sx={headerIconSx}
                            aria-label="logout"
                            onClick={() => {
                                setShowDeleteCourse(false);
                                setShowManageCourse(false);
                                setLogoutOpen(true);
                            }}
                        >
                            <PowerSettingsNewIcon />
                        </IconButton>
                        <Tooltip title="System logs (admin)">
                            <IconButton
                                sx={headerIconSx}
                                aria-label="view system logs"
                                onClick={() => {
                                    navigate("/admin/logs");
                                }}
                            >
                                <ReceiptLongIcon />
                            </IconButton>
                        </Tooltip>
                    </>
                </Stack>
            </Stack>

            <Stack spacing={10}>
                {Object.entries(grouped).map(([year_term, items]) => (
                    <Box key={year_term}>
                        <Typography variant="overline" sx={{ color: "grey.600", letterSpacing: ".12em", fontWeight: 800 }}>
                            {year_term.toUpperCase()}
                        </Typography>

                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            {items.map((c) => (
                                <Box key={c.code} sx={{ display: "flex" }}>
                                    <CourseCard
                                        code={c.code}
                                        title={c.title}
                                        showDelete={showDeleteCourse}
                                        showManage={ShowManageCourse}
                                        onDelete={() => requestDelete(c)}
                                        onOpen={() => {
                                            openActions(c);
                                        }}
                                    />
                                </Box>
                            ))}
                        </Grid>
                    </Box>
                ))}
            </Stack>

            <CourseAdd open={addCourse} onClose={() => setAddCourse(false)} onAdd={handleAddCourse} />

            <CourseDelete
                open={confirmOpen}
                onClose={handleCancelDelete}
                onDelete={handleConfirmDelete}
                course={pendingDelete}
            />

            <CourseActionDialog
                open={dialogOpen}
                course={selectedCourse}
                onClose={closeActions}
                onUpload={goUpload}
                onView={goView}
                // status props to control the View button
                viewStatus={selectedCourse ? aiStatusById[selectedCourse._id] : undefined}
            />

            <ExitConfirmPopup
                logoutOpen={logoutOpen}
                setLogoutOpen={setLogoutOpen}
                logout={logout}
                navigate={navigate}
            />
        </Box>
    );
}
