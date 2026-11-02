// Connexion à la base StatesMob (Supabase). Sans URL ni clé, l'app reste en démo hors ligne.
// Deux sessions séparées sur le même appareil : « passenger » et « driver », chacune avec son compte anonyme,
// pour pouvoir tester une course réelle avec deux onglets (ou deux téléphones).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from './booking'

// Valeurs publiques par nature (elles finissent dans l'app) : la sécurité vient des fonctions de la base.
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rfpmtipkqspbvzhjsfjx.supabase.co'
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Ojgw3pyVeDZnuTtuU8mERw_JPpsEDUh'

export const live = !URL.includes('__') && !KEY.includes('__')

export type Role = 'passenger' | 'driver'

// Stockage de session : localStorage sur le web, mémoire ailleurs (la session ne survit pas au redémarrage).
const memory = new Map<string, string>()
const storage = {
  getItem: (k: string) => { try { return globalThis.localStorage ? globalThis.localStorage.getItem(k) : memory.get(k) ?? null } catch { return memory.get(k) ?? null } },
  setItem: (k: string, v: string) => { try { if (globalThis.localStorage) globalThis.localStorage.setItem(k, v); else memory.set(k, v) } catch { memory.set(k, v) } },
  removeItem: (k: string) => { try { globalThis.localStorage?.removeItem(k) } catch { /* idem */ } memory.delete(k) },
}

const clients: Partial<Record<Role, SupabaseClient>> = {}
const ready: Partial<Record<Role, Promise<SupabaseClient>>> = {}

function client(role: Role) {
  return (clients[role] ??= createClient(URL, KEY, {
    auth: { storageKey: `statesmob-${role}-auth`, storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  }))
}

// Une seule connexion anonyme à la fois par rôle, même si plusieurs écrans appellent en même temps.
function signedIn(role: Role): Promise<SupabaseClient> {
  return (ready[role] ??= (async () => {
    const c = client(role)
    const { data } = await c.auth.getSession()
    if (!data.session) {
      const { error } = await c.auth.signInAnonymously()
      if (error) throw new ApiError('auth', 'Could not connect to StatesMob. Check your internet and try again.')
    }
    return c
  })().catch((e) => { ready[role] = undefined; throw e }))
}

export async function rpc<T>(role: Role, fn: string, args?: Record<string, unknown>): Promise<T> {
  const c = await signedIn(role)
  const { data, error } = await c.rpc(fn, args)
  if (error) {
    if (/fetch|network/i.test(error.message)) throw new ApiError('network', 'No connection. Check your internet and try again.')
    throw new ApiError(error.message, error.hint || 'Something went wrong. Try again.')
  }
  return data as T
}

// « Reset demo data » : on repart avec un nouveau compte anonyme.
export async function signOut(role: Role) {
  if (!live) return
  ready[role] = undefined
  await client(role).auth.signOut().catch(() => {})
}
