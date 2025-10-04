# AI SDK Tool Calling & MCP Integration Analysis

**Research Date**: 2025-10-04
**Sources**: Vercel AI SDK (/vercel/ai), Vercel MCP Adapter (/vercel/mcp-adapter)
**Context**: Analysis for exposing backend APIs as MCP tools for user-connectable AI integrations

---

## Executive Summary

This document provides comprehensive patterns for implementing tool calling with the Vercel AI SDK and Model Context Protocol (MCP) integration. The analysis covers:

1. **Tool Definition Patterns** - Zod schema-based tool definitions with type inference
2. **MCP Server Setup** - Multi-transport MCP server implementation
3. **Tool Execution & Results** - Server-side and client-side execution patterns
4. **Dynamic Tool Registration** - Runtime tool discovery and validation
5. **Multi-Transport Support** - stdio, SSE, and HTTP transport configurations

The key insight: **MCP enables standardized tool exposure that users can connect to from any MCP-compatible AI client (Claude Desktop, Cursor, etc.), while the AI SDK provides the framework for executing these tools with type safety and validation.**

---

## 1. Tool Definition Patterns with Zod Schema Integration

### 1.1 Core Tool Definition Structure

The AI SDK uses a standardized `tool()` function with automatic type inference from Zod schemas:

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  // Type inference: location is automatically typed as string
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
});
```

**Key Pattern Components**:
- `description`: Human-readable explanation for AI model context
- `inputSchema`: Zod schema defining tool parameters with type validation
- `execute`: Async function implementing tool logic (optional for client-side tools)

**Type Safety**: The `inputSchema` automatically infers parameter types for the `execute` function, eliminating manual type annotations.

---

### 1.2 Complex Schema Patterns

**Nested Objects and Arrays**:
```typescript
import { z } from 'zod';

const recipeSchema = z.object({
  recipe: z.object({
    name: z.string(),
    ingredients: z.array(
      z.object({
        name: z.string(),
        amount: z.string()
      })
    ),
    steps: z.array(z.string())
  })
});

const recipeTool = tool({
  description: 'Generate a recipe',
  inputSchema: recipeSchema,
  execute: async ({ recipe }) => {
    // recipe is fully typed with nested structure
    return recipe;
  },
});
```

**Enum Validation**:
```typescript
const weatherTool = tool({
  description: 'Get the weather for a location',
  inputSchema: z.object({
    city: z.string().describe('The city to get the weather for'),
    unit: z.enum(['C', 'F']).describe('The unit to display the temperature in'),
  }),
  execute: async ({ city, unit }) => {
    // unit is typed as 'C' | 'F'
    return `Weather in ${city}: 24°${unit}`;
  },
});
```

---

### 1.3 Tool Sets and Registry Pattern

**Defining Tool Sets**:
```typescript
import { tool, ToolSet } from 'ai';
import { z } from 'zod';

// Define tools as a typed set
export const tools = {
  getWeather: tool({
    description: 'Get the weather in a location',
    inputSchema: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => ({ location, temperature: 72 }),
  }),

  getLocalTime: tool({
    description: 'Get the local time for a specified location',
    inputSchema: z.object({
      location: z.string(),
    }),
    execute: async ({ location }) => {
      return new Date().toLocaleTimeString();
    },
  }),
} satisfies ToolSet;
```

**Type Inference for Tool Sets**:
```typescript
import { InferUITools } from 'ai';

// Extract types from tool set
export type ChatTools = InferUITools<typeof tools>;
```

---

### 1.4 Dynamic Tools for Runtime Schemas

For tools whose schemas aren't known at compile time (e.g., MCP tools, user-defined functions):

```typescript
import { dynamicTool } from 'ai';
import { z } from 'zod';

export const customTool = dynamicTool({
  description: 'Execute a custom user-defined function',
  inputSchema: z.object({}), // Empty schema for dynamic input
  execute: async (input) => {
    // input is typed as 'unknown' - requires runtime validation
    const { action, parameters } = input as any;

    // Perform runtime validation and casting
    return {
      result: `Executed ${action} with ${JSON.stringify(parameters)}`,
    };
  },
});
```

**When to Use Dynamic Tools**:
- MCP tools without predefined schemas
- User-configurable functions
- External API integrations with variable schemas
- Plugin systems where tools are loaded at runtime

**AI SDK 5.0 MCP Integration**: MCP tools without schemas are automatically treated as dynamic tools to prevent type breakage when mixed with static tools.

---

## 2. MCP Server Setup and Client Initialization

### 2.1 MCP Server Implementation with Next.js

**Installation**:
```bash
npm install mcp-handler @modelcontextprotocol/sdk zod@^3
```

**Basic MCP Server Setup** (`app/api/[transport]/route.ts`):
```typescript
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

