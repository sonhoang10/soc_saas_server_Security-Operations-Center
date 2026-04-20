const express = require('express');
const app = express();

// Express >= 4.16.0 natively includes URL-encoded parsing capabilities.
app.use(express.urlencoded({ extended: true }));

/**
 * Global Request Logger Middleware
 * Rationale: Intercepts all incoming HTTP traffic to generate structured JSON telemetry 
 * for downstream SIEM/SOC log ingestion and anomaly detection.
 */
app.use((req, res, next) => {
    const forwardedIps = req.headers['x-forwarded-for'];
    const clientIp = forwardedIps ? forwardedIps.split(',')[0].trim() : req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown Tool';

    const logPayload = {
        timestamp: new Date().toISOString(),
        action: 'http_request',
        ip: clientIp,
        method: req.method,
        path: req.originalUrl,
        user_agent: userAgent
    };

    // Utilizing JSON.stringify ensures robust JSON formatting and prevents injection 
    // issues that occur with manual string interpolation.
    console.log(JSON.stringify(logPayload));
    next();
});

/**
 * Root View Handler
 * Rationale: Serves the initial authentication interface for user interaction.
 */
app.get('/', (req, res) => {
    res.send(`
        <h2>SOC Testing System - Web Client</h2>
        <form action="/login" method="POST">
            Username: <input type="text" name="username"><br><br>
            Password: <input type="password" name="password"><br><br>
            <button type="submit">Login</button>
        </form>
    `);
});

/**
 * Authentication Endpoint
 * Rationale: Processes credentials and emits specific security event logs based on the outcome.
 * Destructuring with default values prevents runtime exceptions if the payload is malformed or empty.
 */
app.post('/login', (req, res) => {
    const { username = '', password = '' } = req.body || {};
    
    const forwardedIps = req.headers['x-forwarded-for'];
    const clientIp = forwardedIps ? forwardedIps.split(',')[0].trim() : req.socket.remoteAddress;

    const baseLog = {
        timestamp: new Date().toISOString(),
        ip: clientIp,
        username: username
    };

    if (username === 'admin' && password === '123456') {
        console.log(JSON.stringify({
            ...baseLog,
            action: 'login_success'
        }));
        res.send('<h3>Authentication successful!</h3><a href="/">Go back</a>');
    } else {
        console.log(JSON.stringify({
            ...baseLog,
            action: 'login_failed',
            password_tried: password
        }));
        res.status(401).send('<h3>Invalid credentials!</h3><a href="/">Try again</a>');
    }
});

/**
 * Server Initialization
 * Rationale: Binds the application to the network interface. Uses environment variables 
 * for deployment flexibility while defaulting to port 80 to maintain original behavior.
 * Note: Binding to port 80 requires elevated (sudo/admin) privileges.
 */
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Web client is running and listening on port ${PORT}...`);
});