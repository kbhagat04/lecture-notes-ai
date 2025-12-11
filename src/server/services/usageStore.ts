// @ts-nocheck
import fs from 'fs';
import path from 'path';

const DEFAULT_PATH = path.resolve(process.cwd(), process.env.TOTAL_USAGE_STORE || 'data/usage.json');

let store: Record<string, number> | null = null;
let writeLock = false;

async function ensureStoreLoaded() {
    if (store !== null) return;
    try {
        await fs.promises.mkdir(path.dirname(DEFAULT_PATH), { recursive: true });
        const exists = fs.existsSync(DEFAULT_PATH);
        if (!exists) {
            store = {};
            await persist();
            return;
        }
        const raw = await fs.promises.readFile(DEFAULT_PATH, 'utf-8');
        store = raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.warn('usageStore: could not load store, starting empty', err);
        store = {};
    }
}

async function persist() {
    if (store === null) store = {};
    // simple lock to avoid overlapping writes in single process
    while (writeLock) {
        // busy-wait briefly
        await new Promise((r) => setTimeout(r, 10));
    }
    writeLock = true;
    try {
        const tmp = `${DEFAULT_PATH}.tmp`;
        await fs.promises.writeFile(tmp, JSON.stringify(store, null, 2), 'utf-8');
        await fs.promises.rename(tmp, DEFAULT_PATH);
    } catch (err) {
        console.error('usageStore: error persisting store', err);
    } finally {
        writeLock = false;
    }
}

export async function getUsage(client: string, provider: string) {
    await ensureStoreLoaded();
    const key = `${client}:${provider}`;
    return store?.[key] || 0;
}

export async function incrementUsage(client: string, provider: string) {
    await ensureStoreLoaded();
    const key = `${client}:${provider}`;
    store[key] = (store[key] || 0) + 1;
    await persist();
    return store[key];
}

export async function setUsage(client: string, provider: string, value: number) {
    await ensureStoreLoaded();
    const key = `${client}:${provider}`;
    store[key] = value;
    await persist();
}

export async function clearStore() {
    store = {};
    await persist();
}

export default {
    getUsage,
    incrementUsage,
    setUsage,
    clearStore
};
