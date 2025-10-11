import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Box, Paper, Stack, Typography, Button, Divider, List, ListItem, ListItemIcon, ListItemText, IconButton, TextField } from "@mui/material";
import UploadBox from "../component/upload-box";
import UploadStepper from "../component/upload-stepper";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "sonner";
import { useAuth } from "../context/auth-context";
import { API_URL } from "../common/const";
import { handleFetch } from "../common/utils";

const STEP_LABELS = [
    "Step 1: Assignment Information",
    "Step 2: Marking Guidelines",
    "Step 3: Assignment Marked by Coordinator",
    "Step 4: Score Marked by Coordinator",
    "Step 5: Assignment Marked by Tutor",
    "Step 6: Score Marked by Tutor",
    "Review & Submit",
];

function fileKey(f) {
    return `${f.name}-${f.lastModified}-${f.size}`;
}

// set File Manager - <course> from query string param: "course"
export default function MultiStepUpload() {
    const { user } = useAuth();
    const isLoggedIn = user !== null;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [course, setCourse] = useState("");
    const [term, setTerm] = useState("");
    const [assignmentName, setAssignmentName] = useState("");

    // 6 upload steps => indices 0..5
    const [uploads, setUploads] = useState({
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [],
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


    // needs to fix to upload the files.
    const handleUpload = (stepIndex) => async (newFiles) => {
        try {
            // Update UI state immediately
            setUploads((prev) => {
                const next = { ...prev };
                next[stepIndex] = [...newFiles, ...prev[stepIndex]];
                return next;
            });

            // // 🔥 Upload each file to backend
            // for (const file of newFiles) {
            //     const result = await uploadFileToBackend(file);
            //     console.log("Uploaded:", result.file_url); // You can store this in DB or map
            // }

            toast.success(
                `Uploaded ${newFiles.length} file${newFiles.length > 1 ? "s" : ""} to ${STEP_LABELS[stepIndex]}`
            );
        } catch (err) {
            toast.error("Upload failed");
        }
    };

    const removeFile = (stepIndex, key) => {
        setUploads((prev) => {
            const next = { ...prev };
            next[stepIndex] = prev[stepIndex].filter((f) => fileKey(f) !== key);
            return next;
        });

    };

    // require at least one file for steps 0..5; review is index 6
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
        // API sync request to backend
        handleFetch(`${API_URL}/v1/assignments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user,
                course,
                assignmentName,
                term,
                step1: uploads[0].map((f) => f.name),
                step2: uploads[1].map((f) => f.name),
                step3: uploads[2].map((f) => f.name),
                step4: uploads[3].map((f) => f.name),
                step5: uploads[4].map((f) => f.name),
                step6: uploads[5].map((f) => f.name),
            }),
        }).then((result) => {
            if (result.ok) {
                toast.success(`User ${user} has submitted assignment ${assignmentName} for ${course} ${term} successfully!`);
                navigate("/courses", { replace: true });
                console.log("Submitting payload:", {
                    user,
                    course,
                    assignmentName,
                    term,
                    step1: uploads[0].map((f) => f.name),
                    step2: uploads[1].map((f) => f.name),
                    step3: uploads[2].map((f) => f.name),
                    step4: uploads[3].map((f) => f.name),
                    step5: uploads[4].map((f) => f.name),
                    step6: uploads[5].map((f) => f.name),
                });
            } else {
                toast.error(`Failed to submit assignment: ${result.statusText}`);
                console.log(`Failed to submit assignment: ${result.statusText}`);
            }
        }).catch((error) => {
            toast.error(`Failed to submit assignment: ${error}`);
            console.log(`Failed to submit assignment: ${error}`);
        });
    };

    return (
        <Box
            sx={{
                minHeight: "100svh",
                display: "grid",
                placeItems: "center",
                px: { xs: 2, sm: 4, md: 8 },
                bgcolor: "grey.100",
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    width: { xs: "100%", sm: "90%", md: "1200px" },
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
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 10 }}>
                            Upload Assignment - {term ? term : "No term selected"} {course ? course : "No course selected"}
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
                            title="Upload Assignment Marked by Coordinator"
                            body={
                                <>
                                    <UploadBox
                                        onUpload={handleUpload(2)}
                                        accept="*"
                                        multiple
                                        title="Assignment Marked by Coordinator"
                                        hint="Drag & drop files here, or"
                                    />
                                    <FileList files={uploads[2]} onRemove={(key) => removeFile(2, key)} />
                                </>
                            }
                        />
                    )}

                    {activeStep === 3 && (
                        <Section
                            title="Upload Score Marked by Coordinator"
                            body={
                                <>
                                    <UploadBox
                                        onUpload={handleUpload(3)}
                                        accept="*"
                                        multiple
                                        title="Score Marked by Coordinator"
                                        hint="Drag & drop files here, or"
                                    />
                                    <FileList files={uploads[3]} onRemove={(key) => removeFile(3, key)} />
                                </>
                            }
                        />
                    )}
                    {activeStep === 4 && (
                        <Section
                            title="Upload Assignment Marked by Tutor"
                            body={
                                <>
                                    <UploadBox
                                        onUpload={handleUpload(4)}
                                        accept="*"
                                        multiple
                                        title="Assignment Marked by Tutor"
                                        hint="Drag & drop files here, or"
                                    />
                                    <FileList files={uploads[4]} onRemove={(key) => removeFile(4, key)} />
                                </>
                            }
                        />
                    )}

                    {activeStep === 5 && (
                        <Section
                            title="Upload Score Marked by Tutor"
                            body={
                                <>
                                    <UploadBox
                                        onUpload={handleUpload(5)}
                                        accept="*"
                                        multiple
                                        title="Score Marked by Tutor"
                                        hint="Drag & drop files here, or"
                                    />
                                    <FileList files={uploads[5]} onRemove={(key) => removeFile(5, key)} />
                                </>
                            }
                        />
                    )}

                    {activeStep === 6 && <ReviewSection uploads={uploads} assignmentName={assignmentName} />}

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
                {renderCount(2, "Assignment Marked by Coordinator")}
                {renderCount(3, "Score Marked by Coordinator")}
                {renderCount(4, "Assignment Marked by Tutor")}
                {renderCount(5, "Score Marked by Tutor")}
            </Stack>
        </Box>
    );
}
