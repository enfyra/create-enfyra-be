const fs = require('fs-extra');
const path = require('path');

const validators = {
  projectName: (input) => {
    if (!input.trim()) return 'Project name is required';
    if (!/^[a-zA-Z0-9-_]+$/.test(input)) return 'Only letters, numbers, - and _ allowed';
    if (fs.existsSync(path.join(process.cwd(), input))) {
      return `Directory ${input} already exists`;
    }
    return true;
  },

  required: (input) => {
    return input.trim() ? true : 'This field is required';
  },

  port: (input) => {
    const port = parseInt(input);
    if (!input.trim()) return 'Port is required';
    if (isNaN(port) || port < 1 || port > 65535) return 'Invalid port (1-65535)';
    return true;
  },

  databaseName: (input) => {
    if (!input.trim()) return 'Database name is required';
    if (!/^[a-zA-Z0-9_]+$/.test(input)) return 'Invalid database name';
    return true;
  },

  redisUri: (input) => {
    if (!input.trim()) return 'Redis is required for Enfyra';
    if (!input.startsWith('redis://')) return 'Must start with redis://';
    return true;
  },

  positiveNumber: (input) => {
    const num = parseInt(input);
    if (isNaN(num) || num < 1) return 'Invalid number';
    return true;
  },

  nonNegativeNumber: (input) => {
    const num = parseInt(input);
    if (isNaN(num) || num < 0) return 'Invalid number';
    return true;
  },

  saltRounds: (input) => {
    const rounds = parseInt(input);
    if (isNaN(rounds) || rounds < 1 || rounds > 20) return 'Invalid (1-20)';
    return true;
  },

  tokenExpiry: (input) => {
    if (!/^\d+[smhd]$/.test(input)) return 'Format: 15m, 1h, 7d, etc.';
    return true;
  },

  timeout: (input) => {
    const timeout = parseInt(input);
    if (isNaN(timeout) || timeout < 100) return 'Invalid timeout (min 100ms)';
    return true;
  },

  email: (input) => {
    if (!input.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input)) return 'Invalid email format';
    return true;
  },

  adminPassword: (input) => {
    if (!input || input.length < 4) return 'Password must be at least 4 characters';
    return true;
  },

  backendUrl: (input) => {
    if (!input.trim()) return 'Backend URL is required';
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      return 'URL must start with http:// or https://';
    }
    try {
      new URL(input);
      return true;
    } catch {
      return 'Invalid URL format';
    }
  }

};

module.exports = validators;