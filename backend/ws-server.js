/**
 * JVD Chat WebSocket Relay Server
 * ---------------------------------
 * Runs alongside Laravel (php artisan serve) on port 6001.
 * Laravel POSTs new messages to /broadcast, and this server
 * pushes them to all connected browser clients in real-time.
 *
 * Start with: node ws-server.js
 */

import http from 'http';
import { WebSocketServer } from 'ws';

const PORT = 6001;

// Track all connected WebSocket clients
const clients = new Set();

// HTTP server — accepts broadcast POSTs from Laravel
const httpServer = http.createServer((req, res) => {
  // CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const message = JSON.stringify({ type: 'new_message', data: payload });

        let sent = 0;
        clients.forEach(client => {
          if (client.readyState === 1) { // OPEN
            client.send(message);
            sent++;
          }
        });

        console.log(`[WS] Broadcast to ${sent} client(s):`, payload?.message?.id || '?');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, sent }));
      } catch (e) {
        console.error('[WS] Invalid payload:', e.message);
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: clients.size }));
    return;
  }

  res.writeHead(404);
  res.end();
});

// WebSocket server — browser clients connect here
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Total: ${clients.size}`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Client error:', err.message);
    clients.delete(ws);
  });

  // Send a hello ping so the browser confirms the connection
  ws.send(JSON.stringify({ type: 'connected', message: 'JVD Chat WebSocket ready' }));
});

httpServer.listen(PORT, () => {
  console.log(`[WS] Chat relay server running on ws://localhost:${PORT}`);
  console.log(`[WS] Broadcast endpoint: http://localhost:${PORT}/broadcast`);
});
