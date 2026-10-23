import mongoose from "mongoose";
import Task from "../models/Task.js";

const VALID_STATUSES = ["Todo", "In Progress", "Done"];

export async function getTasks(req, res, next) {
  try {
    // Single fetch API: returns all tasks belonging to the authenticated user.
    const tasks = await Task.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ count: tasks.length, tasks });
  } catch (error) {
    next(error);
  }
}

export async function createTask(req, res, next) {
  try {
    const { title, description = "", status = "Todo", dueDate = null } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "Task title is required." });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID_STATUSES.join(", ")}.` });
    }
    if (dueDate !== null && (Number.isNaN(Date.parse(dueDate)))) {
      return res.status(400).json({ message: "dueDate must be a valid date or null." });
    }

    const task = await Task.create({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() : "",
      status,
      dueDate: dueDate ? new Date(dueDate) : null,
      owner: req.user._id
    });

    res.status(201).json({ message: "Task created.", task });
  } catch (error) {
    next(error);
  }
}

export async function updateTask(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    const allowed = ["title", "description", "status", "dueDate"];
    const updates = {};
    for (const key of allowed) {
      if (Object.hasOwn(req.body, key)) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Provide at least one field to update." });
    }
    if (updates.title !== undefined &&
        (typeof updates.title !== "string" || !updates.title.trim())) {
      return res.status(400).json({ message: "Title cannot be empty." });
    }
    if (updates.title !== undefined) updates.title = updates.title.trim();
    if (updates.description !== undefined && typeof updates.description !== "string") {
      return res.status(400).json({ message: "Description must be text." });
    }
    if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status)) {
      return res.status(400).json({ message: `Status must be one of: ${VALID_STATUSES.join(", ")}.` });
    }
    if (updates.dueDate !== undefined) {
      if (updates.dueDate === "" || updates.dueDate === null) {
        updates.dueDate = null;
      } else if (Number.isNaN(Date.parse(updates.dueDate))) {
        return res.status(400).json({ message: "dueDate must be a valid date or null." });
      } else {
        updates.dueDate = new Date(updates.dueDate);
      }
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found." });
    res.json({ message: "Task updated.", task });
  } catch (error) {
    next(error);
  }
}

export async function deleteTask(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid task ID." });
    }

    // No status restriction: tasks can be deleted in every workflow stage.
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!task) return res.status(404).json({ message: "Task not found." });
    res.json({ message: "Task deleted.", id: task._id });
  } catch (error) {
    next(error);
  }
}
