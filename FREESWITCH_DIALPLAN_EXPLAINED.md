# FreeSWITCH Dialplan: Traditional vs Drachtio Architecture

## Understanding the Architecture

In this VoIP application, we use **Drachtio** to control FreeSWITCH, which is fundamentally different from traditional FreeSWITCH deployments.

## Traditional FreeSWITCH Architecture ❌ (We're NOT doing this)

### Traditional Setup
```
Phone → FreeSWITCH → Dialplan (XML) → Extensions → Actions
```

### Traditional Dialplan Example
```xml
<!-- /etc/freeswitch/dialplan/default.xml -->
<extension name="extension_6000">
  <condition field="destination_number" expression="^6000$">
    <action application="answer"/>
    <action application="playback" data="/sounds/welcome.wav"/>
    <action application="voicemail" data="default ${domain_name} 6000"/>
  </condition>
</extension>

<extension name="ivr_9999">
  <condition field="destination_number" expression="^9999$">
    <action application="answer"/>
    <action application="ivr" data="main_menu"/>
  </condition>
</extension>
```

**Limitations**:
- Static XML configuration
- Requires FreeSWITCH reload to change
- Hard to integrate with external APIs/databases
- Limited programming logic

## Our Drachtio Architecture ✅ (What we're doing)

### Drachtio Setup
```
Browser → Kamailio → Drachtio Server → Drachtio App (Node.js)
                                              ↓
                                      ESL Commands (8021)
                                              ↓
                                        FreeSWITCH (Media Slave)
```

### Drachtio App Example (What we're actually using)
```javascript
// drachtio-apps/app-1/index.js

// Handle incoming call
srf.invite((req, res) => {
  const dest = req.getParsedHeader('To').uri.user;
  
  // Route based on extension (in JavaScript, not XML!)
  if (dest === '6000') {
    // Play welcome message
    const mrf = await Mrf.connect({ host: 'freeswitch-1', port: 8021 });
    const ms = await mrf.createMediaServer();
    await ms.play('/sounds/welcome.wav');
    
  } else if (dest === '9999') {
    // IVR logic
    const mrf = await Mrf.connect({ host: 'freeswitch-1', port: 8021 });
    const ms = await mrf.createMediaServer();
    
    // Play menu
    await ms.play('/sounds/menu.wav');
    
    // Collect DTMF
    const digits = await ms.collectDigits({
      min: 1,
      max: 1,
      timeout: 5000
    });
    
    // Route based on input (programmatically!)
    if (digits === '1') {
      // Transfer to sales
      await transferToAgent('sales');
    } else if (digits === '2') {
      // Transfer to support
      await transferToAgent('support');
    }
  }
});
```

**Advantages**:
- ✅ Dynamic routing (can query database, APIs)
- ✅ Full programming language (JavaScript)
- ✅ Real-time changes (no reload needed)
- ✅ Easy integration with external systems
- ✅ Complex business logic
- ✅ State management with Redis

## What FreeSWITCH Configuration We Need

### Minimal Configuration (Provided by Official Image)

The `drachtio/drachtio-freeswitch-mrf` image includes:

#### 1. ESL Configuration
```xml
<!-- /usr/local/freeswitch/conf/autoload_configs/event_socket.conf.xml -->
<configuration name="event_socket.conf">
  <settings>
    <param name="listen-ip" value="0.0.0.0"/>
    <param name="listen-port" value="8021"/>
    <param name="password" value="ClueCon"/>
  </settings>
</configuration>
```

#### 2. Minimal Dialplan (Just for ESL)
```xml
<!-- Minimal dialplan that accepts all calls for ESL control -->
<extension name="all_calls">
  <condition field="destination_number" expression="^(.*)$">
    <action application="park"/>
  </condition>
</extension>
```

**Note**: The call is "parked" and Drachtio App takes over via ESL!

#### 3. SIP Profile
```xml
<!-- Basic SIP profile to accept calls -->
<profile name="external">
  <param name="sip-port" value="5060"/>
  <param name="rtp-ip" value="auto"/>
  <!-- Other basic SIP settings -->
</profile>
```

## Comparison Table

| Feature | Traditional FreeSWITCH | Drachtio Architecture |
|---------|------------------------|----------------------|
| **Dialplan** | Complex XML files | JavaScript code |
| **Routing Logic** | Static extensions | Dynamic (database, APIs) |
| **Configuration** | XML reload required | Live code updates |
| **Business Logic** | Limited XML tags | Full programming language |
| **External Integration** | Difficult (lua/python) | Easy (npm modules) |
| **State Management** | Internal vars only | Redis, PostgreSQL |
| **IVR Complexity** | XML menus only | Unlimited complexity |
| **Changes** | Edit XML + reload | Change code + restart app |
| **Testing** | Call-based testing | Unit tests + integration tests |

## Why We Don't Need Custom FreeSWITCH Config

### The Official Image Provides Everything

```yaml
freeswitch-1:
  image: drachtio/drachtio-freeswitch-mrf:latest
  # ↑ This image already has:
  # - ESL enabled on port 8021
  # - Minimal dialplan for ESL control
  # - Sound files installed
  # - SIP profile configured
  # - Optimal settings for MRF
```

