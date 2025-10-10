import { useState } from "react";
import { useAuth } from "../context/auth-context";

import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Typography,
    // Box, Chip
} from "@mui/material";
import { toast } from "sonner";
import { API_URL } from "../const";

export default function CourseAdd({ open, onClose, onAdd }) {

    const { user } = useAuth();
    const [code, setCode] = useState("");
    const [title, setTitle] = useState("");
    const [year, setYear] = useState("");
    const [term, setTerm] = useState("");
    const [errors, setErrors] = useState({});
    // const [menuOpen, setMenuOpen] = useState(false);

    const resetForm = () => {
        setCode("");
        setTitle("");
        setYear("");
        setTerm("");
        setErrors({});
    };

    const handleCancel = () => {
        resetForm();       // clear everything on cancel
        onClose?.();
    };

    const handleSave = () => {
        const newErrors = {};
        if (!code.trim()) newErrors.code = "Course code is required";
        if (!title.trim()) newErrors.title = "Course title is required";
        if (!year.trim()) newErrors.year = "Year is required";
        if (!term.trim()) newErrors.term = "Term is required";

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        // Normalize casing and ensure "T1" → "Term 1"
        const formattedTerm = term.trim().replace(/^T/i, "Term ");
        const year_term = `${year.trim()} ${formattedTerm}`;
        const newCourse = { year_term, code: code.trim(), title: title.trim() };
        const who = user?.email || user?.name || "Unknown user";

        // API sync request to backend
        fetch(`${API_URL}/v1/courses`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(newCourse),
        }).then((result) => {
            if (result.ok) {
                console.log(`User: ${who} has successfully added course ${code}, ${title}, ${year_term}`);
                toast.success(`Added ${code} — ${title} (${year_term}) successfully!`);
            } else {
                console.log(`Failed to add course: ${result.statusText}`);
                toast.error(`Failed to add course: ${result.statusText}`);
            }
        })
        onAdd?.(newCourse);
        resetForm();
    };


    return (
        <Dialog
            open={open}
            onClose={handleCancel}
            fullWidth
            maxWidth="sm"
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: "12px",
                        backgroundColor: "#eef1f6",
                        boxShadow: "0 6px 24px rgba(0,0,0,0.1)",
                    },
                },
            }}
        >
            <DialogTitle sx={{ fontWeight: "bold", color: "#333" }}>
                Add a new course
            </DialogTitle>

            <DialogContent dividers sx={{ backgroundColor: "#fafafa" }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Please fill in the course details:
                </Typography>

                <TextField
                    margin="normal"
                    label="Course Code"
                    fullWidth
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    error={!!errors.code}
                    helperText={errors.code}
                    sx={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                />

                <TextField
                    margin="normal"
                    label="Course Title"
                    fullWidth
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    error={!!errors.title}
                    helperText={errors.title}
                    sx={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                />

                <TextField
                    margin="normal"
                    label="Year"
                    type="number"
                    fullWidth
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    error={!!errors.year}
                    helperText={errors.year}
                    inputProps={{ min: 2000, max: 2100 }}
                    sx={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                />

                <TextField
                    margin="normal"
                    label="Term"
                    select
                    fullWidth
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    error={!!errors.term}
                    helperText={errors.term}
                    sx={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                >
                    <MenuItem value="T1">Term 1</MenuItem>
                    <MenuItem value="T2">Term 2</MenuItem>
                    <MenuItem value="T3">Term 3</MenuItem>
                    <MenuItem value="Summer">Summer Term</MenuItem>
                </TextField>



            </DialogContent>

            <DialogActions sx={{ backgroundColor: "#f0f0f0" }}>
                <Button
                    variant="contained"
                    sx={{
                        backgroundColor: "grey.800",
                        "&:hover": { backgroundColor: "grey.300" },
                        borderRadius: "12px",
                        textTransform: "none",
                    }}
                    onClick={handleCancel}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    sx={{
                        backgroundColor: "grey.800",
                        "&:hover": { backgroundColor: "grey.300" },
                        borderRadius: "12px",
                        textTransform: "none",
                    }}
                    onClick={handleSave}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
