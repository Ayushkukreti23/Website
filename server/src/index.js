import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================================
// ✅ ALLOWED ORIGINS (FINAL FIXED VERSION)
// ========================================================
const allowedOrigins = [
  "https://website-cg7y.vercel.app", // Frontend (Vercel)
  "https://websiteuu.onrender.com", // Backend (Render)
];

// ========================================================
// ✅ TRUST PROXY (required for Render HTTPS)
// ========================================================
app.set("trust proxy", 1);

// ========================================================
// ✅ CORS CONFIGURATION (FINAL)
// ========================================================
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Allow Postman, mobile apps, etc.

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("❌ CORS BLOCKED ORIGIN:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
  const forwardedProto = String(
    req.headers["x-forwarded-proto"] || ""
  ).toLowerCase();
  return (
    req.secure ||
    forwardedProto === "https" ||
    req.headers["x-forwarded-ssl"] === "on" ||
    process.env.NODE_ENV === "production"
  );
}

// ========================================================
// Utility: set auth cookie
// ========================================================
function setAuthCookie(req, res, token) {
  const prod = isSecure(req);

  const cookieOptions = {
    httpOnly: true,
    sameSite: prod ? "none" : "lax",
    secure: prod,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie("token", token, cookieOptions);
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
      return res
        .status(400)
        .json({ message: "Email and password are required" });

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
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ========================================================
// AUTH CHECK (/api/auth/me)
// ========================================================
app.get("/api/auth/me", async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      console.log("⚠️ No auth cookie received");
      return res.status(401).json({ message: "Unauthorized" });
    }

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
