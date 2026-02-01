import { useEffect, useRef, useState, useCallback } from "react";
import {
  connectSocket,
  emitStrokeStart,
  emitStrokeProgress,
  emitStrokeEnd,
  emitUndo,
  emitRedo,
  emitClear,
  closeSocket,
  socketState
} from "./socket";
import './index.css'

export default function CanvasBoard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const currentStrokeId = useRef(null);

  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#eaa0a2");
  const [width, setWidth] = useState(4);

  // CANVAS SETUP

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 70;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
  }, []);

  // UTILS 

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top)
    };
  }

  function applyStyle(ctx, stroke) {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.globalCompositeOperation =
    stroke.tool === "eraser" ? "destination-out" : "source-over";
  }

  //REMOTE DRAW 

  const redraw = useCallback((strokes) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(stroke => {
      applyStyle(ctx, stroke);
      ctx.beginPath();
      for (let i = 0; i < stroke.points.length; i++) {
        const p = stroke.points[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    });
  }, []);

  const remoteStrokeStart = useCallback((stroke) => {
    // Don't draw our own strokes
    if (stroke.userId === socketState.user?.id) return;

    const ctx = ctxRef.current;
    if (!ctx) return;
    applyStyle(ctx, stroke);
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  }, []);

  const remoteStrokeProgress = useCallback(({ id, point }) => {
    const stroke = socketState.strokes.find(s => s.id === id);
    if (!stroke) return;

    // Dont draw own strokes remotely
    if (stroke.userId === socketState.user?.id) return;

    const ctx = ctxRef.current;
    if (!ctx) return;
    applyStyle(ctx, stroke);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }, []);

  // SOCKET

  useEffect(() => {
    connectSocket({
      onInit: ({ strokes }) => redraw(strokes),
      onStrokeStart: remoteStrokeStart,
      onStrokeProgress: remoteStrokeProgress,
      onStrokeEnd: () => {},
      onRedraw: redraw
    });

    // Cleanup function to close socket on unmount
    return () => {
      closeSocket();
    };
  }, [redraw, remoteStrokeStart, remoteStrokeProgress]);

  // LOCAL DRAW

  function handleMouseDown(e) {
    // Dont allow drawing if socket is not connected or user is not initialized
    if (!socketState.user) {
      console.warn("Socket not connected yet. Please wait...");
      return;
    }

    isDrawing.current = true;

    const pos = getPos(e);
    lastPoint.current = pos;

    const strokeId = crypto.randomUUID();
    currentStrokeId.current = strokeId;

    // Draw locally immediately
    const ctx = ctxRef.current;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    emitStrokeStart({
      id: strokeId,
      userId: socketState.user.id,
      color,
      width,
      tool,
      points: [pos],
      isNew: true         
    });
  }

  function handleMouseMove(e) {
    if (!isDrawing.current) return;

    const pos = getPos(e);
    const ctx = ctxRef.current;

    // Draw locally 
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPoint.current = pos;

    emitStrokeProgress(currentStrokeId.current, pos);
  }

  function handleMouseUp() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    emitStrokeEnd(currentStrokeId.current);
  }


  // UI

  function handleClear() {
    if (window.confirm("All users data will be cleared. Continue?")) {
      emitClear();
    }
  }

  return (
    <>
      <div className="toolbar">
        <button className="btn" onClick={() => setTool("brush")}>Brush</button>
        <button className="btn" onClick={() => setTool("eraser")}>Eraser</button>
        
        <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        <input
          className="range-input"
          type="range"
          min="1"
          max="20"
          value={width}
          onChange={e => setWidth(Number(e.target.value))}
        />

        <button className="btn" onClick={emitUndo}>Undo</button>
        <button className="btn" onClick={emitRedo}>Redo</button>
        <button className="btn" onClick={handleClear}>Clear All</button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: tool==='brush'?"crosshair":"grab" }}
      />
    </>
  );
}

