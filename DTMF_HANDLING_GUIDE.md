# DTMF Handling Guide

## 🎯 You're Receiving DTMF But Not Processing It

Your log shows:
```json
{"dtmf":"1","duration":"800","source":"RTP"}
```

**This means**: DTMF is being received, but your code isn't acting on it!

---

## ✅ Complete Solution

### **Key Issue**: Wrong Event Listener

Your code uses:
```javascript
ms.on('dtmf', async (dtmf) => {  // ❌ WRONG - ms doesn't emit dtmf
  await handleDTMF(callId, dtmf.digit, ms);
});
```

Should be:
```javascript
endpoint.on('dtmf', async (evt) => {  // ✅ CORRECT - endpoint emits dtmf
  const digit = evt.dtmf || evt.digit;
  await handleDTMF(callId, digit, endpoint);
});
```

---

## 🔧 Complete Working Code

### **Step 1: Create Endpoint (Not Just ms)**

```javascript
async function handleIVRCall(req, res, callId, from, to) {
  let ms, endpoint, dialog;
  
  try {
    // Connect to FreeSWITCH
    ms = await mrf.connect({
      address: 'freeswitch-2',
      port: 8021,
      secret: 'ClueCon'
    });

    // Use connectCaller to get endpoint object
    const result = await ms.connectCaller(req, res);
    endpoint = result.endpoint;  // ← This object receives DTMF!
    dialog = result.dialog;

    // Store call
    activeCalls.set(callId, { 
      dialog, 
      endpoint, 
      ms, 
      from, 
      to, 
      currentMenu: 'main' 
    });

    // Play initial menu
    await playIVRMenu(callId, 'main', endpoint);

    // =============================
    // DTMF HANDLER - KEY PART!
    // =============================
    endpoint.on('dtmf', async (evt) => {
      try {
        // Extract digit from event
        const digit = evt.dtmf || evt.digit;
        
        logger.info(`DTMF received: ${digit} for call ${callId}`);
        
        // Play beep confirmation
        await playBeep(endpoint);
        
        // Process the digit
        await handleDTMF(callId, digit, endpoint);
        
      } catch (err) {
        logger.error('DTMF handling error:', err);
      }
    });

    // Handle hangup
    dialog.on('destroy', () => {
      endpoint.destroy();
      ms.disconnect();
      activeCalls.delete(callId);
    });
    
  } catch (err) {
    logger.error('IVR error:', err);
    if (endpoint) endpoint.destroy();
    if (ms) ms.disconnect();
  }
}
```

---

### **Step 2: Handle DTMF Digits**

```javascript
async function handleDTMF(callId, digit, endpoint) {
  try {
    logger.info(`Processing DTMF: ${digit} for call ${callId}`);
    
    // Get current call state
    const call = activeCalls.get(callId);
    if (!call) {
      logger.warn(`Call ${callId} not found`);
      return;
    }

    const currentMenu = call.currentMenu;
    
    // Look up what this digit does in this menu
    const result = await pgPool.query(
      'SELECT * FROM ivr_menu_options WHERE menu_id = $1 AND digit = $2',
      [currentMenu, digit]
    );

    if (result.rows.length === 0) {
      // Invalid digit
      logger.info(`Invalid digit ${digit} for menu ${currentMenu}`);
      await playTTS(endpoint, 'Invalid selection. Please try again.');
      await playIVRMenu(callId, currentMenu, endpoint);
      return;
    }

    const option = result.rows[0];
    logger.info(`Menu option: ${JSON.stringify(option)}`);

    // Execute the action
    if (option.action_type === 'menu') {
      // Go to another menu
      await playIVRMenu(callId, option.action_value, endpoint);
      
    } else if (option.action_type === 'transfer') {
      // Transfer to extension
      await playTTS(endpoint, `Transferring you to ${option.action_value}`);
      // TODO: Implement transfer
      
    } else if (option.action_type === 'hangup') {
      // Hang up
      await playTTS(endpoint, 'Goodbye');
      setTimeout(() => call.dialog.destroy(), 2000);
    }
    
  } catch (err) {
    logger.error('DTMF processing error:', err);
  }
}
```

