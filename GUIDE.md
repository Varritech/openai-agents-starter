# Building Production AI Agents with OpenAI Agents API

*Published September 11, 2026 by Varritech*

---

## The Problem: Agent Infrastructure is Still Hard

OpenAI just dropped the **Agents API** (September 10, 2026), and it's a game-changer. But here's what they don't tell you in the docs:

Getting from "hello world" to production-ready agent still takes weeks. You need:
- Memory persistence (so agents remember conversations)
- Tool integrations (search, databases, APIs)
- Multi-agent orchestration (routing complex queries)
- Observability (tracing, logging, cost tracking)
- Deployment infrastructure (scaling, rate limiting, security)

The official examples show you how to build a toy agent. This guide shows you how to build one that handles **10,000+ conversations/day** without melting down.

---

## Why This Matters Now

The agent economy is exploding. Companies are replacing:
- Customer support teams ($50K-80K/rep/year) → $800/month in API costs
- Junior developers ($70K+/year) → AI code review agents
- Research analysts ($60K+/year) → Automated research agents

But most attempts fail because they skip the infrastructure layer. They build a cool demo, then realize it can't handle real traffic, real users, or real edge cases.

This guide skips the demo phase. We're building something you can deploy Monday morning.

---

## Architecture Overview

Here's the production architecture we're implementing:

```
┌─────────────────┐
│   Load Balancer │
│   (Cloudflare)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Agent Gateway  │────▶│  Redis Cache     │
│  (Rate Limiting)│     │  (Token Caching) │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│  Orchestrator   │──────────────────────┐
│  (Agents API)   │                      │
└────────┬────────┘                      │
         │                               │
    ┌────┴────┐                    ┌────▼─────┐
    │         │                    │          │
    ▼         ▼                    ▼          ▼
┌───────┐ ┌───────┐          ┌────────┐ ┌──────────┐
│Coding │ │Research│          │ Postgres│ │ External │
│ Agent │ │ Agent │          │ Memory │ │ APIs     │
└───────┘ └───────┘          └────────┘ └──────────┘
```

### Key Components

1. **Agent Gateway**: Single entry point with auth, rate limiting, request validation
2. **Orchestrator**: Routes requests to specialized agents based on intent
3. **Specialized Agents**: Each optimized for specific tasks (coding, research, support)
4. **Memory Layer**: Postgres for conversation history + Redis for token caching
5. **Observability Stack**: Tracing, metrics, alerting built-in

---

## Step 1: Local Development Setup

Let's get this running locally first. No Docker required.

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (local or cloud)
- OpenAI API key with Agents API access

### Installation

```bash
git clone https://github.com/Varritech/openai-agents-starter
cd openai-agents-starter
npm install
```

### Environment Configuration

Create `.env`:

```bash
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:pass@localhost:5432/agents_db
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Database Setup

```bash
npm run db:migrate
```

This creates:
- `conversations` table (conversation metadata)
- `messages` table (individual messages with tokens)
- `agent_runs` table (execution traces)
- `tool_calls` table (external API calls)

### Run Locally

```bash
npm run dev
```

Test it:

```bash
curl http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Debug this Python function that keeps returning null",
    "context": {"code": "def fetch_data(url): ..."}
  }'
```

You should get a response in <2 seconds. If it's slower, check your database connection.

---

## Step 2: Understanding the Agents API

The Agents API has three core concepts:

### 1. Agents

An agent is more than just a system prompt. It's:
- Instructions (behavior guidelines)
- Tools (functions it can call)
- Handoffs (routes to other agents)
- Memory config (what to persist)

Example:

```typescript
import { Agent } from '@openai/agents';

