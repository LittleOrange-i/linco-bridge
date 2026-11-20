import { ref } from 'vue'
import type { OutboundChatFile } from '@/api/session-api'
import { normalizeAttachmentMimeType } from '@/utils/chat-attachments'
import { prepareOutboundImages } from '@/utils/image-compress'
import { showToast } from '@/utils/format'

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const base64 = result.includes(',') ? (result.split(',')[1] ?? '') : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

function pickViaDocument(): Promise<OutboundChatFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.accept = 'image/*,text/*,.json,.xml,.csv,.log,.yaml,.yml,.md,.txt'
    input.onchange = () => {
      void (async () => {
        const files = Array.from(input.files ?? [])
        const result: OutboundChatFile[] = []
        for (const file of files) {
          result.push({
            name: file.name,
            mimeType: normalizeAttachmentMimeType(file.name, file.type),
            base64: await readFileAsBase64(file),
            localPath: '',
          })
        }
        resolve(result)
      })().catch(() => resolve([]))
    }
    input.click()
  })
}

export function useAttachmentPicker() {
  const pendingFiles = ref<OutboundChatFile[]>([])

  async function pickFiles(): Promise<OutboundChatFile[]> {
    const picked = await pickViaDocument()
    if (picked.length === 0) return []
    const prepared = await prepareOutboundImages(picked)
    pendingFiles.value = [...pendingFiles.value, ...prepared]
    showToast(`已选择 ${prepared.length} 个附件`, 'success')
    return prepared
  }

  function removeFile(index: number) {
    pendingFiles.value = pendingFiles.value.filter((_, idx) => idx !== index)
  }

  function clearFiles() {
    pendingFiles.value = []
  }

  return { pendingFiles, pickFiles, removeFile, clearFiles }
}