const handler = createMcpHandler(
  (server) => {
    // Define tools using the server API
    server.tool(
      'roll_dice',
      'Rolls an N-sided die',
      {
        sides: z.number().int().min(2),
      },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: 'text', text: `🎲 You rolled a ${value}!` }],
        };
      }
    );
  },
  {
    // Optional server options (capabilities, metadata)
    capabilities: {
      tools: {
        roll_dice: {
          description: 'Roll a dice',
        },
      },
    },
  },
  {
    // Optional configuration
    redisUrl: process.env.REDIS_URL, // For pub/sub in distributed environments
    basePath: '/api', // Must match [transport] location
    maxDuration: 60, // SSE connection duration in seconds
    verboseLogs: true, // Enable debugging logs
  }
);

export { handler as GET, handler as POST };
```

**Configuration Options**:
```typescript
interface Config {
  redisUrl?: string;       // Redis connection URL for pub/sub
  basePath?: string;        // Base path for MCP endpoints
  maxDuration?: number;     // Maximum SSE connection duration (seconds)
  verboseLogs?: boolean;    // Enable debug logging
}
```

---

### 2.2 Dynamic Routing Patterns

For multi-tenant or parameterized MCP servers:

```typescript
// app/dynamic/[p]/[transport]/route.ts
import { createMcpHandler } from 'mcp-handler';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

const handler = async (
  req: NextRequest,
  { params }: { params: Promise<{ p: string; transport: string }> }
) => {
  const { p, transport } = await params;

  return createMcpHandler(
    (server) => {
      // Dynamic tool registration based on params
      server.tool(
        `${p}_specific_tool`,
        `Tool specific to ${p}`,
        { data: z.string() },
        async ({ data }) => {
          return { content: [{ type: 'text', text: `Processed ${data}` }] };
        }
      );
    },
    {},
    {
      basePath: `/dynamic/${p}`, // Dynamic base path
      redisUrl: process.env.REDIS_URL,
      verboseLogs: true,
      maxDuration: 60,
    }
  )(req);
};

export { handler as GET, handler as POST, handler as DELETE };
```

---

### 2.3 MCP Client Initialization (Multi-Transport Support)

#### 2.3.1 HTTP Transport (Recommended for Production)

```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL('https://your-server.com/mcp');
const mcpClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(url, {
    sessionId: 'session_123', // Optional session management
  }),
});
```

**Benefits**:
- Production-ready
- Scalable across distributed systems
- Session management support
- Standard HTTP security (HTTPS, CORS, auth headers)

---

#### 2.3.2 SSE Transport (Server-Sent Events)

```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';

const mcpClient = await createMCPClient({
  transport: {
    type: 'sse',
    url: 'https://my-server.com/sse',

    // Optional: configure HTTP headers for authentication
    headers: {
      Authorization: 'Bearer my-api-key',
    },
  },
});
```

**Benefits**:
- Real-time streaming updates
- Built-in reconnection logic
- Long-lived connections for continuous data
- Custom authentication via headers

**Configuration**:
- `maxDuration`: Controls SSE connection lifetime (default: 60s)
- `headers`: Custom HTTP headers for authentication/authorization

---

#### 2.3.3 Stdio Transport (Local Development Only)

```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// Or use the AI SDK's stdio transport:
// import { Experimental_StdioMCPTransport as StdioClientTransport } from 'ai/mcp-stdio';

const mcpClient = await createMCPClient({
  transport: new StdioClientTransport({
    command: 'node',
    args: ['src/stdio/dist/server.js'],
  }),
});
```

**Use Cases**:
- Local development and testing
- CLI-based MCP servers
- Process-based isolation

**Limitations**:
- Not suitable for production (requires spawning processes)
- No HTTP-based authentication
- Single-process communication only

---

### 2.4 Connecting to MCP Servers via Remote Clients

Users can connect to your deployed MCP server from AI clients like Claude Desktop or Cursor:

**Claude Desktop Configuration** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "your-app-name": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-app.vercel.app/api/mcp"
      ]
    }
  }
}
```

**Alternative Direct URL Configuration** (newer clients):
```json
{
  "mcpServers": {
    "your-app-name": {
      "url": "https://your-app.vercel.app/api/mcp"
    }
  }
}
```

---

## 3. Tool Execution and Result Handling

### 3.1 Server-Side Tool Execution Pattern

**Basic Integration with AI Models**:
```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  prompt: 'What is the weather in San Francisco?',
});

console.log(result.text); // AI-generated response using tool results
```

---

### 3.2 Accessing Tool Results