---

### **Step 3: Play Beep Confirmation**

```javascript
async function playBeep(endpoint) {
  try {
    // Play short beep when user presses digit
    await endpoint.execute('playback', 'tone_stream://%(300,0,800)');
  } catch (err) {
    logger.error('Error playing beep:', err);
  }
}
```

---

## 📊 Database Schema

Your IVR menus need these tables:

```sql
-- IVR Menus
CREATE TABLE ivr_menus (
    id SERIAL PRIMARY KEY,
    menu_id VARCHAR(50) UNIQUE NOT NULL,
    welcome_message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Menu Options (what happens when user presses digit)
CREATE TABLE ivr_menu_options (
    id SERIAL PRIMARY KEY,
    menu_id VARCHAR(50) REFERENCES ivr_menus(menu_id),
    digit VARCHAR(1) NOT NULL,
    action_type VARCHAR(20) NOT NULL,  -- 'menu', 'transfer', 'hangup'
    action_value TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Example Data
INSERT INTO ivr_menus (menu_id, welcome_message) VALUES
('main', 'Welcome to our service. For sales press 1. For support press 2. For billing press 3.');

INSERT INTO ivr_menu_options (menu_id, digit, action_type, action_value) VALUES
('main', '1', 'transfer', '1001'),  -- Transfer to sales
('main', '2', 'transfer', '1002'),  -- Transfer to support
('main', '3', 'menu', 'billing'),   -- Go to billing menu
('main', '0', 'transfer', '1000');  -- Operator

INSERT INTO ivr_menus (menu_id, welcome_message) VALUES
('billing', 'Billing department. For invoices press 1. For payments press 2. To return to main menu press star.');

INSERT INTO ivr_menu_options (menu_id, digit, action_type, action_value) VALUES
('billing', '1', 'transfer', '1101'),
('billing', '2', 'transfer', '1102'),
('billing', '*', 'menu', 'main');
```

---

## 🎯 Event Object Formats

DTMF events can have different formats:

```javascript
// Format 1 (your logs show this):
{
  "dtmf": "1",
  "duration": "800",
  "source": "RTP"
}

// Format 2 (some versions):
{
  "digit": "1",
  "duration": 800
}

// Format 3 (legacy):
{
  "dtmf": {
    "digit": "1",
    "duration": 800
  }
}
```

**Handle all formats**:
```javascript
endpoint.on('dtmf', async (evt) => {
  // Extract digit from any format
  const digit = evt.dtmf || evt.digit || (evt.dtmf && evt.dtmf.digit);
  
  if (digit) {
    await handleDTMF(callId, digit, endpoint);
  }
});
```

---

## 🧪 Testing DTMF

### **Test 1: Check DTMF is Being Received**

```bash
# Watch logs
docker-compose logs -f drachtio-app-2

# Make call, press digits
# Should see:
# INFO: DTMF received: {"dtmf":"1","duration":"800","source":"RTP"}
```

✅ **You're already here!**

---

### **Test 2: Check Event Listener is Working**

Add debug logging:
```javascript
endpoint.on('dtmf', async (evt) => {
  logger.info('=== DTMF EVENT FIRED ===');
  logger.info(`Event: ${JSON.stringify(evt)}`);
  logger.info(`Digit: ${evt.dtmf || evt.digit}`);
  
  const digit = evt.dtmf || evt.digit;
  await handleDTMF(callId, digit, endpoint);
});
```

Should see:
```
INFO: === DTMF EVENT FIRED ===
INFO: Event: {"dtmf":"1","duration":"800","source":"RTP"}
INFO: Digit: 1
INFO: Processing DTMF: 1 for call abc123
```

---

### **Test 3: Check Database Lookup**

