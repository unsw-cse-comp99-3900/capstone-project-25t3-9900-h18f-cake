import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

export default function ExitConfirmPopup({ logoutOpen, setLogoutOpen, logout, navigate }) {

    const handleConfirm = () => {
        logout();
        navigate("/");
        setLogoutOpen(false);
    };

    return (
        <Dialog
            open={logoutOpen}
            onClose={() => setLogoutOpen(false)}
            fullWidth
            maxWidth="xs"
            slotProps={{
                paper: {
                    sx: { borderRadius: "12px", backgroundColor: "#fff" },
                },
            }}>
            <DialogTitle sx={{ fontWeight: 700 }}>Logout?</DialogTitle>

            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary">
                    Are you sure you want to logout?
                </Typography>
            </DialogContent>

            <DialogActions>
                <Button
                    onClick={() => setLogoutOpen(false)}
                    variant="contained"
                    sx={{
                        backgroundColor: "grey.800",
                        "&:hover": { backgroundColor: "grey.300" },
                        borderRadius: "12px",
                        textTransform: "none",
                    }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleConfirm}
                    sx={{ borderRadius: "12px", textTransform: "none" }}
                >
                    Logout
                </Button>
            </DialogActions>
        </Dialog>
    );
}