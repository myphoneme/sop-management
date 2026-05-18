# SOP Studio

Modern SOP creation and publishing frontend built with Next.js, React, TypeScript, and Tailwind CSS.

## Local Development

PowerShell blocks the `npm.ps1` shim on this machine, so use `npm.cmd`.

```powershell
npm.cmd install
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

Open `http://127.0.0.1:3000`.

## Backend

The frontend uses the existing FastAPI backend contract from `F:\New folder\fastapi-project`.

Default API base URL:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Copy `.env.example` to `.env.local` when you want to point the frontend at a deployed Nginx API URL.

Used endpoints:

- `GET /posts`
- `GET /posts/{id}`
- `POST /posts`
- `PUT /posts/{id}`
- `DELETE /posts/{id}`
- `GET /categories`
- `POST /categories`
- `PUT /categories/{id}`
- `DELETE /categories/{id}`
- `GET /users`
- `POST /users`
- `PUT /users/{id}`
- `DELETE /users/{id}`
- `POST /login`

The UI labels backend posts as SOPs. Backend changes are not required for this first version.

## Checks

```powershell
npm.cmd run lint
npm.cmd run build
```
