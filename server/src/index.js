import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "./models/User.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================================
// ✅ ALLOWED ORIGINS (FINAL FIXED VERSION)
// ========================================================
const allowedOrigins = [
  "https://website-cg7y.vercel.app",
  "https://website-cg7y.vercel.app/",
  "https://websiteuu.onrender.com",
  "https://vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

// ========================================================
// ✅ TRUST PROXY (Render HTTPS handling)
// ========================================================
app.set("trust proxy", 1);

// ========================================================
// ✅ CORS CONFIGURATION (FINAL)
// ========================================================
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const ok = allowedOrigins.some((a) => {
        try {
          const o = new URL(origin);
          const au = new URL(a);
          return (
            o.origin === au.origin ||
            o.hostname === au.hostname ||
            o.hostname.endsWith("." + au.hostname)
          );
        } catch {
          return false;
        }
      });
      if (ok) return callback(null, true);
      console.log("❌ BLOCKED ORIGIN:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// ========================================================
// ✅ OPTIONS FIX FOR PREFLIGHT
// ========================================================
app.options("*", cors());

// ========================================================
// Middleware
// ========================================================
app.use(express.json());
app.use(cookieParser());

// ========================================================
// MongoDB Connect
// ========================================================
async function connectDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (e) {
    console.error("MongoDB connection failed:", e.message);
    process.exit(1);
  }
}

// ========================================================
// Utility: secure cookie checker
// ========================================================
function isSecure(req) {
  const proto = (req.headers["x-forwarded-proto"] || "").toLowerCase();
  return (
    req.secure || proto === "https" || process.env.NODE_ENV === "production"
  );
}

// ========================================================
// Utility: set auth cookie
// ========================================================
function setAuthCookie(req, res, token) {
  const prod = req.secure || req.headers["x-forwarded-proto"] === "https";

  res.cookie("token", token, {
    httpOnly: true,
    sameSite: prod ? "none" : "lax", // cross-site in prod
    secure: prod, // only send over HTTPS in prod
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
}

// ========================================================
// SIGNUP
// ========================================================
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, lastName, mobile, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    if (mobile && !/^\d{10}$/.test(String(mobile))) {
      return res.status(400).json({
        message: "Mobile number must be exactly 10 digits",
      });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Email already in use" });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      lastName: lastName || "",
      mobile: mobile || "",
      email,
      password: hash,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    setAuthCookie(req, res, token);

    res.status(201).json({
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
      token,
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ========================================================
// LOGIN
// ========================================================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    setAuthCookie(req, res, token);

    res.json({
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      token,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const token = String(crypto.randomInt(100000, 999999));
    user.resetToken = token;
    user.resetTokenExp = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/auth/reset", async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password)
      return res.status(400).json({ message: "All fields are required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const now = new Date();
    if (
      !user.resetToken ||
      !user.resetTokenExp ||
      user.resetToken !== token ||
      user.resetTokenExp < now
    ) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    const hash = await bcrypt.hash(password, 10);
    user.password = hash;
    user.resetToken = undefined;
    user.resetTokenExp = undefined;
    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ========================================================
// AUTH CHECK (/api/auth/me)
// ========================================================
app.get("/api/auth/me", async (req, res) => {
  try {
    let token = req.cookies?.token;
    if (!token) {
      const auth = req.headers?.authorization || "";
      const parts = auth.split(" ");
      if (parts[0] === "Bearer" && parts[1]) token = parts[1];
    }
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "name lastName email mobile"
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      mobile: user.mobile,
    });
  } catch (err) {
    console.error("Auth check error:", err.message);
    res.status(401).json({ message: "Unauthorized" });
  }
});

// ========================================================
// LOGOUT
// ========================================================
app.post("/api/auth/logout", (req, res) => {
  const prod = isSecure(req);

  res.clearCookie("token", {
    httpOnly: true,
    sameSite: prod ? "none" : "lax",
    secure: prod,
    path: "/",
  });

  res.json({ message: "Logged out" });
});

// ========================================================
// ROOT
// ========================================================
app.get("/", (_, res) => res.send("API running"));

// ========================================================
// START SERVER
// ========================================================
connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
  });
});
