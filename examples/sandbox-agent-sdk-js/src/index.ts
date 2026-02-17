import 'dotenv/config'
import { Sandbox } from 'e2b'
import { SandboxAgent } from 'sandbox-agent'

const SERVER_TOKEN = 'sandbox-agent-e2b-demo-token'
const KEEP_ALIVE = process.env.KEEP_ALIVE === '1'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function detectAgent(envs: Record<string, string>): string {
  const explicitAgent = process.env.AGENT?.trim()
  if (explicitAgent) return explicitAgent

  if (envs.OPENAI_API_KEY || envs.CODEX_API_KEY) return 'codex'
  if (envs.ANTHROPIC_API_KEY) return 'claude'

  throw new Error('Set AGENT or provide OPENAI_API_KEY/CODEX_API_KEY/ANTHROPIC_API_KEY')
}

function inspectorUrl(baseUrl: string, token: string, sessionId: string): string {
  return `${baseUrl}/ui/?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`
}

async function waitForHealth(baseUrl: string, token: string): Promise<void> {
  const deadline = Date.now() + 120_000

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/v1/health`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5_000),
      })

      if (response.ok) {
        const data = await response.json()
        if (data?.status === 'ok') return
      }
    } catch {
      // Ignore transient startup failures while polling health.
    }

    await sleep(500)
  }

  throw new Error('Timed out waiting for Sandbox Agent server health check')
}

const envs: Record<string, string> = {}
if (process.env.ANTHROPIC_API_KEY) envs.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (process.env.OPENAI_API_KEY) envs.OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (process.env.CODEX_API_KEY) envs.CODEX_API_KEY = process.env.CODEX_API_KEY
if (!envs.CODEX_API_KEY && envs.OPENAI_API_KEY) envs.CODEX_API_KEY = envs.OPENAI_API_KEY

const agent = detectAgent(envs)

console.log('Creating E2B sandbox...')
const sandbox = await Sandbox.create({ envs })
let client: SandboxAgent | undefined

try {
  console.log(`E2B sandbox ID: ${sandbox.sandboxId}`)

  if (KEEP_ALIVE) {
    // If the runtime closes a long-lived connection (SSE/stream), don't crash and
    // implicitly delete the sandbox. In KEEP_ALIVE mode we want the sandbox to stay up.
    process.on('unhandledRejection', (error) => {
      console.error('Unhandled rejection:', error)
    })
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
    })

    const cleanupAndExit = async (code: number) => {
      try {
        if (client) await client.dispose()
      } catch {
        // ignore
      }
      try {
        await sandbox.kill()
      } catch (error) {
        console.error('Failed to kill sandbox:', error)
      }
      process.exit(code)
    }

    process.once('SIGINT', () => void cleanupAndExit(0))
    process.once('SIGTERM', () => void cleanupAndExit(0))
  }

  const run = async (command: string) => {
    const result = await sandbox.commands.run(command)
    if (result.exitCode !== 0) {
      throw new Error(
        `Command failed (${result.exitCode}): ${command}\n${(result.stderr || result.stdout || '').trim()}`
      )
    }
  }

  console.log('Installing Sandbox Agent CLI...')
  await run(
    "bash -lc 'set -euo pipefail; curl -fsSL https://releases.rivet.dev/sandbox-agent/0.2.x/install.sh | sh; command -v sandbox-agent >/dev/null; sandbox-agent --version'"
  )

  console.log(`Installing agent (${agent})...`)
  await run(`sandbox-agent install-agent ${agent}`)

  console.log('Starting Sandbox Agent server...')
  await run(`sandbox-agent server --token ${SERVER_TOKEN} --host 0.0.0.0 --port 3000 >/tmp/sandbox-agent.log 2>&1 &`)
  await run("sleep 1; pgrep -af 'sandbox-agent server' >/dev/null")

  const baseUrl = `https://${sandbox.getHost(3000)}`

  console.log('Waiting for /v1/health...')
  await waitForHealth(baseUrl, SERVER_TOKEN)

  client = await SandboxAgent.connect({ baseUrl, token: SERVER_TOKEN })
  const session = await client.createSession({
    agent,
    sessionInit: { cwd: '/home/user', mcpServers: [] },
  })

  console.log('Sandbox Agent is ready.')
  console.log(`Inspector URL: ${inspectorUrl(baseUrl, SERVER_TOKEN, session.id)}`)

  // Optional: uncomment to run a prompt through the agent.
  // await session.prompt([{ type: 'text', text: 'Reply with exactly: sandbox-agent-ready' }])

  if (process.env.KEEP_ALIVE === '1') {
    // Close the SDK transport (streams/SSE) but keep the sandbox + server running.
    // The Inspector UI talks directly to the server URL.
    await client.dispose()
    client = undefined
    console.log('KEEP_ALIVE=1 set. Press Ctrl+C to stop and delete the sandbox.')
    // Keep process alive until interrupted so you can open the Inspector URL.
    while (true) {
      await sleep(60_000)
    }
  }
} finally {
  if (client) {
    try {
      await client.dispose()
    } catch {
      // Ignore dispose errors during shutdown.
    }
  }
  await sandbox.kill()
}
