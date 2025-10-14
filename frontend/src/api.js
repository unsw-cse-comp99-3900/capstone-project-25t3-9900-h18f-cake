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
const DEL = (p) => request(p,{method: "DELETE"});

export const courses = {
  list: () => GET("/v1/courses/"),
  create: (payload) => POST("/v1/courses/", payload),
  remove: (id) => DEL(`/v1/courses/${id}`),
};

export const health = {
  ping: () => GET("/health"),
};

export const auth = {
  register: (email, password, role = "coordinator") =>
    POST("/v1/auth/register", { email, password, role }),
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
    return GET(`/v1/assignments${q ? `?${q}` : ""}`);
  },
  create: (payload) => POST("/v1/assignments/", payload),
};

export const submissions = {
  upload: (assignmentId, studentId, file) => {
    const fd = new FormData();
    fd.append("assignment_id", String(assignmentId));
    fd.append("student_id", studentId);
    fd.append("file", file);
    return POST("/v1/submissions/upload", fd);
  },
};

const API = { health, auth, courses, assignments, submissions, getToken, setToken, clearToken };
export default API;
