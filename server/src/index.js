import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import leaveTypeRoutes from './routes/leaveTypes.js';
import requestRoutes from './routes/requests.js';
import holidayRoutes from './routes/holidays.js';
import metaRoutes from './routes/meta.js';
import calendarRoutes from './routes/calendar.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Hosts put a proxy in front of the app; trust it so req.protocol / secure cookies reflect https.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/calendar', calendarRoutes);

// Unknown API paths are a JSON 404, never the web page.
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Production: serve the built client (client/dist) from this same server, so the whole site lives at one address.
// In development the client runs on its own Vite server and this folder does not exist.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist, { index: false, maxAge: '1h' }));
  // Any other page address (e.g. /calendar, /admin/users) is handled by the React app.
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Express 4 does not catch errors thrown inside async route handlers; log them instead of crashing the process.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Leaves tracker listening on port ${port}`);
});
