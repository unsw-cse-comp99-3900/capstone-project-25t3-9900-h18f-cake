import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);

    const login = (username, password) => {
        // reset any previous error
        setError(null);

        // simple mock rule: only "admin"/"admin" works
        if (username.toLowerCase() === "admin" && password === "admin") {
            setUser("admin");
            console.log("✅ Logged in as admin");
            return { success: true };
        }

        // else reject login
        setError("Invalid credentials");
        console.log("❌ Invalid credentials");
        return { success: false };
    };

    const logout = () => {
        setUser(null);
        setError(null);
    }

    return (
        <AuthContext.Provider value={{ user, error, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);