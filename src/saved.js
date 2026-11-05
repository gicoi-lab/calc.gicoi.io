import { ref, watch } from 'vue'

// 輸入值存在 localStorage；隱私模式等無法存取時退回預設值
export const createStore = (prefix = 'calc:') => {
  const defaults = []
  const saved = (key, init) => {
    const init0 = structuredClone(init) // 另存副本：ref 會就地修改傳入的物件
    try {
      const s = localStorage.getItem(prefix + key)
      if (s !== null) init = JSON.parse(s)
    } catch {}
    const r = ref(init)
    defaults.push([r, init0])
    watch(r, v => {
      try { localStorage.setItem(prefix + key, JSON.stringify(v)) } catch {}
    }, { deep: true })
    return r
  }
  const reset = () => defaults.forEach(([r, d]) => (r.value = structuredClone(d)))
  return { saved, reset }
}
