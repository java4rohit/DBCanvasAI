/**
 * useProjectDB — IndexedDB persistence for DBCanvasAI projects
 * Works like drawDB + Excalidraw: browser-native, no backend, no cost.
 */

import type { Table, Relation, RequirementItem } from '../types/schema';

export interface Project {
  id: string;
  name: string;
  tables: Table[];
  relations: Relation[];
  functional: RequirementItem[];
  nonFunctional: RequirementItem[];
  labDocumentName: string | null;
  updatedAt: string; // ISO string
  createdAt: string;
}

const DB_NAME = 'DBCanvasAI';
const STORE = 'projects';
const DB_VERSION = 1;
const ACTIVE_KEY = 'dbcanvasai_active_project';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as Project[]).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveProjectId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function createNewProject(name: string): Project {
  return {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    tables: [],
    relations: [],
    functional: [],
    nonFunctional: [],
    labDocumentName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
