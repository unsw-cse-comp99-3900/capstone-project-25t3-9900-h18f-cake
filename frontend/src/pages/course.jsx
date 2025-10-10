import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Grid, Typography, IconButton } from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { useAuth } from "../context/auth-context";
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
// import InfoOutlined from "@mui/icons-material/InfoOutlined";
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import { toast } from "sonner";

import CourseCard from "../component/course-card";
import CourseAdd from "../component/course-add";
import CourseDelete from "../component/course-delete";
import CourseManage from "../component/course-manage";

export default function CoursesPage() {
    const [termCourse, setTermCourse] = useState([
        { term: "2025 Term 3", code: "COMP9321", title: "Data Services Engineering", coordinator: "Jessie" },
        { term: "2025 Term 2", code: "COMP9334", title: "Capacity Planning of Computer Systems and Networks", coordinator: "Jessie" },
        { term: "2025 Term 2", code: "COMP9900", title: "Information Technology Project", coordinator: ["Jessie", "Peter"] },
        { term: "2025 Term 3", code: "COMP9517", title: "Computer Vision", coordinator: "Jessie" },
        { term: "2025 Term 3", code: "COMP9044", title: "Software Construction", coordinator: "Jessie" },
    ]);
    const navigate = useNavigate();

    const { role, user, logout } = useAuth();
    const isLoggedIn = role !== null;
    const isAdmin = role === "admin";

    useEffect(() => {
        if (!isLoggedIn) navigate("/");
    }, [isLoggedIn, navigate]);

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
        console.log(`Role: ${role} User: ${user} has successfully deleted Course ${pendingDelete.code}, ${pendingDelete.title}, ${pendingDelete.term} with coordinator(s): ${pendingDelete.coordinator.join(", ")}`);
    };
    const handleCancelDelete = () => { setConfirmOpen(false); setPendingDelete(null); };

    const handleConfirmManage = (newCourse) => {
        setTermCourse(prev => prev.map(c => c.code === newCourse.code ? newCourse : c));
        setManageOpen(false);
        setPendingManage(null);
        console.log(`Role: ${role} User: ${user} has successfully updated Course ${newCourse.code}, ${newCourse.title}, ${newCourse.term} with coordinator(s): ${newCourse.coordinator.join(", ")}`);
    };

    const handleAddCourse = (newCourse) => {
        setTermCourse(prev => [...prev, newCourse]);
        setAddCourse(false);
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
        <Box sx={{ px: { xs: 4, sm: 12, md: 25 }, py: { xs: 6, sm: 8,md: 10 } }}>
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
                            <IconButton
                                sx={headerIconSx}
                                aria-label="toggle delete mode"
                                onClick={() => {
                                    logout();
                                    navigate("/");
                                }}
                            
                            >
                                <PowerSettingsNewIcon />
                            </IconButton>
                        </>
                    )}
                </Stack>

            </Stack>

            {/* Terms & cards */}
            <Stack spacing={10}>
                {Object.entries(grouped).map(([term, items]) => (
                    <Box key={term}>
                        <Typography variant="overline" sx={{ color: "grey.600", letterSpacing: ".12em", fontWeight: 800 }}>
                            {term.toUpperCase()}
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
                                        onManage={() => requestManage(c)}
                                        onOpen={() => {
                                            if (isAdmin) {
                                                toast.error("wait for peng to do some thing - User, you don't have permission to view the output.");
                                            } else {
                                                navigate(
                                                    `/fileupload?course=${encodeURIComponent(c.code)}&term=${encodeURIComponent(
                                                        c.term.replace(/\s+/g, "")
                                                    )}`,
                                                    { replace: true }
                                                );
                                            }
                                        }}
                                    />
                                </Box>
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
