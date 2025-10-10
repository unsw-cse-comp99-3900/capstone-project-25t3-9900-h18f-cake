import { API_URL } from "./const";

const USE_DUMMY_DATA = false;

const courseData = [
    { year_term: "2025 Term 3", code: "COMP9321", title: "Data Services Engineering" },
    { year_term: "2025 Term 2", code: "COMP9334", title: "Capacity Planning of Computer Systems and Networks" },
    { year_term: "2025 Term 2", code: "COMP9900", title: "Information Technology Project" },
    { year_term: "2025 Term 3", code: "COMP9517", title: "Computer Vision" },
    { year_term: "2025 Term 3", code: "COMP9044", title: "Software Construction" },
];

export function handleFetch(url, options) {
    if (USE_DUMMY_DATA) {
        if (url === `${API_URL}/v1/courses` && options.method === "GET") {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({ ok: true, json: () => courseData });
                }, 0); // artificial timer, set to zero for now
            });
        }
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ ok: true });
            }, 0);
        });
    }
    return fetch(`${url}`, options);
}