
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography } from "@mui/material";

export function CourseActionDialog({ open, course, onClose, onUpload, onView }) {
    const term = course?.term || course?.year_term || "";

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        width: 500,      // px number is fine
                        maxWidth: "90vw" // keep responsive
                    }
                }
            }}
        >

            <DialogTitle sx={{ fontWeight: 800, bgcolor: "grey.100", borderBottom: 1, borderColor: "grey.200" }}>
                Choose an action
            </DialogTitle>

            <DialogContent sx={{ pt: 3, pb: 3, px: 4 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 5, mt: 2 }}>
                    {course ? `${course.code} — ${course.title} (${term || "No term"})` : ""}
                </Typography>

                <Stack spacing={2}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={onUpload}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            width: "50%",
                            alignSelf: "center",
                            py: 1.2,
                            px: 3,
                            fontSize: 16,
                            bgcolor: "grey.200",               // same background
                            color: "grey.900",
                            transition: "background-color 0.2s ease",
                            "&:hover": { bgcolor: "grey.300" } // same hover tone
                        }}
                    >
                        File Upload
                    </Button>

                    <Button
                        variant="contained"                 // 👈 same variant now
                        size="large"
                        onClick={onView}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            py: 1.2,
                            px: 3,
                            width: "50%",
                            alignSelf: "center",
                            fontSize: 16,
                            bgcolor: "grey.200",
                            color: "grey.900",
                            transition: "background-color 0.2s ease",
                            "&:hover": { bgcolor: "grey.300" }
                        }}
                    >
                        View assignment
                    </Button>


                </Stack>
            </DialogContent>


            <DialogActions sx={{ bgcolor: "grey.200", borderTop: 1, borderColor: "grey.200" }}>
                <Button 
                    onClick={onClose} 
                    variant="contained" 
                    sx={{
                    backgroundColor: "grey.800",
                    "&:hover": { backgroundColor: "grey.300" },
                    borderRadius: "12px",
                    textTransform: "none",
                }}>
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
}
