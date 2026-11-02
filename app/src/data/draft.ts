import { useSyncExternalStore } from 'react'
import type { Payment, Place, Quote, ServiceCode } from './ride'

// Brouillon de la demande, partagé entre l'accueil (carte), la recherche d'adresse et l'écran du prix.
export type Draft = { service: ServiceCode; pickup: Place | null; dropoff: Place | null; quote: Quote | null; offeredCents: number | null; payment: Payment }

const initial: Draft = { service: 'standard', pickup: null, dropoff: null, quote: null, offeredCents: null, payment: 'card' }
let state: Draft = initial
const listeners = new Set<() => void>()

export const draft = {
  get: () => state,
  set: (patch: Partial<Draft>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) },
  // Après une demande : on garde le départ et le moyen de paiement.
  reset: () => { state = { ...initial, pickup: state.pickup, payment: state.payment }; listeners.forEach((l) => l()) },
}

export function useDraft() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l) } }, draft.get, draft.get)
}
