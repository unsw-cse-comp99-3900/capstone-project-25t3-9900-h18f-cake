
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography } from "@mui/material";

export default function CourseActionDialog({ open, course, onClose, onUpload, onView, viewStatus }) {
    const term = course?.term || course?.year_term || "";
    const aiCompleted = !!(viewStatus && viewStatus.aiCompleted);
    const loading = !!(viewStatus && viewStatus.loading);
    const errorMsg = viewStatus && viewStatus.error;

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
                        width: 500,      
                        maxWidth: "90vw" 
                    }
                }
            }}
        >

            <DialogTitle sx={{ fontWeight: 800,  borderBottom: 1, borderColor: "grey.200", bgcolor: "#eef3f8"}}>
                Choose an action
            </DialogTitle>

            <DialogContent sx={{ pt: 3, pb: 3, px: 4 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 5, mt: 2 }}>
                    {course ? `${term} ${course.code} ${course.title} ` : ""}
                </Typography>

                <Stack spacing={2}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={onUpload}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            width: "70%",
                            alignSelf: "center",
                            py: 1.2,
                            px: 3,
                            fontSize: 16,
                            bgcolor: "grey.200",               
                            color: "grey.900",
                            transition: "background-color 0.2s ease",
                            "&:hover": { bgcolor: "grey.300" } 
                        }}
                    >
                        Upload an assignment
                    </Button>

                    {!aiCompleted && (
                        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                            {loading ? "Checking AI status..." : (errorMsg ? `Status check failed: ${errorMsg}` : "AI is still grading for this course. You can view other courses meanwhile.")}
                        </Typography>
                    )}

                    <Button
                        variant="contained"                 
                        size="large"
                        onClick={onView}
                        disabled={!aiCompleted || loading || !viewStatus}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            py: 1.2,
                            px: 3,
                            width: "70%",
                            alignSelf: "center",
                            fontSize: 16,
                            bgcolor: "grey.200",
                            color: "grey.900",
                            transition: "background-color 0.2s ease",
                            "&:hover": { bgcolor: "grey.300" }
                        }}
                    >
                        {aiCompleted ? "View AI-generated grades" : ((loading || !viewStatus) ? "Loading status..." : "AI grading in progress")}
                    </Button>
                </Stack>
            </DialogContent>


            <DialogActions sx={{ backgroundColor: "#f0f0f0", borderTop: 1, borderColor: "grey.200" }}>
                <Button 
                    onClick={onClose} 
                    variant="contained" 
                    sx={{
                    backgroundColor: "grey.800",
                    "&:hover": { backgroundColor: "grey.500" },
                    borderRadius: "12px",
                    textTransform: "none",
                }}>
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
}
