import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 45000
});

function sessionId() {
  const key = "budget-assistant-session";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function currentSessionId() {
  return sessionId();
}

export async function sendChat(message) {
  const { data } = await client.post("/chat", {
    sessionId: sessionId(),
    message
  });
  return data;
}

export async function fetchProducts() {
  const { data } = await client.get("/products");
  return data;
}

export async function analyzeImage(file) {
  const form = new FormData();
  form.append("image", file);
  form.append("sessionId", sessionId());
  const { data } = await client.post("/analyze-image", form);
  return data;
}

export async function recommend(payload) {
  const { data } = await client.post("/recommend", payload);
  return data;
}

export function apiErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Network failure. Confirm the backend is running on port 5000."
  );
}
