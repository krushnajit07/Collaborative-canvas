const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// GLOBAL STATE

let strokes = [];   // active strokes (global truth)
let redoStack = [];     // redo history
const users = new Map(); // ws -> { id, color }


// HELPERS

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(msg);
    }
  });
}

// SOCKET

wss.on("connection", ws => {
  const user = {
    id: crypto.randomUUID()
  };

  users.set(ws, user);

  // Initial sync
  ws.send(JSON.stringify({
    type: "init",
    payload: { user, strokes }
  }));

  ws.on("message", data => {
    const { type, payload } = JSON.parse(data);

    switch (type) {
      case "stroke-start":
        strokes.push(payload);
        if (payload.isNew === true) {
            redoStack=[];
        }
        broadcast("stroke-start", payload);
        break;

      case "stroke-progress": {
        const s = strokes.find(st => st.id === payload.id);
        if (s) {
          s.points.push(payload.point);
          broadcast("stroke-progress", payload);
        }
        break;
      }

      case "stroke-end":
        broadcast("stroke-end", payload);
        break;

    //    GLOBAL UNDO
      case "undo":
        if (strokes.length > 0) {
          redoStack.push(strokes.pop());
          broadcast("redraw", strokes);
        }
        break;

    //   GLOBAL REDO
      case "redo":
        if (redoStack.length > 0) {
          strokes.push(redoStack.pop());
          broadcast("redraw", strokes);
        }
        break;

    //   CLEAR ALL
      case "clear":
        strokes = [];
        redoStack = [];
        broadcast("redraw", strokes);
        break;
    }
  });

  ws.on("close", () => {
    users.delete(ws);
  });
});

// START

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});