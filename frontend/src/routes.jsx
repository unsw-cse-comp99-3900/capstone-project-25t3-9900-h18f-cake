import { Routes, Route } from "react-router-dom";
import LoginMain from "./pages/login";
import CoursesPage from "./pages/course";
import FileUpload from "./pages/fileupload";
import { AuthProvider } from "./context/auth-context";
import { Toaster } from "sonner";
// import ViewResults from "./pages/viewresults.jsx";

export default function PageRoutes() {
    return (
        <AuthProvider>
            <>
                <Routes>
                    <Route path="/" element={<LoginMain />} />
                    <Route path="/courses" element={<CoursesPage />} />
                    <Route path="/fileupload" element={<FileUpload />} />
                    {/* <Route path="/viewresults" element={<ViewResults />} /> */}
                </Routes>
                <Toaster position="top-right" richColors closeButton />
            </>
        </AuthProvider>
    );
}