// Profil du passager et constantes de la marque (démo : rien ne part vers un serveur).
// Les courses elles-mêmes sont dans ./ride.ts.

export class ApiError extends Error {
  constructor(public code: string, message?: string) { super(message ?? code) }
}

export const DISPATCH_PHONE = '513-207-4511'
export const DISPATCH_TEL = 'tel:5132074511'

export const serviceAreas = ['Cincinnati, OH', 'Florence, KY', 'Covington, KY', 'Newport, KY', 'CVG Airport']

export type Contact = { fullName: string; phone: string; email: string }

const KEY = 'statesmob-profile'

function load(): Contact | undefined {
  try { const raw = globalThis.localStorage?.getItem(KEY); return raw ? JSON.parse(raw) : undefined } catch { return undefined }
}

export const phoneDigits = (p: string) => p.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
export const isUsPhone = (p: string) => /^[2-9]\d{2}[2-9]\d{6}$/.test(phoneDigits(p))
export const formatUsPhone = (p: string) => {
  const d = phoneDigits(p).slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
}
export const isEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim())

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export const booking = {
  savedContact: (): Contact | undefined => load(),

  // Profil (onglet Account) : prénom affiché à l'accueil, numéro donné au chauffeur.
  saveContact: async (c: Contact): Promise<Contact> => {
    await wait(250)
    if (!c.fullName.trim()) throw new ApiError('name_required', 'Add your full name.')
    if (!isUsPhone(c.phone)) throw new ApiError('invalid_phone', 'Enter a 10-digit US phone number.')
    if (!isEmail(c.email)) throw new ApiError('invalid_email', 'Enter a valid email address.')
    const contact = { fullName: c.fullName.trim(), phone: phoneDigits(c.phone), email: c.email.trim() }
    try { globalThis.localStorage?.setItem(KEY, JSON.stringify(contact)) } catch { /* stockage indisponible */ }
    return contact
  },

  clearContact: () => { try { globalThis.localStorage?.removeItem(KEY) } catch { /* idem */ } },
}
