// Minimal API client using fetch
const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const getToken = () => localStorage.getItem("token");

const buildError = async (res) => {
  let message = res.statusText;
  try {
    const data = await res.json();
    if (data.message) message = data.message;
  } catch {}
  const error = new Error(message);
  error.response = { status: res.status, data: { message } };
  return error;
};

const api = {
  get: async (url) => {
    const res = await fetch(`${apiBaseUrl}${url}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw await buildError(res);
    return { data: await res.json() };
  },
  post: async (url, body) => {
    const res = await fetch(`${apiBaseUrl}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await buildError(res);
    return { data: await res.json() };
  },
  put: async (url, body) => {
    const res = await fetch(`${apiBaseUrl}${url}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await buildError(res);
    return { data: await res.json() };
  },
  delete: async (url) => {
    const res = await fetch(`${apiBaseUrl}${url}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw await buildError(res);
    return { data: await res.json() };
  },
};

export default api;
