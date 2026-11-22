import { describe, expect, it } from 'vitest'

import {
  BRIDGE_CONNECT_CHANNEL,
  buildInitCommand,
  buildSetupCommands,
  defaultAccountId,
  DEFAULT_BRIDGE_WS_URL,
  getAgentDisplayName,
  getConnectAgentFlag,
  isLocalAgentType,
  parseAgentBridgeType,
} from '@/bridge/commands'

describe('bridge/commands', () => {
  const params = {
    appId: 'app-123',

    appSecret: 'secret-456',
  }

  it('buildInitCommand keeps first-time setup minimal (no channel/account/ws flags)', () => {
    expect(buildInitCommand('codex', params)).toBe(
      [
        `linco-connect init --token "app-123:secret-456"`,

        `--agent codex`,
      ].join(' '),
    )
  })

  it('buildInitCommand matches openclaw agent flag', () => {
    expect(buildInitCommand('openclaw', params)).toBe(
      [
        `linco-connect init --token "app-123:secret-456"`,

        `--agent openclaw`,
      ].join(' '),
    )
  })

  it('buildInitCommand embeds ws-url override without insecure flag for private hosts', () => {
    const customWs = `${DEFAULT_BRIDGE_WS_URL}/codex`
    expect(
      buildInitCommand('codex', {
        ...params,
        wsUrl: customWs,
      }),
    ).toBe(
      [
        `linco-connect init --token "app-123:secret-456"`,
        `--agent codex`,
        `--ws-url ${customWs}`,
      ].join(' '),
    )
  })

  it('buildInitCommand adds account slot only when explicitly provided', () => {
    expect(
      buildInitCommand('codex', {
        ...params,
        accountId: 'codex_1',
      }),
    ).toBe(
      [
        `linco-connect init --token "app-123:secret-456"`,
        `--agent codex`,
        `--account codex_1`,
      ].join(' '),
    )
  })

  it('buildInitCommand requires explicit insecure opt-in for public ws:// hosts', () => {
    const publicWs = 'ws://bridge.example.com/bridge/ws/codex'
    expect(
      buildInitCommand('codex', {
        ...params,
        wsUrl: publicWs,
      }),
    ).toBe(
      [
        `linco-connect init --token "app-123:secret-456"`,
        `--agent codex`,
        `--ws-url ${publicWs}`,
        '--allow-insecure-ws',
      ].join(' '),
    )
  })

  it('buildSetupCommands preserves command block structure', () => {
    const commands = buildSetupCommands('claude', {
      appId: 'a',

      appSecret: 'b',

      accountId: 'claude_1',
    })

    expect(commands).toBe(
      [
        'npm install -g linco-connect',

        '',

        [
          `linco-connect init --token "a:b"`,

          `--agent claude`,

          `--account claude_1`,
        ].join(' '),

        '',

        'linco-connect start --daemon',
      ].join('\n'),
    )
  })

  it('BRIDGE_CONNECT_CHANNEL matches connector linco-bridge preset', () => {
    expect(BRIDGE_CONNECT_CHANNEL).toBe('linco-bridge')
  })

  it('defaultAccountId follows Flutter naming', () => {
    expect(defaultAccountId('openclaw')).toBe('openclaw_1')

    expect(defaultAccountId('hermes')).toBe('hermes_1')
  })

  it('getAgentDisplayName returns Flutter labels', () => {
    expect(getAgentDisplayName('claude')).toBe('Claude Code')

    expect(getAgentDisplayName('codex')).toBe('Codex')
    expect(getAgentDisplayName('deepseek')).toBe('DeepSeek Harness')
  })

  it('getConnectAgentFlag maps bridge types to CLI flags', () => {
    expect(getConnectAgentFlag('openclaw')).toBe('openclaw')

    expect(getConnectAgentFlag('claude')).toBe('claude')
  })

  it('isLocalAgentType excludes openclaw', () => {
    expect(isLocalAgentType('codex')).toBe(true)
    expect(isLocalAgentType('deepseek')).toBe(true)

    expect(isLocalAgentType('openclaw')).toBe(false)
  })

  it('parseAgentBridgeType normalizes valid values', () => {
    expect(parseAgentBridgeType(' OpenClaw ')).toBe('openclaw')
    expect(parseAgentBridgeType(' DeepSeek ')).toBe('deepseek')

    expect(parseAgentBridgeType('invalid')).toBeNull()
  })
})
