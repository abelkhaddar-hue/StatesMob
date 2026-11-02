// Candidature chauffeur (démo : tout reste sur l'appareil, la validation avance toute seule avec le temps).
import { ApiError, booking, formatUsPhone, isEmail, isUsPhone, phoneDigits } from './booking'
import type { ServiceCode } from './ride'

export type VehicleType = 'sedan' | 'suv' | 'minivan'
export type DocCode = 'license' | 'insurance' | 'registration' | 'photo'
export type DriverStatus = 'none' | 'draft' | 'docs_review' | 'background_check' | 'approved'

export type DriverApplication = {
  step: number
  firstName: string; lastName: string; email: string; birthDate: string; city: string
  phone: string; phoneVerified: boolean
  vehicleType: VehicleType; seats: number; make: string; model: string; year: string; color: string; plate: string
  docs: Partial<Record<DocCode, string>>
  consent: boolean
  submittedAt?: string
}

export const STEPS = ['About you', 'Phone', 'Vehicle', 'Documents', 'Review'] as const
export const driverCities = ['Cincinnati, OH', 'Florence, KY', 'Covington, KY', 'Newport, KY']
export const vehicleTypes: { code: VehicleType; label: string; seats: number[] }[] = [
  { code: 'sedan', label: 'Sedan', seats: [4] },
  { code: 'suv', label: 'SUV', seats: [5, 6, 7] },
  { code: 'minivan', label: 'Minivan', seats: [6, 7] },
]
export const documents: { code: DocCode; label: string; hint: string; file: string }[] = [
  { code: 'license', label: "Driver's license", hint: 'Front and back, not expired', file: 'license.jpg' },
  { code: 'insurance', label: 'Proof of insurance', hint: 'Your name and this vehicle on it', file: 'insurance.pdf' },
  { code: 'registration', label: 'Vehicle registration', hint: 'Matches the plate you entered', file: 'registration.pdf' },
  { code: 'photo', label: 'Profile photo', hint: 'Face forward, no sunglasses', file: 'selfie.jpg' },
]

const MIN_AGE = 21
const OLDEST_YEAR = new Date().getFullYear() - 14
const PREMIUM_YEAR = new Date().getFullYear() - 6
// Durées accélérées de la démo : vérification des documents, puis des antécédents.
const DOCS_S = 15
const BACKGROUND_S = 30

const KEY = 'statesmob-driver'
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

function blank(): DriverApplication {
  const c = booking.savedContact()
  const [firstName = '', ...rest] = (c?.fullName ?? '').split(' ')
  return {
    step: 0, firstName, lastName: rest.join(' '), email: c?.email ?? '', birthDate: '', city: driverCities[0],
    phone: c ? formatUsPhone(c.phone) : '', phoneVerified: false,
    vehicleType: 'sedan', seats: 4, make: '', model: '', year: '', color: '', plate: '', docs: {}, consent: false,
  }
}
function load(): DriverApplication | undefined {
  try { const raw = globalThis.localStorage?.getItem(KEY); return raw ? JSON.parse(raw) : undefined } catch { return undefined }
}
function store(a: DriverApplication) {
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(a)) } catch { /* stockage indisponible */ }
}

export const formatBirthDate = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length <= 2 ? d : d.length <= 4 ? `${d.slice(0, 2)}/${d.slice(2)}` : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}
function age(mmddyyyy: string): number | undefined {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(mmddyyyy)
  if (!m) return undefined
  const [mo, d, y] = [+m[1], +m[2], +m[3]]
  const born = new Date(y, mo - 1, d)
  if (born.getMonth() !== mo - 1 || born.getDate() !== d || y < 1900) return undefined
  const now = new Date()
  return now.getFullYear() - y - (now < new Date(now.getFullYear(), mo - 1, d) ? 1 : 0)
}

// Catégories que la voiture peut faire, d'après son type, ses places et son année.
export function eligibleServices(a: Pick<DriverApplication, 'vehicleType' | 'seats' | 'year'>): ServiceCode[] {
  const y = +a.year
  if (!y || y < OLDEST_YEAR) return []
  const out: ServiceCode[] = ['standard']
  if (a.vehicleType !== 'sedan' && a.seats >= 5) out.push('suv')
  if (a.vehicleType !== 'sedan' && a.seats >= 6 && y >= PREMIUM_YEAR) out.push('premium')
  return out
}

