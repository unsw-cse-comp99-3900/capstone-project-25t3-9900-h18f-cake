
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Box, Alert } from "@mui/material";

export default function CourseActionDialog({ open, course, onClose, onUpload, onView, viewStatus }) {
    const term = course?.term || course?.year_term || "";
    const aiCompleted = !!(viewStatus && viewStatus.aiCompleted);
    const loading = !!(viewStatus && viewStatus.loading);
    const errorMsg = viewStatus && viewStatus.error;
    const pendingAssignments = viewStatus?.pendingAssignments || [];
    const primaryPending = pendingAssignments[0];
    const pendingMarked = primaryPending?.marked_count ?? 0;
    const pendingTotal = primaryPending?.total_students ?? 0;
    const pendingRemaining =
        primaryPending?.pending_students ?? Math.max(0, pendingTotal - pendingMarked);
    const stuckAssignments = viewStatus?.stuckAssignments || [];

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
                <Typography variant="body1" color="text.secondary" sx={{ mb: 5, mt: 2, textAlign: "center" }}>
                    {course ? `${term} ${course.code} ${course.title}` : ""}
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

                    {stuckAssignments.length > 0 && (
                        <Alert severity="warning" sx={{ textAlign: "left" }}>
                            {`AI job for ${
                                stuckAssignments[0]?.assignment_title || `Assignment ${stuckAssignments[0]?.assignment_id}`
                            } is stuck. Please rerun the upload or retry later.`}
                        </Alert>
                    )}

                    {pendingAssignments.length > 0 && (
                        <Alert severity="info" sx={{ textAlign: "left" }}>
                            {`AI marking ${
                                primaryPending?.assignment_title || `Assignment ${primaryPending?.assignment_id}`
                            }: ${pendingMarked}/${pendingTotal || "?"} marked, ${pendingRemaining || "?"} remaining.`}
                        </Alert>
                    )}

                    <Button
                        variant="contained"
                        size="large"
                        onClick={onView}
                        disabled={loading || !viewStatus || pendingAssignments.length > 0}
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
                        {pendingAssignments.length > 0
                            ? `AI Marking in progress`
                            : (loading || !viewStatus)
                                ? "Loading status..."
                                : "View AI-generated grades"}
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
