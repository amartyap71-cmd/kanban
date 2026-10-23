import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 80
  },
  // Stored as a string so leading zeroes in phone numbers are preserved.
  phone: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    match: /^[0-9+\-()\s]{7,20}$/
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
