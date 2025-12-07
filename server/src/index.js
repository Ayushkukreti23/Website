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

// -----------------------
// FIXED CLIENT ORIGIN
// -----------------------
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigins = CLIENT_ORIGIN.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

console.log("Allowed Origins:", allowedOrigins);

// -----------------------
// FIXED CORS MIDDLEWARE
// -----------------------
app.set("trust proxy", 1);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin matches allowed origins (exact match or subdomain)
      const isAllowed = allowedOrigins.some(allowed => {
        if (origin === allowed) return true;
        // Also allow if origin is a subdomain of allowed (for flexibility)
        try {
          const originUrl = new URL(origin);
          const allowedUrl = new URL(allowed);
          return originUrl.hostname.endsWith('.' + allowedUrl.hostname) || 
                 allowedUrl.hostname.endsWith('.' + originUrl.hostname);
        } catch {
          return false;
        }
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
      
      console.log("CORS BLOCKED ORIGIN:", origin);
      console.log("Allowed origins:", allowedOrigins);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

// -----------------------
// MONGO CONNECT
// -----------------------
async function connectDb() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (e) {
    console.error("MongoDB connection failed:", e.message);
    process.exit(1);
  }
}

// -----------------------
// COOKIE SETTER
// -----------------------
function isSecure(req) {
  // Check multiple headers and protocols for better compatibility
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "").toLowerCase();
  const isHttps = 
    req?.secure === true ||
    forwardedProto === "https" ||
    req?.headers?.["x-forwarded-ssl"] === "on" ||
    process.env.NODE_ENV === "production";
  return isHttps;
}

function setAuthCookie(req, res, token) {
  const prod = process.env.NODE_ENV === "production" || isSecure(req);
  
  // Chrome requires Secure=true when SameSite=None
  // Don't set domain for cross-origin cookies (render.com -> vercel.app)
  const cookieOptions = {
    httpOnly: true,
    sameSite: prod ? "none" : "lax",
    secure: prod, // Chrome REQUIRES secure=true when sameSite=none
    path: "/", // Explicit path
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  
  // Only set domain in development if needed
  // For production cross-origin, leave domain undefined (browser handles it)
  if (!prod && process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }
  
  // Debug logging (can be removed after verification)
  if (prod) {
    console.log("🍪 Setting cookie with options:", {
      httpOnly: cookieOptions.httpOnly,
      sameSite: cookieOptions.sameSite,
      secure: cookieOptions.secure,
      path: cookieOptions.path,
      hasDomain: !!cookieOptions.domain,
      origin: req.headers.origin
    });
  }
  
  res.cookie("token", token, cookieOptions);
}

// -----------------------
// SIGNUP
// -----------------------
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, lastName, mobile, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

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

// -----------------------
// LOGIN
// -----------------------
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

// -----------------------
// AUTH STATUS
// -----------------------
app.get("/api/auth/me", async (req, res) => {
  try {
    // Debug: Log cookie info (remove in production if needed)
    const token = req.cookies?.token;
    const cookiesReceived = req.headers.cookie || "No cookies";
    
    if (!token) {
      console.log("⚠️ /api/auth/me - No token cookie found");
      console.log("Cookies received:", cookiesReceived);
      console.log("Request origin:", req.headers.origin);
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

// -----------------------
// LOGOUT
// -----------------------
app.post("/api/auth/logout", (req, res) => {
  const prod = process.env.NODE_ENV === "production" || isSecure(req);
  const cookieOptions = {
    httpOnly: true,
    sameSite: prod ? "none" : "lax",
    secure: prod,
    path: "/", // Explicit path to match set cookie
  };
  
  // Match the domain setting used when setting the cookie
  if (!prod && process.env.COOKIE_DOMAIN) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN;
  }
  
  res.clearCookie("token", cookieOptions);
  res.json({ message: "Logged out" });
});

// -----------------------
// ROOT
// -----------------------
app.get("/", (_, res) => res.send("API running"));

// -----------------------
// START SERVER
// -----------------------
connectDb().then(() => {
  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
  });
});
