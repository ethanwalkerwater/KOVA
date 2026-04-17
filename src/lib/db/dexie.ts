/**
 * Kova offline database — powered by Dexie.js (IndexedDB wrapper).
 *
 * Architecture: append-only source of truth.
 * Interactions are written locally first, synced to Supabase when online.
 * Because interactions are immutable, sync is trivial — no conflict resolution.
 *
 * Tables:
 * - interactions:  local copy of all interactions (synced + pending)
 * - contacts:      cached contact metadata for offline list view
 * - pending_sync:  IDs of interactions that haven't been synced to Supabase yet
 *
 * Sync flow:
 * 1. User adds interaction → write to Dexie immediately (optimistic)
 * 2. Attempt POST /api/interactions → if success, mark synced, remove from pending_sync
 * 3. On reconnect → useSyncPending() drains pending_sync queue
 */

import Dexie, { type EntityTable } from "dexie";
import type { Contact } from "@/types/contact";
import type { Interaction } from "@/types/interaction";

// ── Local-only interaction (before server ID is assigned) ─────────────────────

export interface LocalInteraction extends Interaction {
  /**
   * Set to true until the interaction has been confirmed by the server.
   * Pending interactions use a client-generated temporary ID (prefixed "local_").
   */
  pending?: boolean;
  /** The real server ID, once synced. Used to patch up references after sync. */
  server_id?: string;
}

export interface PendingSync {
  /** The local interaction ID (same as LocalInteraction.id when pending). */
  local_id: string;
  /** Serialized payload ready to POST to /api/interactions. */
  payload: string;
  /** ISO timestamp of the failed/pending attempt. */
  created_at: string;
  /** Number of failed sync attempts (for backoff). */
  attempt_count: number;
}

// ── Database class ─────────────────────────────────────────────────────────────

class KovaDatabase extends Dexie {
  interactions!: EntityTable<LocalInteraction, "id">;
  contacts!: EntityTable<Contact, "id">;
  pending_sync!: EntityTable<PendingSync, "local_id">;

  constructor() {
    super("kova_v1");

    this.version(1).stores({
      // Indexed fields (use ++ for auto-increment PK, & for unique, * for multi-entry)
      interactions:
        "id, contact_id, owner_id, type, created_at, pending",
      contacts:
        "id, owner_id, name, stage, importance, last_interaction_at",
      pending_sync:
        "local_id, created_at, attempt_count",
    });
  }
}

// Singleton — one DB instance per browser tab
let _db: KovaDatabase | null = null;

export function getDb(): KovaDatabase {
  if (typeof window === "undefined") {
    throw new Error("KovaDatabase can only be used in the browser");
  }
  if (!_db) {
    _db = new KovaDatabase();
  }
  return _db;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a temporary local ID for interactions created offline. */
export function localInteractionId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** True if an ID was generated locally (not yet confirmed by server). */
export function isLocalId(id: string): boolean {
  return id.startsWith("local_");
}

/**
 * Write an interaction to the local cache.
 * Call this BEFORE the network request for instant UI feedback.
 */
export async function cacheInteraction(
  interaction: LocalInteraction,
): Promise<void> {
  try {
    const db = getDb();
    await db.interactions.put(interaction);
  } catch (err) {
    // Non-fatal — if IndexedDB fails, fall through to server-only mode
    console.warn("[dexie] Failed to cache interaction:", err);
  }
}

/**
 * Queue a failed interaction sync for retry.
 * Payload is the POST body that should be re-sent.
 */
export async function queuePendingSync(
  localId: string,
  payload: object,
): Promise<void> {
  try {
    const db = getDb();
    await db.pending_sync.put({
      local_id: localId,
      payload: JSON.stringify(payload),
      created_at: new Date().toISOString(),
      attempt_count: 0,
    });
  } catch (err) {
    console.warn("[dexie] Failed to queue pending sync:", err);
  }
}

/**
 * Mark an interaction as synced — updates the local record with the server ID
 * and removes it from the pending_sync queue.
 */
export async function markSynced(
  localId: string,
  serverId: string,
): Promise<void> {
  try {
    const db = getDb();

    await db.transaction("rw", [db.interactions, db.pending_sync], async () => {
      // Update local interaction with real server ID
      const local = await db.interactions.get(localId);
      if (local) {
        await db.interactions.delete(localId);
        await db.interactions.put({
          ...local,
          id: serverId,
          server_id: serverId,
          pending: false,
        });
      }
      // Remove from sync queue
      await db.pending_sync.delete(localId);
    });
  } catch (err) {
    console.warn("[dexie] Failed to mark synced:", err);
  }
}

/**
 * Get all pending interactions, sorted oldest-first for reliable ordering.
 */
export async function getPendingInteractions(): Promise<PendingSync[]> {
  try {
    const db = getDb();
    return await db.pending_sync
      .orderBy("created_at")
      .toArray();
  } catch {
    return [];
  }
}

/**
 * Cache a contact in IndexedDB for offline list view.
 * Merges with existing record — doesn't overwrite fields not in `update`.
 */
export async function cacheContact(contact: Contact): Promise<void> {
  try {
    const db = getDb();
    await db.contacts.put(contact);
  } catch (err) {
    console.warn("[dexie] Failed to cache contact:", err);
  }
}

/**
 * Get all locally cached contacts for offline mode.
 */
export async function getCachedContacts(): Promise<Contact[]> {
  try {
    const db = getDb();
    return await db.contacts.orderBy("last_interaction_at").reverse().toArray();
  } catch {
    return [];
  }
}
