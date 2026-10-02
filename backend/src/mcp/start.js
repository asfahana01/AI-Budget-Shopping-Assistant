import { startProtocolServer } from "./protocolServer.js";

startProtocolServer().catch((error) => {
  console.error("MCP server failed to start:", error);
  process.exitCode = 1;
});
