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

const app = express();
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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Vacation tracker API listening on port ${port}`);
});
