const BASE_URL = (process.env.REACT_APP_API_BASE_URL || "").replace(/\/+$/, "");
const TOKEN_KEY = "token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function tryJSON(text) {
    try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function request(path, { method = "GET", body, headers } = {}) {
    const isForm = body instanceof FormData;
    const url = `${BASE_URL}${path}`;
    const resp = await fetch(url, {
        method,
        headers: {
            ...(isForm ? {} : { "Content-Type": "application/json" }),
            ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
            ...headers,
        },
        body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
    const text = await resp.text();
    const data = text ? tryJSON(text) : null;
    if (!resp.ok) {
        const msg = (data && (data.detail || data.message || data.error)) || `${resp.status} ${resp.statusText}`;
        throw new Error(msg);
    }
    return data;
}

const GET = (p) => request(p, { method: "GET" });
const POST = (p, b) => request(p, { method: "POST", body: b });
const DEL = (p) => request(p, { method: "DELETE" });

export const courses = {
    list: () => GET("/v1/courses/"),
    create: (payload) => POST("/v1/courses/", payload),
    remove: (id) => DEL(`/v1/courses/${id}`),
};

export const markingResults = {
    byCourseId: (courseId) => GET(`/v1/marking_result/by_id/${courseId}`),
    upsert: (courseId, payload) => POST(`/v1/marking_result/${courseId}/append`, payload),
    status: (courseId) => GET(`/v1/marking_result/${courseId}/status`),
    setStatus: (courseId, aiCompleted) =>
        request(`/v1/marking_result/${courseId}/status`, {
            method: "PUT",
            body: { ai_completed: Boolean(aiCompleted) },
        }),
};

export const health = {
    ping: () => GET("/health"),
};

export const auth = {
    register: (email, password) =>
        POST("/v1/auth/register", { email, password}),
    login: async (email, password) => {
        const data = await POST("/v1/auth/login", { email, password });
        if (data?.access_token) setToken(data.access_token);
        return data;
    },
    logout: () => { clearToken(); return Promise.resolve(); },
};


export const assignments = {
    list: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return GET(`/v1/assignments/${q ? `?${q}` : ""}`);
    },

    createWithFiles: ({ course, term = "", title, step1, step2 }) => {
        const fd = new FormData();
        fd.append("course", course);
        fd.append("term", term);
        fd.append("title", title);
        fd.append("step1", step1);
        fd.append("step2", step2);
        return POST("/v1/assignments/create_with_files", fd);
    },

    updateFiles: (assignmentId, { spec, rubric } = {}) => {
        const fd = new FormData();
        if (spec) fd.append("spec", spec);
        if (rubric) fd.append("rubric", rubric);
        return request(`/v1/assignments/${assignmentId}/files`, { method: "PUT", body: fd });
    },
};

export const submissions = {
    bulkUpload: (assignmentId, assignmentName, course, term, files) => {
        const fd = new FormData();
        fd.append("assignmentId", String(assignmentId));
        fd.append("assignmentName", assignmentName);
        fd.append("course", course);
        fd.append("term", term || "");
        for (const f of files) fd.append("files", f);
        return POST("/v1/submissions/bulk", fd);
    },
    appendFiles: (submissionId, stepIndex, files, studentId) => {
        const fd = new FormData();
        fd.append("stepIndex", String(stepIndex));
        if (studentId) fd.append("studentId", studentId);
        for (const f of files) fd.append("files", f);
        return request(`/v1/submissions/${submissionId}/files`, {
            method: "PUT",
            body: fd,
        });

    },
    create: (formData) => {
        return request("/v1/submissions", { method: "POST", body: formData });
    },
};

const API = {
    health,
    auth,
    courses,
    assignments,
    submissions,
    markingResults,
    getToken,
    setToken,
    clearToken,
};
export default API;
