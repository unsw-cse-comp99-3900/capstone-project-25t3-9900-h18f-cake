import { Box, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RateReviewIcon from "@mui/icons-material/RateReview";
export const SIDEBAR_WIDTH = 140;

export default function Sidebar({ topOffset, setDashboardOpen }) {
    return (
        <Box
            component="nav"
            sx={{
                width: SIDEBAR_WIDTH,
                display: { xs: "none", md: "flex" },
                flexDirection: "column",
                pt: 2,
                pb: 2,
                px: 1,
                flexShrink: 0,
                borderRight: "1px solid",
                borderColor: "divider",
                minHeight: "100%",
                overflowY: "auto",
                bgcolor: "background.paper",
            }}
        >
            <List dense sx={{ px: 0 }}>
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
    );
}
