import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup, setToken } from "../lib/api";

export default function Signup() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }
    if (mobile && mobile.replace(/\D/g, "").length !== 10) {
      setError("Mobile number must be exactly 10 digits");
      return;
    }
    setLoading(true);
    try {
      const data = await signup({ name, lastName, mobile, email, password });
      if (data?.token) setToken(data.token);
      nav("/dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          (err?.message?.includes("Network")
            ? "Network error. Please try again."
            : "Signup failed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth">
      <h2>Create account</h2>
      <form onSubmit={onSubmit} className="form">
        <input
          placeholder="First Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="Mobile number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        <button disabled={loading}>
          {loading ? "Creating..." : "Sign Up"}
        </button>
      </form>
      <p>
        <Link to="/forgot">Forgot password?</Link>
      </p>
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
