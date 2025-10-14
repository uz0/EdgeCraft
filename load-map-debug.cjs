#!/usr/bin/env node

/**
 * Load a map and capture rendering logs
 */

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');

async function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    });
  });
}

async function loadMapAndDebug() {
  const targets = await getTargets();
  const target = targets.find(t => t.url && t.url.includes('localhost:3002'));

  if (!target) {
    console.error('No target found for localhost:3002');
    process.exit(1);
  }

  console.log(`Connecting to: ${target.title}`);
  console.log(`URL: ${target.url}\n`);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let messageId = 1;
  const consoleLogs = [];
  let mapLoaded = false;

  ws.on('open', () => {
    // Enable Console domain
    ws.send(JSON.stringify({
      id: messageId++,
      method: 'Console.enable'
    }));

    // Enable Runtime domain
    ws.send(JSON.stringify({
      id: messageId++,
      method: 'Runtime.enable'
    }));

    // Enable Log domain
    ws.send(JSON.stringify({
      id: messageId++,
      method: 'Log.enable'
    }));

    // Wait 2 seconds for page to be ready
    setTimeout(() => {
      console.log('[SCRIPT] Attempting to load map...\n');

      // Execute JavaScript to load the map
      ws.send(JSON.stringify({
        id: messageId++,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (async () => {
              // Find the button for "3P Sentinel 01 v3.06.w3x"
              const buttons = Array.from(document.querySelectorAll('button'));
              const targetButton = buttons.find(b =>
                b.textContent.includes('3P Sentinel 01 v3.06')
              );

              if (!targetButton) {
                console.error('[DEBUG] Button not found! Available buttons:',
                  buttons.slice(0, 10).map(b => b.textContent)
                );
                return { error: 'Button not found' };
              }

              console.log('[DEBUG] Found button:', targetButton.textContent);
              console.log('[DEBUG] Clicking button to load map...');

              // Click the button
              targetButton.click();

              console.log('[DEBUG] Button clicked, map should start loading...');

              return { success: true };
            })()
          `,
          awaitPromise: true,
          returnByValue: true
        }
      }));

      // Wait 30 seconds to collect all map loading logs
      setTimeout(() => {
        console.log('\n========== COLLECTED CONSOLE LOGS ==========\n');
        consoleLogs.forEach(log => console.log(log));
        console.log('\n========== END LOGS ==========\n');

        // Save logs to file
        fs.writeFileSync('map-load-debug.log', consoleLogs.join('\n'));
        console.log('Logs saved to map-load-debug.log');

        ws.close();
      }, 30000);
    }, 2000);
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    // Console message
    if (msg.method === 'Console.messageAdded') {
      const { level, text } = msg.params.message;
      const logLine = `[${level.toUpperCase()}] ${text}`;
      consoleLogs.push(logLine);

      // Also print in real-time for certain messages
      if (text.includes('MapRenderer') || text.includes('Terrain') ||
          text.includes('Doodad') || text.includes('DEBUG') ||
          text.includes('ERROR') || text.includes('WARNING')) {
        console.log(logLine);
      }
    }

    // Runtime console API call
    if (msg.method === 'Runtime.consoleAPICalled') {
      const { type, args } = msg.params;
      const text = args.map(arg => {
        if (arg.value !== undefined) return arg.value;
        if (arg.description) return arg.description;
        if (arg.preview && arg.preview.properties) {
          return arg.preview.properties.map(p => `${p.name}=${p.value}`).join(', ');
        }
        return '';
      }).join(' ');

      const logLine = `[${type.toUpperCase()}] ${text}`;
      consoleLogs.push(logLine);

      // Print important logs in real-time
      if (text.includes('MapRenderer') || text.includes('Terrain') ||
          text.includes('Doodad') || text.includes('DEBUG') ||
          text.includes('ERROR') || text.includes('WARNING') ||
          text.includes('Loading') || text.includes('Rendered')) {
        console.log(logLine);
      }
    }

    // Log domain entry
    if (msg.method === 'Log.entryAdded') {
      const { level, text } = msg.params.entry;
      const logLine = `[${level.toUpperCase()}] ${text}`;
      consoleLogs.push(logLine);
    }

    // Evaluation result
    if (msg.id && msg.result) {
      if (msg.result.result && msg.result.result.value) {
        console.log('[EVAL RESULT]', JSON.stringify(msg.result.result.value, null, 2));
      }
      if (msg.result.exceptionDetails) {
        console.error('[EVAL ERROR]', msg.result.exceptionDetails.text);
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });

  ws.on('close', () => {
    console.log('\nConnection closed');
    process.exit(0);
  });
}

loadMapAndDebug().catch(console.error);
