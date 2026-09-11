import express from 'express';
import { Agent } from '@openai/agents';
import { z } from 'zod';

const app = express();
app.use(express.json());

// Coding agent with specialized instructions
const codingAgent = new Agent({
  name: 'coding-agent',
  model: 'gpt-4o',
  instructions: [
    'You are a senior software engineer.',
    'Always ask clarifying questions before suggesting fixes.',
    'Provide code examples with clear explanations.',
    'Flag security concerns immediately.',
    'Prefer simple, maintainable solutions over clever ones.'
  ],
  tools: [],
  handoffs: []
});

// Research agent for web searches
const researchAgent = new Agent({
  name: 'research-agent',
  model: 'gpt-4o',
  instructions: [
    'You are a research assistant.',
    'Always cite sources with URLs.',
    'Distinguish between facts and opinions.',
    'Flag outdated or uncertain information.'
  ],
  tools: [],
  handoffs: []
});

// Orchestrator routes to specialists
const orchestrator = new Agent({
  name: 'orchestrator',
  model: 'gpt-4o-mini',
  instructions: 'Route requests to the appropriate specialist agent based on intent.',
  handoffs: [codingAgent, researchAgent]
});

app.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await orchestrator.run(message, {
      context,
      maxTurns: 10
    });

    res.json({
      response: result.output,
      usage: result.usage,
      traceId: result.traceId
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Agent server running on port ${PORT}`);
});

export default app;
