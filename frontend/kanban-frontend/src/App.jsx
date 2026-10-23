
import { useEffect, useState } from "react";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STATUSES = ["Todo", "In Progress", "Done"];

async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }

  return data;
}

export default function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("kanban-session")) || null;
    } catch {
      return null;
    }
  });

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Todo");
  const [dueDate, setDueDate] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function notify(text) {
    setMessage(text);
    setError("");
  }

  function handleError(err) {
    setError(err.message || "Something went wrong.");
    setMessage("");
  }

  async function authenticate(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "signup" && password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const data = await request(
        mode === "signup" ? "/api/auth/signup" : "/api/auth/login",
        null,
        {
          method: "POST",
          body: JSON.stringify(
            mode === "signup"
              ? { name, phone, password, confirmPassword }
              : { name, password }
          ),
        }
      );

      if (!data.token) {
        throw new Error("No token returned by the backend.");
      }

      const next = {
        token: data.token,
        name: data.user?.name || name,
      };

      sessionStorage.setItem("kanban-session", JSON.stringify(next));
      setSession(next);
      notify("Authentication successful.");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function loadTasks() {
    if (!session) return;

    setLoading(true);
    setError("");

    try {
      const data = await request("/api/tasks", session.token);
      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) loadTasks();
    // Reload when the authenticated session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setStatus("Todo");
    setDueDate("");
    setEditingId(null);
  }

  function editTask(task) {
    setEditingId(task._id || task.id);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setStatus(task.status || "Todo");
    setDueDate(task.dueDate ? String(task.dueDate).slice(0, 10) : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTask(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const body = { title, description, status, dueDate: dueDate || null };
    const path = editingId
      ? `/api/tasks/${editingId}`
      : "/api/tasks";

    try {
      await request(path, session.token, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });

      notify(editingId ? "Task updated." : "Task created.");
      resetForm();
      await loadTasks();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function moveTask(task, nextStatus) {
    const id = task._id || task.id;

    try {
      await request(`/api/tasks/${id}`, session.token, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      setTasks(current =>
        current.map(t =>
          (t._id || t.id) === id ? { ...t, status: nextStatus } : t
        )
      );

      notify(`Moved task to ${nextStatus}.`);
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;

    const id = task._id || task.id;

    try {
      await request(`/api/tasks/${id}`, session.token, {
        method: "DELETE",
      });

      setTasks(current =>
        current.filter(t => (t._id || t.id) !== id)
      );

      notify("Task deleted.");
    } catch (err) {
      handleError(err);
    }
  }

  function logout() {
    sessionStorage.removeItem("kanban-session");
    setSession(null);
    setTasks([]);
    resetForm();
    setError("");
    setMessage("");
  }

  if (!session) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={authenticate}>
          <div className="logo">T</div>
          <p className="eyebrow">PERSONAL WORKSPACE</p>
          <h1>{mode === "login" ? "Welcome back" : "Create an account"}</h1>
          <p className="muted">
            Sign in to organize and track your tasks.
          </p>

          <div className="tabs">
            <button type="button" onClick={() => setMode("login")}
              className={mode === "login" ? "selected" : ""}>
              Login
            </button>
            <button type="button" onClick={() => setMode("signup")}
              className={mode === "signup" ? "selected" : ""}>
              Sign up
            </button>
          </div>

          <label>
            Full name
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Your full name" required />
          </label>

          {mode === "signup" && (
            <label>
              Phone
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Phone number" required />
            </label>
          )}

          <label>
            Password
            <input type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password" required />
          </label>

          {mode === "signup" && (
            <label>
              Confirm password
              <input type="password" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password" required />
            </label>
          )}

          {error && <div className="alert error">{error}</div>}

          <button className="primary full" disabled={busy}>
            {busy ? "Please wait..." : mode === "login" ? "Login →" : "Create account →"}
          </button>

          <p className="muted small">
            Backend: <code>{API}</code>
          </p>
        </form>
      </main>
    );
  }

  const filtered = tasks.filter(task =>
    `${task.title} ${task.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const count = s => tasks.filter(t => t.status === s).length;

  return (
    <main className="layout">
      <header className="topbar">
        <a className="brand" href="#">◈ taskflow</a>
        <div className="user-area">
          <span>Hi, {session.name}</span>
          <button className="secondary" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
          <h1>My Kanban Board</h1>
          <p className="muted">Plan work. Track progress. Get things done.</p>
        </div>
        <button className="secondary" onClick={loadTasks}>
          ↻ Refresh
        </button>
      </section>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <section className="stats">
        <div className="stat"><span>Total tasks</span><strong>{tasks.length}</strong></div>
        <div className="stat"><span>To do</span><strong>{count("Todo")}</strong></div>
        <div className="stat"><span>In progress</span><strong>{count("In Progress")}</strong></div>
        <div className="stat"><span>Completed</span><strong>{count("Done")}</strong></div>
      </section>

      <section className="workspace">
        <form className="task-form" onSubmit={saveTask}>
          <p className="eyebrow">{editingId ? "EDIT TASK" : "NEW TASK"}</p>
          <h2>{editingId ? "Update task" : "Create a task"}</h2>

          <label>
            Task title
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Build React dashboard" required />
          </label>

          <label>
            Description
            <textarea value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What needs to be done?" rows="4" />
          </label>

          <label>
            Status
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>

          <label>
            Due date
            <input type="date" value={dueDate}
              onChange={e => setDueDate(e.target.value)} />
          </label>

          <button className="primary full" disabled={busy}>
            {busy ? "Saving..." : editingId ? "Save changes" : "Create task"}
          </button>

          {editingId && (
            <button type="button" className="secondary full"
              onClick={resetForm}>Cancel edit</button>
          )}

          <div className="api-info">
            <strong>API request</strong>
            <code>{editingId ? "PATCH" : "POST"} {editingId ? "/api/tasks/:id" : "/api/tasks"}</code>
            <span>JWT Bearer token attached automatically.</span>
          </div>
        </form>

        <section className="board">
          <div className="board-heading">
            <div>
              <h2>Your tasks</h2>
              <p className="muted">Tasks loaded from MongoDB through your API.</p>
            </div>
            <input className="search" value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..." aria-label="Search tasks" />
          </div>

          {loading ? (
            <div className="empty">Loading tasks from GET /api/tasks...</div>
          ) : (
            <div className="columns">
              {STATUSES.map((s, index) => {
                const items = filtered.filter(t => t.status === s);

                return (
                  <section className="column" key={s}>
                    <div className="column-heading">
                      <span className={`dot dot-${index}`} />
                      <h3>{s}</h3>
                      <span className="count">{items.length}</span>
                    </div>

                    {items.length === 0 && (
                      <div className="empty">No tasks here yet.</div>
                    )}

                    {items.map(task => (
                      <article className="task-card" key={task._id || task.id}>
                        <div className="task-label">{task.status}</div>
                        <h4>{task.title}</h4>
                        {task.description && <p>{task.description}</p>}

                        <div className="due-date">
                          Due: {task.dueDate
                            ? String(task.dueDate).slice(0, 10)
                            : "Not set"}
                        </div>

                        <label className="move-label">
                          Move task
                          <select value={task.status}
                            onChange={e => moveTask(task, e.target.value)}>
                            {STATUSES.map(option =>
                              <option key={option}>{option}</option>
                            )}
                          </select>
                        </label>

                        <div className="card-actions">
                          <button onClick={() => editTask(task)}>Edit</button>
                          <button className="danger"
                            onClick={() => deleteTask(task)}>Delete</button>
                        </div>
                      </article>
                    ))}
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="debug-panel">
        <h2>Developer information</h2>
        <div className="debug-grid">
          <div><span>Backend URL</span><code>{API}</code></div>
          <div><span>Tasks endpoint</span><code>GET /api/tasks</code></div>
          <div><span>Auth header</span><code>Authorization: Bearer &lt;token&gt;</code></div>
        </div>
        <p className="muted small">
          Available routes: POST /api/auth/signup, POST /api/auth/login,
          POST /api/tasks, PATCH /api/tasks/:id, DELETE /api/tasks/:id.
          The token is stored in sessionStorage for this browser tab.
        </p>
      </section>

      <footer>Taskflow · React + Vite · Express · MongoDB</footer>
    </main>
  );
}
