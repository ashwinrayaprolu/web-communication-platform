const Srf = require('drachtio-srf');
const Mrf = require('drachtio-fsmrf');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');
const redis = require('redis');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const axios = require('axios');
const { Client: RtpEngine } = require('rtpengine-client');
const ttsServiceUrl = process.env.TTS_SERVICE_URL || 'http://tts-service:8000';


// Initialize RTPEngine client
const rtpEngine = new RtpEngine({
  host: process.env.RTPENGINE_HOST || 'rtpengine',
  port: process.env.RTPENGINE_PORT || 22222,
  timeout: 5000
});

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Initialize SRF
const srf = new Srf();
const mrf = new Mrf(srf);

// Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
  },
  password: process.env.REDIS_PASSWORD
});

// PostgreSQL client
const pgPool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'voip_db',
  user: process.env.DB_USER || 'voip_user',
  password: process.env.DB_PASSWORD
});

// LiveKit client
const livekitHost = process.env.LIVEKIT_URL || 'http://livekit:7880';
const livekitApiKey = process.env.LIVEKIT_API_KEY;
const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

const roomService = new RoomServiceClient(livekitHost, livekitApiKey, livekitApiSecret);

// Active calls map
const activeCalls = new Map();

// Drachtio event handlers
srf.on('connect', (err, hostport) => {
  if (err) {
    logger.error('Error connecting to Drachtio:', err);
    return;
  }
  logger.info(`Connected to Drachtio server at ${hostport}`);
});

srf.on('error', (err) => {
  logger.error('Drachtio connection error:', err);
});

// Connect to services
async function connect() {
  try {
    // Connect to Drachtio
    srf.connect({
      host: process.env.DRACHTIO_HOST || 'drachtio-2',
      port: parseInt(process.env.DRACHTIO_PORT || '9022'),
      secret: process.env.DRACHTIO_SECRET || 'cymru',
      tag: 'app-2'  // Add tag for identification
    });

    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Test PostgreSQL connection
    await pgPool.query('SELECT NOW()');
    logger.info('Connected to PostgreSQL');

    logger.info('All services connected');
  } catch (err) {
    logger.error('Connection error:', err);
    process.exit(1);
  }
}

// Handle INVITE requests
srf.invite(async (req, res) => {
  try {
    const callId = req.get('Call-ID');
    const from = req.getParsedHeader('From').uri;
    const to = req.getParsedHeader('To').uri;
    const toUser = to.match(/sip:(\d+)@/)?.[1];

    logger.info(`Incoming call: ${from} -> ${to}(${toUser}), Call-ID: ${callId}`);

    // Route based on extension
    if (toUser === '6000') {
      await handleDirectCall(req, res, callId, from, to);
    } else if (toUser === '9999' || toUser === 9999 ) {
      logger.info(`---Handling IVR call: ${from} -> ${to}(${toUser}), Call-ID: ${callId}`);
      await handleIVRCall(req, res, callId, from, to);
      logger.info(`---Done handling IVR call: ${from} -> ${to}(${toUser}), Call-ID: ${callId}`);
    } else if (toUser && toUser.startsWith('555')) {
      await handleLiveKitCall(req, res, callId, from, to);
    } else {
      res.send(404, 'Not Found');
    }
  } catch (err) {
    logger.error('Error handling INVITE:', err);
    res.send(500, 'Server Error');
  }
});



async function handleDirectCall(req, res, callId, from, to) {
  try {
    logger.info(`Direct call to ${to}: ${callId} from ${from}`);
    
    const targetExtension = to.match(/sip:(\d+)@/)?.[1];
    
    if (!targetExtension) {
      logger.error(`Failed to extract target extension from: ${to}`);
      res.send(400, 'Bad Request - Invalid destination');
      return;
    }
    
    logger.info(`Bridging call ${callId} to extension ${targetExtension}`);
    
    // Simple B2BUA without RTPEngine - Kamailio handles media
    const { uas, uac } = await srf.createB2BUA(req, res, 
      `sip:${targetExtension}@${process.env.KAMAILIO_HOST || 'kamailio'}:${process.env.KAMAILIO_PORT || '5060'}`,
      {
        headers: {
          'X-Call-ID': callId,
          'X-From-App': 'true'
        }
      }
    );
    
    logger.info(`Call ${callId} successfully bridged to ${targetExtension}`);
    
    activeCalls.set(callId, { uas, uac, from, to, callId });
    await logCall(callId, from, targetExtension, 'direct');
    
    uas.on('destroy', async () => {
      logger.info(`Caller hung up on ${callId}`);
      uac.destroy();
      activeCalls.delete(callId);
      await updateCallLog(callId, 'completed');
    });
    
    uac.on('destroy', async () => {
      logger.info(`Target hung up on ${callId}`);
      uas.destroy();
      activeCalls.delete(callId);
      await updateCallLog(callId, 'completed');
    });
    
  } catch (err) {
    logger.error(`Error in handleDirectCall: ${err.message}`, err);
    if (!res.finalResponseSent) {
      res.send(480, 'Temporarily Unavailable');
    }
  }
}

  // Updated handleDirectCall function with loop prevention headers

