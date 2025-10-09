import React, { useRef, useState } from "react";
import { Paper, Stack, Typography, Button } from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";

export default function UploadBox({
    onUpload,              // (files: File[]) => void
    accept = "*",          // e.g. ".pdf,.doc,.docx,image/*"
    multiple = true,
    disabled = false,
    title = "Upload Files",
    hint = "Drag & drop files here, or browse",
}) {
    const inputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    const openPicker = () => !disabled && inputRef.current?.click();

    const handleFiles = (fileList) => {
        if (!fileList || fileList.length === 0) return;
        const files = Array.from(fileList);
        onUpload?.(files); // no size limit
    };

    const onChange = (e) => {
        handleFiles(e.target.files);
        e.target.value = ""; // allow re-selecting the same file later
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
    };

    const onDragOver = (e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
    };

    const onDragLeave = () => setDragActive(false);

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                hidden
                accept={accept}
                multiple={multiple}
                onChange={onChange}
            />

            <Paper
                variant="outlined"
                role="button"
                aria-label={title}
                onClick={openPicker}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                sx={{
                    p: 3,
                    borderRadius: "12px",
                    border: "2px dashed",
                    borderColor: dragActive ? "primary.main" : "grey.300",
                    bgcolor: dragActive ? "grey.50" : "#fff",
                    cursor: disabled ? "not-allowed" : "pointer",
                    textAlign: "center",
                    transition: "border-color .15s ease, background-color .15s ease",
                    opacity: disabled ? 0.6 : 1,
                }}
            >
                <Stack spacing={1.25} alignItems="center">
                    <CloudUploadOutlinedIcon sx={{ fontSize: 40, color: "grey.700" }} />
                    {/* <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {title}
                    </Typography> */}
                    <Typography variant="body2" color="text.secondary">
                        {hint}{" "}
                        <Button
                            variant="text"
                            onClick={(e) => { e.stopPropagation(); openPicker(); }}
                            sx={{ p: 0, minWidth: 0, textTransform: "none" }}
                        >
                            browse
                        </Button>
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={(e) => { e.stopPropagation(); openPicker(); }}
                        disabled={disabled}
                        sx={{ borderRadius: "12px", textTransform: "none" }}
                    >
                        Choose files
                    </Button>
                </Stack>
            </Paper>
        </>
    );
}
