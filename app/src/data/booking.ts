// Données de démonstration de l'app SafeMobility (aucun serveur pour l'instant).
// Même parcours que le site : demande de course → l'équipe de dispatch confirme et assigne un chauffeur.
// Les réservations sont gardées sur l'appareil (localStorage sur le web) pour l'écran « Track ride ».

export class ApiError extends Error {
  constructor(public code: string, message?: string) { super(message ?? code) }
}

export const DISPATCH_PHONE = '513-207-4511'
export const DISPATCH_TEL = 'tel:5132074511'

export type TripType = 'airport' | 'local' | 'business' | 'hourly' | 'long_distance' | 'event'
export const tripTypes: { value: TripType; label: string }[] = [
  { value: 'airport', label: 'Airport Transfer' },
  { value: 'local', label: 'Local Ride' },
  { value: 'business', label: 'Business Transportation' },
  { value: 'hourly', label: 'Hourly Service' },
  { value: 'long_distance', label: 'Long Distance' },
  { value: 'event', label: 'Event Transportation' },
]

export type Payment = 'cash' | 'card'

// Les trois véhicules de la flotte, tels que présentés sur le site.
export const fleet = [
  { id: 'sedan', className: 'Sedan', model: 'Toyota Corolla 2020', passengers: 4, luggage: 2, blurb: 'Affordable, clean and reliable — ideal for solo travelers and short local trips.', image: require('../../assets/fleet/corolla.jpg') },
  { id: 'suv', className: 'SUV', model: 'Toyota RAV4', passengers: 5, luggage: 4, blurb: 'Spacious SUV for airport transfers, families and trips with extra luggage.', image: require('../../assets/fleet/rav4.jpg') },
  { id: 'premium', className: 'Premium SUV', model: 'Toyota Grand Highlander', passengers: 7, luggage: 6, blurb: 'Premium transportation for groups and long-distance rides.', image: require('../../assets/fleet/highlander.jpg') },
] as const

export const serviceAreas = ['Cincinnati, OH', 'Florence, KY', 'Covington, KY', 'Newport, KY', 'CVG Airport']

// Lieux proposés pendant la saisie d'une adresse (l'utilisateur peut aussi taper n'importe quelle adresse).
export const suggestions = [
  'CVG Airport — Cincinnati/Northern Kentucky International',
  'Downtown Cincinnati',
  'Great American Ball Park',
  'Paycor Stadium',
  'Over-the-Rhine, Cincinnati',
  'Hyde Park, Cincinnati',
  'University of Cincinnati',
  'Cincinnati Union Terminal',
  'Newport on the Levee, Newport, KY',
  'Covington, KY',
  'Florence, KY',
  'Mason, OH',
  'Kings Island, Mason, OH',
  'Kenwood Towne Centre',
]

export type ReservationStatus = 'requested' | 'confirmed' | 'driver_assigned' | 'on_the_way' | 'completed' | 'cancelled'
export const statusSteps: { status: ReservationStatus; label: string; detail: string }[] = [
  { status: 'requested', label: 'Request received', detail: 'Our dispatch team is reviewing your ride.' },
  { status: 'confirmed', label: 'Confirmed', detail: 'Your ride is booked. We will text you before pickup.' },
  { status: 'driver_assigned', label: 'Driver assigned', detail: 'Your driver and vehicle are set.' },
  { status: 'on_the_way', label: 'Driver on the way', detail: 'Your driver is heading to the pickup location.' },
  { status: 'completed', label: 'Completed', detail: 'Thanks for riding with StatesMob.' },
]

export type Contact = { fullName: string; phone: string; email: string }

export type RideRequest = Contact & {
  pickup: string; destination: string; date: string; time: string; passengers: number
  tripType: TripType; payment: Payment; notes: string
}

export type Reservation = RideRequest & {
  id: string; kind: 'ride'; createdAt: string; status: ReservationStatus
  driver?: { name: string; vehicle: string; plate: string }
}

export type WeeklyRequest = Contact & {
  passengers: number; home: string; work: string; morningTime: string; eveningTime: string; days: string[]; notes: string
}

export type WeeklyReservation = WeeklyRequest & { id: string; kind: 'weekly'; createdAt: string; status: 'requested' }

// ───────── stockage local ─────────

const KEY = 'safemobility-demo'
type Store = { rides: Reservation[]; weekly: WeeklyReservation[]; contact?: Contact }
let memory: Store = { rides: [], weekly: [] }

function load(): Store {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    if (raw) memory = { rides: [], weekly: [], ...JSON.parse(raw) }
  } catch { /* stockage indisponible : on reste en mémoire */ }
  return memory
}
function save(s: Store) {
  memory = s
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(s)) } catch { /* idem */ }
}

// ───────── outils ─────────

export const phoneDigits = (p: string) => p.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
export const isUsPhone = (p: string) => /^[2-9]\d{2}[2-9]\d{6}$/.test(phoneDigits(p))
export const formatUsPhone = (p: string) => {
  const d = phoneDigits(p).slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
}
export const isEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim())

