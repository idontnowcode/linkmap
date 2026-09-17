import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IPC, type LinkMapApi } from '@shared/ipc'

const api: LinkMapApi = {
  getSnapshot: () => ipcRenderer.invoke(IPC.graphSnapshot),
  getCounts: () => ipcRenderer.invoke(IPC.counts),

  createLink: (input) => ipcRenderer.invoke(IPC.linkCreate, input),
  updateLink: (id, patch) => ipcRenderer.invoke(IPC.linkUpdate, id, patch),
  trashLink: (id) => ipcRenderer.invoke(IPC.linkTrash, id),
  restoreLink: (id) => ipcRenderer.invoke(IPC.linkRestore, id),
  deleteLink: (id) => ipcRenderer.invoke(IPC.linkDelete, id),
  toggleFavorite: (id) => ipcRenderer.invoke(IPC.linkToggleFavorite, id),

  createTag: (input) => ipcRenderer.invoke(IPC.tagCreate, input),
  updateTag: (id, patch) => ipcRenderer.invoke(IPC.tagUpdate, id, patch),
  deleteTag: (id) => ipcRenderer.invoke(IPC.tagDelete, id),
  mergeTag: (sourceTagId, targetTagId) => ipcRenderer.invoke(IPC.tagMerge, sourceTagId, targetTagId),

  createRelation: (input) => ipcRenderer.invoke(IPC.relationCreate, input),
  deleteRelation: (id) => ipcRenderer.invoke(IPC.relationDelete, id),

  createCollection: (name, parentId = null) =>
    ipcRenderer.invoke(IPC.collectionCreate, name, parentId),
  deleteCollection: (id) => ipcRenderer.invoke(IPC.collectionDelete, id),
  moveCollection: (id, parentId) => ipcRenderer.invoke(IPC.collectionMove, id, parentId),
  addLinkToCollection: (collectionId, linkId) =>
    ipcRenderer.invoke(IPC.collectionAddLink, collectionId, linkId),
  removeLinkFromCollection: (collectionId, linkId) =>
    ipcRenderer.invoke(IPC.collectionRemoveLink, collectionId, linkId),

  fetchMeta: (url) => ipcRenderer.invoke(IPC.metaFetch, url),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),

  openPath: (path) => ipcRenderer.invoke(IPC.openPath, path),
  pickPaths: (mode) => ipcRenderer.invoke(IPC.pickPaths, mode),
  pathInfo: (path) => ipcRenderer.invoke(IPC.pathInfo, path),
  pathMtime: (path) => ipcRenderer.invoke(IPC.pathMtime, path),
  readBinary: (path) => ipcRenderer.invoke(IPC.readBinary, path),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  copyText: (text) => ipcRenderer.invoke(IPC.copyText, text),

  folderList: (rootPath) => ipcRenderer.invoke(IPC.folderList, rootPath),
  folderImport: (rootPath, relativePaths, extTags) =>
    ipcRenderer.invoke(IPC.folderImport, rootPath, relativePaths, extTags),
  folderSyncPreview: (tagId) => ipcRenderer.invoke(IPC.folderSyncPreview, tagId),
  folderSync: (tagId) => ipcRenderer.invoke(IPC.folderSync, tagId),
  folderExclusionsGet: (tagId) => ipcRenderer.invoke(IPC.folderExclusionsGet, tagId),
  folderExclusionsSet: (tagId, excludedRelativePaths) =>
    ipcRenderer.invoke(IPC.folderExclusionsSet, tagId, excludedRelativePaths)
}

contextBridge.exposeInMainWorld('api', api)
