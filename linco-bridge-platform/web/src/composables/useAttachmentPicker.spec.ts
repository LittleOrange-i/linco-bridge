import { describe, expect, it, vi } from 'vitest'

vi.stubGlobal('document', undefined)

const { useAttachmentPicker } = await import('@/composables/useAttachmentPicker')

describe('useAttachmentPicker (Web)', () => {
  it('uses the browser file input', async () => {
    const createElement = vi.fn(() => {
      const input = { type: '', multiple: false, accept: '', files: [], click: vi.fn() }
      return input
    })
    vi.stubGlobal('document', { createElement })
    const picker = useAttachmentPicker()
    const promise = picker.pickFiles()
    await Promise.resolve()
    expect(createElement).toHaveBeenCalledWith('input')
    const input = createElement.mock.results[0]?.value as {
      click: () => void
      onchange?: () => void
    }
    input.onchange?.()
    await promise
  })
})