async function handleDirectCallRTPEngine(req, res, callId, from, to) {
  const rtpEngineOpts = {
    host: process.env.RTPENGINE_HOST || 'rtpengine',
    port: parseInt(process.env.RTPENGINE_PORT || '22222')
  };

  try {
    logger.info(`Direct call to ${to}: ${callId} from ${from}`);
    
    const targetExtension = to.match(/sip:(\d+)@/)?.[1];
    
    if (!targetExtension) {
      logger.error(`Failed to extract target extension from: ${to}`);
      res.send(400, 'Bad Request - Invalid destination');
      return;
    }
    
    logger.info(`Bridging call ${callId} to extension ${targetExtension}`);

    logger.info(`----SIP Request body ${req.body}`);
    
    // Detect if this is a WebRTC client
    const isWebRTC = req.body.includes('RTP/SAVPF') || req.body.includes('a=fingerprint');
    const fromTag = req.getParsedHeader('from').params.tag;
    
    logger.info(`Call ${callId} is WebRTC: ${isWebRTC}`);
    
    // Step 1: OFFER to RTPEngine (WebRTC browser → RTP backend)
    const offerParams = {
      'call-id': callId,
      'from-tag': fromTag,
      'sdp': req.body,
      'direction': ['private', 'public']
    };
    
    if (isWebRTC) {
      // For WebRTC clients, convert to RTP/AVP for the backend
      offerParams['ICE'] = 'remove';
      offerParams['DTLS'] = 'off';
      offerParams['rtcp-mux'] = ['demux'];
      offerParams['transport-protocol'] = 'RTP/AVP';
    }
    
    const offerResponse = await rtpEngine.offer(rtpEngineOpts, offerParams);
    const modifiedSdpForBackend = offerResponse.sdp;
    logger.info(`RTPEngine offer completed for ${callId}`);
    
    // Step 2: Create B2BUA with modified SDP
    const { uas, uac } = await srf.createB2BUA(req, res, 
      `sip:${targetExtension}@${process.env.KAMAILIO_HOST || 'kamailio'}:${process.env.KAMAILIO_PORT || '5060'}`,
      {
        localSdpB: modifiedSdpForBackend,
        localSdpA: async (sdp, uacRes) => {
          const toTag = uacRes.getParsedHeader('to').params.tag;
          
          // Step 3: ANSWER to RTPEngine (RTP backend → WebRTC browser)
          const answerParams = {
            'call-id': callId,
            'from-tag': fromTag,
            'to-tag': toTag,
            'sdp': sdp,
            'direction': ['public', 'private']
          };
          
          if (isWebRTC) {
            // CRITICAL: Convert back to WebRTC for the browser
            answerParams['transport-protocol'] = 'RTP/SAVPF';
            answerParams['ICE'] = 'force';
            answerParams['DTLS'] = 'passive';  // or 'actpass'
            answerParams['rtcp-mux'] = ['require'];
            answerParams['generate-RTCP'] = true;
          } else {
            answerParams['transport-protocol'] = 'RTP/AVP';
          }
          
          const answerResponse = await rtpEngine.answer(rtpEngineOpts, answerParams);
          logger.info(`RTPEngine answer completed for ${callId}`);
          logger.info(`Answer SDP for browser: ${answerResponse.sdp.substring(0, 200)}...`);
          return answerResponse.sdp;
        },
        headers: {
          'X-Call-ID': callId,
          'X-From-App': 'true'
        }
      }
    );
    
    logger.info(`Call ${callId} successfully bridged to ${targetExtension} via RTPEngine`);
    
    // Store active call information
    activeCalls.set(callId, { uas, uac, from, to, callId, fromTag });
    await logCall(callId, from, targetExtension, 'direct');
    
    // Cleanup function
    const cleanup = async () => {
      try {
        await rtpEngine.delete(rtpEngineOpts, { 
          'call-id': callId,
          'from-tag': fromTag
        });
        logger.info(`RTPEngine session deleted for ${callId}`);
      } catch (err) {
        logger.error(`Failed to delete RTPEngine session: ${err.message}`);
      }
      activeCalls.delete(callId);
      await updateCallLog(callId, 'completed');
    };
    
    uas.on('destroy', async () => {
      logger.info(`Caller hung up on ${callId}`);
      uac.destroy();
      await cleanup();
    });
    
    uac.on('destroy', async () => {
      logger.info(`Target hung up on ${callId}`);
      uas.destroy();
      await cleanup();
    });
    
  } catch (err) {
    logger.error(`Error in handleDirectCall: ${err.message}`, err);
    
    try {
      const fromTag = req.getParsedHeader('from')?.params?.tag;
      if (fromTag) {
        await rtpEngine.delete(rtpEngineOpts, {
          'call-id': callId,
          'from-tag': fromTag
        });
      }
    } catch (e) {
      logger.error(`Failed to cleanup RTPEngine: ${e.message}`);
    }
    
    if (!res.finalResponseSent) {
      res.send(480, 'Temporarily Unavailable');
    }
  }
}






