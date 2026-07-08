const os = require('os');
const fs = require('fs');

function readOsRelease() {
  const candidates = ['/etc/os-release', '/usr/lib/os-release'];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const data = {};
      for (const line of content.split('\n')) {
        const m = line.match(/^([A-Z_]+)=(.*)$/);
        if (!m) continue;
        let value = m[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        data[m[1]] = value;
      }
      return data;
    }
  }
  return {};
}

function detectDocker() {
  return ['/usr/bin/docker', '/bin/docker', '/usr/local/bin/docker'].some(p => fs.existsSync(p));
}

function getIpAddress() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

function getTempC() {
  return null;
}

function buildInfo() {
  const osr = readOsRelease();
  const platform = os.platform();

  return {
    deviceId: process.env.DEVICE_ID || os.hostname(),
    deviceType: platform === 'linux' ? 'linux' : platform,
    hostname: os.hostname(),
    model: process.env.MODEL || null,
    vendor: osr.ID_LIKE || osr.ID || null,
    osFamily: osr.NAME || platform,
    osVersion: osr.PRETTY_NAME || osr.VERSION || null,
    kernelVersion: os.release(),
    arch: os.arch(),
    ipAddress: getIpAddress(),
    dockerAvailable: detectDocker(),
    cpuPercent: 0,
    ramPercent: 0,
    storagePercent: 0,
    temperatureC: getTempC(),
    uptimeSeconds: Math.floor(os.uptime())
  };
}

async function postJson(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

async function main() {
  const server = process.env.SERVER_URL;
  if (!server) throw new Error('SERVER_URL is required');

  const info = buildInfo();
  console.log('registering', info);

  await postJson(`${server}/api/devices/register`, info);

  setInterval(async () => {
    try {
      const heartbeat = {
        deviceId: info.deviceId,
        ipAddress: getIpAddress(),
        dockerAvailable: detectDocker(),
        cpuPercent: 0,
        ramPercent: 0,
        storagePercent: 0,
        temperatureC: getTempC(),
        uptimeSeconds: Math.floor(os.uptime())
      };

      await postJson(`${server}/api/devices/heartbeat`, heartbeat);
      console.log('heartbeat sent');
    } catch (err) {
      console.error('heartbeat failed', err.message);
    }
  }, 10000);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
