import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [role, setRole] = useState(null);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    // 🔹 Fake login logic (no backend yet)
    const login = (username, password) => {
        // reset any previous error
        setError(null);

        // simple mock rule: only "admin"/"admin" works
        if (username.toLowerCase() === "admin" && password === "admin") {
            setRole("admin");
            setUser("admin");
            console.log("✅ Logged in as admin");
            return { success: true };
        }
                // simple mock rule: only "admin"/"admin" works
        if (username.toLowerCase() === "user" && password === "user") {
            setRole("user");
            setUser("user");
            console.log("✅ Logged in as user");
            return { success: true };
        }

        // else reject login
        setError("Invalid credentials");
        console.log("❌ Invalid credentials");
        return { success: false };
    };

    const logout = () => {
        setRole(null);
        setUser(null);
        setError(null);
    }

    return (
        <AuthContext.Provider value={{ role, user, error, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
