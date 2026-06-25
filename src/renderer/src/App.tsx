import { useEffect, useState } from 'react'
import { useAppStore } from './store/appStore'
import { useUiStore } from './store/uiStore'
import { AppShell } from './app/layout/AppShell'
import { LinkFormDialog } from './features/links/LinkFormDialog'
import { TagFormDialog } from './features/tags/TagFormDialog'
import { RelationDialog } from './features/relations/RelationDialog'
import { CollectionFormDialog } from './features/collections/CollectionFormDialog'
import { CollectionPickerDialog } from './features/collections/CollectionPickerDialog'
import { SettingsDialog } from './features/settings/SettingsDialog'

export default function App(): JSX.Element {
  const load = useAppStore((s) => s.load)
  const loaded = useAppStore((s) => s.loaded)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    void load()
  }, [load])

  // 전역 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const ui = useUiStore.getState()
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        ui.openLinkForm()
      }
      if (e.key === 'Escape') ui.selectNode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // URL drag & drop → 새 링크 폼 (메타 자동 수집)
  useEffect(() => {
    const isInternalDrag = (e: DragEvent): boolean => {
      const t = e.dataTransfer?.types
      return (
        (t?.includes('application/x-linkmap-collection') ||
          t?.includes('application/x-linkmap-link')) ??
        false
      )
    }

    const onDragOver = (e: DragEvent): void => {
      if (isInternalDrag(e)) return // 사이드바 폴더 이동 드래그는 무시
      e.preventDefault()
      setDragging(true)
    }
    const onDragLeave = (e: DragEvent): void => {
      if (e.relatedTarget === null) setDragging(false)
    }
    const onDrop = async (e: DragEvent): Promise<void> => {
      if (isInternalDrag(e)) return // 폴더 이동은 사이드바에서 처리
      e.preventDefault()
      setDragging(false)

      // 1) 로컬 파일/폴더 드롭 (여러 개 가능)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length > 0) {
        const resolved = await Promise.all(
          files.map(async (f) => {
            const path = window.api.getPathForFile(f)
            if (!path) return null
            const info = await window.api.pathInfo(path)
            return { path, kind: info.kind, title: info.title, content: info.content }
          })
        )
        const items = resolved.filter((x): x is NonNullable<typeof x> => x !== null)
        if (items.length === 0) return

        if (items.length === 1) {
          // 하나면 폼을 열어 태그/설명을 바로 붙일 수 있게
          const it = items[0]
          useUiStore
            .getState()
            .openLinkForm({ url: it.path, title: it.title, kind: it.kind, content: it.content })
        } else {
          // 여러 개면 일괄 생성 후 첫 노드 포커스
          const { createLink } = useAppStore.getState()
          let firstId: string | null = null
          for (const it of items) {
            const id = await createLink({
              kind: it.kind,
              url: it.path,
              title: it.title,
              content: it.content
            })
            if (!firstId) firstId = id
          }
          if (firstId) {
            useUiStore.getState().selectNode(firstId, 'link')
            useUiStore.getState().focusNode(firstId)
          }
        }
        return
      }

      // 2) 웹 URL 드롭
      const text =
        e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || ''
      const url = text.trim().split('\n')[0]
      if (!/^https?:\/\//i.test(url)) return
      useUiStore.getState().openLinkForm({ url, kind: 'web' })
      const meta = await window.api.fetchMeta(url)
      useUiStore.getState().openLinkForm({
        url,
        kind: 'web',
        title: meta.title ?? '',
        description: meta.description ?? '',
        favicon: meta.favicon,
        thumbnail: meta.thumbnail,
        content: meta.content
      })
    }
    const onDropWrapped = (e: DragEvent): void => void onDrop(e)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDropWrapped)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDropWrapped)
    }
  }, [])

  if (!loaded) {
    return (
      <div className="flex h-full items-center justify-center bg-rail text-ink-dark-muted">
        LinkMap 로딩 중…
      </div>
    )
  }

  return (
    <>
      <AppShell />
      <LinkFormDialog />
      <TagFormDialog />
      <RelationDialog />
      <CollectionFormDialog />
      <CollectionPickerDialog />
      <SettingsDialog />
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-brand/10 backdrop-blur-sm">
          <div className="rounded-lg border-2 border-dashed border-brand bg-white px-8 py-6 text-h text-brand shadow-pop">
            URL · 파일 · 폴더를 여기에 놓아 링크 추가
          </div>
        </div>
      )}
    </>
  )
}