// Handle direct calls to extension 6000
async function handleDirectCallOld(req, res, callId, from, to) {
  let ms, endpoint, dialog;
  
  try {
    logger.info(`Direct call to ${to}: ${callId} from ${from}`);
    
    // Extract extension number (e.g., 6000)
    const targetExtension = to.match(/sip:(\d+)@/)?.[1] || '6000';
    
    // Connect to FreeSWITCH
    ms = await mrf.connect({
      address: process.env.FREESWITCH_HOST || 'freeswitch-2',
      port: parseInt(process.env.FREESWITCH_PORT || '8021'),
      secret: process.env.FREESWITCH_PASSWORD || 'JambonzR0ck$'
    });

    logger.info(`FreeSWITCH connected for direct call ${callId}`);

    // Connect caller to FreeSWITCH
    const result = await ms.connectCaller(req, res);
    endpoint = result.endpoint;
    dialog = result.dialog;

    logger.info(`Direct call established: ${callId}, bridging to ${targetExtension}`);

    // Store call info
    activeCalls.set(callId, { dialog, endpoint, ms, from, to });

    // Log call to database
    await logCall(callId, from, targetExtension, 'direct');

    // Try to bridge to the target extension
    try {
      logger.info(`Attempting to bridge ${callId} to sip:${targetExtension}@localhost`);
      
      // Play ringing tone while connecting
      await endpoint.play('tone_stream://%(2000,4000,440,480);loops=-1');
      
      
      // Create outbound call to target extension
      const { endpoint: targetEndpoint, dialog: targetDialog } = await ms.createCall({
        destination: `sip:${targetExtension}@${process.env.FREESWITCH_HOST || 'freeswitch-2'}`,
        callingNumber: from,
        headers: {
          'X-Call-ID': callId
        },
        timeout: 30  // Add a timeout to prevent hanging indefinitely
      });

      logger.info(`Outbound leg created for ${callId}, bridging...`);

      // Bridge the two calls
      await endpoint.bridge(targetEndpoint);
      
      logger.info(`Call ${callId} successfully bridged to ${targetExtension}`);

      // Handle target hangup
      targetDialog.on('destroy', () => {
        logger.info(`Target ${targetExtension} hung up on ${callId}`);
        if (dialog) dialog.destroy();
      });

      // Handle caller hangup
      dialog.on('destroy', async () => {
        logger.info(`Caller hung up on ${callId}`);
        if (targetDialog) targetDialog.destroy();
        if (targetEndpoint) targetEndpoint.destroy();
        if (endpoint) endpoint.destroy();
        if (ms) ms.disconnect();
        activeCalls.delete(callId);
        await updateCallLog(callId, 'completed');
      });

    } catch (bridgeErr) {
      // Bridge failed - agent not registered or busy
      logger.warn(`Bridge failed for ${callId}: ${bridgeErr.message}`);
      
      // Stop ringing tone
      await endpoint.stop();
      
      // Play message that agent is unavailable
      try {
        const ttsResponse = await axios.post('http://tts-service:8000/tts', {
          text: `Extension ${targetExtension} is not available. Please try again later.`,
          cache: true
        });
        await endpoint.play(ttsResponse.data.file_path);
      } catch (ttsErr) {
        logger.warn(`TTS failed: ${ttsErr.message}`);
        await endpoint.play('tone_stream://%(200,0,480,620);loops=3');
      }
      
      // Hang up after 2 seconds
      setTimeout(() => {
        if (dialog) dialog.destroy();
      }, 2000);
    }
    
  } catch (err) {
    logger.error(`Error in handleDirectCall: ${err.message}`, err);
    
    // Cleanup on error
    if (endpoint) try { endpoint.destroy(); } catch (e) {}
    if (ms) try { ms.disconnect(); } catch (e) {}
    
    if (!res.finalResponseSent) {
      res.send(500, 'Internal Server Error');
    }
  }
}



