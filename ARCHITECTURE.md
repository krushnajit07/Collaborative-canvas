##  Architecture – Real‑Time Collaborative Drawing Canvas

This document explains the internal architecture, data flow, and design decisions behind the **Real‑Time Collaborative Drawing Canvas**.

---

### High‑Level Architecture Overview

The system follows a **server‑authoritative model**:

- **Server** maintains the *single source of truth* for all drawing data.
- **Clients** are *stateless renderers* that only:
  - Stream user input
  - Render strokes received from the server

This approach guarantees consistency across all connected users.

```
+-----------+        WebSocket        +-----------+        WebSocket        +-----------+
|  Client A |  <------------------>  |   Server  |  <------------------>  |  Client B |
+-----------+                         +-----------+                         +-----------+
```

---

### Data Flow Diagram

### Drawing Data Flow 

```
User draws on canvas
        ↓
Mouse events captured (mousedown → mousemove → mouseup)
        ↓
Client emits stroke events (WebSocket)
        ↓
Server updates global stroke history
        ↓
Server broadcasts updates to all clients
        ↓
All clients render the stroke in real time
```

###  Event‑Level Flow

```
Client A                Server                 Client B
   |   stroke-start  →    |                      |
   |   stroke-progress →  |  broadcast events →  |
   |   stroke-end    →    |                      |
```

This ensures **other users see the drawing while it is happening**, not after completion.

---

### WebSocket Protocol

The application uses **native WebSockets** with a lightweight JSON‑based protocol.

###  Message Envelope

```json
{
  "type": "event-name",
  "payload": { }
}
```

---

###  Events Sent From Client → Server

#### `stroke-start`
Sent when user starts drawing.
```json
{
  "type": "stroke-start",
  "payload": {
    "id": "uuid",
    "userId": "uuid",
    "color": "#000000",
    "width": 4,
    "tool": "brush",
    "points": [{"x":100,"y":200}],
    "isNew": true
  }
}
```

#### `stroke-progress`
Sent continuously while drawing.
```json
{
  "type": "stroke-progress",
  "payload": {
    "id": "uuid",
    "point": {"x":105,"y":205}
  }
}
```

#### `stroke-end`
Marks end of a stroke.

#### `undo`
Requests global undo.

#### `redo`
Requests global redo.

#### `clear`
Clears canvas for all users.

---

###  Events Sent From Server → Clients

#### `init`
Initial sync when a client connects.
```json
{
  "type": "init",
  "payload": {
    "user": {"id":"uuid","color":"#e6194b"},
    "strokes": []
  }
}
```

#### `stroke-start`, `stroke-progress`, `stroke-end`
Broadcast to all clients for live rendering.

#### `redraw`
Sent after undo/redo/clear to force full canvas replay.

----

### Undo / Redo Strategy (Global & Deterministic)

Undo and redo are implemented **globally**, meaning:
- Any user can undo or redo any other user’s drawing.

### Server‑Side Data Structures

```js
strokes   // Active global stroke history
redoStack // Temporarily removed strokes
```

### Undo Logic
1. Pop last stroke from `strokes`
2. Push it to `redoStack`
3. Broadcast `redraw` with updated `strokes`

###  Redo Logic
1. Pop last stroke from `redoStack`
2. Push it back to `strokes`
3. Broadcast `redraw`

###  Critical Rule

> **Redo stack is cleared ONLY when a new user‑intentional stroke starts** (`isNew === true`).

This prevents race conditions caused by delayed WebSocket events.

---

## Performance Decisions

### Stroke Streaming 
- Only **path segments** are transmitted, not raw pixels
- Reduces network load drastically

### Local Immediate Rendering
- Client renders strokes *locally* during mouse movement
- Server messages are used for synchronization, not blocking UI

###  Full Redraw Only When Needed
- Canvas is **not cleared** during normal drawing
- Full redraw happens only on:
  - Undo
  - Redo
  - Clear

###  Minimal State on Client
- Client never computes history
- Avoids divergence and flickering

---

### Conflict Handling (Simultaneous Drawing)

The system **does not lock canvas regions**.

###  Strategy Used: Ordered Stroke Replay

- Every stroke is independent
- Server maintains a strict **stroke order**
- Conflicts resolve naturally based on order

```
User A draws here  ─┐
                    ├─ both stored & replayed
User B draws here  ─┘
```

### Why This Works
- No deadlocks
- No complex region ownership

Undo remains reliable because the canvas can always be **fully reconstructed** from stroke history.

---


