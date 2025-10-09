// component/course-delete.jsx
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
} from "@mui/material";

export default function CourseDelete({ open, onClose, onDelete, course }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            slotProps={{
                paper: {
                    sx: { borderRadius: "12px", backgroundColor: "#fff" },
                },
            }}
        >
            <DialogTitle sx={{ fontWeight: 700 }}>Delete course?</DialogTitle>

            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary">
                    {course
                        ? `Are you sure you want to delete ${course.code} — ${course.title}?`
                        : "Are you sure you want to delete this course?"}
                </Typography>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    onClick={onClose}
                    sx={{ borderRadius: "12px", textTransform: "none" }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={onDelete}
                    sx={{ borderRadius: "12px", textTransform: "none" }}
                >
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
}
