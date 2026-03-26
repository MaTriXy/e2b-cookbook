# Sandbox Agent SDK in E2B Sandbox (JavaScript)

Run [Sandbox Agent](https://github.com/rivet-dev/sandbox-agent) inside E2B, then control it with the [Sandbox Agent SDK](https://sandboxagent.dev/docs/sdk-overview) (npm: [`sandbox-agent`](https://www.npmjs.com/package/sandbox-agent)).

## Why use Sandbox Agent SDK

Running coding agents remotely is hard: local-first SDK assumptions, SSH streaming/TTY issues, and agent-specific APIs.

Sandbox Agent SDK gives you one API for:

- Session lifecycle
- Prompt/send calls
- Streaming events

Sessions are ephemeral by default. For replay/audit, see [session persistence](https://sandboxagent.dev/docs/session-persistence).

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```bash
E2B_API_KEY=your_e2b_api_key

# At least one provider key
OPENAI_API_KEY=your_openai_api_key
# ANTHROPIC_API_KEY=your_anthropic_api_key
```

Provider credential options for other agents: [Sandbox Agent credentials docs](https://sandboxagent.dev/docs/llm-credentials).

3. Run:

```bash
npm run start
```

This starts up your Sandbox Agent and connects it to your E2B Sandbox. To run one prompt and stream events, uncomment the block in `src/index.ts`.

## References

- [Sandbox Agent SDK docs](https://sandboxagent.dev/docs/sdk-overview)
- [Sandbox Agent session persistence](https://sandboxagent.dev/docs/session-persistence)
- [Sandbox Agent credentials](https://sandboxagent.dev/docs/credentials)
- [E2B AMP guide](https://e2b.dev/docs/agents/amp)
