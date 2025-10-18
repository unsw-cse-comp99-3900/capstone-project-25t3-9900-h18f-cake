import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import {
    Box, Card, CardContent, Typography, TextField, Button,
    IconButton, InputAdornment, CircularProgress, Alert,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function RegisterMain() {
    const { register } = useAuth(); 
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");

    // Validate form inputs before submission
    const validateForm = () => {
        const newErrors = {};
        
        // Email validation
        if (!email.trim()) {
            newErrors.email = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Email format is invalid";
        }
        
        // Password validation
        if (!password) {
            newErrors.password = "Password is required";
        } else if (password.length < 6) {
            newErrors.password = "Password must be at least 6 characters";
        }
        
        // Password confirmation validation
        if (!confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password";
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");
        
        // Prevent submission if validation fails
        if (!validateForm()) return;

        setSubmitting(true);

        try {
            // Attempt registration
            const result = await register(email, password);
            
            if (result.success) {
                // Redirect to login page on successful registration
                navigate("/login", { 
                    state: { message: "Registration successful! Please login." } 
                });
            } else {
                // Display server error message
                setServerError(result.message || "Registration failed");
            }
        } catch (error) {
            // Handle network or unexpected errors
            setServerError(error.message || "Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box sx={{ 
            minHeight: "100svh", 
            display: "grid", 
            placeItems: "center", 
            p: { xs: 2, sm: 3 }, 
            bgcolor: "#ffffff" 
        }}>
            <Card elevation={0} sx={{ 
                width: { xs: "100%", sm: 520 }, 
                height: { xs: "100%", sm: "auto" }, 
                borderRadius: "16px", 
                bgcolor: "#eef3f8", 
                boxShadow: "0 12px 30px rgba(2,6,23,0.08)" 
            }}>
                <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
                    <Typography variant="h4" align="center" sx={{ fontWeight: 800, mb: 1 }}>
                        Create an account
                    </Typography>
                    <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 5 }}>
                        Enter your details to get started
                    </Typography>

                    {serverError && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: "8px" }}>
                            {serverError}
                        </Alert>
                    )}

                    <Box component="form" noValidate onSubmit={handleSubmit}>
                        {/* Email input field */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: "#111827" }}>
                            Email
                        </Typography>
                        <TextField
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (errors.email) setErrors({ ...errors, email: "" });
                            }}
                            autoComplete="email"
                            error={!!errors.email}
                            helperText={errors.email || " "}
                            fullWidth
                            size="medium"
                            sx={{
                                backgroundColor: "transparent",
                                "& .MuiOutlinedInput-root": { 
                                    backgroundColor: "#fff", 
                                    borderRadius: "12px" 
                                },
                                "& .MuiFormHelperText-root": { 
                                    backgroundColor: "transparent", 
                                    m: "4px 0 0 0" 
                                },
                            }}
                        />

                        {/* Password input field */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, mt: 3, color: "#111827" }}>
                            Password
                        </Typography>
                        <TextField
                            placeholder="Enter your password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                if (errors.password) setErrors({ ...errors, password: "" });
                            }}
                            autoComplete="new-password"
                            error={!!errors.password}
                            helperText={errors.password || " "}
                            fullWidth
                            size="medium"
                            sx={{
                                backgroundColor: "transparent",
                                "& .MuiOutlinedInput-root": { 
                                    backgroundColor: "#fff", 
                                    borderRadius: "12px" 
                                },
                                "& .MuiFormHelperText-root": { 
                                    backgroundColor: "transparent", 
                                    m: "4px 0 0 0" 
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

                        {/* Password confirmation field */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, mt: 3, color: "#111827" }}>
                            Confirm Password
                        </Typography>
                        <TextField
                            placeholder="Confirm your password"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" });
                            }}
                            autoComplete="new-password"
                            error={!!errors.confirmPassword}
                            helperText={errors.confirmPassword || " "}
                            fullWidth
                            size="medium"
                            sx={{
                                backgroundColor: "transparent",
                                "& .MuiOutlinedInput-root": { 
                                    backgroundColor: "#fff", 
                                    borderRadius: "12px" 
                                },
                                "& .MuiFormHelperText-root": { 
                                    backgroundColor: "transparent", 
                                    m: "4px 0 0 0" 
                                },
                            }}
                        />

                        {/* Submit button */}
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
                                bgcolor: "#0f172a", 
                                "&:hover": { bgcolor: "#0b1220" }, 
                                mt: 4
                            }}
                        >
                            {submitting ? (
                                <>
                                    <CircularProgress size={18} sx={{ mr: 1, color: "white" }} />
                                    Creating account…
                                </>
                            ) : (
                                "Sign up"
                            )}
                        </Button>

                        {/* Login link */}
                        <Box sx={{ textAlign: "center", mt: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                                Already have an account?{" "}
                                <Link 
                                    to="/login" 
                                    style={{ 
                                        color: "#0f172a", 
                                        fontWeight: 700, 
                                        textDecoration: "none",
                                        "&:hover": { textDecoration: "underline" }
                                    }}
                                >
                                    Sign in
                                </Link>
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}