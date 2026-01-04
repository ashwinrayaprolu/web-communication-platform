# FreeSWITCH Errors Explained

## Errors You're Seeing

```
[CONSOLE] mod_local_stream.c:289 Can't open directory: /usr/local/freeswitch/sounds/music/8000
[CRIT] Error Loading module /usr/local/freeswitch/mod/mod_lua.so
```

---

## Impact Assessment

### ⚠️ Missing Music Directory

**Error**:
```
Can't open directory: /usr/local/freeswitch/sounds/music/8000
Can't open directory: /usr/local/freeswitch/sounds/music/16000
Can't open directory: /usr/local/freeswitch/sounds/music/32000
Can't open directory: /usr/local/freeswitch/sounds/music/48000
```

**Impact**: ✅ **NONE - Safe to Ignore**

**Why it doesn't matter**:
- This is for hold music via `mod_local_stream`
- Your system uses **Drachtio** for call control, not FreeSWITCH dialplan
- Hold music can be played via Drachtio instead
- TTS service handles prompts

**When you'd need it**:
- If using FreeSWITCH native dialplan (you're not)
- If playing hold music directly from FreeSWITCH (you're not)

---

### ❌ Missing mod_lua.so

**Error**:
```
[CRIT] Error Loading module /usr/local/freeswitch/mod/mod_lua.so
/usr/local/freeswitch/mod/mod_lua.so: cannot open shared object file
```

**Impact**: ✅ **NONE - Safe to Ignore**

**Why it doesn't matter**:
- Lua is for scripting FreeSWITCH dialplan
- Your system uses **Drachtio Node.js apps** for call logic
- No Lua scripts in your setup

**When you'd need it**:
- If writing FreeSWITCH dialplan in Lua (you're not)
- If using FreeSWITCH ESL with Lua scripts (you're not)

---

## Your System's Call Flow

```
Browser (WebRTC)
    ↓
Kamailio (SIP Proxy)
    ↓
Drachtio (SIP Server) ← **Call logic happens here (Node.js)**
    ↓
FreeSWITCH (Media Engine) ← **Just does RTP, no dialplan**
    ↓
RTPEngine (Media Gateway)
```

**FreeSWITCH Role**: RTP media engine only  
**Call Logic**: Drachtio Node.js apps  
**Audio**: TTS service + FreeSWITCH tone_stream  

---

## Optional Fix (If You Want to Remove Warnings)

### Fix 1: Create Music Directories

```bash
# Create the missing directories
docker-compose exec freeswitch-1 mkdir -p \
    /usr/local/freeswitch/sounds/music/8000 \
    /usr/local/freeswitch/sounds/music/16000 \
    /usr/local/freeswitch/sounds/music/32000 \
    /usr/local/freeswitch/sounds/music/48000

# Download free hold music (optional)
docker-compose exec freeswitch-1 sh -c '
    cd /usr/local/freeswitch/sounds/music/8000
    wget http://www.freeswitch.org/sounds/freeswitch-sounds-music-8000-1.0.52.tar.gz
    tar -xzf freeswitch-sounds-music-8000-1.0.52.tar.gz
    rm freeswitch-sounds-music-8000-1.0.52.tar.gz
'

# Restart FreeSWITCH
docker-compose restart freeswitch-1
```

### Fix 2: Install mod_lua (Not Needed)

Update FreeSWITCH Dockerfile:

```dockerfile
# Install FreeSWITCH with Lua
RUN apt-get update && apt-get install -y \
    freeswitch-meta-all \
    freeswitch-mod-lua \
    && rm -rf /var/lib/apt/lists/*
```

Then rebuild:
```bash
docker-compose build freeswitch-1 freeswitch-2
docker-compose up -d freeswitch-1 freeswitch-2
```

**But you don't need this** - your call logic is in Node.js!

---

## Recommended Action

### ✅ Do Nothing

These errors are cosmetic and don't affect functionality:
- Calls work ✅
- Media flows ✅
- TTS works ✅
- FreeSWITCH does its job (RTP) ✅

### ✅ Or Disable the Modules

If the warnings bother you, disable unused modules:

**Create** `/freeswitch/conf/modules.conf.xml`:
```xml
<?xml version="1.0"?>
<configuration name="modules.conf" description="Modules">
  <modules>
    <!-- Only load what we need -->
    <load module="mod_sofia"/>
    <load module="mod_dptools"/>
    <load module="mod_dialplan_xml"/>
    <load module="mod_sndfile"/>
    <load module="mod_tone_stream"/>
    <load module="mod_event_socket"/>
    
    <!-- Don't load these -->
    <!-- <load module="mod_local_stream"/> -->
    <!-- <load module="mod_lua"/> -->
  </modules>
</configuration>
```

Then mount it:
```yaml
# docker-compose.yaml
freeswitch-1:
  volumes:
    - ./freeswitch/conf/modules.conf.xml:/etc/freeswitch/autoload_configs/modules.conf.xml:ro
```

---

## Summary

| Error | Impact | Fix Needed? |
|-------|--------|-------------|
| Missing music dirs | None | No |
| Missing mod_lua.so | None | No |
| Your calls working? | ✅ Yes | No action needed |

**Recommendation**: **Ignore these errors** - they're harmless warnings for features you don't use.

---

## When You WOULD Need These

### mod_local_stream (Hold Music)

If you wanted FreeSWITCH to play hold music natively:

1. Create music directories
2. Download hold music files
3. Configure in FreeSWITCH dialplan
4. Play via `local_stream://moh`

**But you have**: Drachtio can play audio via TTS or FreeSWITCH tone_stream

### mod_lua (Scripting)

If you wanted to write FreeSWITCH logic in Lua:

1. Install `freeswitch-mod-lua`
2. Write Lua scripts
3. Call from dialplan: `<action application="lua" data="myscript.lua"/>`

**But you have**: Node.js apps for all call logic

---

## Your Current Setup is Correct

```javascript
// In Drachtio app - you have full control
const audioHelper = require('./audioHelper');

// Play prompts
await audioHelper.speak(endpoint, "Welcome!");

// Play tones
await audioHelper.playRingingTone(endpoint);

// Collect DTMF
const digit = await audioHelper.collectDigits(endpoint);
```

**No FreeSWITCH dialplan needed!** ✅  
**No Lua scripts needed!** ✅  
**Everything controlled from Node.js!** ✅

---

## Final Verdict

✅ **Safe to ignore** - these errors don't affect your system  
✅ **Calls work fine** - FreeSWITCH just needs to handle RTP  
✅ **No fix needed** - you're using Drachtio for call control  
✅ **Optional fix** - only if the warnings bother you  

**Your VoIP system is working correctly!** 🎉
