// "use client";

// import SockJS from "sockjs-client";
// import { Client } from "@stomp/stompjs";

// let stompClient: Client | null = null;

// // ✅ Status callback globally store karo
// let statusCallback:
//   | ((status: { userId: string; online: boolean }) => void)
//   | null = null;

// export const connectSocket = (
//   userId: string,
//   onConnected?: () => void
// ) => {
//   // ✅ Pehle se connected ho to dobara connect mat karo
//   if (stompClient?.active) {
//     console.log("Socket already active");
//     return;
//   }

//   stompClient = new Client({
//       webSocketFactory: () => new SockJS(`${process.env.NEXT_PUBLIC_BACKEND_URL || '/'}ws/chat`),
//     connectHeaders: {
//       userId,
//     },
//     reconnectDelay: 5000,

//     onConnect: () => {
//       console.log("✅ Socket Connected");

//       // ✅ Subscribe onConnect ke ANDAR karo
//       // Reconnect hone par bhi automatically resubscribe hoga
//       if (statusCallback) {
//         stompClient?.subscribe("/topic/status", (message) => {
//           const status = JSON.parse(message.body);
//           statusCallback?.(status);
//         });
//       }

//       onConnected?.();
//     },

//     onStompError: (frame) => {
//       console.error("❌ STOMP Error:", frame);
//     },

//     onWebSocketClose: () => {
//       console.log("🔴 Socket Disconnected");
//     },

//     onDisconnect: () => {
//       console.log("Stomp Disconnected");
//     },
//   });

//   stompClient.activate();
// };

// // ✅ Callback pehle register karo
// // Subscribe onConnect mein automatically hoga
// export const subscribeToStatus = (
//   callback: (status: { userId: string; online: boolean }) => void
// ) => {
//   statusCallback = callback;

//   // Agar already connected hai to turant subscribe karo
//   if (stompClient?.connected) {
//     stompClient.subscribe("/topic/status", (message) => {
//       const status = JSON.parse(message.body);
//       callback(status);
//     });
//   }
// };

// export const subscribeToRoom = (
//   roomId: string,
//   callback: (message: any) => void
// ) => {
//   if (!stompClient?.connected) return;

//   stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
//     const data = JSON.parse(message.body);
//     callback(data);
//   });
// };

// export const sendMessage = (roomId: string, message: any) => {
//   if (!stompClient?.connected) return;

//   stompClient.publish({
//     destination: `/app/sendMessage/${roomId}`,
//     body: JSON.stringify(message),
//   });
// };

// export const disconnectSocket = () => {
//   stompClient?.deactivate();
//   stompClient = null;
//   statusCallback = null;
// };

// export const getSocketClient = () => stompClient;

"use client";

import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

let stompClient: Client | null = null;

// ✅ Status callback globally store karo
let statusCallback:
  | ((status: { userId: string; online: boolean }) => void)
  | null = null;

// Strip any trailing slash from the base URL so we never end up with
// either a missing slash ("...comws/chat") or a double slash ("...com//ws/chat").
function getWsUrl(): string {
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
  return `${base}/ws/chat`;
}

export const connectSocket = (
  userId: string,
  onConnected?: () => void
) => {
  // ✅ Pehle se connected ho to dobara connect mat karo
  if (stompClient?.active) {
    console.log("Socket already active");
    return;
  }

  stompClient = new Client({
    webSocketFactory: () => new SockJS(getWsUrl()),
    connectHeaders: {
      userId,
    },
    reconnectDelay: 5000,

    onConnect: () => {
      console.log("✅ Socket Connected");

      // ✅ Subscribe onConnect ke ANDAR karo
      // Reconnect hone par bhi automatically resubscribe hoga
      if (statusCallback) {
        stompClient?.subscribe("/topic/status", (message) => {
          const status = JSON.parse(message.body);
          statusCallback?.(status);
        });
      }

      onConnected?.();
    },

    onStompError: (frame) => {
      console.error("❌ STOMP Error:", frame);
    },

    onWebSocketClose: () => {
      console.log("🔴 Socket Disconnected");
    },

    onDisconnect: () => {
      console.log("Stomp Disconnected");
    },
  });

  stompClient.activate();
};

// ✅ Callback pehle register karo

export const subscribeToStatus = (
  callback: (status: { userId: string; online: boolean }) => void
) => {
  statusCallback = callback;


  if (stompClient?.connected) {
    stompClient.subscribe("/topic/status", (message) => {
      const status = JSON.parse(message.body);
      callback(status);
    });
  }
};

export const subscribeToRoom = (
  roomId: string,
  callback: (message: any) => void
) => {
  if (!stompClient?.connected) return;

  stompClient.subscribe(`/topic/room/${roomId}`, (message) => {
    const data = JSON.parse(message.body);
    callback(data);
  });
};

export const sendMessage = (roomId: string, message: any) => {
  if (!stompClient?.connected) return;

  stompClient.publish({
    destination: `/app/sendMessage/${roomId}`,
    body: JSON.stringify(message),
  });
};

export const disconnectSocket = () => {
  stompClient?.deactivate();
  stompClient = null;
  statusCallback = null;
};

export const getSocketClient = () => stompClient;