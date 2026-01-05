# VoIP Call Flow Diagrams

## Scenario 1: Call to Extension 6002 (Bridges to same extension)

```
┌─────────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐    ┌─────────────┐
│  SIP Phone  │    │   Kamailio   │    │ Drachtio │    │  Node.js │    │ Extension   │
│   (6001)    │    │              │    │          │    │   App    │    │   (6002)    │
└──────┬──────┘    └──────┬───────┘    └────┬─────┘    └────┬─────┘    └──────┬──────┘
       │                  │                  │               │                 │
       │ INVITE sip:6002  │                  │               │                 │
       ├─────────────────>│                  │               │                 │
       │                  │                  │               │                 │
       │                  │ INVITE sip:6002  │               │                 │
       │                  │ (ALL calls go    │               │                 │
       │                  │  to Drachtio)    │               │                 │
       │                  ├─────────────────>│               │                 │
       │                  │                  │               │                 │
       │                  │                  │ INVITE 6002   │                 │
       │                  │                  ├──────────────>│                 │
       │                  │                  │               │                 │
       │                  │                  │               │ ┌─────────────────────┐
       │                  │                  │               │ │ Extract target: 6002│
       │                  │                  │               │ │ Bridge to SAME ext  │
       │                  │                  │               │ │ Target = 6002       │
       │                  │                  │               │ └─────────────────────┘
       │                  │                  │               │                 │
       │                  │                  │               │ INVITE 6002     │
       │                  │                  │               │ [X-Call-ID: abc]│
       │                  │                  │               │ [X-From-App]    │
       │                  │<─────────────────────────────────┤                 │
       │                  │                  │               │                 │
       │                  │ ┌──────────────────────┐         │                 │
       │                  │ │ Loop Prevention:     │         │                 │
       │                  │ │ Headers detected!    │         │                 │
       │                  │ │ Route directly       │         │                 │
       │                  │ └──────────────────────┘         │                 │
       │                  │                  │               │                 │
       │                  │ INVITE sip:6002  │               │                 │
       │                  ├────────────────────────────────────────────────────>│
       │                  │                  │               │                 │
       │                  │                  │               │      200 OK     │
       │                  │<────────────────────────────────────────────────────┤
       │     200 OK       │                  │               │                 │
       │<─────────────────┤                  │               │                 │
       │                  │                  │               │                 │
       │                       Media (RTP via RTPEngine)                       │
       │<═══════════════════════════════════════════════════════════════════════>│
       │                  │                  │               │                 │
```

**Key Points:**
- User calls extension 6002
- **Call goes through Drachtio first** (all calls must)
- App extracts target: `6002` (same as called number)
- App bridges to extension 6002
- App adds loop prevention headers
- Kamailio detects headers and routes directly to 6002
- **NO second trip to Drachtio** (loop prevented)
- **Result: 6002 → App → 6002** (bridged through app)


