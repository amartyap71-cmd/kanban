import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask
} from "../controllers/taskController.js";

const router = Router();

router.use(requireAuth);
router.get("/", getTasks);          // Fetch all of this user's tasks in one request
router.post("/", createTask);       // Create task
router.patch("/:id", updateTask);   // Edit task or change status
router.delete("/:id", deleteTask);  // Delete at any status

export default router;