**Typed Tool Result Access**:
```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
  },
  prompt: 'What is the weather in San Francisco and Los Angeles?',
});

// Iterate through tool results with type safety
for (const toolResult of result.toolResults) {
  if (toolResult.dynamic) {
    continue; // Skip dynamic tools
  }

  switch (toolResult.toolName) {
    case 'weather': {
      // Fully typed access
      console.log(toolResult.input.location);      // string
      console.log(toolResult.output.location);     // string
      console.log(toolResult.output.temperature);  // number
      break;
    }
  }
}
```

---

### 3.3 Multi-Step Tool Calling (Agentic Behavior)

**Enabling Multi-Step Execution**:
```typescript
import { generateText, stepCountIs } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  tools: {
    getLocation: tool({
      description: 'Get the location of the user',
      inputSchema: z.object({}),
      execute: async () => {
        return `Your location is at latitude 37.7749 and longitude -122.4194`;
      },
    }),
    getWeather: tool({
      description: 'Get the weather for a location',
      inputSchema: z.object({
        city: z.string().describe('The city to get the weather for'),
        unit: z.enum(['C', 'F']),
      }),
      execute: async ({ city, unit }) => {
        return `It is currently 24°${unit} and Sunny in ${city}!`;
      },
    }),
  },
  stopWhen: stepCountIs(5), // Allow up to 5 tool execution steps
  prompt: 'What is the weather where I am?',
});

// Access all steps taken by the agent
const allToolCalls = result.steps.flatMap(step => step.toolCalls);
console.log(`Agent took ${allToolCalls.length} tool calls across ${result.steps.length} steps`);
```

**Step Lifecycle Hooks**:
```typescript
const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  stopWhen: stepCountIs(5),

  onStepFinish: async ({ toolResults, stepNumber }) => {
    console.log(`Step ${stepNumber} completed with ${toolResults.length} tool calls`);

    // Log tool results for debugging
    if (toolResults.length) {
      console.log(JSON.stringify(toolResults, null, 2));
    }
  },

  prepareStep: async ({ stepNumber, steps }) => {
    // Customize settings per step
    if (stepNumber === 0) {
      return {
        model: specializedModel,
        toolChoice: { type: 'tool', toolName: 'firstTool' },
        activeTools: ['firstTool'], // Limit available tools
      };
    }
  },
});
```

---

### 3.4 Client-Side Tool Execution Pattern

For React applications using `useChat` or `useCompletion`:

```typescript
import { useChat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';

const { messages, sendMessage, addToolResult } = useChat({
  // Automatically submit when all tool results are available
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,

  // Handle tool calls on the client
  onToolCall: async ({ toolCall }) => {
    if (toolCall.toolName === 'getLocation') {
      try {
        const result = await getLocationData();

        // Important: Don't await inside onToolCall to avoid deadlocks
        addToolResult({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          output: result,
        });
      } catch (err) {
        addToolResult({
          tool: 'getLocation',
          toolCallId: toolCall.toolCallId,
          state: 'output-error',
          errorText: 'Failed to get location',
        });
      }
    }
  },
});
```

**Critical Pattern**: Never `await` inside `onToolCall` to prevent deadlocks. Call `addToolResult` synchronously.

---

### 3.5 Manual Agent Loop Pattern

For full control over tool execution and conversation flow:

```typescript
import { streamText, tool } from 'ai';
import { ModelMessage } from 'ai';
import { z } from 'zod';

const messages: ModelMessage[] = [
  {
    role: 'user',
    content: 'Get the weather in New York and San Francisco',
  },
];

async function agentLoop() {
  while (true) {
    const result = streamText({
      model: openai('gpt-4o'),
      messages,
      tools: {
        getWeather: tool({
          description: 'Get the current weather in a given location',
          inputSchema: z.object({
            location: z.string(),
          }),
          // No execute function - handle manually
        }),
      },
    });

    // Stream the response for real-time updates
    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        process.stdout.write(chunk.text);
      }
      if (chunk.type === 'tool-call') {
        console.log('\nCalling tool:', chunk.toolName);
      }
    }

    // Add LLM-generated messages to history
    const responseMessages = (await result.response).messages;
    messages.push(...responseMessages);

    const finishReason = await result.finishReason;

    if (finishReason === 'tool-calls') {
      const toolCalls = await result.toolCalls;

      // Handle tool execution manually
      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'getWeather') {
          const toolOutput = await getWeather(toolCall.input);

          messages.push({
            role: 'tool',
            content: [
              {
                toolName: toolCall.toolName,
                toolCallId: toolCall.toolCallId,
                type: 'tool-result',
                output: { type: 'text', value: toolOutput },
              },
            ],
          });
        }
      }
    } else {
      // Exit loop when no more tool calls
      break;
    }
  }

  console.log('Final conversation history:', messages);
}
```

