import { Routes, Route } from "react-router-dom";
import LoginMain from "./pages/login";
import CourseMain from "./pages/course";
import FileUpload from "./pages/fileupload";
import { Toaster } from "sonner";

export default function PageRoutes() {
    return (
        <>
            <Routes>
                <Route path="/" element={<LoginMain />} />
                <Route path="/courses" element={<CourseMain />} />
                <Route path="/fileupload" element={<FileUpload />} />

            </Routes>
            <Toaster position="top-right" richColors closeButton />
        </>
    );
}