import { useEffect, useState } from "react";
import { me, logout } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    // Small delay to ensure cookie is set after login redirect
    const checkAuth = async () => {
      try {
        const u = await me();
        if (mounted) setUser(u);
      } catch (err) {
        console.error("Dashboard auth check failed:", err);
        if (mounted) {
          // More specific error message
          const message = err?.response?.status === 401 
            ? "Please login" 
            : "Failed to load user data";
          setError(message);
        }
      }
    };
    
    // Small delay to ensure cookie propagation after redirect
    const timer = setTimeout(checkAuth, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  async function onLogout() {
    try {
      await logout();
      nav("/login");
    } catch {
      setError("Logout failed");
    }
  }

  if (error)
    return (
      <div className="auth">
        <p className="error">{error}</p>
      </div>
    );
  if (!user)
    return (
      <div className="auth">
        <p>Loading...</p>
      </div>
    );

  return (
    <div className="auth">
      <h2>
        Welcome, {user.name} {user.lastName}
      </h2>
      <p>Email: {user.email}</p>
      {user.mobile && <p>Mobile: {user.mobile}</p>}
      <button onClick={onLogout}>Logout</button>
    </div>
  );
}
