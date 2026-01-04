# WebRTC Media Flow Architecture - Detailed Explanation

## The Problem You Identified

**Great question!** You correctly identified that browsers cannot directly connect to FreeSWITCH because:

1. **Browsers use WebRTC**: SRTP (encrypted RTP), ICE, DTLS, STUN/TURN
2. **FreeSWITCH uses traditional RTP**: Unencrypted RTP, no ICE negotiation
3. **No direct compatibility**: They speak different "dialects" of media protocols

## The Solution: RTPEngine

**RTPEngine** acts as a media proxy and protocol translator between WebRTC and traditional RTP.

## Complete Media Flow Diagrams

### 1. Browser to Browser Call (WebRTC ↔ WebRTC)

```
┌─────────────┐                                           ┌─────────────┐
│  Browser A  │                                           │  Browser B  │
│  (WebRTC)   │                                           │  (WebRTC)   │
└──────┬──────┘                                           └──────┬──────┘
       │                                                         │
       │ SIP INVITE (SDP with WebRTC)                           │
       │ ws://kamailio:8080                                     │
       ├────────────────────────────────►┌──────────────┐       │
       │                                  │   Kamailio   │       │
       │                                  │ (SIP Proxy)  │       │
       │                                  └──────┬───────┘       │
       │                                         │               │
       │                                         │ Forward INVITE│
       │                                         └───────────────►
       │                                                         │
       │◄────────────────────────────────────────────────────────┤
       │                    200 OK (SDP with WebRTC)             │
       │                                                         │
       │                                                         │
       │ MEDIA PATH (established via RTPEngine)                  │
       │                                                         │
       │ SRTP packets                                            │
       ├────────────────────►┌──────────────┐◄───────────────────┤
       │                     │   RTPEngine  │                    │
       │                     │              │                    │
       │                     │ WebRTC ↔ WebRTC                   │
       │                     │ (ICE relay)  │                    │
       │◄────────────────────┤              ├───────────────────►│
       │                     └──────────────┘                    │
       │                                                         │
```

**Flow**:
1. Browser A sends INVITE via WebSocket to Kamailio
2. Kamailio forwards to Browser B
3. Kamailio instructs RTPEngine to handle media
4. RTPEngine relays SRTP between browsers
5. Audio flows: Browser A → RTPEngine → Browser B

### 2. Browser to FreeSWITCH Call (WebRTC ↔ RTP)

```
┌─────────────┐                                           ┌─────────────┐
│   Browser   │                                           │ FreeSWITCH  │
│  (WebRTC)   │                                           │    (RTP)    │
└──────┬──────┘                                           └──────┬──────┘
       │                                                         │
       │ 1. SIP INVITE (SDP: WebRTC offer)                      │
       │    - SRTP                                               │
       │    - ICE candidates                                     │
       │    - DTLS fingerprint                                   │
       ├────────────►┌──────────────┐                           │
       │              │   Kamailio   │                           │
       │              │              │                           │
       │              │ 2. Calls     │                           │
       │              │ rtpengine_offer()                        │
       │              │              │                           │
       │              └──────┬───────┘                           │
       │                     │                                   │
       │                     │ 3. RTPEngine processes SDP:       │
       │                     ├──────────►┌──────────────┐        │
       │                     │           │  RTPEngine   │        │
       │                     │           │              │        │
       │                     │           │ - Removes ICE│        │
       │                     │           │ - Changes    │        │
       │                     │           │   SRTP → RTP │        │
       │                     │           │ - Adds own IP│        │
       │                     │           └──────────────┘        │
       │                     │                                   │
       │                     │ 4. Modified SDP                   │
       │                     │    (Plain RTP)                    │
       │                     └───────────────────────────────────►
       │                                                         │
       │                                           5. 200 OK     │
       │                                              (RTP SDP)  │
       │◄────────────────────────────────────────────────────────┤
       │                                                         │
       │ 6. Kamailio calls rtpengine_answer()                   │
       │    RTPEngine converts RTP SDP → WebRTC SDP              │
       │                                                         │
       │◄────────────────────────────────────────────────────────┤
       │              200 OK (WebRTC SDP)                        │
       │                                                         │
       │                                                         │
       │ MEDIA PATH (Different protocols!)                       │
       │                                                         │
       │ SRTP (encrypted)                  RTP (unencrypted)     │
       ├─────────────►┌──────────────┐◄────────────────────────►│
       │              │  RTPEngine   │                          │
       │              │              │                          │
       │              │ CONVERSION:  │                          │
       │              │ SRTP → RTP   │                          │
       │              │ RTP → SRTP   │                          │
       │◄─────────────┤              ├─────────────────────────►│
       │              └──────────────┘                          │
       │                                                         │
```

