import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    IconButton,
    InputAdornment,
    CircularProgress,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function LoginMain() {
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [emptyUsername, setEmptyUsername] = useState(false);
    const [emptyPassword, setEmptyPassword] = useState(false);
    const [signedIn, setSignedIn] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        setEmptyUsername(!username.trim());
        setEmptyPassword(!password);
        if (!username.trim() || !password) return;

        setSubmitting(true);
        setTimeout(() => {
            setSignedIn(true);
            setSubmitting(false);
        }, 700);
    };

    useEffect(() => {
        if (signedIn) navigate("/courses", { replace: true });
    }, [signedIn, navigate]);

    return (
        <Box
            sx={{
                minHeight: "100svh",
                display: "grid",
                placeItems: "center",
                p: { xs: 2, sm: 3 },
                bgcolor: "#ffffff",
            }}
        >
            <Card
                elevation={0}
                sx={{
                    width: { xs: "100%", sm: 520 },
                    height: { xs: "100%", sm: 520 },
                    borderRadius: "16px",
                    bgcolor: "#eef3f8", // soft bluish like the screenshot
                    boxShadow: "0 12px 30px rgba(2,6,23,0.08)",
                }}
            >
                <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                    {/* Title */}
                    <Typography
                        variant="h4"
                        align="center"
                        sx={{ fontWeight: 800, mb: 1 }}
                    >
                        Welcome back
                    </Typography>
                    <Typography
                        variant="body1"
                        align="center"
                        color="text.secondary"
                        sx={{ mb: 5 }}
                    >
                        Enter your credentials to access your account
                    </Typography>

                    {/* Form */}
                    <Box component="form" noValidate onSubmit={handleSubmit}>
                        {/* Username */}
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, mb: 1, color: "#111827" }}
                        >
                            Username
                        </Typography>
                        <TextField
                            placeholder="you@example.com"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                if (emptyUsername && e.target.value.trim()) setEmptyUsername(false);
                            }}
                            autoComplete="username"
                            error={emptyUsername}
                            helperText={emptyUsername ? "Username is required" : " "}
                            fullWidth
                            size="medium"
                            sx={{
                                // keep the root transparent
                                backgroundColor: "transparent",
                                // style only the input wrapper
                                "& .MuiOutlinedInput-root": {
                                    backgroundColor: "#fff",
                                    borderRadius: "12px",
                                },
                                // make sure helper area isn’t white
                                "& .MuiFormHelperText-root": {
                                    backgroundColor: "transparent",
                                    m: "4px 0 0 0",
                                },
                            }}
                        />

                        {/* Password */}
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 700, mb: 1, color: "#111827" }}
                        >
                            Password
                        </Typography>
                        <TextField
                            placeholder="Enter your password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (emptyPassword && e.target.value) setEmptyPassword(false);
                            }}
                            autoComplete="current-password"
                            error={emptyPassword}
                            helperText={emptyPassword ? "Password is required" : " "}
                            fullWidth
                            size="medium"
                            sx={{
                                // keep the root transparent
                                backgroundColor: "transparent",
                                // style only the input wrapper
                                "& .MuiOutlinedInput-root": {
                                    backgroundColor: "#fff",
                                    borderRadius: "12px",
                                },
                                // make sure helper area isn’t white
                                "& .MuiFormHelperText-root": {
                                    backgroundColor: "transparent",
                                    m: "4px 0 0 0",
                                },
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            onClick={() => setShowPassword((s) => !s)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* Submit */}
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={submitting}
                            sx={{
                                py: 1.25,
                                borderRadius: "12px",
                                textTransform: "none",
                                fontWeight: 700,
                                bgcolor: "#0f172a", // dark navy
                                "&:hover": { bgcolor: "#0b1220" },
                            }}
                        >
                            {submitting ? (
                                <>
                                    <CircularProgress size={18} sx={{ mr: 1, color: "white" }} />
                                    Signing in…
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}
