import { Terminal } from 'https://cdn.jsdelivr.net/npm/@xterm/xterm/+esm';
import { FitAddon } from 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit/+esm';

const term = new Terminal({
  cursorBlink: true,
  fontSize: 14,
  theme: {
    background: '#0b1020',
    foreground: '#e8ecff'
  }
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(document.getElementById('terminal'));
fitAddon.fit();

let ws = null;

function getToken() {
  return localStorage.getItem('token') || '';
}

function connect() {
  const deviceId = document.getElementById('deviceSelect').value;
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${location.host}/ws/terminal?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(getToken())}`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    term.writeln('\r\n[connected]');
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === 'ready') {
      term.writeln(`\r\n[session ready for ${msg.deviceId}]`);
      return;
    }

    if (msg.type === 'output') {
      term.write(msg.data);
    }
  };

  ws.onclose = () => {
    term.writeln('\r\n[disconnected]');
  };

  ws.onerror = () => {
    term.writeln('\r\n[error]');
  };

  term.onData((data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
    }
  });

  window.addEventListener('resize', () => {
    fitAddon.fit();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    }
  }, { once: true });
}

function disconnect() {
  if (ws) ws.close();
  ws = null;
}

document.getElementById('connectBtn').addEventListener('click', connect);
document.getElementById('disconnectBtn').addEventListener('click', disconnect);
