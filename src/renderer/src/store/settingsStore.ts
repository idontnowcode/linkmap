import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  /** AI 관계 추천 ON/OFF (기본 OFF) */
  aiSuggest: boolean
  /** 그래프에 태그 노드 표시 */
  showTags: boolean
  /** 그래프에 컬렉션 노드 + 멤버십 표시 */
  showCollections: boolean
  setAiSuggest: (v: boolean) => void
  setShowTags: (v: boolean) => void
  setShowCollections: (v: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      aiSuggest: false,
      showTags: true,
      showCollections: true,
      setAiSuggest: (v) => set({ aiSuggest: v }),
      setShowTags: (v) => set({ showTags: v }),
      setShowCollections: (v) => set({ showCollections: v })
    }),
    { name: 'linkmap-settings' }
  )
)