**Detailed Flow**:

**SIP Signaling**:
1. Browser sends INVITE with WebRTC SDP (SRTP, ICE, DTLS)
2. Kamailio intercepts, calls `rtpengine_offer()`
3. RTPEngine modifies SDP:
   - Removes ICE candidates
   - Changes SRTP → RTP
   - Replaces IP with RTPEngine's IP
4. Modified SDP sent to FreeSWITCH (now plain RTP)
5. FreeSWITCH responds with RTP SDP
6. Kamailio calls `rtpengine_answer()`
7. RTPEngine converts RTP SDP → WebRTC SDP
8. Browser receives WebRTC-compatible SDP

**Media Path**:
1. Browser sends SRTP packets to RTPEngine
2. RTPEngine decrypts SRTP → RTP
3. RTPEngine forwards RTP to FreeSWITCH
4. FreeSWITCH processes audio, sends RTP back
5. RTPEngine encrypts RTP → SRTP
6. RTPEngine sends SRTP to Browser

### 3. Complete Call Flow with All Components

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Browser  │────►│  Nginx   │────►│ Kamailio │────►│ Drachtio │────►│Drachtio  │
│          │     │(WebSocket│     │  (SIP    │     │  Server  │     │   App    │
│          │     │  Proxy)  │     │  Proxy)  │     │          │     │          │
└────┬─────┘     └──────────┘     └────┬─────┘     └──────────┘     └────┬─────┘
     │                                  │                                  │
     │                                  │                                  │
     │  SIP Signaling Path              │ Controls RTPEngine               │
     │  (WebSocket → TCP/UDP)           │                                  │
     │                                  ▼                                  ▼
     │                          ┌──────────────┐                  ┌──────────────┐
     │    Media Path            │  RTPEngine   │                  │ FreeSWITCH   │
     │    (SRTP ↔ RTP)          │              │◄─────RTP────────►│              │
     └──────SRTP───────────────►│  WebRTC ↔ RTP│                  │ Media Server │
                                │  Conversion  │                  │              │
                                └──────────────┘                  └──────────────┘
```

## Why Each Component is Needed

### 1. **Nginx** (WebSocket Proxy)
- **Purpose**: Terminates browser WebSocket connections
- **Why**: Provides clean HTTP/WebSocket → TCP upgrade
- **Converts**: WS/WSS → TCP for Kamailio

### 2. **Kamailio** (SIP Proxy)
- **Purpose**: SIP routing and load balancing
- **Why**: Handles SIP signaling, not media
- **Controls**: RTPEngine for media proxy decisions
- **Does NOT**: Touch media packets directly

### 3. **RTPEngine** (Media Proxy)
- **Purpose**: Media protocol conversion and relay
- **Why**: Bridge between WebRTC and traditional RTP
- **Converts**: 
  - SRTP ↔ RTP
  - ICE candidates handling
  - DTLS key exchange
  - Codec transcoding (optional)
- **Critical**: Without this, browser ↔ FreeSWITCH won't work!

### 4. **Drachtio** (SIP Application Server)
- **Purpose**: Custom call logic
- **Why**: Handles routing decisions (extension 6000, 9999, etc.)
- **Does NOT**: Touch media

### 5. **FreeSWITCH** (Media Server)
- **Purpose**: Advanced media processing
- **Why**: IVR, recording, conferencing, transcoding
- **Speaks**: Traditional RTP (NOT WebRTC)

## RTPEngine Configuration in Kamailio

### Key Functions Called

```c
# On initial INVITE from browser
rtpengine_manage("trust-address replace-origin replace-session-connection ICE=remove RTP/AVP");