**Benefits of Manual Agent Loop**:
- Full control over tool execution timing
- Custom message history management
- Complex exit conditions beyond step count
- Integration with external state management

---

## 4. Dynamic Tool Registration

### 4.1 MCP Client Tool Discovery

**Automatic Discovery** (infers types from server):
```typescript
import { experimental_createMCPClient as createMCPClient } from 'ai';

const mcpClient = await createMCPClient({
  transport: new StreamableHTTPClientTransport(url),
});

// Automatically fetch all tools from the MCP server
const tools = await mcpClient.tools();
```

**Explicit Schema Definition** (recommended for type safety):
```typescript
import { z } from 'zod';

const tools = await mcpClient.tools({
  schemas: {
    'get-data': {
      inputSchema: z.object({
        query: z.string().describe('The data query'),
        format: z.enum(['json', 'text']).optional(),
      }),
    },
    // For tools with zero inputs, use an empty object
    'tool-with-no-args': {
      inputSchema: z.object({}),
    },
  },
});
```

**Benefits of Explicit Schemas**:
- TypeScript type safety and IDE autocompletion
- Compile-time parameter validation
- Selective tool loading (performance optimization)
- Documentation and self-describing APIs

---

### 4.2 Combining Multiple MCP Clients

```typescript
import { experimental_createMCPClient } from 'ai';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp';

let stdioClient, httpClient, sseClient;

try {
  // Connect to multiple MCP servers with different transports
  stdioClient = await experimental_createMCPClient({
    transport: new StdioClientTransport({
      command: 'node',
      args: ['src/stdio/dist/server.js'],
    }),
  });

  httpClient = await experimental_createMCPClient({
    transport: new StreamableHTTPClientTransport(
      new URL('http://localhost:3000/mcp'),
    ),
  });

  sseClient = await experimental_createMCPClient({
    transport: new SSEClientTransport(
      new URL('http://localhost:3000/sse'),
    ),
  });

  // Retrieve tools from all clients
  const toolSetOne = await stdioClient.tools();
  const toolSetTwo = await httpClient.tools();
  const toolSetThree = await sseClient.tools();

  // Merge tool sets (later sets override tools with same name)
  const tools = {
    ...toolSetOne,
    ...toolSetTwo,
    ...toolSetThree,
  };

  const response = await generateText({
    model: openai('gpt-4o'),
    tools,
    stopWhen: stepCountIs(5),
    prompt: 'Find products under $100',
  });

  console.log(response.text);
} finally {
  // Ensure proper cleanup
  await Promise.all([
    stdioClient?.close(),
    httpClient?.close(),
    sseClient?.close(),
  ]);
}
```

**Tool Name Collision Handling**: Later tool sets override earlier ones with the same name. Use namespacing or prefixes to avoid conflicts.

---

### 4.3 Resource Management and Cleanup

**Streaming Response Cleanup**:
```typescript
const mcpClient = await experimental_createMCPClient({
  transport: new StreamableHTTPClientTransport(url),
});

const tools = await mcpClient.tools();

const result = await streamText({
  model: openai('gpt-4o'),
  tools,
  prompt: 'What is the weather in Brooklyn, New York?',

  // Close client when stream finishes
  onFinish: async () => {
    await mcpClient.close();
  },

  // Optional: Close on error (prevents hanging connections)
  onError: async (error) => {
    console.error('Error:', error);
    await mcpClient.close();
  },
});

return result.toDataStreamResponse();
```

**Non-Streaming Response Cleanup**:
```typescript
let mcpClient: MCPClient | undefined;

try {
  mcpClient = await experimental_createMCPClient({
    transport: new StreamableHTTPClientTransport(url),
  });

  const tools = await mcpClient.tools();

  const response = await generateText({
    model: openai('gpt-4o'),
    tools,
    prompt: 'Query the data',
  });

  console.log(response.text);
} catch (error) {
  console.error('Error:', error);
} finally {
  // Ensure cleanup even if errors occur
  await mcpClient?.close();
}
```

---

### 4.4 Selective Tool Activation

Limit available tools per request for performance and context optimization:

```typescript
import { generateText } from 'ai';

const { text } = await generateText({
  model: openai('gpt-4o'),
  tools: myToolSet, // Large set of 50+ tools
  activeTools: ['weatherTool', 'locationTool'], // Only these 2 are available
  prompt: 'What is the weather where I am?',
});
```

**Use Cases**:
- Performance optimization (reduce token usage in prompts)
- Context-specific tool availability
- Progressive disclosure of capabilities
- Role-based tool access control

---

## 5. Multi-Transport Support Patterns

### 5.1 Transport Comparison Matrix

