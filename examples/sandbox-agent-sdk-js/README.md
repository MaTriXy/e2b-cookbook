# Sandbox Agent SDK in E2B Sandbox (JavaScript)

This example shows how to run [Sandbox Agent](https://github.com/rivet-dev/sandbox-agent) inside an E2B sandbox, then connect to it using the Sandbox Agent TypeScript SDK.

## What this example does

1. Creates an E2B sandbox.
2. Installs Sandbox Agent CLI in the sandbox.
3. Installs a coding agent (`codex`, `claude`, or any `SANDBOX_AGENT` value).
4. Starts `sandbox-agent server` in the sandbox.
5. Connects with `SandboxAgent.connect(...)` and creates a session.

## Why use Sandbox Agent SDK?

Running coding agents remotely is hard. Existing SDKs assume local execution, SSH breaks streaming and interactive workflows, and every coding agent has a different API.

Building this from scratch usually means rewriting everything for each coding agent.

Sandbox Agent solves three problems:

- **Coding agents need sandboxes:** You can't let AI execute arbitrary code on your production servers. Sandbox Agent runs inside the E2B sandbox and exposes HTTP/SSE.
- **Every coding agent is different:** Claude Code, Codex, OpenCode, Cursor, Amp, and Pi each have proprietary APIs and event formats. Sandbox Agent provides one API, so swapping agents is a config change (`SANDBOX_AGENT`) instead of a rewrite.
- **Sessions are ephemeral:** Agent transcripts often die with the sandbox/process. Sandbox Agent emits a universal event schema so you can store, replay, and audit sessions outside the sandbox lifecycle.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```bash
E2B_API_KEY=your_e2b_api_key

# Provide at least one provider key, unless SANDBOX_AGENT points to a compatible preinstalled agent
OPENAI_API_KEY=your_openai_api_key
# CODEX_API_KEY=your_codex_api_key
# ANTHROPIC_API_KEY=your_anthropic_api_key

# Optional: any specific agent id
# SANDBOX_AGENT=codex
```

3. Run the example:

```bash
npm run start
```

The script prints an Inspector URL once the server and session are ready, then exits after cleanup.

## Notes

- If `SANDBOX_AGENT` is set, that exact agent ID is used.
- If `SANDBOX_AGENT` is not set, the script defaults to `codex` when OpenAI/Codex keys exist, otherwise `claude` when Anthropic key exists.
- API keys are available to processes running inside the sandbox.