const wait = (ms = 400) => new Promise<void>((r) => setTimeout(r, ms))
const reference = () => `SM-${Math.floor(1000 + Math.random() * 9000)}`

// Démo : la réservation avance toute seule (confirmée après 20 s, chauffeur après 40 s, en route après 60 s)
// pour montrer l'écran de suivi. En vrai, c'est l'équipe de dispatch qui fait avancer le statut.
const demoDriver = { name: 'Marcus', vehicle: 'Toyota RAV4 · Silver', plate: 'OH · JKT 4821' }
function withDemoProgress(r: Reservation): Reservation {
  if (r.status === 'cancelled' || r.status === 'completed') return r
  const s = (Date.now() - Date.parse(r.createdAt)) / 1000
  const status: ReservationStatus = s > 60 ? 'on_the_way' : s > 40 ? 'driver_assigned' : s > 20 ? 'confirmed' : 'requested'
  return { ...r, status, driver: status === 'driver_assigned' || status === 'on_the_way' ? demoDriver : undefined }
}

// ───────── API ─────────

export const booking = {
  savedContact: (): Contact | undefined => load().contact,

  // Profil (onglet Compte) : pré-remplit les réservations et retrouve « Mes courses ».
  saveContact: async (c: Contact): Promise<Contact> => {
    await wait(250)
    if (!c.fullName.trim()) throw new ApiError('name_required', 'Add your full name.')
    if (!isUsPhone(c.phone)) throw new ApiError('invalid_phone', 'Enter a 10-digit US phone number.')
    if (!isEmail(c.email)) throw new ApiError('invalid_email', 'Enter a valid email address.')
    const contact = { fullName: c.fullName.trim(), phone: phoneDigits(c.phone), email: c.email.trim() }
    save({ ...load(), contact })
    return contact
  },

  // « Mes courses » : les réservations du numéro enregistré sur ce téléphone, sans le retaper.
  myBookings: async (): Promise<(Reservation | WeeklyReservation)[]> => {
    const c = load().contact
    return c ? booking.track(c.phone) : []
  },

  // Démo : repartir de zéro (réservations et profil).
  clearDemo: () => save({ rides: [], weekly: [] }),

  requestRide: async (input: RideRequest): Promise<Reservation> => {
    await wait()
    if (!input.pickup.trim() || !input.destination.trim()) throw new ApiError('address_required', 'Add a pickup location and a destination.')
    if (!input.fullName.trim()) throw new ApiError('name_required', 'Add your full name.')
    if (!isUsPhone(input.phone)) throw new ApiError('invalid_phone', 'Enter a 10-digit US phone number.')
    if (!isEmail(input.email)) throw new ApiError('invalid_email', 'Enter a valid email address.')
    const r: Reservation = { ...input, phone: phoneDigits(input.phone), id: reference(), kind: 'ride', createdAt: new Date().toISOString(), status: 'requested' }
    const s = load()
    save({ ...s, rides: [r, ...s.rides], contact: { fullName: input.fullName.trim(), phone: r.phone, email: input.email.trim() } })
    return r
  },

  requestWeekly: async (input: WeeklyRequest): Promise<WeeklyReservation> => {
    await wait()
    if (!input.home.trim() || !input.work.trim()) throw new ApiError('address_required', 'Add your home and work addresses.')
    if (!input.days.length) throw new ApiError('days_required', 'Pick at least one day.')
    if (!input.fullName.trim()) throw new ApiError('name_required', 'Add your full name.')
    if (!isUsPhone(input.phone)) throw new ApiError('invalid_phone', 'Enter a 10-digit US phone number.')
    if (!isEmail(input.email)) throw new ApiError('invalid_email', 'Enter a valid email address.')
    const r: WeeklyReservation = { ...input, phone: phoneDigits(input.phone), id: reference(), kind: 'weekly', createdAt: new Date().toISOString(), status: 'requested' }
    const s = load()
    save({ ...s, weekly: [r, ...s.weekly], contact: { fullName: input.fullName.trim(), phone: r.phone, email: input.email.trim() } })
    return r
  },

  // « Track ride » : comme sur le site, on retrouve ses réservations avec le numéro de téléphone.
  track: async (phone: string): Promise<(Reservation | WeeklyReservation)[]> => {
    await wait()
    if (!isUsPhone(phone)) throw new ApiError('invalid_phone', 'Enter the 10-digit phone number you booked with.')
    const d = phoneDigits(phone)
    const s = load()
    return [...s.rides.filter((r) => r.phone === d).map(withDemoProgress), ...s.weekly.filter((w) => w.phone === d)]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  reservation: async (id: string): Promise<Reservation> => {
    await wait(150)
    const r = load().rides.find((x) => x.id === id)
    if (!r) throw new ApiError('not_found', 'We could not find this reservation.')
    return withDemoProgress(r)
  },

  cancel: async (id: string): Promise<void> => {
    await wait()
    const s = load()
    save({ ...s, rides: s.rides.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)) })
  },
}