# What this does:
# - trust-address: Trust the source IP
# - replace-origin: Replace o= line in SDP
# - replace-session-connection: Replace c= line in SDP
# - ICE=remove: Remove ICE candidates (FreeSWITCH doesn't need them)
# - RTP/AVP: Convert to plain RTP profile
```

### Direction Detection

```c
if ($proto == "ws" || $proto == "wss") {
    # Browser → FreeSWITCH: WebRTC → RTP
    rtpengine_manage("ICE=remove RTP/AVP");
} else {
    # FreeSWITCH → Browser: RTP → WebRTC  
    rtpengine_manage("ICE=force RTP/SAVPF");
}
```

## Alternative Architectures

### Option 1: FreeSWITCH with mod_verto (Our current setup - WRONG!)
```
Browser → FreeSWITCH (mod_verto)
```
**Problem**: Tight coupling, no load balancing, complex

### Option 2: Kamailio + RTPEngine + FreeSWITCH (CORRECT - Now implemented!)
```
Browser → Kamailio → RTPEngine → FreeSWITCH
```
**Benefits**: 
- Separation of concerns
- Load balancing
- Protocol conversion
- Scalability

### Option 3: Janus Gateway (Alternative)
```
Browser → Janus → FreeSWITCH
```
**Trade-off**: Janus is WebRTC-specific, less SIP-native

### Option 4: Asterisk with chan_pjsip (Alternative)
```
Browser → Asterisk (WebRTC support)
```
**Trade-off**: Single point of failure, less scalable

## Performance Considerations

### RTPEngine vs Direct Connection

**With RTPEngine** (Correct):
```
Browser → RTPEngine (30ms) → FreeSWITCH
Total latency: ~30ms added for conversion
Benefits: Works correctly, scalable
```

**Direct to FreeSWITCH** (Impossible):
```
Browser --X--> FreeSWITCH
Result: Connection fails, no media
```

### RTPEngine Optimization

1. **Kernel Module**: Use kernel-space forwarding for lower latency
2. **Hardware Offload**: Can use DPDK for high-throughput scenarios
3. **Multiple Instances**: Run multiple RTPEngine instances for load balancing
4. **Port Range**: Allocate 30000-40000 (10,000 ports = 5,000 concurrent calls)

## Common Misconceptions

### ❌ WRONG: "Browser can send RTP to FreeSWITCH"
- Browsers ONLY speak WebRTC (SRTP + ICE + DTLS)
- FreeSWITCH expects plain RTP
- **Result**: Packets dropped, no audio

### ❌ WRONG: "Kamailio forwards media"
- Kamailio is SIP-only
- It controls RTPEngine via NG protocol
- Media flows: Browser ↔ RTPEngine ↔ FreeSWITCH

### ✅ CORRECT: "RTPEngine bridges WebRTC and RTP"
- Acts as media proxy
- Converts protocols
- Handles encryption/decryption

## Testing the Media Path

### 1. Verify RTPEngine is Working

```bash
# Check RTPEngine status
docker-compose exec kamailio kamctl fifo rtpengine.show all

# Should show active sessions when call is in progress
```

### 2. Monitor RTP Packets

```bash
# On Browser side (SRTP)
tcpdump -i any -n port 30000-40000

# On FreeSWITCH side (RTP)
tcpdump -i any -n port 16384-16394
```

### 3. Check SDP Transformation

**Browser SDP (Offer)**:
```
v=0
o=- 123456 123456 IN IP4 192.168.1.100
c=IN IP4 192.168.1.100
m=audio 50000 RTP/SAVPF 111
a=rtpmap:111 opus/48000/2
a=ice-ufrag:abc123
a=ice-pwd:xyz789
a=fingerprint:sha-256 AB:CD:EF...
```

**Modified SDP to FreeSWITCH**:
```
v=0
o=- 123456 123456 IN IP4 172.20.0.100
c=IN IP4 172.20.0.100
m=audio 30050 RTP/AVP 0 8 111
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:111 opus/48000/2
# No ICE, no DTLS, plain RTP
```

## Summary: Why RTPEngine is Essential

1. **Protocol Conversion**: SRTP ↔ RTP
2. **NAT Traversal**: Handles ICE, relays media
3. **Security**: Manages DTLS handshakes
4. **Scalability**: Offloads media from SIP proxy
5. **Compatibility**: Bridges modern browsers with legacy systems

**Without RTPEngine**: Browser → FreeSWITCH calls will fail with "no audio" or connection timeout.

**With RTPEngine**: Full WebRTC support, production-ready VoIP system!

The architecture is now complete and correct. 🎉
