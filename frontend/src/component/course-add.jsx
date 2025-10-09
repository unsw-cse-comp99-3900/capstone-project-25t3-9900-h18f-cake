import { useState } from "react";
import { useAuth } from "../context/auth-context";

import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Typography, Box, Chip
} from "@mui/material";
import { toast } from "sonner";

export default function CourseAdd({ open, onClose, onAdd }) {
    const coordinatorOptions = ["Jessie", "Peter", "Andrew", "Basem", "Khalegh"];

    const { role, user } = useAuth();
    const [code, setCode] = useState("");
    const [title, setTitle] = useState("");
    const [year, setYear] = useState("");
    const [term, setTerm] = useState("");
    const [coordinators, setCoordinators] = useState([]); // always array
    const [errors, setErrors] = useState({});
    const [menuOpen, setMenuOpen] = useState(false);

    const resetForm = () => {
        setCode("");
        setTitle("");
        setYear("");
        setTerm("");
        setCoordinators([]);
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
        if (!coordinators || coordinators.length === 0) {
            newErrors.coordinators = "At least one coordinator is required";
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const newCourse = { code, title, year, term, coordinators }
        console.log(
            `Role: ${role} User: ${user} has successfully added Course ${code}, ${title}, ${year}, ${term} with coordinator(s): ${coordinators.join(", ")}`
        );
        toast.success(
            `Role: ${role} User: ${user} has successfully added Course ${code}, ${title}, ${year}, ${term} with coordinator(s): ${coordinators.join(", ")}`
        );

        onAdd?.(newCourse);
        resetForm();       // clear on save as well
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

                <TextField
                    margin="normal"
                    select
                    fullWidth
                    // remove root value; we control it in slotProps.select
                    error={!!errors.coordinators}
                    helperText={errors.coordinators}
                    sx={{
                        mt: 2,
                        backgroundColor: "white",
                        borderRadius: "12px",
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                    slotProps={{
                        select: {
                            multiple: true,
                            open: menuOpen,
                            onOpen: () => setMenuOpen(true),
                            onClose: () => setMenuOpen(false),

                            value: coordinators ?? [],
                            onChange: (e) => {
                                const val = e.target.value;
                                const next = Array.isArray(val)
                                    ? val
                                    : String(val).split(",").filter(Boolean);
                                setCoordinators(next);
                                setMenuOpen(false); // <-- close after pick
                            },

                            displayEmpty: true,
                            renderValue: (selected) =>
                                selected.length === 0 ? (
                                    <span style={{ color: "rgba(0,0,0,0.38)" }}>
                                        Select coordinators…
                                    </span>
                                ) : (
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                        {selected.map((name) => (
                                            <Chip key={name} label={name} />
                                        ))}
                                    </Box>
                                ),

                            MenuProps: { PaperProps: { sx: { maxHeight: 200 } } },
                        },
                    }}
                >
                    {coordinatorOptions.map((name) => (
                        <MenuItem key={name} value={name}>
                            {name}
                        </MenuItem>
                    ))}
                </TextField>



            </DialogContent>

            <DialogActions sx={{ backgroundColor: "#f0f0f0" }}>
                <Button
                    variant="contained"
                    sx={{
                        backgroundColor: "grey.800",
                        "&:hover": { backgroundColor: "grey.900" },
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
                        "&:hover": { backgroundColor: "grey.900" },
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
