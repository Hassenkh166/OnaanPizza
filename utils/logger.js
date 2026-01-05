// Simple logger utility: logs only when NODE_ENV !== 'production'
module.exports = {
  info: (...args) => { if (process.env.NODE_ENV !== 'production') console.log(...args); },
  warn: (...args) => { if (process.env.NODE_ENV !== 'production') console.warn(...args); },
  error: (...args) => { console.error(...args); },
  debug: (...args) => { if (process.env.NODE_ENV !== 'production') console.debug(...args); }
};