| Transport | Use Case | Authentication | Scalability | Real-time | Production Ready |
|-----------|----------|----------------|-------------|-----------|------------------|
| **HTTP** | Production deployments | HTTP headers, OAuth | High (load balanced) | Request/response | ✅ Yes |
| **SSE** | Real-time streaming | HTTP headers, OAuth | Medium (long connections) | Yes (server→client) | ✅ Yes |
| **stdio** | Local development, CLI | Process-level | Low (single process) | No | ❌ No |

---

### 5.2 HTTP Transport Advanced Configuration

```typescript
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(
  new URL('https://your-server.com/mcp'),
  {
    sessionId: 'user_session_123',

    // Custom HTTP client configuration
    fetch: (url, init) => {
      return fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          'X-API-Key': process.env.API_KEY,
          'X-User-ID': 'user_123',
        },
      });
    },
  }
);

const mcpClient = await experimental_createMCPClient({ transport });
```

---

### 5.3 SSE Transport with Authentication

```typescript
const mcpClient = await experimental_createMCPClient({
  transport: {
    type: 'sse',
    url: 'https://my-server.com/sse',
    headers: {
      'Authorization': 'Bearer ' + process.env.AUTH_TOKEN,
      'X-Client-ID': 'app_client_id',
      'X-API-Version': 'v1',
    },
  },
});
```

---

### 5.4 Stdio Transport for Local MCP Servers

```typescript
import { Experimental_StdioMCPTransport } from 'ai/mcp-stdio';

const transport = new Experimental_StdioMCPTransport({
  command: 'node',
  args: ['dist/server.js'],

  // Optional: Environment variables for the spawned process
  env: {
    ...process.env,
    NODE_ENV: 'development',
  },
});

const mcpClient = await experimental_createMCPClient({ transport });
```

---

## 6. Advanced Patterns for Exposing Backend APIs as MCP Tools

### 6.1 Backend API → MCP Tool Transformation Pattern

**Scenario**: You have existing backend API endpoints and want to expose them as MCP tools.

**Example: Billing API → MCP Tools**

```typescript
// app/api/mcp/[transport]/route.ts
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { getStripeCustomer, createCheckoutSession, getSubscriptionStatus } from '@/services/api/billing';

const handler = createMcpHandler(
  (server) => {
    // Tool 1: Get customer subscription status
    server.tool(
      'get_subscription_status',
      'Get the current subscription status for a customer',
      {
        customerId: z.string().describe('The Stripe customer ID'),
      },
      async ({ customerId }) => {
        try {
          const status = await getSubscriptionStatus(customerId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  customerId,
                  status: status.status,
                  currentPeriodEnd: status.current_period_end,
                  plan: status.plan,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`,
              },
            ],
            isError: true,
          };
        }
      }
    );

    // Tool 2: Create checkout session
    server.tool(
      'create_checkout_session',
      'Create a Stripe checkout session for a subscription plan',
      {
        priceId: z.string().describe('The Stripe price ID'),
        customerId: z.string().optional().describe('Optional existing customer ID'),
        successUrl: z.string().url().describe('URL to redirect on success'),
        cancelUrl: z.string().url().describe('URL to redirect on cancel'),
      },
      async ({ priceId, customerId, successUrl, cancelUrl }) => {
        const session = await createCheckoutSession({
          priceId,
          customerId,
          successUrl,
          cancelUrl,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sessionId: session.id,
                checkoutUrl: session.url,
              }, null, 2),
            },
          ],
        };
      }
    );

    // Tool 3: Get customer portal URL
    server.tool(
      'get_customer_portal',
      'Generate a URL to the Stripe customer portal for subscription management',
      {
        customerId: z.string().describe('The Stripe customer ID'),
        returnUrl: z.string().url().describe('URL to return after managing subscription'),
      },
      async ({ customerId, returnUrl }) => {
        const portalSession = await createCustomerPortalSession({
          customerId,
          returnUrl,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                portalUrl: portalSession.url,
              }, null, 2),
            },
          ],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        get_subscription_status: {
          description: 'Retrieve subscription information',
        },
        create_checkout_session: {
          description: 'Initiate subscription checkout',
        },
        get_customer_portal: {
          description: 'Access subscription management portal',
        },
      },
    },
  },
  {
    basePath: '/api/mcp',
    redisUrl: process.env.REDIS_URL,
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === 'development',
  }
);

export { handler as GET, handler as POST };
```

---

### 6.2 Authentication and Authorization Pattern

**OAuth 2.0 Protected MCP Resources**:

```typescript
// app/api/mcp/[transport]/route.ts
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { z } from 'zod';