## Scenario 2: Call to Extension 6000 (Bridges to same extension)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│SIP Phone │    │ Kamailio │    │ Drachtio │    │  Node.js │    │Extension │
│  (6001)  │    │          │    │          │    │   App    │    │  (6000)  │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │ INVITE 6000   │               │               │               │
     ├──────────────>│               │               │               │
     │               │               │               │               │
     │               │ ┌─────────────────────────┐   │               │
     │               │ │ ALL calls route to      │   │               │
     │               │ │ Drachtio first          │   │               │
     │               │ └─────────────────────────┘   │               │
     │               │               │               │               │
     │               │ INVITE 6000   │               │               │
     │               │ [X-Kamailio-Route: initial]   │               │
     │               ├──────────────>│               │               │
     │               │               │               │               │
     │               │               │ INVITE 6000   │               │
     │               │               ├──────────────>│               │
     │               │               │               │               │
     │               │               │               │ ┌───────────────────┐
     │               │               │               │ │ Extract: 6000     │
     │               │               │               │ │ Bridge to SAME    │
     │               │               │               │ │ Target = 6000     │
     │               │               │               │ └───────────────────┘
     │               │               │               │               │
     │               │               │               │ INVITE 6000   │
     │               │               │               │ [X-Call-ID: abc123]
     │               │               │               │ [X-From-App: true]
     │               │<──────────────────────────────┤               │
     │               │               │               │               │
     │               │ ┌─────────────────────────────────────┐       │
     │               │ │ *** LOOP PREVENTION CHECK ***       │       │
     │               │ │                                     │       │
     │               │ │ is_present_hf("X-Call-ID")?        │       │
     │               │ │ Result: TRUE                        │       │
     │               │ │                                     │       │
     │               │ │ is_present_hf("X-From-App")?       │       │
     │               │ │ Result: TRUE                        │       │
     │               │ │                                     │       │
     │               │ │ ✓ Call is FROM APP                 │       │
     │               │ │ ✓ Skip Drachtio routing            │       │
     │               │ │ ✓ Route directly to extension      │       │
     │               │ └─────────────────────────────────────┘       │
     │               │               │               │               │
     │               │ lookup("location")            │               │
     │               │               │               │               │
     │               │ INVITE 6000   │               │               │
     │               ├──────────────────────────────────────────────>│
     │               │               │               │               │
     │               │               │               │     200 OK    │
     │               │<──────────────────────────────────────────────┤
     │               │               │               │               │
     │               │               │               │  200 OK       │
     │               │               │               ├<──────────────┤
     │               │               │     200 OK    │               │
     │               │               │<──────────────┤               │
     │               │     200 OK    │               │               │
     │               │<──────────────┤               │               │
     │    200 OK     │               │               │               │
     │<──────────────┤               │               │               │
     │               │               │               │               │
     │               │          Media (RTP via RTPEngine)            │
     │<═══════════════════════════════════════════════════════════════>│
     │               │               │               │               │
```

**Key Points:**
1. User calls extension 6000
2. Kamailio routes to Drachtio (first hop - all calls go here)
3. App extracts target: `6000` (same as called number)
4. App creates B2BUA to bridge to extension 6000
5. App adds loop prevention headers
6. **Kamailio detects headers and routes directly to 6000**
7. **NO second hop to Drachtio** (loop prevented)
8. **Result: 6000 → App → 6000** (call completes successfully)


## What Prevents the Loop

### Without Loop Prevention (BAD - Creates Loop):
```
Phone → Kamailio → Drachtio → App → Kamailio → Drachtio → App → Kamailio ...
  (calls 6002)                  (bridges to 6002)  ↑          ↓
                                                     └──────────┘
                                        (Routes to Drachtio again - LOOP!)
```

### With Loop Prevention (GOOD):
```
Phone → Kamailio → Drachtio → App → Kamailio → Extension 6002
  (calls 6002)                  (bridges to 6002)  ↓
                                            [Detects headers]
                                            [Routes directly]
                                            [NO loop]
```

**Important:** The app bridges to the SAME extension that was called:
- Call 6002 → App bridges to 6002
- Call 6000 → App bridges to 6000
- Call 9999 → App bridges to 9999

## Header Detection Logic in Kamailio

```
┌─────────────────────────────────────────────────────────────┐
│  INVITE arrives at Kamailio                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ Has X-Call-ID header?         │
        │ OR X-From-App header?         │
        └───────┬───────────────┬───────┘
                │               │
           YES  │               │  NO
                │               │
                ▼               ▼
    ┌─────────────────┐   ┌──────────────────┐
    │ Call FROM App   │   │ New incoming     │
    │ Route directly  │   │ call - check     │
    │ to extension    │   │ if registered    │
    │ (NO LOOP)       │   │                  │
    └─────────────────┘   └────────┬─────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │ If not registered   │
                         │ AND special ext     │
                         │ → Route to Drachtio │
                         └─────────────────────┘
```

## Summary

| Scenario | First Hop | Headers Present? | Action | Loop Risk? |
|----------|-----------|------------------|--------|-----------|
| Any incoming call | ❌ No | ❌ No | Route to Drachtio | ❌ No |
| App bridges back | ✅ Yes | ✅ Yes | Route directly to extension | ❌ No (Prevented!) |
| App bridges back (old code) | ✅ Yes | ❌ No | Route to Drachtio again | ✅ YES (Loop!) |

**Critical Rule:** ALL incoming calls go to Drachtio first. Only calls with `X-Call-ID` or `X-From-App` headers (from the app) skip Drachtio and go directly to the extension.