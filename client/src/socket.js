let socket = null;

export const socketState = {
  user: null,
  strokes: []
};

export function connectSocket(handlers) {
  // Close existing socket if any
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    socket.close();
  }

  const wsUrl = process.env.REACT_APP_WS_URL || "ws://localhost:3000";
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected");
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket disconnected");
  };

  socket.onmessage = e => {
    const { type, payload } = JSON.parse(e.data);

    switch (type) {
      case "init":
        socketState.user = payload.user;
        socketState.strokes = payload.strokes;
        handlers.onInit(payload);
        break;

      case "stroke-start":
        socketState.strokes.push(payload);
        handlers.onStrokeStart(payload);
        break;

      case "stroke-progress": {
        const s = socketState.strokes.find(st => st.id === payload.id);
        if (s) s.points.push(payload.point);
        handlers.onStrokeProgress(payload);
        break;
      }

      case "stroke-end":
        handlers.onStrokeEnd(payload);
        break;

      case "redraw":
        socketState.strokes = payload;
        handlers.onRedraw(payload);
        break;

      default:
        break;
    }
  };
}

// Helper to check if socket is ready
function ensureSocketReady() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    console.log("Socket is not ready");
    return false;
  }
  return true;
}

//  DRAW EVENTS

export function emitStrokeStart(stroke) {
  if (!ensureSocketReady()) return;
  socket.send(JSON.stringify({
    type: "stroke-start",
    payload: stroke
  }));
}

export function emitStrokeProgress(id, point) {
  if (!ensureSocketReady()) return;
  socket.send(JSON.stringify({
    type: "stroke-progress",
    payload: { id, point }
  }));
}

export function emitStrokeEnd(id) {
  if (!ensureSocketReady()) return;
  socket.send(JSON.stringify({
    type: "stroke-end",
    payload: { id }
  }));
}

//  GLOBAL ACTIONS

export function emitUndo() {
  if (!ensureSocketReady()) return;
  socket.send(JSON.stringify({ type: "undo" }));
}

export function emitRedo() {
  if (!ensureSocketReady()) return;
  socket.send(JSON.stringify({ type: "redo" }));
}

export function emitClear() {
  if (!ensureSocketReady()) return;
  socket.send(JSON.stringify({ type: "clear" }));
}

export function closeSocket() {
  if (socket && socket.readyState !== WebSocket.CLOSED) {
    socket.close();
  }
}
    