// Token verification function
const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  // Verify JWT token
  const payload = await verifyJWT(bearerToken);

  if (!payload) return undefined;

  return {
    token: bearerToken,
    scopes: payload.scopes || [],
    clientId: payload.sub,
    extra: {
      userId: payload.userId,
      email: payload.email,
    },
  };
};

// Create handler with tools
const handler = createMcpHandler(
  (server) => {
    server.tool(
      'get_user_data',
      'Fetch user-specific data',
      { query: z.string() },
      async ({ query }, extra) => {
        // Access authenticated user info
        const userId = extra.authInfo?.extra?.userId;

        if (!userId) {
          return {
            content: [{ type: 'text', text: 'Unauthorized' }],
            isError: true,
          };
        }

        const data = await fetchUserData(userId, query);

        return {
          content: [{ type: 'text', text: JSON.stringify(data) }],
        };
      }
    );
  }
);

// Wrap with authentication
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true, // Make auth required for all requests
  requiredScopes: ['read:user_data'], // Require specific scopes
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authHandler as GET, authHandler as POST };
```

**OAuth Protected Resource Metadata Endpoint**:

```typescript
// app/.well-known/oauth-protected-resource/route.ts
import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';

const handler = protectedResourceHandler({
  // Specify the Issuer URL of the Authorization Server
  authServerUrls: ['https://auth.yourapp.com'],
});

export { handler as GET, metadataCorsOptionsRequestHandler as OPTIONS };
```

---

### 6.3 Database Query MCP Tools Pattern

```typescript
// app/api/mcp/database/[transport]/route.ts
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { db } from '@/db';
import { usersTable, subscriptionsTable } from '@/db/tables';
import { eq } from 'drizzle-orm';

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'query_users',
      'Query users from the database',
      {
        email: z.string().email().optional(),
        limit: z.number().int().min(1).max(100).default(10),
      },
      async ({ email, limit }) => {
        const query = db
          .select()
          .from(usersTable)
          .limit(limit);

        if (email) {
          query.where(eq(usersTable.email, email));
        }

        const users = await query.execute();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(users, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      'get_subscription_analytics',
      'Get subscription analytics and metrics',
      {
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      },
      async ({ startDate, endDate }) => {
        const analytics = await db
          .select({
            total: count(),
            active: countIf(eq(subscriptionsTable.status, 'active')),
            canceled: countIf(eq(subscriptionsTable.status, 'canceled')),
          })
          .from(subscriptionsTable)
          .where(
            and(
              gte(subscriptionsTable.createdAt, new Date(startDate)),
              lte(subscriptionsTable.createdAt, new Date(endDate))
            )
          )
          .execute();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(analytics[0], null, 2),
            },
          ],
        };
      }
    );
  },
  {},
  {
    basePath: '/api/mcp/database',
    redisUrl: process.env.REDIS_URL,
  }
);

export { handler as GET, handler as POST };
```

---

### 6.4 External API Integration Pattern

```typescript
// app/api/mcp/integrations/[transport]/route.ts
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

