// Create a new file for socket debugging utilities
import { Socket } from 'socket.io-client';

export const debugSocket = (socket: Socket): Socket => {
  if (!socket) return socket;
  
  // Store original methods
  const originalEmit = socket.emit;
  const originalOn = socket.on;
  const originalOff = socket.off;
  
  // Override emit to add logging
  socket.emit = function(event, ...args) {
    console.log(`[SOCKET DEBUG] Emitting: ${event}`, args[0] ? JSON.stringify(args[0]).substring(0, 200) : '');
    return originalEmit.apply(this, [event, ...args]);
  };
  
  // Override on to add logging
  socket.on = function(event, listener) {
    const wrappedListener = (...args: any[]) => {
      console.log(`[SOCKET DEBUG] Received: ${event}`, args[0] ? JSON.stringify(args[0]).substring(0, 200) : '');
      return listener(...args);
    };
    return originalOn.call(this, event, wrappedListener);
  };
  
  // Override off to add logging
  socket.off = function(event, listener) {
    console.log(`[SOCKET DEBUG] Removing listener for: ${event}`);
    return originalOff.apply(this, [event, listener]);
  };
  
  return socket;
};

// Function to list all event listeners
export const listSocketListeners = (socket: Socket): void => {
  if (!socket) return;
  
  console.log('[SOCKET DEBUG] Active event listeners:');
  // @ts-ignore - Accessing private property for debugging
  const events = socket._events || {};
  
  Object.keys(events).forEach(event => {
    const listeners = Array.isArray(events[event]) ? events[event].length : 1;
    console.log(`[SOCKET DEBUG] - ${event}: ${listeners} listener(s)`);
  });
}; 