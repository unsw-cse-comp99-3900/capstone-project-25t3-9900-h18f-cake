import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { Box, Stack, Grid, IconButton, Typography } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';

import CourseCard from "../component/course-card";
import CourseAdd from "../component/course-add";
import CourseDelete from "../component/course-delete";
import CourseActionDialog from "../component/course-action";
import ExitConfirmPopup from "../component/exit-confirm";
import { toast } from "sonner";

import { API_URL } from "../common/const";
import { handleFetch } from "../common/utils";
// import BuildCircleIcon from '@mui/icons-material/BuildCircle';
// import CourseManage from "../component/course-manage";

export default function CoursesPage() {
    // API sync request to backend
    const [termCourse, setTermCourse] = useState([]);

    useEffect(() => {
        // API sync request to backend
        handleFetch(`${API_URL}/v1/courses`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }).then(response => response.json()).then(data => {
            setTermCourse(data);
            console.log("Successfully fetched data:", data);
        }).catch(error => {
            console.error("Error fetching data:", error);
        });
    }, []);

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

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);

    const grouped = useMemo(() => {
        return termCourse.reduce((acc, c) => { (acc[c.year_term] ||= []).push(c); return acc; }, {});
    }, [termCourse]);

    const handleConfirmDelete = () => {
        if (!pendingDelete) return;
        setTermCourse(prev => prev.filter(c => c.code !== pendingDelete.code));
        setConfirmOpen(false);
        setPendingDelete(null);

        // API sync request to backend
        handleFetch(`${API_URL}/v1/courses`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(pendingDelete),
        }).then((result) => {
            if (result.ok) {
                console.log(`User: ${user} has successfully deleted Course ${pendingDelete.code}, ${pendingDelete.title}, ${pendingDelete.year_term}`)
                toast.success(`User ${user} has successfully deleted course ${pendingDelete.code}, ${pendingDelete.title}, ${pendingDelete.term}}`);
            } else {
                console.log(`Failed to delete course: ${result.statusText}`);
                toast.error(`Failed to delete course: ${result.statusText}`);
            }
        })
    }

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
            `/viewpages?course=${encodeURIComponent(c.code)}&term=${encodeURIComponent(term)}`,
            { replace: false }
        );
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
                        <Tooltip title="Add Course" arrow>
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
                                aria-label="add course"
                                onClick={() => {
                                    setAddCourse(true);
                                    setShowDeleteCourse(false);
                                    setShowManageCourse(false);
                                }}
                            >
                                <AddCircleOutlineIcon sx={{ fontSize: 50 }} />  {/* Bigger icon */}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Course" arrow>
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
                                aria-label="toggle delete mode"
                                onClick={() => {
                                    setShowDeleteCourse((p) => !p);
                                    setShowManageCourse(false);
                                }}
                            >
                                <RemoveCircleOutlineIcon sx={{ fontSize: 50 }} />
                            </IconButton>
                        </Tooltip>
                        {/* <IconButton
                            aria-label="settings"
                            onClick={() => {
                                setShowManageCourse((p) => !p);
                                setShowDeleteCourse(false);
                            }}
                        >
                            <BuildCircleIcon />
                        </IconButton> */}
                        <Tooltip title="Logout" arrow>

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
                                aria-label="logout"
                                onClick={() => {
                                    setShowDeleteCourse(false);
                                    setShowManageCourse(false);
                                    setLogoutOpen(true);
                                }}
                            >
                                <PowerSettingsNewIcon sx={{ fontSize: 50 }} />
                            </IconButton>
                        </Tooltip>
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