const handler = createMcpHandler(
  (server) => {
    // Stripe integration
    server.tool(
      'stripe_refund',
      'Process a refund for a Stripe payment',
      {
        paymentIntentId: z.string(),
        amount: z.number().positive().optional(),
        reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
      },
      async ({ paymentIntentId, amount, reason }) => {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const refund = await stripe.refunds.create({
          payment_intent: paymentIntentId,
          amount,
          reason,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                id: refund.id,
                status: refund.status,
                amount: refund.amount,
              }, null, 2),
            },
          ],
        };
      }
    );

    // Email integration
    server.tool(
      'send_notification_email',
      'Send a notification email via AWS SES',
      {
        to: z.string().email(),
        subject: z.string(),
        body: z.string(),
        templateId: z.string().optional(),
      },
      async ({ to, subject, body, templateId }) => {
        const result = await sendEmail({
          to,
          subject,
          body,
          templateId,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Email sent successfully. Message ID: ${result.messageId}`,
            },
          ],
        };
      }
    );
  },
  {},
  {
    basePath: '/api/mcp/integrations',
  }
);

export { handler as GET, handler as POST };
```

---

## 7. Production Best Practices

### 7.1 Error Handling and Validation

```typescript
server.tool(
  'process_payment',
  'Process a payment transaction',
  {
    amount: z.number().positive(),
    currency: z.enum(['USD', 'EUR', 'GBP']),
    customerId: z.string(),
  },
  async ({ amount, currency, customerId }) => {
    try {
      // Validate business logic
      if (amount > 100000) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: Amount exceeds maximum transaction limit',
            },
          ],
          isError: true,
        };
      }

      // Process payment
      const result = await processPayment({ amount, currency, customerId });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      // Log error for monitoring
      console.error('Payment processing error:', error);

      return {
        content: [
          {
            type: 'text',
            text: `Payment failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);
```

---

### 7.2 Rate Limiting and Throttling

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

server.tool(
  'expensive_operation',
  'Perform an expensive computational operation',
  { data: z.string() },
  async ({ data }, extra) => {
    const userId = extra.authInfo?.clientId || 'anonymous';

    // Check rate limit
    const { success, remaining } = await ratelimit.limit(userId);

    if (!success) {
      return {
        content: [
          {
            type: 'text',
            text: 'Rate limit exceeded. Please try again later.',
          },
        ],
        isError: true,
      };
    }

    // Perform operation
    const result = await expensiveOperation(data);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result, remaining }, null, 2),
        },
      ],
    };
  }
);
```

---

### 7.3 Monitoring and Observability

```typescript
import { track } from '@/lib/analytics';

server.tool(
  'create_subscription',
  'Create a new subscription',
  { planId: z.string() },
  async ({ planId }, extra) => {
    const startTime = Date.now();

    try {
      const result = await createSubscription(planId);

      // Track success metrics
      await track({
        event: 'mcp_tool_executed',
        properties: {
          toolName: 'create_subscription',
          success: true,
          duration: Date.now() - startTime,
          userId: extra.authInfo?.clientId,
        },
      });

      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    } catch (error) {
      // Track error metrics
      await track({
        event: 'mcp_tool_error',
        properties: {
          toolName: 'create_subscription',
          error: error.message,
          duration: Date.now() - startTime,
          userId: extra.authInfo?.clientId,
        },
      });

      throw error;
    }
  }
);
```

---

### 7.4 Versioning and Backward Compatibility

```typescript
// app/api/mcp/v1/[transport]/route.ts
const handlerV1 = createMcpHandler(
  (server) => {
    server.tool(
      'get_data',
      'Get data (v1 - deprecated)',
      { id: z.string() },
      async ({ id }) => {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                warning: 'This endpoint is deprecated. Please use v2.',
                data: await getDataV1(id)
              }),
            },
          ],
        };
      }
    );
  },
  {},
  { basePath: '/api/mcp/v1' }
);

// app/api/mcp/v2/[transport]/route.ts
const handlerV2 = createMcpHandler(
  (server) => {
    server.tool(
      'get_data',
      'Get data with enhanced response format',
      {
        id: z.string(),
        includeMetadata: z.boolean().default(false),
      },
      async ({ id, includeMetadata }) => {
        const data = await getDataV2(id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                data,
                metadata: includeMetadata ? { version: 'v2', timestamp: new Date() } : undefined,
              }),
            },
          ],
        };
      }
    );
  },
  {},
  { basePath: '/api/mcp/v2' }
);
```

---

## 8. Key Takeaways and Recommendations

### 8.1 For Exposing Backend APIs as MCP Tools

1. **Use HTTP Transport for Production**: Scalable, supports authentication, and works across distributed systems
2. **Implement Authentication**: Always use `withMcpAuth` for production MCP servers
3. **Define Explicit Schemas**: Use Zod schemas for type safety and validation
4. **Version Your APIs**: Maintain backward compatibility with versioned endpoints
5. **Monitor and Track**: Implement observability for tool usage and errors
6. **Rate Limit**: Protect expensive operations with rate limiting
7. **Error Handling**: Return structured error responses with `isError: true`

---

### 8.2 For Consuming MCP Tools in Applications

1. **Close Clients Properly**: Always use `onFinish`/`finally` blocks to close MCP clients
2. **Use Multi-Step Execution**: Enable `stopWhen: stepCountIs(n)` for agentic behavior
3. **Combine Multiple Sources**: Merge tools from multiple MCP servers for rich functionality
4. **Type Safety**: Define explicit schemas even for dynamic tools when possible
5. **Handle Tool Failures**: Implement robust error handling and retry logic

---

### 8.3 Architecture Recommendations

**Hybrid Pattern** (Recommended):
- **Development**: Use dynamic MCP tool discovery for flexibility
- **Production**: Generate static tool definitions from MCP servers for security and performance

**Tool Organization**:
- Group related tools in domain-specific MCP servers (e.g., `/api/mcp/billing`, `/api/mcp/analytics`)
- Use clear, descriptive tool names with namespace prefixes if needed
- Document tools with comprehensive descriptions for AI model context

**Security**:
- Implement OAuth 2.0 for user-specific operations
- Use scoped permissions for fine-grained access control
- Validate all inputs with Zod schemas
- Audit tool usage with comprehensive logging

---

## 9. Example: Complete Billing Dashboard MCP Server

**File**: `src/app/api/mcp/billing/[transport]/route.ts`

```typescript
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { z } from 'zod';
import { verifySessionToken } from '@/lib/auth';
import {
  getSubscriptionStatus,
  createCheckoutSession,
  createCustomerPortalSession,
  cancelSubscription,
  updateSubscription,
} from '@/services/api/subscription-management';

const verifyToken = async (
  req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;

  const session = await verifySessionToken(bearerToken);

  if (!session) return undefined;

  return {
    token: bearerToken,
    scopes: ['billing:read', 'billing:write'],
    clientId: session.userId,
    extra: { userId: session.userId, email: session.user.email },
  };
};

const handler = createMcpHandler(
  (server) => {
    // Read operations
    server.tool(
      'get_subscription_status',
      'Get the current subscription status for the authenticated user',
      {
        includeUsage: z.boolean().default(false).describe('Include usage metrics'),
      },
      async ({ includeUsage }, extra) => {
        const userId = extra.authInfo?.extra?.userId;

        if (!userId) {
          return {
            content: [{ type: 'text', text: 'Unauthorized' }],
            isError: true,
          };
        }

        const status = await getSubscriptionStatus({ userId, includeUsage });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }
    );

    // Write operations
    server.tool(
      'create_checkout',
      'Create a Stripe checkout session for a subscription plan',
      {
        priceId: z.string().describe('Stripe price ID (e.g., price_1234)'),
        successUrl: z.string().url().describe('Redirect URL on success'),
        cancelUrl: z.string().url().describe('Redirect URL on cancel'),
      },
      async ({ priceId, successUrl, cancelUrl }, extra) => {
        const userId = extra.authInfo?.extra?.userId;

        if (!userId) {
          return {
            content: [{ type: 'text', text: 'Unauthorized' }],
            isError: true,
          };
        }

        const session = await createCheckoutSession({
          userId,
          priceId,
          successUrl,
          cancelUrl,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sessionId: session.id,
                checkoutUrl: session.url,
              }, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      'cancel_subscription',
      'Cancel the user subscription',
      {
        immediately: z.boolean().default(false).describe('Cancel immediately or at period end'),
        reason: z.string().optional().describe('Cancellation reason'),
      },
      async ({ immediately, reason }, extra) => {
        const userId = extra.authInfo?.extra?.userId;

        if (!userId) {
          return {
            content: [{ type: 'text', text: 'Unauthorized' }],
            isError: true,
          };
        }

        const result = await cancelSubscription({ userId, immediately, reason });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );

    server.tool(
      'get_customer_portal',
      'Get URL to Stripe customer portal for subscription management',
      {
        returnUrl: z.string().url().describe('URL to return after management'),
      },
      async ({ returnUrl }, extra) => {
        const userId = extra.authInfo?.extra?.userId;

        if (!userId) {
          return {
            content: [{ type: 'text', text: 'Unauthorized' }],
            isError: true,
          };
        }

        const portal = await createCustomerPortalSession({ userId, returnUrl });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ portalUrl: portal.url }, null, 2),
            },
          ],
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        get_subscription_status: {
          description: 'View subscription information',
        },
        create_checkout: {
          description: 'Start subscription checkout process',
        },
        cancel_subscription: {
          description: 'Cancel active subscription',
        },
        get_customer_portal: {
          description: 'Access subscription management',
        },
      },
    },
  },
  {
    basePath: '/api/mcp/billing',
    redisUrl: process.env.REDIS_URL,
    maxDuration: 60,
    verboseLogs: process.env.NODE_ENV === 'development',
  }
);

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ['billing:read'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

export { authHandler as GET, authHandler as POST };
```

---

## 10. Conclusion

The Vercel AI SDK's tool calling capabilities combined with MCP integration provide a powerful framework for exposing backend APIs as standardized, discoverable tools that users can connect to from any MCP-compatible AI client.

**Key Implementation Steps**:
1. Define tools with Zod schemas for type safety
2. Implement MCP server using `mcp-handler` with HTTP transport
3. Add authentication and authorization with `withMcpAuth`
4. Expose tools via dynamic routing (`/api/mcp/[domain]/[transport]`)
5. Document tool capabilities for AI model context
6. Monitor usage and errors for production reliability

**User Connection Flow**:
1. User adds MCP server URL to their AI client (Claude Desktop, Cursor, etc.)
2. AI client discovers available tools via MCP protocol
3. User interacts with AI, which invokes tools as needed
4. Tools execute backend logic and return structured results
5. AI incorporates results into natural language responses

This architecture enables **self-service AI integration** where users can extend their AI assistants with your application's capabilities without custom development.

---

**References**:
- Vercel AI SDK: https://ai-sdk.dev
- Model Context Protocol: https://modelcontextprotocol.io
- MCP Handler: https://github.com/vercel/mcp-adapter
- Zod Schema Validation: https://zod.dev
