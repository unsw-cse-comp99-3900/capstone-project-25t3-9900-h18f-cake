import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TemporaryDrawer from './view-sidedrawer';
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { Stack, IconButton } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import ExitConfirmPopup from "../component/exit-confirm";

export default function ButtonAppBar() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [logoutOpen, setLogoutOpen] = React.useState(false);
    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>

                    <TemporaryDrawer />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Hi User, Welcome to ViewPages
                    </Typography>
                    <Stack direction="row" justifyContent="flex-end" sx={{ width: "100%", mb: 1 }}>

                        <Tooltip title="Back to Course Page" arrow>
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
                                aria-label="Back to Course Page"
                                onClick={() => {
                                    navigate("/courses", { replace: true });
                                }}
                            >
                                <ArrowBackIcon sx={{ fontSize: 50 }} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Logout" arrow>
                            <IconButton
                                sx={{
                                    borderRadius: "12px",   // round edges
                                    "&:hover": {
                                        backgroundColor: "grey.100",      // <- subtle MUI-style hover bg
                                        transform: "translateY(-2px)",     // <- slight lift
                                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.26)", // <- softer than before
                                    }
                                }}
                                aria-label="logout"
                                onClick={() => {
                                    setLogoutOpen(true);
                                }}
                            >
                                <PowerSettingsNewIcon sx={{ fontSize: 50 }} />
                            </IconButton>
                        </Tooltip>
                    </Stack>
                    <ExitConfirmPopup
                        logoutOpen={logoutOpen}
                        setLogoutOpen={setLogoutOpen}
                        logout={logout}
                        navigate={navigate}
                    />
                </Toolbar>
            </AppBar>
        </Box>
    );
}