### What the Drachtio App Does

```javascript
// Instead of XML dialplan, we have this:

const Mrf = require('drachtio-fsmrf');
const mrf = await Mrf.connect({
  host: 'freeswitch-1',
  port: 8021,
  secret: 'ClueCon'
});

// Now we control FreeSWITCH programmatically:
const ms = await mrf.createMediaServer();

// Play audio
await ms.play({
  file: '/usr/local/freeswitch/sounds/en/us/callie/ivr/8000/ivr-welcome.wav'
});

// Record
await ms.record({
  file: '/recordings/message.wav',
  maxDuration: 60000
});

// Collect DTMF
const digits = await ms.collectDigits({
  min: 1,
  max: 5,
  timeout: 10000
});

// Bridge calls
const ep = await ms.createEndpoint();
await ep.bridge(otherEndpoint);
```

## When You WOULD Need Custom FreeSWITCH Config

You would need custom FreeSWITCH dialplan/config if:

1. **Not using Drachtio** - Direct SIP to FreeSWITCH
2. **Static routing needed** - Same routing for all calls
3. **Simple PBX** - Just forwarding extensions
4. **Legacy integration** - Working with existing FreeSWITCH setup

## Our Current Setup: Files Overview

```
voip-application/
├── freeswitch/
│   ├── Dockerfile              # (Not used - using official image)
│   └── conf/                   # (Not needed - using defaults)
│       └── sip_profiles/
│           └── external.xml    # (Not needed - using defaults)
│
├── drachtio-apps/
│   ├── app-1/
│   │   └── index.js           # ✅ THIS is our "dialplan"!
│   └── app-2/
│       └── index.js           # ✅ THIS is our "dialplan"!
```

**The "dialplan" is actually in JavaScript, not XML!**

## Example: IVR Flow in Our System

### How It Works

```javascript
// drachtio-apps/app-1/index.js

async function handleIVR(req, res, dest) {
  // 1. Connect to FreeSWITCH via ESL
  const mrf = await Mrf.connect({
    host: 'freeswitch-1',
    port: 8021
  });
  
  // 2. Create media server instance
  const ms = await mrf.createMediaServer();
  
  // 3. Answer the call
  const {endpoint, dialog} = await ms.connectCaller(req, res);
  
  // 4. Load IVR menu from PostgreSQL
  const menu = await db.query(
    'SELECT * FROM ivr_menus WHERE menu_id = $1',
    ['main']
  );
  
  // 5. Play welcome message
  await endpoint.play({
    file: menu.welcome_message
  });
  
  // 6. Collect digits
  const result = await endpoint.collectDigits({
    min: 1,
    max: 1,
    timeout: 5000
  });
  
  // 7. Route based on input (from database!)
  const option = await db.query(
    'SELECT * FROM ivr_menu_options WHERE menu_id = $1 AND digit = $2',
    ['main', result.digits]
  );
  
  if (option.action_type === 'transfer') {
    // Transfer to agent
    await transferCall(endpoint, option.action_value);
  } else if (option.action_type === 'submenu') {
    // Play another menu
    await handleSubMenu(endpoint, option.next_menu_id);
  }
}
```

**All of this logic is in Node.js, not FreeSWITCH XML!**

## Sound Files

### Where They Come From

The official image includes sound files:
```
/usr/local/freeswitch/sounds/
├── en/
│   └── us/
│       └── callie/
│           ├── ivr/
│           │   ├── ivr-welcome.wav
│           │   ├── ivr-thank_you.wav
│           │   └── ...
│           ├── voicemail/
│           └── ...
```

### How to Use Custom Sounds

If you want custom audio files:

```yaml
# docker-compose.yaml
freeswitch-1:
  volumes:
    - ./freeswitch/sounds:/usr/local/freeswitch/sounds/custom
```

Then in your Drachtio app:
```javascript
await endpoint.play({
  file: '/usr/local/freeswitch/sounds/custom/my-message.wav'
});
```

## Summary

### ✅ What We Have (Drachtio Architecture)

- **Drachtio Apps** control all call logic in JavaScript
- **FreeSWITCH** is just a media processor (plays audio, handles RTP)
- **No XML dialplan needed** - all logic is programmatic
- **Official image** provides everything FreeSWITCH needs

### ❌ What We DON'T Have (Traditional Architecture)

- No custom XML dialplan files
- No static extension routing
- No FreeSWITCH-level IVR XML menus
- No lua/python scripts in FreeSWITCH

### 🎯 The Key Insight

**In this architecture:**
- **Drachtio App = Dialplan** (JavaScript)
- **FreeSWITCH = Media Engine** (plays audio, handles codecs)

This is why you don't see dialplan XML files - they're not needed! The Drachtio App does everything the dialplan would traditionally do, but with the full power of a programming language.

## Want to Add Custom Routing?

Just edit the Drachtio app:

```javascript
// drachtio-apps/app-1/index.js

srf.invite((req, res) => {
  const dest = req.getParsedHeader('To').uri.user;
  
  // Add your routing logic here (no XML needed!)
  if (dest === '7000') {
    // New extension - just add code!
    await playCustomMessage();
  }
});
```

No need to touch FreeSWITCH configuration at all! 🎉
