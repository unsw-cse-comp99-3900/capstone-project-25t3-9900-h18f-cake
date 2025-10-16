import { createContext, useContext, useMemo, useState } from "react";
import { auth as authApi, getToken, clearToken } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setTokenState] = useState(() => getToken());
    const [error, setError] = useState(null);

    async function login(username, password) {
        setError(null);
        try {
            const res = await authApi.login(username, password);
            setTokenState(getToken());
            return { success: true, data: res };
        } catch (e) {
            const msg = e?.message || "Login failed";
            setError(msg);
            return { success: false, message: msg };
        }
    }

    function logout() {
        clearToken();
        setTokenState(null);
        setError(null);
    }

    const value = useMemo(() => ({ token, error, login, logout }), [token, error]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
};
