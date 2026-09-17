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
  tagFormEditId: string | null
  relationSourceId: string | null
  relationSourceKind: NodeKind | null
  relationTargetId: string | null
  collectionFormOpen: boolean
  collectionFormParentId: string | null
  collectionPickerLinkId: string | null
  settingsOpen: boolean
  folderImportOpen: boolean
  /** 동기화 미리보기 다이얼로그 대상 태그 id — null이면 닫힘 */
  folderSyncTagId: string | null
  /** 동기화 범위(제외 목록) 편집 다이얼로그 대상 태그 id — null이면 닫힘 */
  folderExclusionTagId: string | null

  selectNode: (id: string | null, kind?: NodeKind | null) => void
  setTab: (tab: DetailTab) => void
  setView: (view: ActiveView) => void
  setSearch: (q: string) => void
  setLayout: (l: LayoutMode) => void
  focusNode: (id: string) => void

  openLinkForm: (prefill?: Partial<CreateLinkInput> | null, editId?: string | null) => void
  closeLinkForm: () => void
  /** editId를 주면 해당 태그를 수정하는 모드로 연다 */
  openTagForm: (editId?: string | null) => void
  closeTagForm: () => void
  openRelationDialog: (sourceId: string, sourceKind: NodeKind, targetId?: string | null) => void
  closeRelationDialog: () => void
  openCollectionForm: (parentId?: string | null) => void
  closeCollectionForm: () => void
  openCollectionPicker: (linkId: string) => void
  closeCollectionPicker: () => void
  openSettings: () => void
  closeSettings: () => void
  openFolderImport: () => void
  closeFolderImport: () => void
  openFolderSync: (tagId: string) => void
  closeFolderSync: () => void
  openFolderExclusion: (tagId: string) => void
  closeFolderExclusion: () => void
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
  tagFormEditId: null,
  relationSourceId: null,
  relationSourceKind: null,
  relationTargetId: null,
  collectionFormOpen: false,
  collectionFormParentId: null,
  collectionPickerLinkId: null,
  settingsOpen: false,
  folderImportOpen: false,
  folderSyncTagId: null,
  folderExclusionTagId: null,

  selectNode: (id, kind = 'link') => set({ selectedNodeId: id, selectedKind: id ? kind : null }),
  setTab: (tab) => set({ activeTab: tab }),
  setView: (view) => set({ activeView: view }),
  setSearch: (q) => set({ searchQuery: q }),
  setLayout: (l) => set({ layout: l }),
  focusNode: (id) => set((s) => ({ focusNodeId: id, focusNonce: s.focusNonce + 1 })),

  openLinkForm: (prefill = null, editId = null) =>
    set({ linkFormOpen: true, linkFormPrefill: prefill, linkFormEditId: editId }),
  closeLinkForm: () => set({ linkFormOpen: false, linkFormPrefill: null, linkFormEditId: null }),
  openTagForm: (editId = null) => set({ tagFormOpen: true, tagFormEditId: editId }),
  closeTagForm: () => set({ tagFormOpen: false, tagFormEditId: null }),
  openRelationDialog: (sourceId, sourceKind, targetId = null) =>
    set({ relationSourceId: sourceId, relationSourceKind: sourceKind, relationTargetId: targetId }),
  closeRelationDialog: () =>
    set({ relationSourceId: null, relationSourceKind: null, relationTargetId: null }),
  openCollectionForm: (parentId = null) =>
    set({ collectionFormOpen: true, collectionFormParentId: parentId }),
  closeCollectionForm: () => set({ collectionFormOpen: false, collectionFormParentId: null }),
  openCollectionPicker: (linkId) => set({ collectionPickerLinkId: linkId }),
  closeCollectionPicker: () => set({ collectionPickerLinkId: null }),
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openFolderImport: () => set({ folderImportOpen: true }),
  closeFolderImport: () => set({ folderImportOpen: false }),
  openFolderSync: (tagId) => set({ folderSyncTagId: tagId }),
  closeFolderSync: () => set({ folderSyncTagId: null }),
  openFolderExclusion: (tagId) => set({ folderExclusionTagId: tagId }),
  closeFolderExclusion: () => set({ folderExclusionTagId: null })
}))
