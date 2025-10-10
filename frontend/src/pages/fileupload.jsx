import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Paper, Stack, Typography, Button, Divider, List, ListItem, ListItemIcon, ListItemText, IconButton, TextField } from "@mui/material";
import UploadBox from "../component/upload-box";
import UploadStepper from "../component/upload-stepper";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "sonner";
import { useAuth } from "../context/auth-context";

const STEP_LABELS = [
    "Step 1: Assignment Information",
    "Step 2: Marking Guidelines",
    "Step 3: Coordinator Marked Assignments",
    "Step 4: Tutor Marked Assignments",
    "Review & Submit",
];

function fileKey(f) {
    return `${f.name}-${f.lastModified}-${f.size}`;
}

// set File Manager - <course> from query string param: "course"
export default function MultiStepUpload() {
    const { user, role } = useAuth();
    const isLoggedIn = role !== null;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [course, setCourse] = useState("");
    const [term, setTerm] = useState("");
    const [assignmentName, setAssignmentName] = useState("");

    // 4 upload steps => indices 0..3
    const [uploads, setUploads] = useState({
        0: [],
        1: [],
        2: [],
        3: [],
    });
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        if (!isLoggedIn) navigate("/");
    }, [isLoggedIn, navigate]);

    useEffect(() => {
        const courseParam = searchParams.get("course");
        const termParam = searchParams.get("term");
        if (courseParam) {
            setCourse(courseParam);
        }

        if (termParam) {
            setTerm(termParam);
        }
    }, [searchParams]);

    const handleUpload = (stepIndex) => (newFiles) => {
        setUploads((prev) => {
            const next = { ...prev };
            next[stepIndex] = [...newFiles, ...prev[stepIndex]];
            return next;
        });
        toast.success(
            `Added ${newFiles.length} file${newFiles.length > 1 ? "s" : ""} to ${STEP_LABELS[stepIndex]}`
        );
    };

    const removeFile = (stepIndex, key) => {
        setUploads((prev) => {
            const next = { ...prev };
            next[stepIndex] = prev[stepIndex].filter((f) => fileKey(f) !== key);
            return next;
        });
    };

    // require at least one file for steps 0..3; review is index 4
    const canGoNext = useMemo(() => {
        const isReview = activeStep === STEP_LABELS.length - 1; // 4
        if (isReview) return true;

        const hasFiles = uploads[activeStep]?.length > 0;

        if (activeStep === 0) {
            const hasPdf = (uploads[0] || []).some(
                f =>
                    (f.type && f.type.toLowerCase() === "application/pdf") ||
                    /\.pdf$/i.test(f.name)
            );
            return (
                hasFiles && hasPdf && assignmentName.trim().length > 0
            );
        }

        return hasFiles;
    }, [activeStep, uploads, assignmentName]);

    const onNext = () => {
        if (activeStep < STEP_LABELS.length - 1) {
            if (!canGoNext) {
                let msg = "Please upload at least one file before continuing.";

                if (activeStep === 0) {
                    const hasName = assignmentName.trim().length > 0;
                    const hasPdf = (uploads[0] || []).some(
                        f =>
                            (f.type && f.type.toLowerCase() === "application/pdf") ||
                            /\.pdf$/i.test(f.name)
                    );

                    if (!hasName && !hasPdf) msg = "Enter an assignment name and upload at least one PDF.";
                    else if (!hasName) msg = "Please enter the assignment name.";
                    else if (!hasPdf) msg = "Please upload at least one PDF file.";
                }

                toast.error(msg);
                return;
            }

            setActiveStep((s) => s + 1);
        }
    };

    const onPrev = () => {
        if (activeStep === 0) {
            navigate("/courses", { replace: true });        // or: navigate(-1) to go back in history
        } else {
            setActiveStep((s) => s - 1);
        }
    };

    const onSubmit = () => {
        console.log("Submitting payload:", {
            user,
            role,
            course,
            assignmentName,
            term,
            step1: uploads[0].map((f) => f.name),
            step2: uploads[1].map((f) => f.name),
            step3: uploads[2].map((f) => f.name),
            step4: uploads[3].map((f) => f.name),
        });
        toast.success(`Role ${role} User ${user} has submitted assignment ${assignmentName} for ${course} ${term} successfully!`);
        navigate("/courses", { replace: true });
    };

    return (
        <Box sx={{ minHeight: "100svh", display: "grid", placeItems: "center", p: 2, bgcolor: "grey.100" }}>
            <Paper
                elevation={0}
                sx={{
                    width: { xs: "100%", sm: "90%", md: "900px" },
                    p: 3,
                    borderRadius: "12px",
                    border: "1px solid",
                    borderColor: "grey.300",
                    bgcolor: "#fff",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                }}
            >
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 500, mb: 5 }}>
                            File Manager - {term ? term : "No term selected"} {course ? course : "No course selected"}
                        </Typography>
                    </Box>

                    <UploadStepper activeStep={activeStep} steps={STEP_LABELS} />

                    {/* Step content */}
                    {activeStep === 0 && (
                        <Section
                            title="Upload Assignment Information"
                            body={
                                <>
                                    <TextField
                                        label="Assignment name"
                                        placeholder="e.g., Project 1: Data Services"
                                        value={assignmentName}
                                        onChange={(e) => setAssignmentName(e.target.value)}
                                        fullWidth
                                        margin="normal"
                                        sx={{
                                            backgroundColor: "#fff",
                                            borderRadius: "12px",
                                            "& .MuiOutlinedInput-root": { borderRadius: "12px" },
                                        }}
                                    />

                                    <UploadBox
                                        onUpload={handleUpload(0)}
                                        accept=".pdf,.doc,.docx,image/*"
                                        multiple
                                        hint="Drag & drop files here, or"
                                    />

                                    <FileList files={uploads[0]} onRemove={(key) => removeFile(0, key)} />
                                </>
                            }
                        />
                    )}

                    {activeStep === 1 && (
                        <Section
                            title="Upload Marking Guidelines"
                            body={
                                <>
                                    <UploadBox
                                        onUpload={handleUpload(1)}
                                        accept=".pdf,.doc,.docx,image/*"
                                        multiple
                                        title="Marking Guidelines"
                                        hint="Drag & drop files here, or"
                                    />
                                    <FileList files={uploads[1]} onRemove={(key) => removeFile(1, key)} />
                                </>
                            }
                        />
                    )}

                    {activeStep === 2 && (
                        <Section
                            title="Upload Coordinator Marked Assignments"
                            body={
                                <>
                                    <UploadBox
                                        onUpload={handleUpload(2)}
                                        accept="*"
                                        multiple
                                        title="Coordinator Marked Assignments"
                                        hint="Drag & drop files here, or"
                                    />
                                    <FileList files={uploads[2]} onRemove={(key) => removeFile(2, key)} />
                                </>
                            }
                        />
                    )}

                    {activeStep === 3 && (
                        <Section
                            title="Upload Tutor Marked Assignments"
                            body={
                                <>
                                    <UploadBox
                                        onUpload={handleUpload(3)}
                                        accept="*"
                                        multiple
                                        title="Tutor Marked Assignments"
                                        hint="Drag & drop files here, or"
                                    />
                                    <FileList files={uploads[3]} onRemove={(key) => removeFile(3, key)} />
                                </>
                            }
                        />
                    )}

                    {activeStep === 4 && <ReviewSection uploads={uploads} assignmentName={assignmentName} />}

                    {/* Navigation */}
                    <Stack direction="row" spacing={1.5} justifyContent="space-between" sx={{ pt: 1 }}>
                        <Button variant="outlined" onClick={onPrev} sx={{ borderRadius: "12px", textTransform: "none" }}>
                            Prev
                        </Button>

                        {activeStep < STEP_LABELS.length - 1 ? (
                            <Button
                                variant="contained"
                                onClick={onNext}
                                sx={{ borderRadius: "12px", textTransform: "none" }}
                            >
                                Next
                            </Button>
                        ) : (
                            <Button variant="contained" color="success" onClick={onSubmit} sx={{ borderRadius: "12px", textTransform: "none" }}>
                                Submit
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Paper>
        </Box>
    );
}

