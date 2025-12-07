import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../lib/api";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);
    try {
      await login({ email, password });
      nav("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          (err?.message?.includes("Network")
            ? "Network error. Please try again."
            : "Login failed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <h2>Login</h2>
      <form onSubmit={onSubmit} className="form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        <button disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p>
        <Link to="/forgot">Forgot password?</Link>
      </p>
      <p>
        No account? <Link to="/signup">Create one</Link>
      </p>
    </div>
  );
}