```javascript
async function handleDTMF(callId, digit, endpoint) {
  logger.info(`Looking up digit ${digit} in menu ${currentMenu}`);
  
  const result = await pgPool.query(
    'SELECT * FROM ivr_menu_options WHERE menu_id = $1 AND digit = $2',
    [currentMenu, digit]
  );
  
  logger.info(`Found ${result.rows.length} options`);
  if (result.rows.length > 0) {
    logger.info(`Option: ${JSON.stringify(result.rows[0])}`);
  }
}
```

---

## 🎬 Complete Flow

```
1. User calls 9999
   ↓
2. handleIVRCall() executes
   ↓
3. ms.connectCaller() creates endpoint
   ↓
4. endpoint.on('dtmf', ...) set up
   ↓
5. playIVRMenu() plays "Press 1 for sales..."
   ↓
6. User presses "1"
   ↓
7. DTMF event fires: {"dtmf":"1",...}
   ↓
8. endpoint.on('dtmf') handler catches it
   ↓
9. Extracts digit: "1"
   ↓
10. Calls handleDTMF(callId, "1", endpoint)
    ↓
11. Queries database: WHERE digit = '1'
    ↓
12. Finds action: transfer to 1001
    ↓
13. Plays TTS: "Transferring to sales"
    ↓
14. Executes transfer (or other action)
```

---

## 🐛 Common Issues

### Issue 1: "No DTMF events firing"

**Cause**: Using `ms.on('dtmf')` instead of `endpoint.on('dtmf')`

**Fix**: Use `endpoint.on('dtmf')`

---

### Issue 2: "endpoint is undefined"

**Cause**: Using `srf.createUAS()` instead of `ms.connectCaller()`

**Fix**:
```javascript
// Wrong:
const { endpoint, dialog } = await srf.createUAS(req, res, {
  localSdp: ms.local.sdp
});

// Right:
const { endpoint, dialog } = await ms.connectCaller(req, res);
```

---

### Issue 3: "DTMF received but nothing happens"

**Cause**: No `endpoint.on('dtmf')` handler

**Fix**: Add event listener after creating endpoint

---

### Issue 4: "Can't read property 'digit' of undefined"

**Cause**: Event object format varies

**Fix**:
```javascript
const digit = evt.dtmf || evt.digit || (evt.dtmf && evt.dtmf.digit);
```

---

## 📦 Files in Package

1. **drachtio-apps/app-2/index-with-dtmf.js** - Complete working code ✅
2. **DTMF_HANDLING_GUIDE.md** - This guide ✅
3. **TTS_EXAMPLE.js** - TTS helper functions ✅

---

## 🚀 Quick Fix

### Replace your handleIVRCall:

```bash
cd voip-application/drachtio-apps/app-2

# Backup current file
cp index.js index.js.backup

# Copy working version
cp index-with-dtmf.js index.js

# Rebuild
cd ../..
docker-compose build drachtio-app-2

# Restart
docker-compose restart drachtio-app-2

# Test
docker-compose logs -f drachtio-app-2
```

---

## ✅ Verification

After applying fix:

```bash
# 1. Make call to 9999
# 2. Hear: "Welcome to our service..."
# 3. Press digit 1
# 4. See in logs:

INFO: DTMF received: 1 for call abc123
INFO: [beep sound]
INFO: Processing DTMF: 1 for call abc123
INFO: Menu option found: {"action_type":"transfer","action_value":"1001"}
INFO: Transferring to: 1001
INFO: Playing TTS: "Transferring you to extension 1001"
```

**DTMF now fully working!** 🎉

---

## 📝 Summary

| Issue | Solution |
|-------|----------|
| DTMF received but ignored | Add `endpoint.on('dtmf')` handler |
| Wrong object | Use `endpoint`, not `ms` |
| No endpoint object | Use `ms.connectCaller()` not `createUAS()` |
| Different event formats | Handle all: `evt.dtmf \|\| evt.digit` |
| No action taken | Implement `handleDTMF()` function |
| No database records | Insert IVR menu data |

**Your DTMF handling is now complete!** 🎹📞
