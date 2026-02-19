import 'dotenv/config'
import { setTimeout as delay } from 'node:timers/promises'
import { Sandbox } from 'e2b'
import { SandboxAgent } from 'sandbox-agent'

const SERVER_PORT = 3000
const SANDBOX_AGENT_CLI_VERSION = '0.2.x'
const E2B_TEMPLATE = process.env.E2B_TEMPLATE?.trim() || 'base'
const HEALTH_TIMEOUT_MS = 120_000

function chooseAgent(envs: Record<string, string>): string {
  if (envs.OPENAI_API_KEY || envs.CODEX_API_KEY) return 'codex'
  if (envs.ANTHROPIC_API_KEY) return 'claude'
  throw new Error('Set OPENAI_API_KEY/CODEX_API_KEY or ANTHROPIC_API_KEY')
}

async function waitForHealth(baseUrl: string): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/v1/health`, {
        signal: AbortSignal.timeout(5_000),
      })

      if (response.ok) {
        const data = await response.json()
        if (data?.status === 'ok') return
      }
    } catch {
      // Ignore transient startup failures while polling health.
    }

    await delay(500)
  }

  throw new Error('Timed out waiting for Sandbox Agent health endpoint')
}

const envs: Record<string, string> = {}
if (process.env.ANTHROPIC_API_KEY) envs.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
if (process.env.OPENAI_API_KEY) envs.OPENAI_API_KEY = process.env.OPENAI_API_KEY
if (process.env.CODEX_API_KEY) envs.CODEX_API_KEY = process.env.CODEX_API_KEY
if (!envs.CODEX_API_KEY && envs.OPENAI_API_KEY) envs.CODEX_API_KEY = envs.OPENAI_API_KEY

const agent = chooseAgent(envs)

console.log(`Creating E2B sandbox from template "${E2B_TEMPLATE}"...`)
const sandbox = await Sandbox.create(E2B_TEMPLATE, { envs })
let sdk: SandboxAgent | undefined

try {
  console.log(`E2B sandbox ID: ${sandbox.sandboxId}`)

  const run = async (command: string) => {
    const result = await sandbox.commands.run(command)
    if (result.exitCode !== 0) {
      throw new Error(
        `Command failed (${result.exitCode}): ${command}\n${(result.stderr || result.stdout || '').trim()}`,
      )
    }
  }

  console.log('Installing Sandbox Agent CLI...')
  await run(
    `bash -lc 'set -euo pipefail; curl -fsSL https://releases.rivet.dev/sandbox-agent/${SANDBOX_AGENT_CLI_VERSION}/install.sh | sh; sandbox-agent --version'`,
  )

  console.log(`Installing agent (${agent})...`)
  await run(`sandbox-agent install-agent ${agent}`)

  console.log('Starting Sandbox Agent server...')
  await run(`sandbox-agent --no-token server --host 0.0.0.0 --port ${SERVER_PORT} >/tmp/sandbox-agent.log 2>&1 &`)
  await run("sleep 1; pgrep -af 'sandbox-agent.*server' >/dev/null")

  const baseUrl = `https://${sandbox.getHost(SERVER_PORT)}`
  console.log('Waiting for /v1/health...')
  await waitForHealth(baseUrl)

  sdk = await SandboxAgent.connect({ baseUrl })
  const session = await sdk.createSession({ agent })

  console.log('Sandbox Agent is ready.')
  console.log(`Inspector URL: ${baseUrl}/ui/sessions/${encodeURIComponent(session.id)}`)

  // Uncomment to run one prompt and stream events in your terminal.
  // const off = session.onEvent((event) => {
  //   console.log(`[event] ${event.type}`)
  // })
  // await session.prompt([{ type: 'text', text: 'Reply with exactly: sandbox-agent-ready' }])
  // off()
} finally {
  if (sdk) {
    try {
      await sdk.dispose()
    } catch {
      // Ignore dispose errors during shutdown.
    }
  }
  await sandbox.kill()
}
