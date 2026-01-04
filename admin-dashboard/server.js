const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const redis = require('redis');
const { RoomServiceClient, AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pgPool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'voip_db',
  user: process.env.DB_USER || 'voip_user',
  password: process.env.DB_PASSWORD
});

// Redis connection
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: 6379
  },
  password: process.env.REDIS_PASSWORD
});

// LiveKit client
const livekitHost = process.env.LIVEKIT_URL || 'http://livekit:7880';
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

const roomService = new RoomServiceClient(livekitHost, livekitApiKey, livekitApiSecret);

// Connect to Redis
redisClient.connect().catch(err => {
  console.error('Redis connection error:', err);
});

// API Routes
app.get('/api/health', async (req, res) => {
  try {
    await pgPool.query('SELECT 1');
    await redisClient.ping();
    res.json({ status: 'healthy' });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT 
        (SELECT COUNT(*) FROM call_logs) as total_calls,
        (SELECT COUNT(*) FROM active_calls) as active_calls,
        (SELECT COUNT(*) FROM agents WHERE status = 'online') as online_agents,
        (SELECT COUNT(*) FROM call_logs WHERE DATE(start_time) = CURRENT_DATE) as calls_today
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agents', async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT extension, name, email, status, current_calls, total_calls
      FROM agents
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agents/:extension/status', async (req, res) => {
  try {
    const { extension } = req.params;
    const { status } = req.body;
    
    await pgPool.query(
      'UPDATE agents SET status = $1, updated_at = NOW() WHERE extension = $2',
      [status, extension]
    );
    
    res.json({ success: true, extension, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calls/active', async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT ac.*, a.name as agent_name
      FROM active_calls ac
      LEFT JOIN agents a ON ac.agent_extension = a.extension
      ORDER BY ac.started_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calls/history', async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const result = await pgPool.query(`
      SELECT call_id, from_number, to_number, status, start_time, end_time, duration
      FROM call_logs
      ORDER BY start_time DESC
      LIMIT $1
    `, [limit]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/livekit/rooms', async (req, res) => {
  try {
    const rooms = await roomService.listRooms();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/livekit/token', async (req, res) => {
  try {
    const { roomName, identity, name } = req.body;
    
    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: identity || `user-${Date.now()}`,
      name: name || 'Anonymous'
    });
    
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true
    });
    
    res.json({ token: token.toJwt(), roomName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ivr/menus', async (req, res) => {
  try {
    const result = await pgPool.query(`
      SELECT m.*, 
        (SELECT json_agg(mo ORDER BY mo.digit) 
         FROM ivr_menu_options mo 
         WHERE mo.menu_id = m.menu_id) as options
      FROM ivr_menus m
      ORDER BY m.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin Dashboard server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await redisClient.quit();
  await pgPool.end();
  process.exit(0);
});
