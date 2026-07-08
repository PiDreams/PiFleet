require('dotenv').config();

const express = require('express');
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');

require('./db');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const meRoutes = require('./routes/me');
const { setupTerminalWs } = require('./ws-terminal');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const dashboardPath = path.join(__dirname, '..', 'dashboard');

app.use(helmet());
app.use(cors({
  origin: process.env.WEB_ORIGIN || true,
  credentials: true
}));
app.use(express.json({ limit: '64kb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'RemotePi API', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/me', meRoutes);

app.use(express.static(dashboardPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(dashboardPath, '404.html'));
});

setupTerminalWs(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`RemotePi API running on http://0.0.0.0:${PORT}`);
});
