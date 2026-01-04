/**
 * Enhanced IVR Helper with Audio Feedback
 * Provides ringing tones, connection sounds, and TTS for IVR
 */

const axios = require('axios');
const logger = require('./logger');

const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://tts-service:8000';

class AudioHelper {
  constructor() {
    this.ttsEnabled = true;
    this.checkTTSService();
  }

  async checkTTSService() {
    try {
      await axios.get(`${TTS_SERVICE_URL}/health`, { timeout: 2000 });
      logger.info('TTS service is available');
      this.ttsEnabled = true;
    } catch (err) {
      logger.warn('TTS service not available, will use fallback audio');
      this.ttsEnabled = false;
    }
  }

  /**
   * Play ringing tone while connecting
   */
  async playRingingTone(endpoint) {
    try {
      // Use FreeSWITCH built-in ringback tone
      await endpoint.execute('ringback', '${us-ring}');
      logger.info('Playing ringing tone');
      return true;
    } catch (err) {
      logger.error('Error playing ringing tone:', err);
      return false;
    }
  }

  /**
   * Play connection sound
   */
  async playConnectionSound(endpoint) {
    try {
      // Play a simple beep to indicate connection
      await endpoint.execute('playback', 'tone_stream://%(200,200,425);loops=1');
      logger.info('Played connection sound');
      return true;
    } catch (err) {
      logger.error('Error playing connection sound:', err);
      return false;
    }
  }

  /**
   * Speak text using TTS or fallback to pre-recorded audio
   */
  async speak(endpoint, text, options = {}) {
    const { voice = 'default', speed = 1.0, fallbackAudio = null } = options;

    try {
      if (this.ttsEnabled) {
        // Try TTS first
        const response = await axios.post(
          `${TTS_SERVICE_URL}/tts`,
          {
            text: text,
            voice: voice,
            speed: speed,
            cache: true
          },
          { timeout: 5000 }
        );

        if (response.data.success && response.data.file_path) {
          // Copy file to FreeSWITCH accessible location if needed
          const audioPath = response.data.file_path;
          await endpoint.execute('playback', audioPath);
          logger.info(`Played TTS audio: ${text.substring(0, 50)}...`);
          return true;
        }
      }
    } catch (err) {
      logger.warn('TTS failed, using fallback:', err.message);
    }

    // Fallback to pre-recorded audio or silence
    if (fallbackAudio) {
      try {
        await endpoint.execute('playback', fallbackAudio);
        return true;
      } catch (err) {
        logger.error('Fallback audio failed:', err);
      }
    }

    return false;
  }

  /**
   * Play welcome message with audio
   */
  async playWelcome(endpoint) {
    // Play a nice tone
    await endpoint.execute('playback', 'tone_stream://%(300,200,941,1336);loops=1');
    
    // Speak welcome message
    await this.speak(
      endpoint,
      'Welcome to our voice service. Please listen carefully to the following options.',
      { fallbackAudio: '/usr/local/freeswitch/sounds/en/us/callie/ivr/8000/ivr-welcome.wav' }
    );
  }

  /**
   * Play IVR menu with options
   */
  async playMenu(endpoint, menuText) {
    await this.speak(endpoint, menuText, {
      fallbackAudio: '/usr/local/freeswitch/sounds/en/us/callie/ivr/8000/ivr-please_hold.wav'
    });
  }

  /**
   * Play transfer message
   */
  async playTransferring(endpoint, destination) {
    const message = `Transferring your call to ${destination}. Please wait.`;
    
    // Play transfer tone
    await endpoint.execute('playback', 'tone_stream://%(200,100,425);loops=2');
    
    await this.speak(endpoint, message, {
      fallbackAudio: '/usr/local/freeswitch/sounds/en/us/callie/ivr/8000/ivr-please_hold.wav'
    });
  }

  /**
   * Play agent connecting message
   */
  async playAgentConnecting(endpoint) {
    // Play pleasant tone
    await endpoint.execute('playback', 'tone_stream://%(300,200,350,440);loops=1');
    
    await this.speak(
      endpoint,
      'An agent will be with you shortly. Thank you for your patience.',
      { fallbackAudio: '/usr/local/freeswitch/sounds/en/us/callie/ivr/8000/ivr-thank_you_for_calling.wav' }
    );
  }

  /**
   * Play hold music
   */
  async playHoldMusic(endpoint) {
    try {
      // Use FreeSWITCH built-in hold music
      await endpoint.execute('playback', '/usr/local/freeswitch/sounds/music/8000/default.wav');
      return true;
    } catch (err) {
      logger.error('Error playing hold music:', err);
      return false;
    }
  }

  /**
   * Play error/invalid option message
   */
  async playInvalidOption(endpoint) {
    // Error tone
    await endpoint.execute('playback', 'tone_stream://%(100,100,400);loops=3');
    
    await this.speak(
      endpoint,
      'Invalid option. Please try again.',
      { fallbackAudio: '/usr/local/freeswitch/sounds/en/us/callie/ivr/8000/ivr-that_was_an_invalid_entry.wav' }
    );
  }

  /**
   * Play goodbye message
   */
  async playGoodbye(endpoint) {
    await this.speak(
      endpoint,
      'Thank you for calling. Goodbye.',
      { fallbackAudio: '/usr/local/freeswitch/sounds/en/us/callie/ivr/8000/ivr-thank_you_for_calling.wav' }
    );
    
    // Final tone
    await endpoint.execute('playback', 'tone_stream://%(200,200,350);loops=1');
  }

  /**
   * Collect DTMF with audio prompt
   */
  async collectDigits(endpoint, promptText, options = {}) {
    const {
      minDigits = 1,
      maxDigits = 1,
      timeout = 5000,
      terminators = '#',
      fallbackAudio = null
    } = options;

    // Play prompt
    if (promptText) {
      await this.speak(endpoint, promptText, { fallbackAudio });
    }

    // Collect digits
    try {
      const result = await endpoint.execute('read', `0 1 ${fallbackAudio} ${timeout} ${terminators}`);
      return result;
    } catch (err) {
      logger.error('Error collecting digits:', err);
      return null;
    }
  }
}

module.exports = new AudioHelper();
