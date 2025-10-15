import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box, Paper, Stack, Typography, Button, Divider, List, ListItem,
  ListItemIcon, ListItemText, IconButton, TextField
} from "@mui/material";
import UploadBox from "../component/upload-box";
import UploadStepper from "../component/upload-stepper";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { toast } from "sonner";
import { useAuth } from "../context/auth-context";
import API from "../api";

const STEP_LABELS = [
    "Step 1: Assignment Information",
    "Step 2: Marking Guidelines",
    "Step 3: Assignment Marked by Coordinator",
    "Step 4: Marked by Coordinator",
    "Step 5: Assignment Marked by Tutor",
    "Step 6: Marked by Tutor",
    "Review & Submit",
];

function fileKey(f) {
  return `${f.name}-${f.lastModified}-${f.size}`;
}
const isPdf = (f) =>
  (f.type && f.type.toLowerCase() === "application/pdf") || /\.pdf$/i.test(f.name);
function extractZid(filename) {
  const m = filename && filename.match(/[zZ]\d{7}/);
  return m ? m[0].toLowerCase() : null;
}
function groupByZid(files) {
  const g = {};
  for (const f of files) {
    const zid = extractZid(f.name);
    if (!zid) continue;
    if (!g[zid]) g[zid] = [];
    g[zid].push(f);
  }
  return g;
}

