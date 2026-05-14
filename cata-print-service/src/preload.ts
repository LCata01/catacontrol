import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  getConfig: () => ipcRenderer.invoke("config:get"),
  saveConfig: (patch: any) => ipcRenderer.invoke("config:save", patch),
  listPrinters: () => ipcRenderer.invoke("printers:list"),
  testPrinter: () => ipcRenderer.invoke("printer:test"),
  getStatus: () => ipcRenderer.invoke("status:get"),
  copyApiKey: () => ipcRenderer.invoke("apikey:copy"),
});
