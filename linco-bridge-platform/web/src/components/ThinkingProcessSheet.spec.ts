import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ThinkingProcessSheet from '@/components/ThinkingProcessSheet.vue'
import type { AgentTrace } from '@/bridge/types'

function trace(status = 'running', count = 1): AgentTrace {
  return {
    task: { status: status === 'running' ? 'task_running' : 'task_success' },
    actions: Array.from({ length: count }, (_, index) => ({
      id: `action-${index}`,
      type: 'tool',
      status,
      label: `Action ${index}`,
    })),
  }
}

const stubs = {
  AgentTraceActionCard: { template: '<div>{{ action.id }}</div>', props: ['action'] },
}

describe('ThinkingProcessSheet follow behavior (Web)', () => {
  it('renders a completed trace', async () => {
    const wrapper = mount(ThinkingProcessSheet, {
      props: { visible: true, trace: trace('completed', 2), streaming: false },
      global: { stubs },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.thinking-sheet').exists()).toBe(true)
  })

  it('renders a streaming trace', async () => {
    const wrapper = mount(ThinkingProcessSheet, {
      props: { visible: true, trace: trace('running', 1), streaming: true },
      global: { stubs },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('action-0')
  })
})
