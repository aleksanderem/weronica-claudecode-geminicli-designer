import { Server, ServerWebSocket } from "bun";

// Store clients by channel
const channels = new Map<string, Set<ServerWebSocket<any>>>();

// Store channel metadata
interface ChannelMetadata {
  documentName?: string;
  connectedAt: string;
  clientCount: number;
}
const channelMetadata = new Map<string, ChannelMetadata>();

function handleConnection(ws: ServerWebSocket<any>) {
  // Don't add to clients immediately - wait for channel join
  console.log("New client connected");

  // Send welcome message to the new client
  ws.send(JSON.stringify({
    type: "system",
    message: "Please join a channel to start chatting",
  }));

  ws.close = () => {
    console.log("Client disconnected");

    // Remove client from their channel
    channels.forEach((clients, channelName) => {
      if (clients.has(ws)) {
        clients.delete(ws);
        
        // Update metadata
        const metadata = channelMetadata.get(channelName);
        if (metadata) {
          metadata.clientCount = clients.size;
          
          // Remove channel if empty
          if (clients.size === 0) {
            channels.delete(channelName);
            channelMetadata.delete(channelName);
          }
        }

        // Notify other clients in same channel
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: "system",
              message: "A user has left the channel",
              channel: channelName
            }));
          }
        });
      }
    });
  };
}

const server = Bun.serve({
  port: 3055,
  // uncomment this to allow connections in windows wsl
  // hostname: "0.0.0.0",
  fetch(req: Request, server: Server) {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Handle WebSocket upgrade
    const success = server.upgrade(req, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });

    if (success) {
      return; // Upgraded to WebSocket
    }

    // Return response for non-WebSocket requests
    return new Response("WebSocket server running", {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
  websocket: {
    open: handleConnection,
    message(ws: ServerWebSocket<any>, message: string | Buffer) {
      try {
        console.log("Received message from client:", message);
        const data = JSON.parse(message as string);

        if (data.type === "join") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") {
            ws.send(JSON.stringify({
              type: "error",
              message: "Channel name is required"
            }));
            return;
          }

          // Create channel if it doesn't exist
          if (!channels.has(channelName)) {
            channels.set(channelName, new Set());
            channelMetadata.set(channelName, {
              documentName: data.documentName,
              connectedAt: new Date().toISOString(),
              clientCount: 0
            });
          }

          // Add client to channel
          const channelClients = channels.get(channelName)!;
          channelClients.add(ws);
          
          // Update metadata
          const metadata = channelMetadata.get(channelName)!;
          metadata.clientCount = channelClients.size;
          if (data.documentName) {
            metadata.documentName = data.documentName;
          }

          // Notify client they joined successfully
          ws.send(JSON.stringify({
            type: "system",
            message: `Joined channel: ${channelName}`,
            channel: channelName
          }));

          console.log("Sending message to client:", data.id);

          ws.send(JSON.stringify({
            type: "system",
            message: {
              id: data.id,
              result: "Connected to channel: " + channelName,
            },
            channel: channelName
          }));

          // Notify other clients in channel
          channelClients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "system",
                message: "A new user has joined the channel",
                channel: channelName
              }));
            }
          });
          return;
        }

        // Handle list channels request
        if (data.type === "list_channels") {
          const channelsList = Array.from(channelMetadata.entries()).map(([channel, metadata]) => ({
            channel,
            documentName: metadata.documentName,
            connectedAt: metadata.connectedAt,
            clientCount: metadata.clientCount
          }));
          
          ws.send(JSON.stringify({
            type: "channels_list",
            channels: channelsList
          }));
          return;
        }

        // Handle regular messages
        if (data.type === "message") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") {
            ws.send(JSON.stringify({
              type: "error",
              message: "Channel name is required"
            }));
            return;
          }

          const channelClients = channels.get(channelName);
          if (!channelClients || !channelClients.has(ws)) {
            ws.send(JSON.stringify({
              type: "error",
              message: "You must join the channel first"
            }));
            return;
          }

          // Broadcast to all clients in the channel
          channelClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              console.log("Broadcasting message to client:", data.message);
              client.send(JSON.stringify({
                type: "broadcast",
                message: data.message,
                sender: client === ws ? "You" : "User",
                channel: channelName
              }));
            }
          });
        }
      } catch (err) {
        console.error("Error handling message:", err);
      }
    },
    close(ws: ServerWebSocket<any>) {
      // Remove client from their channel
      channels.forEach((clients, channelName) => {
        if (clients.has(ws)) {
          clients.delete(ws);
          
          // Update metadata
          const metadata = channelMetadata.get(channelName);
          if (metadata) {
            metadata.clientCount = clients.size;
            
            // Remove channel if empty
            if (clients.size === 0) {
              channels.delete(channelName);
              channelMetadata.delete(channelName);
            }
          }
        }
      });
    }
  }
});

console.log(`WebSocket server running on port ${server.port}`);
