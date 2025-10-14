#!/usr/bin/env node

/**
 * Simple Chrome DevTools Protocol client to inspect console logs
 */

const WebSocket = require('ws');
const http = require('http');

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

async function inspectConsole() {
  const targets = await getTargets();

  // Find localhost:3002 target
  const target = targets.find(t => t.url && t.url.includes('localhost:3002'));

  if (!target) {
    console.error('No target found for localhost:3002');
    process.exit(1);
  }

  console.log(`Connecting to: ${target.title}`);
  console.log(`URL: ${target.url}`);
  console.log('---');

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let messageId = 1;
  const consoleLogs = [];

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

    // Evaluate JavaScript to trigger map load
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: messageId++,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            // Check if map is loaded
            console.log('[DEBUG-SCRIPT] Scene active:', !!window.__BABYLON_SCENE);
            console.log('[DEBUG-SCRIPT] Meshes count:', window.__BABYLON_SCENE?.meshes?.length || 0);

            // Try to find the "Load map" button
            const button = document.querySelector('button[aria-label*="3P Sentinel"]') ||
                           Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('3P Sentinel 01'));

            if (button) {
              console.log('[DEBUG-SCRIPT] Found button:', button.textContent);
              button.click();
              console.log('[DEBUG-SCRIPT] Clicked load button');
            } else {
              console.log('[DEBUG-SCRIPT] Button not found. Available buttons:',
                Array.from(document.querySelectorAll('button')).map(b => b.textContent).slice(0, 5)
              );
            }
          `,
          returnByValue: true
        }
      }));

      // Wait 10 seconds to collect logs, then close
      setTimeout(() => {
        console.log('\n=== COLLECTED CONSOLE LOGS ===');
        consoleLogs.forEach(log => console.log(log));
        ws.close();
      }, 10000);
    }, 1000);
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    // Console message
    if (msg.method === 'Console.messageAdded') {
      const { level, text, source } = msg.params.message;
      consoleLogs.push(`[${level.toUpperCase()}] ${text}`);
    }

    // Runtime console API call
    if (msg.method === 'Runtime.consoleAPICalled') {
      const { type, args } = msg.params;
      const text = args.map(arg => arg.value || arg.description || '').join(' ');
      consoleLogs.push(`[${type.toUpperCase()}] ${text}`);
    }

    // Evaluation result
    if (msg.id && msg.result && msg.result.result) {
      const { value, description } = msg.result.result;
      if (value !== undefined || description) {
        console.log('EVAL RESULT:', value || description);
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

inspectConsole().catch(console.error);
