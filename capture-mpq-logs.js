/**
 * Diagnostic script to capture MPQ decompression errors
 * Run this in the browser console
 */

// Capture all console messages
const logs = [];
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

['log', 'warn', 'error'].forEach(level => {
  console[level] = function(...args) {
    const message = args.map(arg => {
      if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
      if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
      return String(arg);
    }).join(' ');
    
    logs.push({ level, message, timestamp: Date.now() });
    originalConsole[level].apply(console, args);
  };
});

// After 10 seconds, filter and display MPQ-related logs
setTimeout(() => {
  const mpqLogs = logs.filter(log => 
    log.message.includes('MPQ') || 
    log.message.includes('compression') ||
    log.message.includes('Decompressor')
  );
  
  console.log('\n\n=== MPQ DIAGNOSTIC REPORT ===');
  console.log(`Total logs: ${logs.length}`);
  console.log(`MPQ-related logs: ${mpqLogs.length}`);
  console.log('\n--- Errors ---');
  mpqLogs.filter(l => l.level === 'error').forEach(l => console.log(l.message));
  console.log('\n--- Compression Flags ---');
  mpqLogs.filter(l => l.message.includes('Flagged algorithms')).forEach(l => console.log(l.message));
}, 10000);

console.log('MPQ diagnostic logging active. Will report in 10 seconds...');