/* ---------- Helpers (unchanged except review now shows 4 steps) ---------- */

function Section({ title, hint, body }) {
    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", minHeight: 56, borderBottom: "1px solid", borderColor: "grey.200", px: 1, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, m: 0 }}>
                    {title}
                </Typography>
            </Box>
            {hint && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {hint}
                </Typography>
            )}
            {body}
        </Box>
    );
}

function FileList({ files, onRemove }) {
    if (!files?.length) return null;

    return (
        <>
            <Divider sx={{ my: 2 }} />

            {/* Uploaded section with count */}
            <Box
                sx={{
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: "grey.300",
                    maxHeight: 280,        // enough space for ~5 files + header
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header with file count */}
                <Box
                    sx={{
                        bgcolor: "grey.50",
                        px: 2,
                        py: 1,
                        borderBottom: "1px solid",
                        borderColor: "grey.200",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Typography variant="subtitle2" color="text.secondary">
                        Uploaded
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {files.length} {files.length === 1 ? "file" : "files"}
                    </Typography>
                </Box>

                {/* Scrollable file list */}
                <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
                    <List dense sx={{ py: 0 }}>
                        {files.map((f) => {
                            const key = fileKey(f);
                            return (
                                <ListItem
                                    key={key}
                                    secondaryAction={
                                        <IconButton
                                            edge="end"
                                            aria-label="remove file"
                                            onClick={() => onRemove(key)}
                                        >
                                            <DeleteOutlineIcon />
                                        </IconButton>
                                    }
                                    sx={{ py: 0.5 }}
                                >
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                        <InsertDriveFileOutlinedIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={f.name}
                                        secondary={`${(f.size / (1024 * 1024)).toFixed(2)} MB`}
                                        slotProps={{
                                            primary: { sx: { fontSize: 14 } },
                                            secondary: { sx: { fontSize: 12 } },
                                        }}
                                    />
                                </ListItem>
                            );
                        })}
                    </List>
                </Box>
            </Box>
        </>
    );
}

function ReviewSection({ uploads, assignmentName }) {
    const renderList = (idx, title) => (
        <Paper
            variant="outlined"
            sx={{ p: 2, borderRadius: "12px", borderColor: "grey.300" }}
        >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {title}
            </Typography>

            {uploads[idx]?.length ? (
                <List dense sx={{ py: 0 }}>
                    {uploads[idx].map((f) => (
                        <ListItem key={fileKey(f)} sx={{ py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                                <InsertDriveFileOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                                primary={f.name}
                                secondary={`${(f.size / (1024 * 1024)).toFixed(2)} MB`}
                                slotProps={{
                                    primary: { sx: { fontSize: 14 } },
                                    secondary: { sx: { fontSize: 12 } },
                                }}
                            />

                        </ListItem>
                    ))}
                </List>
            ) : (
                <Typography variant="body2" color="text.secondary">
                    No files uploaded.
                </Typography>
            )}
        </Paper>
    );

    const renderCount = (idx, title) => {
        const count = uploads[idx]?.length ?? 0;
        return (
            <Paper
                variant="outlined"
                sx={{ p: 2, borderRadius: "12px", borderColor: "grey.300" }}
            >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {title}
                    </Typography>
                    <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700 }}>
                        Total File{count === 1 ? "" : "s"}: {count}
                    </Typography>
                </Stack>
            </Paper>
        );
    };

    return (
        <Box>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    minHeight: 56,
                    borderBottom: "1px solid",
                    borderColor: "grey.200",
                    px: 1,
                    mb: 2,
                }}
            >
                <Typography variant="h6" sx={{ fontWeight: 700, m: 0 }}>
                    Assignment Name: {assignmentName}
                </Typography>
            </Box>

            <Stack spacing={2}>
                {/* Keep full lists for the first two */}
                {renderList(0, "Assignment Information")}
                {renderList(1, "Marking Guidelines")}

                {/* Show numbers only for Coordinator & Tutor */}
                {renderCount(2, "Coordinator Marked Assignments")}
                {renderCount(3, "Tutor Marked Assignments")}
            </Stack>
        </Box>
    );
}
