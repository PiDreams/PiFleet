function token() {
  return localStorage.getItem('token') || '';
}

function formatTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

async function loadDevices() {
  const devicesEl = document.getElementById('devices');
  if (!devicesEl) return;

  try {
    const res = await fetch('/api/devices', {
      headers: { Authorization: `Bearer ${token()}` }
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      devicesEl.innerHTML = '<div class="device-card">Sign in to view devices.</div>';
      return;
    }

    const q = (document.getElementById('search')?.value || '').toLowerCase().trim();

    const devices = data.devices.filter(d => {
      if (!q) return true;
      return [
        d.hostname,
        d.model,
        d.vendor,
        d.device_type,
        d.os_family,
        d.os_version,
        d.kernel_version,
        d.arch,
        d.ip_address,
        d.device_id
      ].some(v => String(v || '').toLowerCase().includes(q));
    });

    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.length - online;

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('totalPis', devices.length);
    setText('onlinePis', online);
    setText('offlinePis', offline);
    setText('avgCpu', `${avg(devices.map(d => Number(d.cpu_percent) || 0)).toFixed(1)}%`);
    setText('avgRam', `${avg(devices.map(d => Number(d.ram_percent) || 0)).toFixed(1)}%`);
    setText('avgTemp', `${avg(devices.map(d => Number(d.temperature_c) || 0)).toFixed(1)}°C`);
    setText('deviceCount', `${devices.length} device${devices.length === 1 ? '' : 's'}`);
    setText('fleetHealth', devices.length ? `${online}/${devices.length} online` : 'No devices');
    setText('lastRefresh', `Updated ${new Date().toLocaleTimeString()}`);

    devicesEl.innerHTML = devices.map(d => `
      <article class="device-card">
        <div class="device-top">
          <div>
            <h3 class="device-name">${d.hostname}</h3>
            <div class="brand-sub">${d.device_id}</div>
          </div>
          <span class="badge ${d.status === 'online' ? 'online' : 'offline'}">${d.status}</span>
        </div>

        <div class="device-meta">
          <div class="kv"><span>Type</span><strong>${d.device_type || 'linux'}</strong></div>
          <div class="kv"><span>OS family</span><strong>${d.os_family || '-'}</strong></div>
          <div class="kv"><span>OS version</span><strong>${d.os_version || '-'}</strong></div>
          <div class="kv"><span>Kernel</span><strong>${d.kernel_version || '-'}</strong></div>
          <div class="kv"><span>Arch</span><strong>${d.arch || '-'}</strong></div>
          <div class="kv"><span>Vendor</span><strong>${d.vendor || '-'}</strong></div>
          <div class="kv"><span>IP</span><strong>${d.ip_address || '-'}</strong></div>
          <div class="kv"><span>CPU</span><strong>${Number(d.cpu_percent || 0).toFixed(1)}%</strong></div>
          <div class="kv"><span>RAM</span><strong>${Number(d.ram_percent || 0).toFixed(1)}%</strong></div>
          <div class="kv"><span>Temp</span><strong>${Number(d.temperature_c || 0).toFixed(1)}°C</strong></div>
          <div class="kv"><span>Uptime</span><strong>${d.uptime_seconds || 0}s</strong></div>
          <div class="kv"><span>Docker</span><strong>${yesNo(d.docker_available)}</strong></div>
          <div class="kv"><span>Last check-in</span><strong>${formatTime(d.last_checkin)}</strong></div>
        </div>
      </article>
    `).join('');
  } catch {
    devicesEl.innerHTML = '<div class="device-card">Unable to load devices.</div>';
  }
}

document.getElementById('refreshBtn')?.addEventListener('click', loadDevices);
document.getElementById('search')?.addEventListener('input', loadDevices);

document.getElementById('loginStatus')?.addEventListener('click', () => {
  if (token()) {
    localStorage.removeItem('token');
    location.reload();
  } else {
    window.location.href = '/login.html';
  }
});

loadDevices();
setInterval(loadDevices, 5000);
