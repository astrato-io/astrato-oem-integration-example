# QUICK START

1. To start the app, please copy `.env.example` as `.env` and set the required variables in the `.env` file. The following document https://help.astrato.io/en/articles/9413603-auth-oem-api contains information on how to obtain the ID and secret.

```
ASTRATO_CLIENT_ID=
ASTRATO_CLIENT_SECRET=
ASTRATO_URL=
ASTRATO_EMBED_LINK=
```

2. Run following commands in terminal

```
docker compose build
docker compose up
```

# cheat-sheet

```
run > docker build -t getting-started .

docker run --env-file .env.example -dp 127.0.0.1:80:80 getting-started

.debug now docker run --env-file .env.example --mount type=bind,src=./www/,dst=/var/www/html -dp 127.0.0.1:80:80 getting-started

docker ps -a // to check the name
docker exec -it name bash // to get to bash console
```

# 📘 OEM Access Integration with Astrato

This document describes how to implement OEM access to Astrato using a lightweight NodeJs application. This setup facilitates generating session tickets for end users via Machine-to-Machine (M2M) authentication and simulates basic authentication via email.

## 📌 Overview

This application demonstrates:

- A simple login interface
- Generating an M2M access token
- Creating session tickets for users
- Serving authenticated content
- Handling logout

---

## 🔐 Authentication Flow

### 1. **Login Page**

- Accessed at `/login`.
- Accepts email input from the user.
- On form submission (`POST /login`):
- Stores the email in session.
- Calls Astrato's M2M token endpoint to obtain a **management access token**.
- Uses the token to call Astrato's `/oem/setup` endpoint and retrieves a **session ticket**.
- Stores the session ticket in session.
- Redirects the user to `/`.

> 📌 **Note:** No password is required. This simulates OEM environments where user identity is externally verified.

---

## 🔄 Token Retrieval

### `getManagementApiToken()`

- Sends a `POST` request to:

```
{ASTRATO_URL}/auth/proxy/m2m/token

```

- Requires:
  - `clientId`
  - `clientSecret`
- Returns:
  - A bearer token for backend (OEM) operations.

---

### `getSessionTicket(token, email)`

- Sends a `POST` request to:

```
{ASTRATO_URL}/oem/setup
```

- Body:

```json
{
  "email": "<user_email>",
  "groupIds": []
}
```

- Returns:
  - A `ticketId` used for accessing Astrato as that user.

> ⚠️ `groupIds` can be provided to associate the user with specific Astrato groups.

---

## 📂 Routes Summary

| Route               | Method   | Description                                     |
| ------------------- | -------- | ----------------------------------------------- |
| `/`                 | GET      | Main page (protected)                           |
| `/login`            | GET/POST | Login form + session creation                   |
| `/logout`           | GET      | Session destruction + redirect                  |
| `/external-relogin` | POST     | Returns a fresh `ticketId` using stored session |

---

## 🛡 Session Management

- `$_SESSION['user']`: Stores the email (user identity)
- `$_SESSION['ticketId']`: Stores the active session ticket
- `session_start()` is required to persist data across routes

# OEM E2E Node.js Application

This is a Node.js application that provides authentication and iframe embedding for Astrato Analytics.

## Features

- User authentication with email
- Session management
- Astrato Analytics integration
- Iframe embedding with automatic re-authentication
- Responsive web interface

## Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd oem-e2e-nodejs
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp env.example .env
```

4. Configure your environment variables in `.env`:

```env
# Astrato Configuration
ASTRATO_URL=https://your-astrato-instance.com/
ASTRATO_CLIENT_ID=your_client_id_here
ASTRATO_CLIENT_SECRET=your_client_secret_here
ASTRATO_EMBED_LINK=https://your-astrato-instance.com/embed/your-dashboard

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here

# Server Configuration
PORT=3001
```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The application will be available at `http://localhost:3001`

## API Endpoints

- `GET /` - Main dashboard page (requires authentication)
- `GET /login` - Login page
- `POST /login` - Handle login form submission
- `GET /logout` - Logout user
- `POST /external-relogin` - Handle external re-authentication

## Docker Support

The application includes Docker support. You can build and run it using:

```bash
# Build the image
docker build -t oem-e2e-nodejs .

# Run the container
docker run -p 3001:3001 --env-file .env oem-e2e-nodejs
```

Or use docker-compose:

```bash
docker-compose up
```

## Security Notes

- In production, set `SESSION_SECRET` to a strong, random string
- Enable HTTPS and set `cookie.secure: true` in session configuration
- Consider implementing proper user authentication and validation
- Add rate limiting for production use

## Troubleshooting

- Ensure all environment variables are properly set
- Check that the Astrato API endpoints are accessible
- Verify that the Astrato credentials are correct
- Check the console logs for any error messages
