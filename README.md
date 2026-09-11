# OpenAI Agents API Starter

**Production-ready starter kit for building AI agents with OpenAI's new Agents API**

Stop wrestling with agent infrastructure. This repo gives you a working, production-ready agent in 5 minutes.

## What You Get

- ✅ **Ready-to-deploy agent** with memory, tools, and handoffs
- ✅ **Local dev setup** that just works (no Docker required)
- ✅ **Production deployment** configs for Vercel, Fly.io, or Kubernetes
- ✅ **Built-in observability** with tracing and logging
- ✅ **MIT License** - use it for client work, SaaS, whatever

## Quick Start

```bash
# Clone and install
git clone https://github.com/Varritech/openai-agents-starter
cd openai-agents-starter
npm install

# Set your API key
echo "OPENAI_API_KEY=sk-..." > .env

# Run locally
npm run dev
```

Your agent is now live at `http://localhost:3000`. Test it:

```bash
curl http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Help me debug this Python code..."}'
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Client    │────▶│  Agent API   │────▶│   Tools     │
│  (Web/Mobile)│    │  (Orchestrator)│    │ (Search/DB) │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Memory     │
                    │  (Postgres)  │
                    └──────────────┘
```

## Features

### Multi-Agent Handoffs
Route complex queries to specialized agents:
- `coding-agent` - Code review, debugging, generation
- `research-agent` - Web search, fact-checking
- `support-agent` - Customer support workflows

### Built-in Tools
- Web search (Tavily integration)
- Code execution sandbox
- Database queries (Postgres/MySQL)
- File operations

### Observability
- Request/response logging
- Token usage tracking
- Latency monitoring
- Error alerting

## Deployment

### Vercel (Recommended)
```bash
vercel deploy --prod
```

### Fly.io
```bash
fly launch
fly deploy
```

### Kubernetes
See `kubernetes/` for Helm charts and manifests.

## Customization

### Add Custom Tools
```typescript
// src/tools/my-tool.ts
export const myTool = {
  name: 'my-tool',
  description: 'Does something useful',
  execute: async (params) => {
    // Your logic here
    return result;
  }
};
```

### Custom Agent Behavior
```typescript
// src/agents/custom-agent.ts
import { Agent } from '@openai/agents';

export const customAgent = new Agent({
  name: 'custom-agent',
  instructions: 'You are a helpful assistant that...',
  tools: [myTool],
});
```

## Cost Optimization

- **Token caching** - Cache frequent responses
- **Model routing** - Use GPT-4o for complex tasks, GPT-4o-mini for simple ones
- **Rate limiting** - Built-in protection against abuse

Estimated cost: **$0.02-0.08 per conversation** at scale.

## Security

- API key encryption at rest
- Input sanitization
- Rate limiting per IP/user
- Audit logging

## Contributing

PRs welcome! Areas we'd love help:
- More tool integrations (Slack, Notion, Linear)
- Additional deployment targets
- UI dashboard for agent monitoring

## License

MIT © Varritech

---

**Built by [Varritech](https://varritech.com)** - We ship production AI systems in weeks, not months.

Need help scaling this? [christian@varritech.com](mailto:christian@varritech.com)
