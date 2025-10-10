import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { Box, Stack, Grid, IconButton, Typography } from "@mui/material";

import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

import CourseCard from "../component/course-card";
import CourseAdd from "../component/course-add";
import CourseDelete from "../component/course-delete";
import CourseActionDialog from "../component/course-action";
import ExitConfirmPopup from "../component/exit-confirm";   
// import BuildCircleIcon from '@mui/icons-material/BuildCircle';
// import CourseManage from "../component/course-manage";

export default function CoursesPage() {
    const [termCourse, setTermCourse] = useState([
        { year_term: "2025 Term 3", code: "COMP9321", title: "Data Services Engineering" },
        { year_term: "2025 Term 2", code: "COMP9334", title: "Capacity Planning of Computer Systems and Networks" },
        { year_term: "2025 Term 2", code: "COMP9900", title: "Information Technology Project" },
        { year_term: "2025 Term 3", code: "COMP9517", title: "Computer Vision" },
        { year_term: "2025 Term 3", code: "COMP9044", title: "Software Construction" },
    ]);
    const navigate = useNavigate();

    const { user, logout } = useAuth();
    const isLoggedIn = user !== null;

    useEffect(() => {
        if (!isLoggedIn) navigate("/");
    }, [isLoggedIn, navigate]);

    const [showDeleteCourse, setShowDeleteCourse] = useState(false);
    const [ShowManageCourse, setShowManageCourse] = useState(false);
    const [addCourse, setAddCourse] = useState(false);

    const [confirmOpen, setConfirmOpen] = useState(false);
    // const [manageOpen, setManageOpen] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null); // { term, code, title }
    // const [pendingManage, setPendingManage] = useState(null); // { term, code, title }

    const [logoutOpen, setLogoutOpen] = useState(false);

    const requestDelete = (course) => { setPendingDelete(course); setConfirmOpen(true); };
    // const requestManage = (course) => { setPendingManage(course); setManageOpen(true); };

    const handleConfirmDelete = () => {
        if (!pendingDelete) return;
        setTermCourse(prev => prev.filter(c => c.code !== pendingDelete.code));
        setConfirmOpen(false);
        setPendingDelete(null);
        console.log(`User: ${user} has successfully deleted Course ${pendingDelete.code}, ${pendingDelete.title}, ${pendingDelete.year_term}`);
    };
    const handleCancelDelete = () => { setConfirmOpen(false); setPendingDelete(null); };

    // const handleConfirmManage = (newCourse) => {
    //     setTermCourse(prev => prev.map(c => c.code === newCourse.code ? newCourse : c));
    //     // setManageOpen(false);
    //     // setPendingManage(null);
    //     console.log(`User: ${user} has successfully updated Course ${newCourse.code}, ${newCourse.title}, ${newCourse.term}}`);
    // };

    const handleAddCourse = (newCourse) => {
        setTermCourse(prev => [...prev, newCourse]);
        setAddCourse(false);
    };

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    const openActions = (course) => {
        setSelectedCourse(course);
        setDialogOpen(true);
    };

    const closeActions = () => {
        setDialogOpen(false);
        setSelectedCourse(null);
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

    const goView = () => {
        const c = selectedCourse;
        const term = c.term || c.year_term || "";
        closeActions();
        navigate(
            `/courseview?course=${encodeURIComponent(c.code)}&term=${encodeURIComponent(term)}`,
            { replace: false }
        );
    };

    const grouped = useMemo(() => {
        return termCourse.reduce((acc, c) => { (acc[c.year_term] ||= []).push(c); return acc; }, {});
    }, [termCourse]);

    const headerIconSx = {
        width: 44, height: 44, borderRadius: "50%",
        border: "3px solid", borderColor: "grey.500", color: "grey.700",
        "&:hover": { bgcolor: "grey.100" },
    };

    return (
        <Box sx={{ px: { xs: 4, sm: 12, md: 25 }, py: { xs: 6, sm: 8, md: 10 } }}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, fontSize: { xs: 28, md: 48 }, lineHeight: 1.1 }}>
                    Courses
                </Typography>
                <Stack direction="row" spacing={2}>

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

                        {/* <IconButton
                            sx={headerIconSx}
                            aria-label="settings"
                            onClick={() => {
                                setShowManageCourse((p) => !p);
                                setShowDeleteCourse(false);
                            }}
                        >
                            <BuildCircleIcon />
                        </IconButton> */}
                        <IconButton
                            sx={headerIconSx}
                            aria-label="toggle delete mode"
                            onClick={() => {
                                setShowDeleteCourse(false);
                                setShowManageCourse(false);
                                setLogoutOpen(true);

                            }}

                        >
                            <PowerSettingsNewIcon />
                        </IconButton>
                    </>

                </Stack>

            </Stack>

            {/* Terms & cards */}
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
            {/* <CourseManage
                open={manageOpen}
                onClose={() => setManageOpen(false)}
                onSave={handleConfirmManage}
                course={pendingManage}
            /> */}
            <CourseActionDialog
                open={dialogOpen}
                course={selectedCourse}
                onClose={closeActions}
                onUpload={goUpload}
                onView={goView}
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