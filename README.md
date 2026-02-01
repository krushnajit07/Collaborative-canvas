## Real-Time Collaborative Drawing Canvas

A real-time, multi-user collaborative drawing application built using **React**, **Node.js**, **HTML5 Canvas**, and **Native WebSockets**. Multiple users can draw simultaneously on a shared canvas with smooth rendering and **global undo/redo support**.
 

---

##  Installation & Running the Project

###  Run the Project
####  Install Backend Dependencies

```bash
cd server
npm install
```
#### Start the WebSocket Server

```bash
node server.js
```

You should see:
```
 WebSocket running at ws://localhost:8080
```


####  Install Frontend Dependencies


In a new terminal window:
```bash
cd client
npm install
```

#### Start the Frontend

```bash
npm start
```

The React app will start at:
```
http://localhost:3000
```

---

## Testing With Multiple Users

To test real-time collaboration:

1. Open **http://localhost:3000** in **two or more browser windows**
   - You can also use different browsers (Chrome + Edge)
2. Start drawing in one window
3. Observe:
   - Other users see strokes **while they are being drawn**
   - Undo/Redo works globally across all users
   - Clear button clears canvas for everyone
4. Draw simultaneously in multiple windows to test conflict handling

This setup simulates real multi-user collaboration.


---

## Features

- Brush and Eraser tools
- Multiple colors
- Adjustable stroke width
- Real-time drawing synchronization (live streaming)
- Global Undo / Redo (any user can undo another user’s drawing)
- Conflict-safe multi-user drawing
- Native Canvas API 
- Native WebSockets

---


##  Known Issues / Limitations

- Redo history is cleared when a new stroke is started (expected behavior)
- No persistence layer (canvas resets when server restarts)
- No authentication or room separation (single shared canvas)
- High-latency networks may cause slight visual delays (expected in WebSocket streaming)

These limitations were accepted to keep the focus on **core real-time collaboration logic**.

---

##  Total Time Spent

Approximate total time spent on the project:

**20–22 Hours**



