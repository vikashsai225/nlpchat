import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket(token) {
  if (!token) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    return null;
  }

  if (!socketInstance) {
    socketInstance = io(window.location.origin, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });
  } else if (socketInstance.disconnected) {
    socketInstance.auth = { token };
    socketInstance.connect();
  }

  return socketInstance;
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
