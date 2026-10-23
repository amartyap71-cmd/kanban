import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

function createToken(user) {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function signup(req, res, next) {
  try {
    const { name, phone, password, confirmPassword } = req.body;

    if (![name, phone, password, confirmPassword].every(
      value => typeof value === "string" && value.trim().length > 0
    )) {
      return res.status(400).json({
        message: "Name, phone, password and confirmPassword are required."
      });
    }

    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({ message: "Name must be 2–80 characters." });
    }
    if (!/^[0-9+\-()\s]{7,20}$/.test(cleanPhone)) {
      return res.status(400).json({ message: "Enter a valid phone number." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const existing = await User.findOne({ phone: cleanPhone });
    if (existing) {
      return res.status(409).json({ message: "An account with this phone already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: cleanName,
      phone: cleanPhone,
      passwordHash
    });

    return res.status(201).json({
      message: "Signup successful.",
      token: createToken(user),
      user: { id: user._id, name: user.name, phone: user.phone }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "An account with this phone already exists." });
    }
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { name, password } = req.body;

    if (typeof name !== "string" || !name.trim() ||
        typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Name and password are required." });
    }

    // Login is by name as requested. Names need not be unique, so if duplicates
    // exist this deliberately rejects ambiguous matches. Phone-based login is safer.
    const users = await User.find({
      name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" }
    }).select("+passwordHash").limit(2);

    if (users.length !== 1) {
      return res.status(401).json({ message: "Invalid name or password." });
    }

    const user = users[0];
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return res.status(401).json({ message: "Invalid name or password." });
    }

    return res.json({
      message: "Login successful.",
      token: createToken(user),
      user: { id: user._id, name: user.name, phone: user.phone }
    });
  } catch (error) {
    next(error);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
