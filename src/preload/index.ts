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

  createRelation: (input) => ipcRenderer.invoke(IPC.relationCreate, input),
  deleteRelation: (id) => ipcRenderer.invoke(IPC.relationDelete, id),

  createCollection: (name) => ipcRenderer.invoke(IPC.collectionCreate, name),
  deleteCollection: (id) => ipcRenderer.invoke(IPC.collectionDelete, id),
  addLinkToCollection: (collectionId, linkId) =>
    ipcRenderer.invoke(IPC.collectionAddLink, collectionId, linkId),
  removeLinkFromCollection: (collectionId, linkId) =>
    ipcRenderer.invoke(IPC.collectionRemoveLink, collectionId, linkId),

  fetchMeta: (url) => ipcRenderer.invoke(IPC.metaFetch, url),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),

  openPath: (path) => ipcRenderer.invoke(IPC.openPath, path),
  pickPaths: (mode) => ipcRenderer.invoke(IPC.pickPaths, mode),
  pathInfo: (path) => ipcRenderer.invoke(IPC.pathInfo, path),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  copyText: (text) => ipcRenderer.invoke(IPC.copyText, text)
}

contextBridge.exposeInMainWorld('api', api)
