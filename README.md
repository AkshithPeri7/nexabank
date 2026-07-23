# NexaBank

NexaBank is a premier digital-first banking platform designed to bridge the gap between traditional reliability and modern technology. It provides a seamless user experience, complete transparency, and bank-grade security for both retail and corporate clients.

## Features
- **Smart Dashboard**: Real-time overview of accounts, loans, and transactions.
- **Instant Transfers**: Send money instantly.
- **Loan Management**: Apply and manage home, personal, and business loans.
- **Multi-Account**: Manage Savings, Current, and Fixed Deposit accounts.
- **Admin Portal**: Dedicated portal for authorized personnel to handle loan approvals, KYC verification, and employee management.
- **Bank-Grade Security**: Ensuring data protection and full system audit logs.

## Tech Stack
### Frontend
- HTML5, CSS3, JavaScript (Vanilla)
- Supabase (for Auth/Data integration)
- Chart.js & jsPDF for analytics and reports
- Hosted locally via `serve` (port 3000)

### Backend
- Node.js & Express.js
- MySQL (via `mysql2`)
- Authentication using `bcryptjs` and `jsonwebtoken`
- Hosted locally on port 5000

## Prerequisites
- [Node.js](https://nodejs.org/) installed
- MySQL Database

## Getting Started

### 1. Setup Backend
Navigate to the `Backend` directory and install the dependencies:
```bash
cd Backend
npm install
```
*(Make sure to set up your `.env` variables for database connection).*

### 2. Setup and Run the Frontend (Website)
The frontend website files do not require any `npm` package installations because they are built using plain HTML, CSS, and vanilla JavaScript. However, they must be served via a local web server to communicate properly with the backend APIs.

You can quickly serve the website by running this command from the root directory:
```bash
npx serve Frontend -l 3000
```
This will host the frontend at `http://localhost:3000`. 
*(Alternatively, you can open the project in VS Code and use the **Live Server** extension on `Frontend/index.html`).*

### 3. Run the Backend Server
You can start the backend server by running the provided batch file from the root directory:
```bash
start-backend.bat
```
Alternatively, manually start it from the `Backend` directory:
```bash
cd Backend
npm start
```

### 4. Exposing via Tunnels (Cloud Hosting)
If you want to host the project online temporarily using `localtunnel`, run:
```bash
host-online.bat
```
This script will automatically:
- Serve the frontend on port 3000 (`npx serve Frontend -l 3000`)
- Open a tunnel for the frontend at `https://nexabankui99.loca.lt`
- Open a tunnel for the backend at `https://nexabankapi99.loca.lt`

*Note: Make sure your backend server is already running using `start-backend.bat` before running the tunnel script.*

## Project Structure
- `/Backend`: Contains all the Node.js Express server code, controllers, routes, middleware, and database schema/migration scripts.
- `/Frontend`: Contains the static web files (`index.html`, `app.js`, `styles.css`) for the NexaBank user interface.
- `start-backend.bat`: Script to quickly install dependencies and start the backend.
- `host-online.bat`: Script to start the frontend server and expose local ports using localtunnel.
