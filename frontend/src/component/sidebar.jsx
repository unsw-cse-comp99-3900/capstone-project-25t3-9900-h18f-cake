import {
    Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText
} from "@mui/material";
import DashboardIcon from '@mui/icons-material/Dashboard';
import RateReviewIcon from '@mui/icons-material/RateReview';
export const SIDEBAR_WIDTH = 180;

export default function Sidebar({ topOffset, setDashboardOpen }) {
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
                <Box sx={{ width: SIDEBAR_WIDTH, height: "100%", display: "flex", flexDirection: "column" }}>
                    <List
                        dense
                        sx={{ px: 1 }}
                    >
                        <ListItemButton
                            onClick={() => setDashboardOpen("dashboard")}
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
                            onClick={() => setDashboardOpen("review")}
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
            </Drawer>
        </>
    );
}
