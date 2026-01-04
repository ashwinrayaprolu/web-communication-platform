const Srf = require('drachtio-srf');
const Mrf = require('drachtio-fsmrf');

// Initialize logging
const log = {
  info: (msg, data) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, data || ''),
  debug: (msg, data) => console.debug(`[DEBUG] ${new Date().toISOString()} - ${msg}`, data || '')
};

// Initialize SRF
const srf = new Srf();
const mrf = new Mrf(srf);

// Helper function to test network connectivity
async function testConnection(host, port) {
  const net = require('net');
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 5000; // 5 seconds
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      log.info('TCP connection successful');
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      log.error('Connection timeout');
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
    
    socket.on('error', (err) => {
      log.error('TCP connection failed:', err.message);
      reject(err);
    });
    
    log.debug(`Testing TCP connection to ${host}:${port}`);
    socket.connect(port, host);
  });
}

// Main async function with timeout
async function initializeMediaServer() {
  try {
    log.info('Starting media server connection...');
    
    const config = {
      address: process.env.FREESWITCH_HOST || 'freeswitch-2',
      port: parseInt(process.env.FREESWITCH_PORT || '8021', 10),
      secret: 'JambonzR0ck$'
    };
    
    log.info('Configuration:', {
      address: config.address,
      port: config.port,
      secret: '***' // Don't log the actual password
    });
    
    // Test basic TCP connectivity first
    log.info('Testing network connectivity...');
    try {
      await testConnection(config.address, config.port);
    } catch (err) {
      log.error('Network connectivity test failed. Please check:');
      log.error('1. FreeSWITCH is running');
      log.error('2. Host/port are correct');
      log.error('3. No firewall blocking the connection');
      log.error('4. ESL (Event Socket Library) is enabled in FreeSWITCH');
      throw err;
    }
    
    log.info('Network connectivity OK, attempting MRF connection...');
    
    // Add timeout to the MRF connection
    const connectionTimeout = 30000; // 30 seconds
    const connectionPromise = mrf.connect(config);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('MRF connection timeout after 30s')), connectionTimeout)
    );
    
    log.debug('Waiting for MRF connection...');
    const ms = await Promise.race([connectionPromise, timeoutPromise]);
    
    log.info('✓ Successfully connected to FreeSWITCH!');
    
    // Add event listeners for the media server
    ms.on('error', (err) => {
      log.error('Media server error:', err);
    });
    
    ms.on('disconnect', () => {
      log.warn('Media server disconnected');
    });
    
    ms.on('connect', () => {
      log.info('Media server connected event fired');
    });
    
    return ms;
    
  } catch (error) {
    log.error('Failed to connect to FreeSWITCH:', {
      message: error.message,
      stack: error.stack
    });
    
    // Additional troubleshooting info
    log.error('');
    log.error('=== TROUBLESHOOTING STEPS ===');
    log.error('1. Verify FreeSWITCH is running: docker ps | grep freeswitch');
    log.error('2. Check ESL configuration in FreeSWITCH:');
    log.error('   - File: /etc/freeswitch/autoload_configs/event_socket.conf.xml');
    log.error('   - Should have: <param name="listen-ip" value="0.0.0.0"/>');
    log.error('   - Should have: <param name="listen-port" value="8021"/>');
    log.error('3. Test with fs_cli: fs_cli -H freeswitch-2 -P 8021 -p ClueCon');
    log.error('4. Check FreeSWITCH logs: docker logs <freeswitch-container>');
    log.error('5. Verify network: telnet freeswitch-2 8021');
    log.error('=============================');
    log.error('');
    
    throw error;
  }
}

// Add SRF error handling
srf.on('error', (err) => {
  log.error('SRF error:', err);
});

// MRF error handling
mrf.on('error', (err) => {
  log.error('MRF error:', err);
});

// Handle process termination gracefully
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully...');
  srf.disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  log.info('SIGINT received, shutting down gracefully...');
  srf.disconnect();
  process.exit(0);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', { promise, reason });
});

// Start the application
log.info('=== Starting Drachtio Application ===');
log.info('Node version:', process.version);

initializeMediaServer()
  .then((ms) => {
    log.info('=== Application started successfully ===');
    log.info('Media server object:', typeof ms);
    // Add your application logic here
  })
  .catch((error) => {
    log.error('=== Application failed to start ===');
    log.error('Error:', error.message);
    process.exit(1);
  });

module.exports = { srf, mrf };