import axios from "axios";

// ---------------------------------------------------
// BASE URL (remove trailing slash if present)
// ---------------------------------------------------
const baseURL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ||
  "https://websiteuu.onrender.com";

// ---------------------------------------------------
// AXIOS INSTANCE
// ---------------------------------------------------
export const api = axios.create({
  baseURL,
  withCredentials: true,
});

const TOKEN_KEY = "auth_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
  } catch {
    return;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    return;
  }
}

// ---------------------------------------------------
// Request interceptor (debugging optional)
// ---------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------
// Response interceptor (debugging optional)
// ---------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn(
        "401 Unauthorized – Cookie may not be set or sent correctly"
      );
      console.warn("Request URL:", error.config?.url);
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------
// API FUNCTIONS
// ---------------------------------------------------

// Signup user
export async function signup(payload) {
  try {
    const { data } = await api.post("/api/auth/signup", payload);
    return data;
  } catch (error) {
    console.error("Signup error:", error.response?.data || error.message);
    throw error;
  }
}

// Login user
export async function login(payload) {
  try {
    const { data } = await api.post("/api/auth/login", payload);
    return data;
  } catch (error) {
    console.error("Login error:", error.response?.data || error.message);
    throw error;
  }
}

// Get current logged-in user
export async function me() {
  try {
    const { data } = await api.get("/api/auth/me");
    return data;
  } catch (error) {
    console.error("Fetch user error:", error.response?.data || error.message);
    throw error;
  }
}

// Logout user
export async function logout() {
  try {
    const { data } = await api.post("/api/auth/logout");
    return data;
  } catch (error) {
    console.error("Logout error:", error.response?.data || error.message);
    throw error;
  }
}
