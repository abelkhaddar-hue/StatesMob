import { useSyncExternalStore } from 'react'
import type { Payment, TripType } from './booking'

// Brouillon de réservation partagé entre le formulaire rapide de l'accueil et le formulaire en étapes,
// comme sur le site (« Get my quote » ouvre la réservation pré-remplie).
export type Draft = {
  pickup: string; destination: string; date: string; time: string; passengers: number
  tripType: TripType | null; payment: Payment | null; notes: string
  fullName: string; phone: string; email: string
}

const empty: Draft = { pickup: '', destination: '', date: '', time: '', passengers: 1, tripType: null, payment: null, notes: '', fullName: '', phone: '', email: '' }
let state: Draft = empty
const listeners = new Set<() => void>()

export const draft = {
  get: () => state,
  set: (patch: Partial<Draft>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) },
  // Après une demande envoyée : on garde le contact, on vide le trajet.
  reset: () => { state = { ...empty, fullName: state.fullName, phone: state.phone, email: state.email }; listeners.forEach((l) => l()) },
}

export function useDraft() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l) } }, draft.get, draft.get)
}