// Handle IVR calls to extension 9999
async function handleIVRCall(req, res, callId, from, to) {
  let ms, endpoint, dialog;
  
  try {
    logger.info(`---Connect MRF IVR call: ${from} -> ${to}, Call-ID: ${callId}`);
    
    // Connect to media server
    ms = await mrf.connect({
      address: process.env.FREESWITCH_HOST || 'freeswitch-2',
      port: parseInt(process.env.FREESWITCH_PORT || '8021', 10),
      secret: process.env.FREESWITCH_PASSWORD || 'JambonzR0ck$'
    });
    
    logger.info('Connected to media server');
    
    // Use connectCaller to handle the call and create endpoint
    logger.info(`---Connecting caller to media server: ${callId}`);
    
    const { endpoint: ep, dialog: dlg } = await ms.connectCaller(req, res);
    
    endpoint = ep;
    dialog = dlg;
    
    logger.info(`---Caller connected, dialog created for call: ${callId}`);
    
    // Store call info
    activeCalls.set(callId, { dialog, endpoint, ms, from, to, currentMenu: 'main' });

    logger.info(`---Play IVR Menu IVR call: ${from} -> ${to}, Call-ID: ${callId}`);
    
    // Start IVR
    await playIVRMenu(callId, 'main', endpoint);

    // Handle DTMF
    endpoint.on('dtmf', async (evt) => {
      logger.info(`DTMF received: ${JSON.stringify(evt)}`);
      const digit = evt.dtmf || evt.digit;
      if (digit) {
        await handleDTMF(callId, digit, endpoint);
      }
    });

    // Log call to database
    await logCall(callId, from, to, 'ivr');

    // Handle call termination
    dialog.on('destroy', async () => {
      logger.info(`IVR call ended: ${callId}`);
      endpoint.destroy();
      ms.disconnect();
      activeCalls.delete(callId);
      await updateCallLog(callId, 'completed');
    });
  } catch (err) {
    logger.error('--------Error in handleIVRCall:', err);
    
    // Cleanup on error
    if (endpoint) {
      try { endpoint.destroy(); } catch (e) { }
    }
    if (ms) {
      try { ms.disconnect(); } catch (e) { }
    }
    
    throw err;
  }
}


// Generate TTS audio
async function generateTTS(text, voice = 'default', speed = 1.0) {
  const response = await axios.post(`${ttsServiceUrl}/tts`, {
    text: text,
    voice: voice,
    speed: speed,
    cache: true
  }, { timeout: 10000 });
  
  return response.data.file_path;  // e.g., "/app/output/abc123.wav"
}

// Play TTS via FreeSWITCH
async function playTTS(endpoint, text, voice = 'default', speed = 1.0) {
  try {
    // 1. Generate audio file
    const audioFile = await generateTTS(text, voice, speed);
    
    // 2. Play it
    await endpoint.play(audioFile);
    
    logger.info('TTS playback completed');
  } catch (err) {
    logger.error('TTS error:', err);
    // Fallback to tone
    await endpoint.execute('playback', 'tone_stream://%(200,0,800)');
  }
}

