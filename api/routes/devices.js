const express = require('express');
const db = require('../db');
const { isNonEmptyString, safeNumber } = require('../../shared/validation');

const router = express.Router();

router.get('/', (req, res) => {
  const devices = db.prepare(`
    SELECT device_id, device_type, hostname, model, vendor, os_family, os_version,
           kernel_version, arch, ip_address, status, cpu_percent, ram_percent,
           storage_percent, temperature_c, uptime_seconds, docker_available,
           last_checkin, created_at, updated_at
    FROM devices
    ORDER BY updated_at DESC
  `).all();

  res.json({ ok: true, devices });
});

router.post('/register', (req, res) => {
  const {
    deviceId,
    deviceType,
    hostname,
    model,
    vendor,
    osFamily,
    osVersion,
    kernelVersion,
    arch,
    ipAddress,
    dockerAvailable
  } = req.body || {};

  if (!isNonEmptyString(deviceId, 128) || !isNonEmptyString(hostname, 200)) {
    return res.status(400).json({ error: 'deviceId and hostname are required' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO devices (
      device_id, device_type, hostname, model, vendor, os_family, os_version,
      kernel_version, arch, ip_address, status, docker_available, last_checkin, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'online', ?, ?, ?)
    ON CONFLICT(device_id) DO UPDATE SET
      device_type=excluded.device_type,
      hostname=excluded.hostname,
      model=excluded.model,
      vendor=excluded.vendor,
      os_family=excluded.os_family,
      os_version=excluded.os_version,
      kernel_version=excluded.kernel_version,
      arch=excluded.arch,
      ip_address=excluded.ip_address,
      status='online',
      docker_available=excluded.docker_available,
      last_checkin=excluded.last_checkin,
      updated_at=excluded.updated_at
  `).run(
    deviceId,
    deviceType || 'linux',
    hostname,
    model || null,
    vendor || null,
    osFamily || null,
    osVersion || null,
    kernelVersion || null,
    arch || null,
    ipAddress || null,
    dockerAvailable ? 1 : 0,
    now,
    now
  );

  res.json({ ok: true, deviceId, receivedAt: now });
});

router.post('/heartbeat', (req, res) => {
  const {
    deviceId,
    cpuPercent,
    ramPercent,
    storagePercent,
    temperatureC,
    uptimeSeconds,
    ipAddress,
    dockerAvailable
  } = req.body || {};

  if (!isNonEmptyString(deviceId, 128)) {
    return res.status(400).json({ error: 'deviceId is required' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE devices
    SET cpu_percent = ?,
        ram_percent = ?,
        storage_percent = ?,
        temperature_c = ?,
        uptime_seconds = ?,
        ip_address = COALESCE(?, ip_address),
        docker_available = COALESCE(?, docker_available),
        status = 'online',
        last_checkin = ?,
        updated_at = ?
    WHERE device_id = ?
  `).run(
    safeNumber(cpuPercent) ? cpuPercent : 0,
    safeNumber(ramPercent) ? ramPercent : 0,
    safeNumber(storagePercent) ? storagePercent : 0,
    safeNumber(temperatureC) ? temperatureC : 0,
    Number.isInteger(uptimeSeconds) ? uptimeSeconds : 0,
    ipAddress || null,
    typeof dockerAvailable === 'boolean' ? (dockerAvailable ? 1 : 0) : null,
    now,
    now,
    deviceId
  );

  db.prepare(`
    INSERT INTO device_events (device_id, type, payload_json)
    VALUES (?, ?, ?)
  `).run(deviceId, 'heartbeat', JSON.stringify(req.body || {}));

  res.json({ ok: true, receivedAt: now });
});

module.exports = router;
