function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isNonEmptyString(value, max = 200) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function safeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

module.exports = { isEmail, isNonEmptyString, safeNumber };
