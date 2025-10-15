import { Routes, Route, Navigate } from "react-router-dom";
import LoginMain from "./pages/login";
import CoursesPage from "./pages/course";
import FileUpload from "./pages/fileupload";
import { AuthProvider, useAuth } from "./context/auth-context";
import { Toaster } from "sonner";
import Airesult from "./pages/airesult";

function Private({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/" replace />;
}

function PublicOnly({ children }) {
  const { token } = useAuth();
  return token ? <Navigate to="/courses" replace /> : children;
}

export default function PageRoutes() {
  return (
    <AuthProvider>
      <>
        <Routes>
          <Route
            path="/"
            element={
              <PublicOnly>
                <LoginMain />
              </PublicOnly>
            }
          />
          <Route
            path="/courses"
            element={
              <Private>
                <CoursesPage />
              </Private>
            }
          />
          <Route
            path="/fileupload"
            element={
              <Private>
                <FileUpload />
              </Private>
            }
          />
          <Route
            path="/airesult"
            element={
              <Private>
                <Airesult />
              </Private>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors closeButton />
      </>
    </AuthProvider>
  );
}