import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchProducts } from "./tools/searchProducts.js";
import { getProductDetails } from "./tools/getProductDetails.js";
import { checkBudgetBundle } from "./tools/checkBudgetBundle.js";
import { getPolicy } from "./tools/getPolicy.js";

const productIdSchema = z.string().trim().min(1).max(80).regex(/^[a-z0-9_-]+$/i);

const toolDefinitions = {
  search_products: {
    description: "Search the verified shopping catalog by query, category, price, and stock status.",
    inputSchema: z.object({
      query: z.string().trim().min(1).max(200),
      category: z.string().trim().min(1).max(40).optional(),
      maxPrice: z.number().positive().max(10_000_000).optional(),
      inStockOnly: z.boolean().default(true)
    })
  },
  get_product_details: {
    description: "Read one verified product from the catalog by product ID.",
    inputSchema: z.object({ productId: productIdSchema })
  },
  check_budget_bundle: {
    description: "Validate a requested shopping bundle against the deterministic optimizer.",
    inputSchema: z.object({
      budget: z.number().positive().max(10_000_000),
      items: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
      preferences: z.array(z.string().trim().max(80)).max(12).default([])
    })
  },
  get_policy: {
    description: "Retrieve policy or product-fact guidance grounded in the knowledge documents.",
    inputSchema: z.object({ topic: z.string().trim().min(1).max(200) })
  }
};

const toolHandlers = {
  search_products: searchProducts,
  get_product_details: getProductDetails,
  check_budget_bundle: checkBudgetBundle,
  get_policy: getPolicy
};

function buildToolError(code, message) {
  return {
    ok: false,
    error: { code, message }
  };
}

export function createProtocolServer() {
  const server = new McpServer({
    name: "ai-budget-shopping-assistant-mcp",
    version: "1.0.0"
  });

  for (const [name, definition] of Object.entries(toolDefinitions)) {
    server.registerTool(name, {
      description: definition.description,
      inputSchema: definition.inputSchema.shape
    }, async (args) => {
      try {
        const parsed = definition.inputSchema.safeParse(args ?? {});
        if (!parsed.success) {
          const message = parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ");
          return {
            content: [{ type: "text", text: JSON.stringify(buildToolError("INVALID_TOOL_INPUT", message)) }],
            isError: true,
            structuredContent: buildToolError("INVALID_TOOL_INPUT", message)
          };
        }

        const result = await toolHandlers[name](parsed.data);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
          structuredContent: result
        };
      } catch {
        const fallback = buildToolError("TOOL_FAILURE", "The shopping tool could not complete this request.");
        return {
          content: [{ type: "text", text: JSON.stringify(fallback) }],
          isError: true,
          structuredContent: fallback
        };
      }
    });
  }

  return {
    server,
    listTools() {
      return Object.entries(toolDefinitions).map(([name, definition]) => ({
        name,
        description: definition.description,
        inputSchema: definition.inputSchema.shape
      }));
    },
    async callTool(name, input) {
      const schema = toolDefinitions[name]?.inputSchema;
      const handler = toolHandlers[name];
      if (!schema || !handler) {
        return buildToolError("UNKNOWN_TOOL", `Unknown shopping tool: ${String(name).slice(0, 80)}.`);
      }

      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        return buildToolError(
          "INVALID_TOOL_INPUT",
          parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("; ")
        );
      }

      try {
        return { ok: true, structuredContent: await handler(parsed.data) };
      } catch {
        return buildToolError("TOOL_FAILURE", "The shopping tool could not complete this request.");
      }
    }
  };
}

export async function startProtocolServer() {
  const protocolServer = createProtocolServer();
  await protocolServer.server.connect(new StdioServerTransport());
  console.log("MCP protocol server listening on stdio.");
  return protocolServer;
}
