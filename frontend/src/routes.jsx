import { Routes, Route } from "react-router-dom";
import LoginMain from "./pages/login";
import CoursesPage from "./pages/course";
import FileUpload from "./pages/fileupload";
import { AuthProvider } from "./context/auth-context";
import { Toaster } from "sonner";
// import ViewPages from "./pages/viewmpages";

export default function PageRoutes() {
    return (
        <AuthProvider>
            <>
                <Routes>
                    <Route path="/" element={<LoginMain />} />
                    <Route path="/courses" element={<CoursesPage />} />
                    <Route path="/fileupload" element={<FileUpload />} />
                    {/* <Route path="/viewmpages" element={<ViewPages />} /> */}
                </Routes>
                <Toaster position="top-right" richColors closeButton />
            </>
        </AuthProvider>
    );
}