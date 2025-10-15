import { useMemo } from "react";
import {
    Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText
} from "@mui/material";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import DashboardIcon from '@mui/icons-material/Dashboard';
import RateReviewIcon from '@mui/icons-material/RateReview';
export const SIDEBAR_WIDTH = 180;

export default function Sidebar({onClose, topOffset}) {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const course = searchParams.get("course") || "";
    const term = searchParams.get("term") || "";

    const goDashboard = () => {
        const dashUrl = `/dashboard?course=${encodeURIComponent(course)}&term=${encodeURIComponent(term)}`;
        if (location.pathname + location.search !== dashUrl) {
            navigate(dashUrl);
        }
        onClose?.();
    };

    const content = useMemo(() => (
        <Box sx={{ width: SIDEBAR_WIDTH, height: "100%", display: "flex", flexDirection: "column" }}>
            <List
                dense
                sx={{ px: 1 }}
            >
                <ListItemButton
                    onClick={goDashboard}
                    sx={{
                        mb: 0.5,
                        borderRadius: 2,
                        position: "relative",
                        "&.active, &:active": { bgcolor: "grey.100" },
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 36 }}><DashboardIcon /></ListItemIcon>
                    <ListItemText primary="Dashboard" />
                </ListItemButton>

                {/* Review: preserve ?course=&term= */}
                <ListItemButton
                    component={NavLink}
                    to={{ pathname: "/new", search: location.search }}
                    onClick={onClose}
                    sx={{
                        mb: 0.5,
                        borderRadius: 2,
                        "&.active": { bgcolor: "grey.100" },
                    }}
                >
                    <ListItemIcon sx={{ minWidth: 36 }}><RateReviewIcon /></ListItemIcon>
                    <ListItemText primary="Review" />
                </ListItemButton>
            </List>
            <Box sx={{ flexGrow: 1 }} />
        </Box>
    ), [location.search, onClose, course, term]);

    return (
        <>
            <Drawer
                variant="permanent"
                open
                sx={{
                    display: { xs: "none", md: "block" },
                    "& .MuiDrawer-paper": {
                        width: SIDEBAR_WIDTH,
                        boxSizing: "border-box",
                        position: "fixed",
                        top: `${topOffset}px`,
                        left: 0,
                        height: `calc(100vh - ${topOffset}px)`,
                        // borderColor: "transparent",
                    },
                }}
            >
                {content}
            </Drawer>
        </>
    );
}
