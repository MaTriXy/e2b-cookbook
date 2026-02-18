# Sandbox Agent SDK in E2B Sandbox (JavaScript)

This example shows how to run [Sandbox Agent](https://github.com/rivet-dev/sandbox-agent) inside an E2B sandbox, then connect to it using the [Sandbox Agent TypeScript SDK](https://sandboxagent.dev/docs/sdk-overview) (npm: [`sandbox-agent`](https://www.npmjs.com/package/sandbox-agent)).

## What this example does

1. Creates an E2B sandbox.
2. Installs Sandbox Agent CLI in the sandbox.
3. Installs a coding agent (for example `codex` or `claude`).
4. Starts `sandbox-agent server` in the sandbox.
5. Connects with `SandboxAgent.connect(...)` and creates a session.

## Why use Sandbox Agent SDK?

Running coding agents remotely is hard. Existing SDKs assume local execution, SSH breaks streaming and interactive workflows, and every coding agent has a different API.

Building this from scratch usually means rewriting everything for each coding agent.

Sandbox Agent solves three problems:

- **Coding agents need sandboxes:** You can't let AI execute arbitrary code on your production servers. Sandbox Agent runs inside the E2B sandbox and exposes HTTP/SSE.
- **Every coding agent is different:** Claude Code, Codex, OpenCode, Cursor, Amp, and Pi each have proprietary APIs and event formats. Sandbox Agent provides one API, so swapping agents is a config change instead of a rewrite.
- **Sessions are ephemeral:** Agent transcripts often die with the sandbox/process. Sandbox Agent emits a universal event schema so you can store, replay, and audit sessions outside the sandbox lifecycle.

## Features

- **Universal Agent API**

Claude Code, Codex, OpenCode, and Amp each have different APIs. Sandbox Agent exposes one HTTP API that works across all of them.

- **Streaming Events**

Real-time SSE stream of everything the agent does. Persist to your storage, replay sessions, audit everything.

- **Universal Schema**

Standardized session schema that covers all features of all agents. Includes tool calls, permission requests, file edits, etc.

- **Full Session Lifecycle Management**

Create sessions, send messages, persist transcripts. Full session lifecycle management over HTTP.

- **OpenCode Support**

Experimental.

Connect OpenCode CLI, SDK, or web UI to control agents through familiar OpenCode tooling.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```bash
E2B_API_KEY=your_e2b_api_key

# Provide at least one provider key
OPENAI_API_KEY=your_openai_api_key
# CODEX_API_KEY=your_codex_api_key
# ANTHROPIC_API_KEY=your_anthropic_api_key

# Other agents may require additional credentials. Set any extra provider keys as environment variables.

# Optional: select which agent to run
# AGENT=codex
```

3. Run the example:

```bash
npm run start
```

The script prints an Inspector URL once the server and session are ready, then exits after cleanup.

To keep the sandbox running so you can open the Inspector URL, run:

```bash
KEEP_ALIVE=1 npm run start
```

## Notes

- If `AGENT` is set, that agent is used.
- If `AGENT` is not set, the script defaults to `codex` when OpenAI/Codex keys exist, otherwise `claude` when Anthropic key exists.
- API keys are available to processes running inside the sandbox.

## References

- [Sandbox Agent SDK docs](https://sandboxagent.dev/docs/sdk-overview)
- [`sandbox-agent` npm package](https://www.npmjs.com/package/sandbox-agent)