// Play IVR menu
async function playIVRMenu(callId, menuId, endpoint) {
  try {
    const result = await pgPool.query(
      'SELECT * FROM ivr_menus WHERE menu_id = $1',
      [menuId]
    );

    if (result.rows.length === 0) {
      logger.error(`Menu not found: ${menuId}`);
      return;
    }

    const menu = result.rows[0];
    
    // Play welcome message using TTS
    await playTTS(endpoint, menu.welcome_message);

    // Update current menu
    const call = activeCalls.get(callId);
    if (call) {
      call.currentMenu = menuId;
    }
  } catch (err) {
    logger.error('Error playing IVR menu:', err);
  }
}

// Handle DTMF input
async function handleDTMF(callId, digit, endpoint) {
  try {
    const call = activeCalls.get(callId);
    if (!call) return;

    const currentMenu = call.currentMenu;

    const result = await pgPool.query(
      'SELECT * FROM ivr_menu_options WHERE menu_id = $1 AND digit = $2',
      [currentMenu, digit]
    );

    if (result.rows.length === 0) {
      await playTTS(endpoint, 'Invalid selection. Please try again.');
      await playIVRMenu(callId, currentMenu, endpoint);
      return;
    }

    const option = result.rows[0];

    if (option.action_type === 'menu') {
      await playIVRMenu(callId, option.action_value, endpoint);
    } else if (option.action_type === 'transfer') {
      // Transfer to agent
      await playTTS(endpoint, `Transferring you to extension ${option.action_value}`);
      // Implement transfer logic here
    }
  } catch (err) {
    logger.error('Error handling DTMF:', err);
  }
}



// Handle LiveKit WebRTC calls
async function handleLiveKitCall(req, res, callId, from, to) {
  try {
    const roomName = `call-${uuidv4()}`;

    // Create LiveKit room
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 10
    });

    logger.info(`Created LiveKit room: ${roomName}`);

    // Generate access token for caller
    const token = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: from,
      name: `Caller ${from}`
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true
    });

    const jwt = token.toJwt();

    // Store room info in Redis
    await redisClient.set(`room:${callId}`, JSON.stringify({
      roomName,
      token: jwt,
      from,
      to
    }), { EX: 3600 });

    // Accept call with SDP
    const ms = await mrf.connect({
      address: process.env.FREESWITCH_HOST || 'freeswitch-2',
      port: process.env.FREESWITCH_PORT || 8021,
      secret: process.env.FREESWITCH_PASSWORD || 'JambonzR0ck$'
    });

    const { endpoint, dialog } = await srf.createUAS(req, res, {
      localSdp: ms.local.sdp
    });

    logger.info(`LiveKit call established for ${callId}`);

    // Store call info
    activeCalls.set(callId, { dialog, endpoint, ms, from, to, roomName });

    // Log call to database
    await logCall(callId, from, to, 'livekit', roomName);

    // Handle call termination
    dialog.on('destroy', async () => {
      logger.info(`LiveKit call ended: ${callId}`);
      ms.disconnect();
      activeCalls.delete(callId);
      await updateCallLog(callId, 'completed');
    });
  } catch (err) {
    logger.error('Error in handleLiveKitCall:', err);
    throw err;
  }
}

// Log call to database
async function logCall(callId, from, to, status, roomName = null) {
  try {
    await pgPool.query(
      `INSERT INTO call_logs (call_id, from_number, to_number, status, start_time, recording_url)
       VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [callId, from, to, status, roomName]
    );
  } catch (err) {
    logger.error('Error logging call:', err);
  }
}

// Update call log
async function updateCallLog(callId, status) {
  try {
    await pgPool.query(
      `UPDATE call_logs SET status = $1, end_time = NOW(),
       duration = EXTRACT(EPOCH FROM (NOW() - start_time))
       WHERE call_id = $2`,
      [status, callId]
    );
  } catch (err) {
    logger.error('Error updating call log:', err);
  }
}

// SRF event handlers
srf.on('connect', (err, hostport) => {
  if (err) {
    logger.error('Error connecting to Drachtio:', err);
    return;
  }
  logger.info(`Connected to Drachtio server at ${hostport}`);
});

srf.on('error', (err) => {
  logger.error('SRF error:', err);
});

// Start application
connect().catch(err => {
  logger.error('Failed to start application:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await redisClient.quit();
  await pgPool.end();
  process.exit(0);
});

logger.info('Drachtio App 2 started');