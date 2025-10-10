import { useEffect, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Typography, Box, Chip
} from "@mui/material";
import { toast } from "sonner";

export default function CourseManage({
    open,
    onClose,
    onSave,
    course,
}) {
    const coordinatorOptions = ["Mingxia", "Peng", "Moran", "Ruipeng", "Jiahao", "Adrian"];

    // normalise incoming coordinators (string | string[] | undefined) -> string[]
    const normalizeCoordinators = (c) => {
        if (!c) return [];
        if (Array.isArray(c.coordinators)) return [...new Set(c.coordinators)];
        if (Array.isArray(c.coordinator)) return [...new Set(c.coordinator)];
        const str =
            typeof c.coordinators === "string" ? c.coordinators :
                typeof c.coordinator === "string" ? c.coordinator : "";
        return [...new Set(str.split(",").map(s => s.trim()).filter(Boolean))];
    };

    // seed from course initially
    const [coordinators, setCoordinators] = useState(() => normalizeCoordinators(course));
    const [errors, setErrors] = useState({});

    const [menuOpen, setMenuOpen] = useState(false);

    // when course or dialog open changes, refresh initial values
    useEffect(() => {
        setCoordinators(normalizeCoordinators(course));
        setErrors({});
    }, [course, open]);

    const handleCancel = () => {
        setCoordinators(normalizeCoordinators(course)); // revert to initial
        setErrors({});
        onClose?.();
    };

    const handleSave = () => {
        const newErrors = {};
        if (!coordinators || coordinators.length === 0) {
            newErrors.coordinators = "At least one coordinator is required";
        }
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        const updated = { ...course, coordinators }; // keep a canonical 'coordinators' array
        onSave?.(updated);
        toast.success(
            `Saved coordinators for ${course?.code ?? ""}: ${coordinators.join(", ")}`
        );
        onClose?.();
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
                Manage coordinators
            </DialogTitle>

            <DialogContent dividers sx={{ backgroundColor: "#fafafa" }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    {course ? `${course.code} · ${course.title} · ${course.term ?? ""}` : "No course selected"}
                </Typography>

                <TextField
                    margin="normal"
                    select
                    fullWidth
                    label="Coordinators"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.coordinators}
                    helperText={errors.coordinators}
                    sx={{
                        mt: 2,
                        backgroundColor: "white",
                        borderRadius: "12px",
                        "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                    }}
                    SelectProps={{
                        multiple: true,
                        // control the menu open/close
                        open: menuOpen,
                        onOpen: () => setMenuOpen(true),
                        onClose: () => setMenuOpen(false),
                        // value + update (close right after any change)
                        value: coordinators ?? [],
                        onChange: (e) => {
                            const val = e.target.value;
                            const next = Array.isArray(val) ? val : String(val).split(",").filter(Boolean);
                            setCoordinators(next);
                            setMenuOpen(false); // <-- close after selecting/deselecting
                        },
                        displayEmpty: true,
                        renderValue: (selected) =>
                            selected.length === 0 ? (
                                <span style={{ color: "rgba(0,0,0,0.38)" }}>Select coordinators…</span>
                            ) : (
                                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                    {selected.map((name) => (
                                        <Chip key={name} label={name} />
                                    ))}
                                </Box>
                            ),
                        MenuProps: { PaperProps: { sx: { maxHeight: 240 } } },
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
                    disabled={!course}
                >
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    );
}
