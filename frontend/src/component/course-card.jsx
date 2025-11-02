import { Paper, ButtonBase, Typography, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import BuildCircleIcon from '@mui/icons-material/BuildCircle';

export default function CourseCard({
    code,
    title,
    showDelete,
    showManage,
    onDelete,
    onManage,
    onOpen,
    height = { xs: 116, sm: 128, md: 140 },
}) {
    return (
        <Paper
            component={ButtonBase}
            onClick={showDelete || showManage ? undefined : () => onOpen?.()}
            disableRipple={showDelete || showManage}
            focusRipple={false}
            tabIndex={showDelete || showManage ? -1 : 0}
            aria-disabled={showDelete || showManage || undefined}
            sx={{
                position: "relative",
                width: { xs: 100, sm: 250, md: 320 },
                p: { xs: 2, md: 3 },
                bgcolor: "#eef3f8",
                borderRadius: "18px",
                boxShadow: "none",
                cursor: showDelete || showManage ? "default" : "pointer",
                height,
                minHeight: height,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "center",
                textAlign: "left",
                overflow: "hidden",
                transition: "box-shadow .2s ease, transform .08s ease",
                border: (showDelete || showManage) ? "2px solid #475569" : "1px solid transparent",
                "&:hover": !(showDelete || showManage)
                    ? {
                        backgroundColor: "grey.100",
                        transform: "translateY(-2px)",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.26)",
                    }
                    : undefined,
                "&:focus-visible": !(showDelete || showManage)
                    ? { outline: "2px solid #94a3b8", outlineOffset: 2 }
                    : undefined,
            }}
        >
            {/* Delete button */}
            {showDelete && (
                <IconButton
                    aria-label={`delete ${code}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                    }}
                    size="small"
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        bgcolor: "#fff",
                        border: "1px solid",
                        borderColor: "black.300",
                        "&:hover": { bgcolor: "grey.50" },
                    }}
                >
                    <CloseRoundedIcon sx={{ fontSize: 18 }} />
                </IconButton>
            )}

            {/* Manage button */}
            {showManage && (
                <IconButton
                    aria-label={`manage ${code}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onManage?.();
                    }}
                    size="small"
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        bgcolor: "#fff",
                        border: "1px solid",
                        borderColor: "grey.300",
                        "&:hover": { bgcolor: "grey.50" },
                    }}
                >
                    <BuildCircleIcon sx={{ fontSize: 18 }} />
                </IconButton>
            )}

            <Typography
                variant="h6"
                sx={{ fontWeight: 900, mb: 0.5, pr: 4, width: "100%" }}
            >
                {code}
            </Typography>

            {title && (
                <Typography
                    variant="subtitle1"
                    sx={{
                        color: "grey.700",
                        fontWeight: 700,
                        lineHeight: 1.35,
                        pr: 4,
                        width: "100%",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                    }}
                >
                    {title}
                </Typography>
            )}
        </Paper>
    );
}
