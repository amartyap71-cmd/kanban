# Kanban Auth + Tasks API

## Requirements
- Node.js 18+
- MongoDB Community Server running locally

## Setup
1. Copy `.env.example` to `.env`.
2. Replace `JWT_SECRET` with a random secret of at least 32 characters.
3. Run:
   ```powershell
   npm install
   npm run dev
   ```
4. API runs at `http://localhost:5000`.

## MongoDB Compass
Connect to:
`mongodb://127.0.0.1:27017`

The database `kanban` and collections `users` and `tasks` are created automatically on first insert. No manual table creation is required.

## Endpoints

### Signup
`POST /api/auth/signup`
```json
{
  "name": "Asha Sharma",
  "phone": "9876543210",
  "password": "example-password",
  "confirmPassword": "example-password"
}
```

### Login
`POST /api/auth/login`
```json
{
  "name": "Asha Sharma",
  "password": "example-password"
}
```
Returns a JWT token. Send it on task requests as:
`Authorization: Bearer YOUR_TOKEN`

**Important:** The requested name + password login can be ambiguous if multiple users have the same name. This implementation rejects duplicate-name matches. Phone + password login is recommended for a real app.

### Get all your tasks (one API)
`GET /api/tasks`

### Create task
`POST /api/tasks`
```json
{
  "title": "Build signup page",
  "description": "Create form validation and connect API",
  "status": "Todo",
  "dueDate": "2026-11-01"
}
```

### Update task / change status
`PATCH /api/tasks/TASK_ID`
```json
{
  "status": "In Progress"
}
```
Allowed statuses: `Todo`, `In Progress`, `Done`. You can also update `title`, `description`, or `dueDate`.

### Delete task at any stage
`DELETE /api/tasks/TASK_ID`

## MongoDB Compass query
In Compass, open the `kanban` database, select `tasks`, and use the Filter bar:
```json
{ "status": "Todo" }
```
For all tasks:
```json
{}
```
For a user-specific filter, use their owner's ObjectId:
```json
{ "owner": ObjectId("PASTE_USER_OBJECT_ID_HERE") }
```
