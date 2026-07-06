import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SavedFilter {
  id: string
  name: string
  query: string
}

interface SettingsState {
  /** AI 관계 추천 ON/OFF (기본 OFF) */
  aiSuggest: boolean
  /** 그래프에 태그 노드 표시 */
  showTags: boolean
  /** 그래프에 컬렉션 노드 + 멤버십 표시 */
  showCollections: boolean
  /** 검색/필터 시 비매칭 노드를 흐리게(false) 대신 완전히 숨김(true) */
  hideUnmatched: boolean
  /** 저장된 필터(검색어) 프리셋 */
  savedFilters: SavedFilter[]
  /** 패널 너비(px) */
  railWidth: number
  listWidth: number
  setRailWidth: (v: number) => void
  setListWidth: (v: number) => void
  setAiSuggest: (v: boolean) => void
  setShowTags: (v: boolean) => void
  setShowCollections: (v: boolean) => void
  setHideUnmatched: (v: boolean) => void
  addSavedFilter: (name: string, query: string) => void
  removeSavedFilter: (id: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      aiSuggest: false,
      showTags: true,
      showCollections: true,
      hideUnmatched: false,
      savedFilters: [],
      railWidth: 220,
      listWidth: 248,
      setRailWidth: (v) => set({ railWidth: Math.max(160, Math.min(400, v)) }),
      setListWidth: (v) => set({ listWidth: Math.max(180, Math.min(500, v)) }),
      setAiSuggest: (v) => set({ aiSuggest: v }),
      setShowTags: (v) => set({ showTags: v }),
      setShowCollections: (v) => set({ showCollections: v }),
      setHideUnmatched: (v) => set({ hideUnmatched: v }),
      addSavedFilter: (name, query) =>
        set((s) => ({
          savedFilters: [...s.savedFilters, { id: crypto.randomUUID(), name, query }]
        })),
      removeSavedFilter: (id) =>
        set((s) => ({ savedFilters: s.savedFilters.filter((f) => f.id !== id) }))
    }),
    { name: 'linkmap-settings' }
  )
)
