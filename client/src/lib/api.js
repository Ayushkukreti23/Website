import axios from "axios";

// Use environment variable if defined, otherwise fallback to localhost
export const baseURL =
  import.meta.env.VITE_API_URL || "https://websiteuu.onrender.com";

// Create axios instance
const baseURL = "https://websiteuu.onrender.com";
export const api = axios.create({
  baseURL: "https://websiteuu.onrender.com",
  withCredentials: true, // required if backend uses cookies/auth
});

// Add request interceptor for debugging (can be removed in production)
api.interceptors.request.use(
  (config) => {
    console.log("API Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log detailed error info for debugging Chrome cookie issues
    if (error.response?.status === 401) {
      console.warn(
        "401 Unauthorized - Cookie may not be set or sent correctly"
      );
      console.warn("Request URL:", error.config?.url);
      console.warn("Request Headers:", error.config?.headers);
    }
    return Promise.reject(error);
  }
);

// ---------------------- API FUNCTIONS ----------------------

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
