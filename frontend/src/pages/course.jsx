import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Grid, Typography, IconButton } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
// import InfoOutlined from "@mui/icons-material/InfoOutlined";
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import { toast } from "sonner";

import CourseCard from "../component/course-card";   // ← use the single shared component
import CourseAdd from "../component/course-add";
import CourseDelete from "../component/course-delete";
import CourseManage from "../component/course-manage";

export default function CoursesPage() {
    const [termCourse, setTermCourse] = useState([
        { term: "2025 Term 3", code: "COMP9321", title: "Data Services Engineering", coordinator: "Jessie" },
        { term: "2025 Term 1", code: "COMP9334", title: "Capacity Planning of Computer Systems and Networks", coordinator: "Jessie" },
        { term: "2025 Term 1", code: "COMP9323", title: "Cloud Computing", coordinator: ["Jessie", "Peter"] },
        { term: "2025 Term 1", code: "COMP9324", title: "Cloud Computing", coordinator: "Jessie" },
        { term: "2025 Term 1", code: "COMP9325", title: "Cloud Computing", coordinator: "Jessie" },
        { term: "2025 Term 1", code: "COMP9326", title: "Cloud Computing", coordinator: "Peter" },
        { term: "2025 Term 1", code: "COMP9327", title: "Data Analytics", coordinator: "Jessie" },
    ]);

    const navigate = useNavigate();
    const isAdmin = true;
    const [showDeleteCourse, setShowDeleteCourse] = useState(false);
    const [ShowManageCourse, setShowManageCourse] = useState(false);
    const [addCourse, setAddCourse] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [manageOpen, setManageOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null); // { term, code, title }
    const [pendingManage, setPendingManage] = useState(null); // { term, code, title }

    const requestDelete = (course) => { setPendingDelete(course); setConfirmOpen(true); };
    const requestManage = (course) => { setPendingManage(course); setManageOpen(true); };

    const handleConfirmDelete = () => {
        if (!pendingDelete) return;
        setTermCourse(prev => prev.filter(c => c.code !== pendingDelete.code));
        setConfirmOpen(false);
        setPendingDelete(null);
        toast.success("Course deleted");
    };
    const handleCancelDelete = () => { setConfirmOpen(false); setPendingDelete(null); };

    const handleConfirmManage = (newCourse) => {
        setTermCourse(prev => prev.map(c => c.code === newCourse.code ? newCourse : c));
        setManageOpen(false);
        toast.success("Course updated");
    };

    const handleAddCourse = (newCourse) => {
        setTermCourse(prev => [...prev, newCourse]);
        setAddCourse(false);
        toast.success("Course added");
    };

    const grouped = useMemo(() => {
        return termCourse.reduce((acc, c) => { (acc[c.term] ||= []).push(c); return acc; }, {});
    }, [termCourse]);

    const headerIconSx = {
        width: 44, height: 44, borderRadius: "50%",
        border: "3px solid", borderColor: "grey.500", color: "grey.700",
        "&:hover": { bgcolor: "grey.100" },
    };

    return (
        <Box sx={{ px: { xs: 4, md: 10 }, py: { xs: 6, md: 12 } }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: 28, md: 48 }, lineHeight: 1.1 }}>
                    Courses
                </Typography>
                <Stack direction="row" spacing={2}>
                    {isAdmin && (
                        <>
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

                            <IconButton
                                sx={headerIconSx}
                                aria-label="settings"
                                onClick={() => {
                                    setShowManageCourse((p) => !p);
                                    setShowDeleteCourse(false);
                                }}
                            >
                                <BuildCircleIcon />
                            </IconButton>
                        </>
                    )}
                </Stack>

            </Stack>

            {/* Terms & cards */}
            <Stack spacing={6}>
                {Object.entries(grouped).map(([term, items]) => (
                    <Box key={term}>
                        <Typography variant="overline" sx={{ color: "grey.600", letterSpacing: ".12em", fontWeight: 800 }}>
                            {term.toUpperCase()}
                        </Typography>

                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            {items.map((c) => (
                                <Grid key={c.code} item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
                                    <CourseCard
                                        code={c.code}
                                        title={c.title}
                                        showDelete={showDeleteCourse}
                                        showManage={ShowManageCourse}
                                        onDelete={() => requestDelete(c)}
                                        onManage={() => requestManage(c)}
                                        onOpen={() => {
                                            if (isAdmin) {
                                                navigate(
                                                    `/fileupload?course=${encodeURIComponent(c.code)}&term=${encodeURIComponent(c.term.replace(/\s+/g, ""))}`, { replace: true }
                                                );
                                            } else {
                                                // Non-admin user: block navigation or show message
                                                toast.error("You don't have permission to upload files.");
                                            }
                                        }}
                                    />
                                </Grid>
                            ))}
                        </Grid>

                    </Box>
                ))}
            </Stack>

            {/* Dialogs */}
            <CourseAdd
                open={addCourse}
                onClose={() => setAddCourse(false)}
                onAdd={handleAddCourse}
            />
            <CourseDelete
                open={confirmOpen}
                onClose={handleCancelDelete}
                onDelete={handleConfirmDelete}
                course={pendingDelete}
            />
            <CourseManage
                open={manageOpen}
                onClose={() => setManageOpen(false)}
                onSave={handleConfirmManage}
                course={pendingManage}
            />
        </Box>
    );
}
