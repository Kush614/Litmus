/**
 * Litmus WebSocket Server — Entry Point
 *
 * A lightweight Fastify server that handles bidirectional audio streaming
 * between Plivo and the Gemini Live API for real-time voice evaluation.
 *
 * Plivo connects via WebSocket at /ws, sending mu-law 8kHz audio.
 * The server converts the audio, pipes it to Gemini Live, and streams
 * Gemini's audio responses back to the caller through Plivo.
 */

import "dotenv/config";
import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { handlePlivoStream } from "./stream-handler.js";

const server = Fastify({
  logger: true,
});

// Register the WebSocket plugin
await server.register(websocket);

// Health check endpoint for Render and monitoring
server.get("/health", async (_request, _reply) => {
  return { status: "ok" };
});

// WebSocket route for Plivo bidirectional audio streaming
server.get("/ws", { websocket: true }, (socket, req) => {
  handlePlivoStream(socket, req);
});

// Start the server
const port = parseInt(process.env.PORT || "8080", 10);
const host = "::"; // Bind to all interfaces (IPv4 + IPv6) for Render compatibility

try {
  await server.listen({ port, host });
  console.log(`Litmus WS server listening on port ${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