const codingAgent = new Agent({
  name: 'coding-agent',
  instructions: [
    'You are a senior software engineer.',
    'Always ask clarifying questions before suggesting fixes.',
    'Provide code examples with explanations.',
    'Flag security concerns immediately.'
  ],
  tools: [codeInterpreter, githubSearch],
  handoffs: [researchAgent],
  memory: {
    enabled: true,
    maxTurns: 50
  }
});
```

### 2. Tools

Tools are functions the agent can call. They must be:
- **Idempotent**: Safe to retry
- **Fast**: <5 second execution time
- **Observable**: Log inputs/outputs
- **Safe**: Validate all inputs

Example tool:

```typescript
const webSearchTool = {
  name: 'web_search',
  description: 'Search the web for current information',
  parameters: {
    query: { type: 'string', required: true },
    numResults: { type: 'number', default: 5 }
  },
  execute: async ({ query, numResults }) => {
    const results = await tavily.search({ query, numResults });
    return results.map(r => ({ title: r.title, url: r.url, snippet: r.snippet }));
  }
};
```

### 3. Handoffs

Handoffs let agents delegate to specialists:

```typescript
const orchestrator = new Agent({
  name: 'orchestrator',
  instructions: 'Route requests to the appropriate specialist agent.',
  handoffs: [codingAgent, researchAgent, supportAgent]
});
```

When a user asks "Why is my React component re-rendering?", the orchestrator hands off to `codingAgent`. When they ask "What's the latest news on quantum computing?", it hands off to `researchAgent`.

---

## Step 3: Production Deployment

### Option A: Vercel (Fastest)

```bash
vercel deploy --prod
```

Vercel handles:
- Auto-scaling
- Edge caching
- SSL certificates
- DDoS protection

Add environment variables in Vercel dashboard. Done.

### Option B: Fly.io (More Control)

```bash
fly launch
fly postgres create --name agents-db
fly apps open agents-db
fly deploy
```

Fly gives you:
- Global regions (deploy close to users)
- Persistent volumes
- Private networking
- Better cost control at scale

### Option C: Kubernetes (Maximum Control)

See `kubernetes/` directory for:
- Helm charts
- HorizontalPodAutoscaler configs
- Ingress rules
- Network policies

Only choose this if you need custom networking or have compliance requirements.

---

## Step 4: Observability & Monitoring

You can't improve what you don't measure. Track these metrics:

### Essential Metrics

1. **Latency**: p50, p95, p99 response times
2. **Token Usage**: Input/output tokens per request
3. **Cost**: USD per conversation
4. **Error Rate**: Failed requests / total requests
5. **Handoff Rate**: How often agents delegate

### Implementation

We use OpenTelemetry + Prometheus:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('agents-api');

async function handleRequest(req) {
  return tracer.startActiveSpan('handle_request', async (span) => {
    span.setAttribute('user.id', req.userId);
    span.setAttribute('agent.name', req.agentName);
    
    try {
      const result = await processRequest(req);
      span.setAttribute('response.tokens', result.usage.totalTokens);
      return result;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Alerting

Set up alerts for:
- p95 latency > 5 seconds
- Error rate > 1%
- Daily cost > $100 (adjust based on scale)
- Token cache hit rate < 80%

Use PagerDuty, Slack, or email. Your choice.

---

## Step 5: Cost Optimization

At scale, every token matters. Here's how to cut costs 60-70%:

### 1. Token Caching

Cache frequent responses in Redis:

```typescript
const cacheKey = `cache:${hash(input)}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const response = await agent.run(input);
await redis.setex(cacheKey, 3600, JSON.stringify(response)); // 1 hour TTL
```

**Savings**: 40-50% for repetitive queries

### 2. Model Routing

Use cheaper models when possible:

```typescript
const model = input.complexity > 0.7 ? 'gpt-4o' : 'gpt-4o-mini';
```

**Savings**: 20-30% overall

### 3. Response Truncation

Don't generate verbose responses for simple queries:

```typescript
const maxTokens = input.type === 'simple' ? 500 : 2000;
```

**Savings**: 10-15%

### Real-World Costs

At 10,000 conversations/day:
- **Without optimization**: ~$450/day ($13.5K/month)
- **With optimization**: ~$135/day ($4K/month)

That's a **$9.5K/month** difference.

---

## Security Checklist

Before going live:

- [ ] API keys encrypted at rest (use AWS KMS or HashiCorp Vault)
- [ ] Rate limiting per IP/user (prevent abuse)
- [ ] Input sanitization (prevent prompt injection)
- [ ] Output filtering (block harmful content)
- [ ] Audit logging (track all agent actions)
- [ ] CORS configured (restrict allowed origins)
- [ ] HTTPS enforced (no exceptions)

---

## Common Pitfalls

### 1. Infinite Loops

Agents can get stuck in handoff loops. Prevent with:

```typescript
const maxHandoffs = 3;
if (handoffCount > maxHandoffs) {
  throw new Error('Max handoffs exceeded');
}
```

### 2. Memory Leaks

Conversation history grows unbounded. Fix with:

```typescript
const recentMessages = messages.slice(-50); // Keep last 50 turns
```

### 3. Tool Timeout

External APIs hang. Always set timeouts:

```typescript
const result = await Promise.race([
  tool.execute(params),
  timeout(5000) // 5 second max
]);
```

### 4. Cost Surprises

Set hard limits:

```typescript
if (estimatedCost > maxBudget) {
  throw new Error('Budget exceeded');
}
```

---

## Next Steps

This starter gets you to production in days, not weeks. But you'll need to customize:

1. **Add your tools**: Integrate your internal APIs, databases, services
2. **Tune instructions**: Refine agent behavior for your use case
3. **Set up monitoring**: Connect your observability stack
4. **Load test**: Verify it handles your expected traffic
5. **Deploy**: Push to production and monitor closely

---

## Need Help?

Building agents is hard. Scaling them is harder.

**Varritech** specializes in production AI systems. We've shipped:
- Customer support agents handling 50K+ conversations/month
- Code review agents integrated into CI/CD pipelines
- Research agents automating market analysis

If you're stuck or need a hand, reach out: [christian@varritech.com](mailto:christian@varritech.com)

---

**Fork this repo. Build something great. Ship it.**

*MIT License © 2026 Varritech*
