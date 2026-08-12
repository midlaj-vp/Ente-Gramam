// // api.jsx
// // Central HTTP layer for the Welfare Scheme Application page.
// // Every function here hits a real endpoint on your backend instead of
// // reading from a local array. Point it at your server with one env var:
// //
// //   .env (or .env.local)
// //   VITE_API_BASE_URL=https://your-backend.example.com/api
// //
// // Expected REST contract (adjust paths to match your actual backend,
// // then update the URLs below — nothing else in the app needs to change):
// //
// //   GET    /applications?userId=:userId          -> Application[]        (citizen's own applications)
// //   GET    /applications/queue                    -> Application[]        (admin: submitted/under_review)
// //   GET    /applications/:id                       -> Application
// //   POST   /applications/:id/submit                -> Application
// //   POST   /applications/:id/approve                -> Application
// //   POST   /applications/:id/reject   { reason }    -> Application
// //   POST   /applications/:id/documents/:docId/upload  (multipart/form-data, field "file") -> Document

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// function getAuthToken() {
//   return localStorage.getItem("auth_token") || "";
// }

// class ApiError extends Error {
//   constructor(message, status, body) {
//     super(message);
//     this.name = "ApiError";
//     this.status = status;
//     this.body = body;
//   }
// }

// async function request(path, options = {}) {
//   const token = getAuthToken();

//   const res = await fetch(`${API_BASE_URL}${path}`, {
//     ...options,
//     headers: {
//       ...(options.body && !(options.body instanceof FormData)
//         ? { "Content-Type": "application/json" }
//         : {}),
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       ...options.headers,
//     },
//   });

//   let data = null;
//   const text = await res.text();
//   try {
//     data = text ? JSON.parse(text) : null;
//   } catch {
//     data = text;
//   }

//   if (!res.ok) {
//     const message =
//       (data && (data.message || data.error)) || `Request failed with status ${res.status}`;
//     throw new ApiError(message, res.status, data);
//   }

//   return data;
// }

// // ---------------------------------------------------------------------------
// // CITIZEN-FACING
// // ---------------------------------------------------------------------------
// export function fetchMyApplications(userId) {
//   return request(`/applications?userId=${encodeURIComponent(userId)}`);
// }

// export function fetchApplicationDetail(appId) {
//   return request(`/applications/${encodeURIComponent(appId)}`);
// }

// export function submitApplication(appId) {
//   return request(`/applications/${encodeURIComponent(appId)}/submit`, {
//     method: "POST",
//   });
// }

// export function uploadDocument(appId, docId, file) {
//   const formData = new FormData();
//   formData.append("file", file);
//   return request(`/applications/${encodeURIComponent(appId)}/documents/${encodeURIComponent(docId)}/upload`, {
//     method: "POST",
//     body: formData,
//   });
// }

// // ---------------------------------------------------------------------------
// // ADMIN-FACING
// // ---------------------------------------------------------------------------
// export function fetchAdminQueue() {
//   return request(`/applications/queue`);
// }

// export function approveApplication(appId) {
//   return request(`/applications/${encodeURIComponent(appId)}/approve`, {
//     method: "POST",
//   });
// }

// export function rejectApplication(appId, reason) {
//   return request(`/applications/${encodeURIComponent(appId)}/reject`, {
//     method: "POST",
//     body: JSON.stringify({ reason }),
//   });
// }

// export { ApiError };