import { create } from 'zustand'
import type { CreateLinkInput, NodeKind } from '@shared/types'

export type DetailTab = 'details' | 'relations' | 'notes' | 'preview'
export type LayoutMode = 'force' | 'hierarchical' | 'radial'

export type ActiveView =
  | { kind: 'smart'; id: 'all' | 'favorites' | 'recent' | 'trash' }
  | { kind: 'tag'; id: string }
  | { kind: 'collection'; id: string }

interface UiState {
  selectedNodeId: string | null
  selectedKind: NodeKind | null
  activeTab: DetailTab
  activeView: ActiveView
  searchQuery: string
  layout: LayoutMode

  // 그래프 포커스 신호 (LinkCard 클릭 → 캔버스 센터링)
  focusNodeId: string | null
  focusNonce: number

  // 다이얼로그
  linkFormOpen: boolean
  linkFormPrefill: Partial<CreateLinkInput> | null
  linkFormEditId: string | null
  tagFormOpen: boolean
  relationSourceId: string | null
  relationSourceKind: NodeKind | null
  collectionFormOpen: boolean
  collectionPickerLinkId: string | null

  selectNode: (id: string | null, kind?: NodeKind | null) => void
  setTab: (tab: DetailTab) => void
  setView: (view: ActiveView) => void
  setSearch: (q: string) => void
  setLayout: (l: LayoutMode) => void
  focusNode: (id: string) => void

  openLinkForm: (prefill?: Partial<CreateLinkInput> | null, editId?: string | null) => void
  closeLinkForm: () => void
  openTagForm: () => void
  closeTagForm: () => void
  openRelationDialog: (sourceId: string, sourceKind: NodeKind) => void
  closeRelationDialog: () => void
  openCollectionForm: () => void
  closeCollectionForm: () => void
  openCollectionPicker: (linkId: string) => void
  closeCollectionPicker: () => void
}

export const useUiStore = create<UiState>((set) => ({
  selectedNodeId: null,
  selectedKind: null,
  activeTab: 'details',
  activeView: { kind: 'smart', id: 'all' },
  searchQuery: '',
  layout: 'force',

  focusNodeId: null,
  focusNonce: 0,

  linkFormOpen: false,
  linkFormPrefill: null,
  linkFormEditId: null,
  tagFormOpen: false,
  relationSourceId: null,
  relationSourceKind: null,
  collectionFormOpen: false,
  collectionPickerLinkId: null,

  selectNode: (id, kind = 'link') => set({ selectedNodeId: id, selectedKind: id ? kind : null }),
  setTab: (tab) => set({ activeTab: tab }),
  setView: (view) => set({ activeView: view }),
  setSearch: (q) => set({ searchQuery: q }),
  setLayout: (l) => set({ layout: l }),
  focusNode: (id) => set((s) => ({ focusNodeId: id, focusNonce: s.focusNonce + 1 })),

  openLinkForm: (prefill = null, editId = null) =>
    set({ linkFormOpen: true, linkFormPrefill: prefill, linkFormEditId: editId }),
  closeLinkForm: () => set({ linkFormOpen: false, linkFormPrefill: null, linkFormEditId: null }),
  openTagForm: () => set({ tagFormOpen: true }),
  closeTagForm: () => set({ tagFormOpen: false }),
  openRelationDialog: (sourceId, sourceKind) =>
    set({ relationSourceId: sourceId, relationSourceKind: sourceKind }),
  closeRelationDialog: () => set({ relationSourceId: null, relationSourceKind: null }),
  openCollectionForm: () => set({ collectionFormOpen: true }),
  closeCollectionForm: () => set({ collectionFormOpen: false }),
  openCollectionPicker: (linkId) => set({ collectionPickerLinkId: linkId }),
  closeCollectionPicker: () => set({ collectionPickerLinkId: null })
}))
