import { create } from 'zustand'
import type {
  CreateLinkInput,
  CreateRelationInput,
  CreateTagInput,
  GraphSnapshot,
  LinkCounts,
  Tag,
  UpdateLinkInput
} from '@shared/types'

interface AppState {
  loaded: boolean
  snapshot: GraphSnapshot
  counts: LinkCounts

  load: () => Promise<void>
  refresh: () => Promise<void>

  createLink: (input: CreateLinkInput) => Promise<string>
  updateLink: (id: string, patch: UpdateLinkInput) => Promise<void>
  trashLink: (id: string) => Promise<void>
  restoreLink: (id: string) => Promise<void>
  deleteLink: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  bulkTrash: (ids: string[]) => Promise<void>
  bulkRestore: (ids: string[]) => Promise<void>
  bulkDelete: (ids: string[]) => Promise<void>

  createTag: (input: CreateTagInput) => Promise<string>
  deleteTag: (id: string) => Promise<void>

  createRelation: (input: CreateRelationInput) => Promise<void>
  deleteRelation: (id: string) => Promise<void>

  createCollection: (name: string, parentId?: string | null) => Promise<void>
  deleteCollection: (id: string) => Promise<void>
  moveCollection: (id: string, parentId: string | null) => Promise<void>
  addLinkToCollection: (collectionId: string, linkId: string) => Promise<void>
  removeLinkFromCollection: (collectionId: string, linkId: string) => Promise<void>

  addTagToLink: (linkId: string, tagId: string) => Promise<void>
  removeTagFromLink: (linkId: string, tagId: string) => Promise<void>
  bulkAddTag: (linkIds: string[], tagId: string) => Promise<void>
  bulkRemoveTag: (linkIds: string[], tagId: string) => Promise<void>
  bulkAddToCollection: (collectionId: string, linkIds: string[]) => Promise<void>
  bulkRemoveFromCollection: (linkIds: string[], collectionId: string) => Promise<void>
}

const emptySnapshot: GraphSnapshot = {
  links: [],
  tags: [],
  collections: [],
  relations: [],
  linkTags: [],
  collectionLinks: []
}
const emptyCounts: LinkCounts = {
  all: 0,
  favorites: 0,
  recent: 0,
  trash: 0,
  byTag: {},
  byCollection: {}
}

export const useAppStore = create<AppState>((set, get) => ({
  loaded: false,
  snapshot: emptySnapshot,
  counts: emptyCounts,

  load: async () => {
    const [snapshot, counts] = await Promise.all([
      window.api.getSnapshot(),
      window.api.getCounts()
    ])
    set({ snapshot, counts, loaded: true })
  },

  refresh: async () => {
    const [snapshot, counts] = await Promise.all([
      window.api.getSnapshot(),
      window.api.getCounts()
    ])
    set({ snapshot, counts })
  },

  createLink: async (input) => {
    const link = await window.api.createLink(input)
    await get().refresh()
    return link.id
  },
  updateLink: async (id, patch) => {
    await window.api.updateLink(id, patch)
    await get().refresh()
  },
  trashLink: async (id) => {
    await window.api.trashLink(id)
    await get().refresh()
  },
  restoreLink: async (id) => {
    await window.api.restoreLink(id)
    await get().refresh()
  },
  deleteLink: async (id) => {
    await window.api.deleteLink(id)
    await get().refresh()
  },
  toggleFavorite: async (id) => {
    await window.api.toggleFavorite(id)
    await get().refresh()
  },
  bulkTrash: async (ids) => {
    for (const id of ids) await window.api.trashLink(id)
    await get().refresh()
  },
  bulkRestore: async (ids) => {
    for (const id of ids) await window.api.restoreLink(id)
    await get().refresh()
  },
  bulkDelete: async (ids) => {
    for (const id of ids) await window.api.deleteLink(id)
    await get().refresh()
  },

  createTag: async (input) => {
    const tag: Tag = await window.api.createTag(input)
    await get().refresh()
    return tag.id
  },
  deleteTag: async (id) => {
    await window.api.deleteTag(id)
    await get().refresh()
  },

  createRelation: async (input) => {
    await window.api.createRelation(input)
    await get().refresh()
  },
  deleteRelation: async (id) => {
    await window.api.deleteRelation(id)
    await get().refresh()
  },

  createCollection: async (name, parentId = null) => {
    await window.api.createCollection(name, parentId)
    await get().refresh()
  },
  deleteCollection: async (id) => {
    await window.api.deleteCollection(id)
    await get().refresh()
  },
  moveCollection: async (id, parentId) => {
    await window.api.moveCollection(id, parentId)
    await get().refresh()
  },
  addLinkToCollection: async (collectionId, linkId) => {
    await window.api.addLinkToCollection(collectionId, linkId)
    await get().refresh()
  },
  removeLinkFromCollection: async (collectionId, linkId) => {
    await window.api.removeLinkFromCollection(collectionId, linkId)
    await get().refresh()
  },

  addTagToLink: async (linkId, tagId) => {
    const link = get().snapshot.links.find((l) => l.id === linkId)
    if (!link || link.tagIds.includes(tagId)) return
    await window.api.updateLink(linkId, { tagIds: [...link.tagIds, tagId] })
    await get().refresh()
  },
  removeTagFromLink: async (linkId, tagId) => {
    const link = get().snapshot.links.find((l) => l.id === linkId)
    if (!link) return
    await window.api.updateLink(linkId, { tagIds: link.tagIds.filter((t) => t !== tagId) })
    await get().refresh()
  },
  bulkAddTag: async (linkIds, tagId) => {
    const byId = new Map(get().snapshot.links.map((l) => [l.id, l]))
    for (const id of linkIds) {
      const link = byId.get(id)
      if (link && !link.tagIds.includes(tagId)) {
        await window.api.updateLink(id, { tagIds: [...link.tagIds, tagId] })
      }
    }
    await get().refresh()
  },
  bulkRemoveTag: async (linkIds, tagId) => {
    const byId = new Map(get().snapshot.links.map((l) => [l.id, l]))
    for (const id of linkIds) {
      const link = byId.get(id)
      if (link && link.tagIds.includes(tagId)) {
        await window.api.updateLink(id, { tagIds: link.tagIds.filter((t) => t !== tagId) })
      }
    }
    await get().refresh()
  },
  bulkAddToCollection: async (collectionId, linkIds) => {
    for (const id of linkIds) await window.api.addLinkToCollection(collectionId, id)
    await get().refresh()
  },
  bulkRemoveFromCollection: async (linkIds, collectionId) => {
    for (const id of linkIds) await window.api.removeLinkFromCollection(collectionId, id)
    await get().refresh()
  }
}))