export default function MultiStepUpload() {
  const { user } = useAuth();
  const isLoggedIn = user !== null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState("");
  const [term, setTerm] = useState("");
  const [assignmentName, setAssignmentName] = useState("");
  const [assignmentId, setAssignmentId] = useState(null);
  const [subByStudent, setSubByStudent] = useState({});
  const [uploads, setUploads] = useState({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => { if (!isLoggedIn) navigate("/"); }, [isLoggedIn, navigate]);
  useEffect(() => {
    const courseParam = searchParams.get("course");
    const termParam = searchParams.get("term");
    if (courseParam) setCourse(courseParam);
    if (termParam) setTerm(termParam);
  }, [searchParams]);

  const handleUpload = (stepIndex) => async (newFiles) => {
    try {
      setUploads((prev) => {
        const next = { ...prev };
        next[stepIndex] = [...newFiles, ...prev[stepIndex]];
        return next;
      });
      toast.success(`Uploaded ${newFiles.length} file${newFiles.length > 1 ? "s" : ""} to ${STEP_LABELS[stepIndex]}`);
    } catch {
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

  const canGoNext = useMemo(() => {
    const isReview = activeStep === STEP_LABELS.length - 1;
    if (isReview) return true;
    const files = uploads[activeStep] || [];
    const hasFiles = files.length > 0;
    if (activeStep === 0) {
      const hasPdf0 = files.some(isPdf);
      return hasFiles && hasPdf0 && assignmentName.trim().length > 0;
    }
    if (activeStep === 1) {
      const hasPdf1 = files.some(isPdf);
      return hasFiles && hasPdf1;
    }
    return hasFiles;
  }, [activeStep, uploads, assignmentName]);

  const onNext = async () => {
    if (activeStep >= STEP_LABELS.length - 1) return;

    if (!canGoNext) {
      let msg = "Please upload at least one file before continuing.";
      if (activeStep === 0) {
        const hasName = assignmentName.trim().length > 0;
        const hasPdf0 = (uploads[0] || []).some(isPdf);
        if (!hasName && !hasPdf0) msg = "Enter an assignment name and upload at least one PDF for Step 1.";
        else if (!hasName) msg = "Please enter the assignment name.";
        else if (!hasPdf0) msg = "Step 1: Please upload at least one PDF.";
      } else if (activeStep === 1) {
        const hasPdf1 = (uploads[1] || []).some(isPdf);
        if (!hasPdf1) msg = "Step 2: Please upload at least one PDF.";
      }
      toast.error(msg);
      return;
    }

    try {
      if (activeStep === 1) {
        const spec = (uploads[0] || [])[0];
        const rubric = (uploads[1] || [])[0];
        const data = await API.assignments.createWithFiles({ course, term, title: assignmentName, step1: spec, step2: rubric });
        setAssignmentId(data.id);
        toast.success("Assignment created.");
      }

      if (activeStep === 2) {
        if (!assignmentId) { toast.error("Assignment is not created yet."); return; }
        const studentFiles = uploads[2] || [];
        const created = await API.submissions.bulkUpload(assignmentId, assignmentName, course, term, studentFiles);
        const map = {};
        for (const s of created || []) if (s.student_id) map[s.student_id.toLowerCase()] = s;
        setSubByStudent(map);
        toast.success(`Uploaded ${studentFiles.length} student file(s).`);
      }

      if (activeStep === 3) {
        const files = uploads[3] || [];
        const grouped = groupByZid(files);
        const zids = Object.keys(grouped);
        if (zids.length === 0) { toast.error("No valid files with zID found for Step 4."); return; }
        const missing = zids.filter((z) => !subByStudent[z]);
        if (missing.length) { toast.error(`No submission from Step3 for: ${missing.join(", ")}`); return; }
        for (const zid of zids) {
          const sub = subByStudent[zid];
          await API.submissions.appendFiles(sub.id, 4, grouped[zid], zid);
        }
        toast.success(`Uploaded ${files.length} file(s) to step 4.`);
      }

      if (activeStep === 4) {
        if (!assignmentId) { toast.error("Assignment is not created yet."); return; }
        const files = uploads[4] || [];
        const grouped = groupByZid(files);
        const zids = Object.keys(grouped);
        if (zids.length === 0) { toast.error("No valid files with zID found for Step 5."); return; }
        const map = { ...subByStudent };
        for (const zid of zids) {
          const exist = map[zid];
          if (exist) {
            await API.submissions.appendFiles(exist.id, 5, grouped[zid], zid);
          } else {
            const fd = new FormData();
            fd.append("assignmentName", assignmentName);
            fd.append("course", course);
            fd.append("term", term || "");
            fd.append("studentId", zid);
            if (assignmentId != null) fd.append("assignmentId", String(assignmentId));
            for (const f of grouped[zid]) fd.append("step5", f);
            const createdSub = await API.submissions.create(fd);
            map[zid] = createdSub;
          }
        }
        setSubByStudent(map);
        toast.success(`Uploaded ${files.length} file(s) to step 5.`);
      }

      if (activeStep === 5) {
        const files = uploads[5] || [];
        const grouped = groupByZid(files);
        const zids = Object.keys(grouped);
        if (zids.length === 0) { toast.error("No valid files with zID found for Step 6."); return; }
        const missing = zids.filter((z) => !subByStudent[z]);
        if (missing.length) { toast.error(`No Step5 submission for: ${missing.join(", ")}`); return; }
        for (const zid of zids) {
          const sub = subByStudent[zid];
          await API.submissions.appendFiles(sub.id, 6, grouped[zid], zid);
        }
        toast.success(`Uploaded ${files.length} file(s) to step 6.`);
      }

      setActiveStep((s) => s + 1);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Request failed");
    }
  };

  const onPrev = () => {
    if (activeStep === 0) navigate("/courses", { replace: true });
    else setActiveStep((s) => s - 1);
  };
  const onSubmit = () => { toast.success("All done!"); navigate("/courses", { replace: true }); };

  return (
    <Box sx={{ minHeight: "100svh", display: "grid", placeItems: "center", px: { xs: 2, sm: 4, md: 8 }, bgcolor: "grey.100" }}>
      <Paper elevation={0} sx={{ width: { xs: "100%", sm: "90%", md: "1200px" }, p: 3, borderRadius: "12px", border: "1px solid", borderColor: "grey.300", bgcolor: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}>
        <Stack spacing={2}>
          <Box><Typography variant="h4" sx={{ fontWeight: 700, mb: 10 }}>Upload Assignment - {term ? term : "No term selected"} {course ? course : "No course selected"}</Typography></Box>
          <UploadStepper activeStep={activeStep} steps={STEP_LABELS} />

          {activeStep === 0 && (
            <Section
              title="Upload Assignment Information"
              body={
                <>
                  <TextField label="Assignment name" placeholder="e.g., Project 1: Data Services" value={assignmentName} onChange={(e) => setAssignmentName(e.target.value)} fullWidth margin="normal" sx={{ backgroundColor: "#fff", borderRadius: "12px", "& .MuiOutlinedInput-root": { borderRadius: "12px" } }} />
                  <UploadBox onUpload={handleUpload(0)} accept=".pdf" multiple={false} hint="Upload the specification PDF" />
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
                  <UploadBox onUpload={handleUpload(1)} accept=".pdf" multiple={false} title="Marking Guidelines" hint="Upload the rubric PDF" />
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
                  <UploadBox onUpload={handleUpload(2)} accept="*" multiple title="Assignment Marked by Coordinator" hint="Drag & drop student submissions (filenames must contain zID)" />
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
                  <UploadBox onUpload={handleUpload(3)} accept="*" multiple title="Score Marked by Coordinator" hint="Filenames must contain zID" />
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
                  <UploadBox onUpload={handleUpload(4)} accept="*" multiple title="Assignment Marked by Tutor" hint="Filenames must contain zID" />
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
                  <UploadBox onUpload={handleUpload(5)} accept="*" multiple title="Score Marked by Tutor" hint="Filenames must contain zID" />
                  <FileList files={uploads[5]} onRemove={(key) => removeFile(5, key)} />
                </>
              }
            />
          )}

          {activeStep === 6 && <ReviewSection uploads={uploads} assignmentName={assignmentName} />}

          <Stack direction="row" spacing={1.5} justifyContent="space-between" sx={{ pt: 1 }}>
            <Button variant="outlined" onClick={onPrev} sx={{ borderRadius: "12px", textTransform: "none" }}>Prev</Button>
            {activeStep < STEP_LABELS.length - 1 ? (
              <Button variant="contained" onClick={onNext} sx={{ borderRadius: "12px", textTransform: "none" }}>Next</Button>
            ) : (
              <Button variant="contained" color="success" onClick={onSubmit} sx={{ borderRadius: "12px", textTransform: "none" }}>Submit</Button>
            )}
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}

function Section({ title, hint, body }) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", minHeight: 56, borderBottom: "1px solid", borderColor: "grey.200", px: 1, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, m: 0 }}>{title}</Typography>
      </Box>
      {hint && (<Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{hint}</Typography>)}
      {body}
    </Box>
  );
}

function FileList({ files, onRemove }) {
  if (!files?.length) return null;
  return (
    <>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ borderRadius: "8px", border: "1px solid", borderColor: "grey.300", maxHeight: 280, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Box sx={{ bgcolor: "grey.50", px: 2, py: 1, borderBottom: "1px solid", borderColor: "grey.200", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle2" color="text.secondary">Uploaded</Typography>
          <Typography variant="caption" color="text.secondary">{files.length} {files.length === 1 ? "file" : "files"}</Typography>
        </Box>
        <Box sx={{ flex: 1, overflowY: "auto", pr: 1 }}>
          <List dense sx={{ py: 0 }}>
            {files.map((f) => {
              const key = fileKey(f);
              return (
                <ListItem key={key} secondaryAction={<IconButton edge="end" aria-label="remove file" onClick={() => onRemove(key)}><DeleteOutlineIcon /></IconButton>} sx={{ py: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}><InsertDriveFileOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={f.name} secondary={`${(f.size / (1024 * 1024)).toFixed(2)} MB`} slotProps={{ primary: { sx: { fontSize: 14 } }, secondary: { sx: { fontSize: 12 } } }} />
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
    <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", borderColor: "grey.300" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
      {uploads[idx]?.length ? (
        <List dense sx={{ py: 0 }}>
          {uploads[idx].map((f) => (
            <ListItem key={fileKey(f)} sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}><InsertDriveFileOutlinedIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary={f.name} secondary={`${(f.size / (1024 * 1024)).toFixed(2)} MB`} slotProps={{ primary: { sx: { fontSize: 14 } }, secondary: { sx: { fontSize: 12 } } }} />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">No files uploaded.</Typography>
      )}
    </Paper>
  );
  const renderCount = (idx, title) => {
    const count = uploads[idx]?.length ?? 0;
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
                {renderCount(3, "Marked by Coordinator")}
                {renderCount(4, "Assignment Marked by Tutor")}
                {renderCount(5, "Marked by Tutor")}
            </Stack>
        </Box>
    );
  };
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", minHeight: 56, borderBottom: "1px solid", borderColor: "grey.200", px: 1, mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, m: 0 }}>Assignment Name: {assignmentName}</Typography>
      </Box>
      <Stack spacing={2}>
        {renderList(0, "Assignment Information")}
        {renderList(1, "Marking Guidelines")}
        {renderCount(2, "Assignment Marked by Coordinator")}
        {renderCount(3, "Score Marked by Coordinator")}
        {renderCount(4, "Assignment Marked by Tutor")}
        {renderCount(5, "Score Marked by Tutor")}
      </Stack>
    </Box>
  );
}
