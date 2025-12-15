// @ts-nocheck
import fs from 'fs';
import path from 'path';

const DEFAULT_PATH = path.resolve(process.cwd(), process.env.NOTES_STORE || 'data/notes.json');

let store: Record<string, string> | null = null;
let writeLock = false;

async function ensureLoaded() {
  if (store !== null) return;
  try {
    await fs.promises.mkdir(path.dirname(DEFAULT_PATH), { recursive: true });
    if (!fs.existsSync(DEFAULT_PATH)) {
      store = {};
      await persist();
      return;
    }
    const raw = await fs.promises.readFile(DEFAULT_PATH, 'utf-8');
    store = raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('notesStore: could not load store, starting empty', err);
    store = {};
  }
}

async function persist() {
  if (store === null) store = {};
  while (writeLock) await new Promise((r) => setTimeout(r, 10));
  writeLock = true;
  try {
    const tmp = `${DEFAULT_PATH}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(store, null, 2), 'utf-8');
    await fs.promises.rename(tmp, DEFAULT_PATH);
  } catch (err) {
    console.error('notesStore: error persisting store', err);
  } finally {
    writeLock = false;
  }
}

export async function getNotes(fileId: string) {
  await ensureLoaded();
  return store?.[fileId] || null;
}

export async function setNotes(fileId: string, notes: string) {
  await ensureLoaded();
  store[fileId] = notes;
  await persist();
}

export async function deleteNotes(fileId: string) {
  await ensureLoaded();
  delete store[fileId];
  await persist();
}

export default { getNotes, setNotes, deleteNotes };
