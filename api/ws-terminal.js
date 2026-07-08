const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const os = require('os');
const jwt = require('jsonwebtoken');

function parseToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);

  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('token');
}

function verifyUser(req) {
  const token = parseToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function setupTerminalWs(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    if (!req.url.startsWith('/ws/terminal')) return;
    const user = verifyUser(req);
    if (!user) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const deviceId = url.searchParams.get('deviceId') || 'local';
    const shell = os.platform() === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');

    const term = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 100,
      rows: 30,
      cwd: process.env.HOME || process.cwd(),
      env: process.env
    });

    ws.send(JSON.stringify({ type: 'ready', deviceId }));

    term.onData((data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }));
      }
    });

    ws.on('message', (msg) => {
      let data;
      try {
        data = JSON.parse(msg.toString());
      } catch {
        return;
      }

      if (data.type === 'input' && typeof data.data === 'string') {
        term.write(data.data);
      }

      if (data.type === 'resize' && Number.isInteger(data.cols) && Number.isInteger(data.rows)) {
        term.resize(data.cols, data.rows);
      }
    });

    ws.on('close', () => {
      try { term.kill(); } catch {}
    });

    ws.on('error', () => {
      try { term.kill(); } catch {}
    });
  });
}

module.exports = { setupTerminalWs };
