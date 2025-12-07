import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    lastName: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: { type: String, required: true, minlength: 6 },
    mobile: { type: String, trim: true },
    resetToken: { type: String },
    resetTokenExp: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