export type FieldErrors = Partial<Record<keyof DriverApplication, string>>

// Erreurs de l'étape donnée (vide = on peut continuer).
export function validate(step: number, a: DriverApplication): FieldErrors {
  const e: FieldErrors = {}
  if (step === 0) {
    if (!a.firstName.trim()) e.firstName = 'Add your first name.'
    if (!a.lastName.trim()) e.lastName = 'Add your last name as it appears on your license.'
    if (!isEmail(a.email)) e.email = 'Enter a valid email address.'
    const n = age(a.birthDate)
    if (n === undefined) e.birthDate = 'Use the format MM/DD/YYYY.'
    else if (n < MIN_AGE) e.birthDate = `You need to be at least ${MIN_AGE} to drive with StatesMob.`
  }
  if (step === 1) {
    if (!isUsPhone(a.phone)) e.phone = 'Enter a 10-digit US phone number.'
    else if (!a.phoneVerified) e.phoneVerified = 'Verify your number to continue.'
  }
  if (step === 2) {
    if (!a.make.trim()) e.make = 'Add the make, e.g. Toyota.'
    if (!a.model.trim()) e.model = 'Add the model, e.g. Camry.'
    const y = +a.year
    if (!/^\d{4}$/.test(a.year) || y > new Date().getFullYear() + 1) e.year = 'Enter a 4-digit year.'
    else if (y < OLDEST_YEAR) e.year = `Vehicles need to be ${OLDEST_YEAR} or newer.`
    if (!a.color.trim()) e.color = 'Add the color.'
    if (!/^[A-Z0-9 -]{2,8}$/.test(a.plate.trim())) e.plate = 'Enter the plate as shown, 2 to 8 characters.'
  }
  if (step === 3 && documents.some((d) => !a.docs[d.code])) e.docs = 'Add all 4 documents to continue.'
  if (step === 4 && !a.consent) e.consent = 'Your consent is needed to run the background check.'
  return e
}

export type DriverView = { status: DriverStatus; application?: DriverApplication; reviewEndsAt?: string }

function view(a: DriverApplication | undefined): DriverView {
  if (!a) return { status: 'none' }
  if (!a.submittedAt) return { status: 'draft', application: a }
  const s = (Date.now() - Date.parse(a.submittedAt)) / 1000
  const status = s < DOCS_S ? 'docs_review' : s < DOCS_S + BACKGROUND_S ? 'background_check' : 'approved'
  return { status, application: a, reviewEndsAt: new Date(Date.parse(a.submittedAt) + (DOCS_S + BACKGROUND_S) * 1000).toISOString() }
}

let pendingCode: string | undefined

export const driver = {
  current: async (): Promise<DriverView> => view(load()),
  status: (): DriverStatus => view(load()).status,
  // Reprend la candidature commencée, ou en ouvre une pré-remplie avec le profil passager.
  open: (): DriverApplication => load() ?? blank(),
  save: (a: DriverApplication) => store(a),

  sendCode: async (phone: string): Promise<string> => {
    await wait(600)
    if (!isUsPhone(phone)) throw new ApiError('invalid_phone', 'Enter a 10-digit US phone number.')
    pendingCode = String(Math.floor(100000 + Math.random() * 900000))
    return pendingCode
  },
  checkCode: async (code: string): Promise<void> => {
    await wait(400)
    if (!pendingCode || code.replace(/\D/g, '') !== pendingCode) throw new ApiError('bad_code', "That code doesn't match. Check the text message and try again.")
    pendingCode = undefined
  },
  // Envoi d'un document (démo : on garde seulement le nom du fichier).
  upload: async (code: DocCode): Promise<string> => {
    await wait(900)
    return documents.find((d) => d.code === code)!.file
  },

  submit: async (a: DriverApplication): Promise<DriverView> => {
    await wait(800)
    for (let i = 0; i < STEPS.length; i++) {
      if (Object.keys(validate(i, a)).length) throw new ApiError('incomplete', `Some details in “${STEPS[i]}” need attention.`)
    }
    const done = { ...a, phone: phoneDigits(a.phone), plate: a.plate.trim().toUpperCase(), submittedAt: new Date().toISOString() }
    store(done)
    return view(done)
  },
  clear: () => { try { globalThis.localStorage?.removeItem(KEY) } catch { /* idem */ } },
}
