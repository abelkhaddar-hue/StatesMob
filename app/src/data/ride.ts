// Courses immédiates façon VTC (démo, sans serveur) : prix proposé par le passager, offres des chauffeurs,
// suivi du chauffeur sur la carte, note à la fin. Tout est calculé à partir de l'heure : l'état survit
// au rechargement de la page (localStorage sur le web).
import { ApiError } from './booking'
import { live } from './supabase'
import { makeLiveRides } from './live'

export type LngLat = { lng: number; lat: number }
export type PlaceKind = 'landmark' | 'airport' | 'stadium' | 'mall' | 'station' | 'street' | 'recent'
export type Place = { id: string; name: string; detail: string; point: LngLat; kind?: PlaceKind }

export type ServiceCode = 'standard' | 'suv' | 'premium'
export type Payment = 'card' | 'cash'

export const services: { code: ServiceCode; name: string; model: string; seats: number; bags: number; image: number }[] = [
  { code: 'standard', name: 'Standard', model: 'Toyota Corolla', seats: 4, bags: 2, image: require('../../assets/fleet/corolla.jpg') },
  { code: 'suv', name: 'SUV', model: 'Toyota RAV4', seats: 5, bags: 4, image: require('../../assets/fleet/rav4.jpg') },
  { code: 'premium', name: 'Premium', model: 'Toyota Grand Highlander', seats: 7, bags: 6, image: require('../../assets/fleet/highlander.jpg') },
]

export type Quote = { distanceM: number; durationS: number; recommendedCents: number; route: LngLat[] }

type Driver = { id: string; firstName: string; rating: number; rides: number; service: ServiceCode; vehicle: { make: string; model: string; color: string; plate: string } }

export type Offer = {
  id: string; fareCents: number; kind: 'accept' | 'counter'; etaS: number; distanceM: number
  appearsAt: string; expiresAt: string
  driver: { id: string; firstName: string; rating: number; rides: number }
  vehicle: { make: string; model: string; color: string }
}

export type RideRequest = {
  id: string; service: ServiceCode; pickup: Place; dropoff: Place; distanceM: number; durationS: number; route: LngLat[]
  recommendedCents: number; offeredCents: number; payment: Payment
  status: 'searching' | 'matched' | 'cancelled' | 'expired'; createdAt: string; expiresAt: string; rideId?: string
}

export type RideStatus = 'driver_en_route' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled'

export type RideView = {
  id: string; status: RideStatus; service: ServiceCode; fareCents: number; payment: Payment
  pickup: Place; dropoff: Place; route: LngLat[]; distanceM: number; durationS: number
  driver: { id: string; firstName: string; rating: number; rides: number }
  vehicle: { make: string; model: string; color: string; plate: string }
  driverPosition: (LngLat & { heading: number }) | null; etaS: number | null
  acceptedAt: string; startedAt?: string; completedAt?: string; cancelledAt?: string
  stars?: number; rated: boolean
  passengerName?: string; cancelledBy?: 'passenger' | 'driver'
}

// ───────── lieux de Cincinnati ─────────

export const myPosition: LngLat = { lat: 39.1009, lng: -84.5120 }
const area = { minLat: 38.95, maxLat: 39.35, minLng: -84.8, maxLng: -84.25 }

export const places: Place[] = [
  { id: 'p1', name: 'Fountain Square', detail: '520 Vine St, Downtown', point: { lat: 39.1015, lng: -84.5125 }, kind: 'landmark' },
  { id: 'p2', name: 'CVG Airport', detail: 'Cincinnati/Northern Kentucky International, Hebron, KY', point: { lat: 39.0489, lng: -84.6678 }, kind: 'airport' },
  { id: 'p3', name: 'Hyde Park Square', detail: 'Erie Ave, Hyde Park', point: { lat: 39.1387, lng: -84.4423 }, kind: 'landmark' },
  { id: 'p4', name: 'Great American Ball Park', detail: '100 Joe Nuxhall Way, The Banks', point: { lat: 39.0974, lng: -84.5066 }, kind: 'stadium' },
  { id: 'p5', name: 'Paycor Stadium', detail: '1 Paycor Stadium, The Banks', point: { lat: 39.0954, lng: -84.5161 }, kind: 'stadium' },
  { id: 'p6', name: 'Findlay Market', detail: '1801 Race St, Over-the-Rhine', point: { lat: 39.1153, lng: -84.5188 }, kind: 'landmark' },
  { id: 'p7', name: 'University of Cincinnati', detail: '2600 Clifton Ave, Clifton', point: { lat: 39.1329, lng: -84.5150 }, kind: 'landmark' },
  { id: 'p8', name: 'Kenwood Towne Centre', detail: '7875 Montgomery Rd, Kenwood', point: { lat: 39.2009, lng: -84.3733 }, kind: 'mall' },
  { id: 'p9', name: 'Cincinnati Union Terminal', detail: '1301 Western Ave, Queensgate', point: { lat: 39.1098, lng: -84.5376 }, kind: 'station' },
  { id: 'p10', name: 'Newport on the Levee', detail: '1 Levee Way, Newport, KY', point: { lat: 39.0947, lng: -84.4955 }, kind: 'mall' },
  { id: 'p11', name: 'Cincinnati Zoo', detail: '3400 Vine St, Avondale', point: { lat: 39.1452, lng: -84.5087 }, kind: 'landmark' },
  { id: 'p12', name: 'Roebling Point', detail: 'Court St, Covington, KY', point: { lat: 39.0880, lng: -84.5088 }, kind: 'street' },
  { id: 'p13', name: "Cincinnati Children's Hospital", detail: '3333 Burnet Ave, Avondale', point: { lat: 39.1405, lng: -84.5023 }, kind: 'landmark' },
  { id: 'p14', name: 'Mariemont Square', detail: 'Wooster Pike, Mariemont', point: { lat: 39.1451, lng: -84.3744 }, kind: 'street' },
]

// ───────── chauffeurs et tarifs ─────────

const drivers: Driver[] = [
  { id: 'd1', firstName: 'Danielle', rating: 4.9, rides: 1240, service: 'standard', vehicle: { make: 'Toyota', model: 'Corolla', color: 'White', plate: 'OH · HRT 2291' } },
  { id: 'd2', firstName: 'Keisha', rating: 4.8, rides: 860, service: 'standard', vehicle: { make: 'Toyota', model: 'Corolla', color: 'Gray', plate: 'KY · 4WD 118' } },
  { id: 'd3', firstName: 'Ahmed', rating: 4.7, rides: 412, service: 'standard', vehicle: { make: 'Toyota', model: 'Corolla', color: 'Black', plate: 'OH · JLM 7730' } },
  { id: 'd4', firstName: 'Marcus', rating: 4.9, rides: 2105, service: 'suv', vehicle: { make: 'Toyota', model: 'RAV4', color: 'Silver', plate: 'OH · JKT 4821' } },
  { id: 'd5', firstName: 'Tom', rating: 4.8, rides: 977, service: 'suv', vehicle: { make: 'Toyota', model: 'RAV4', color: 'Blue', plate: 'KY · 7RB 402' } },
  { id: 'd6', firstName: 'Luis', rating: 4.9, rides: 1530, service: 'suv', vehicle: { make: 'Toyota', model: 'RAV4', color: 'Black', plate: 'OH · GPX 5506' } },
  { id: 'd7', firstName: 'Andre', rating: 5.0, rides: 688, service: 'premium', vehicle: { make: 'Toyota', model: 'Grand Highlander', color: 'Black', plate: 'OH · SMB 0007' } },
  { id: 'd8', firstName: 'Rachel', rating: 4.9, rides: 1012, service: 'premium', vehicle: { make: 'Toyota', model: 'Grand Highlander', color: 'Pearl', plate: 'OH · VIP 2410' } },
  { id: 'd9', firstName: 'Chris', rating: 4.8, rides: 541, service: 'premium', vehicle: { make: 'Toyota', model: 'Grand Highlander', color: 'Gray', plate: 'KY · LUX 919' } },
]

// Prix conseillé : base + km + minutes, arrondi au dollar au-dessus. Montants en cents.
const fares: Record<ServiceCode, { base: number; perKm: number; perMin: number; min: number }> = {
  standard: { base: 250, perKm: 105, perMin: 22, min: 900 },
  suv: { base: 350, perKm: 140, perMin: 28, min: 1200 },
  premium: { base: 500, perKm: 190, perMin: 35, min: 1800 },
}
const recommendedFare = (s: ServiceCode, distM: number, durS: number) => {
  const f = fares[s]
  return Math.ceil(Math.max(f.min, f.base + (f.perKm * distM) / 1000 + (f.perMin * durS) / 60) / 100) * 100
}

// Durées de la démo (secondes) : assez courtes pour tout voir en une minute et demie.
const APPROACH_S = 30, WAIT_S = 10, TRIP_S = 40, OFFER_TTL_S = 45, REQUEST_TTL_S = 600
// En base, une offre de chauffeur reste valable 60 s.
export const OFFER_TTL = live ? 60 : OFFER_TTL_S

// ───────── géométrie ─────────

const rad = (d: number) => (d * Math.PI) / 180
export function distanceM(a: LngLat, b: LngLat) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}
const lerp = (a: LngLat, b: LngLat, t: number): LngLat => ({ lng: a.lng + (b.lng - a.lng) * t, lat: a.lat + (b.lat - a.lat) * t })
const bearing = (a: LngLat, b: LngLat) => (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180 / Math.PI + 360) % 360
const inArea = (p: LngLat) => p.lat >= area.minLat && p.lat <= area.maxLat && p.lng >= area.minLng && p.lng <= area.maxLng

// Itinéraire « en escalier » qui ressemble à des rues (la vraie carte donnera le vrai trajet).
function fakeRoute(a: LngLat, b: LngLat): LngLat[] {
  const m1 = { lng: a.lng + (b.lng - a.lng) * 0.35, lat: a.lat }
  const m2 = { lng: m1.lng, lat: a.lat + (b.lat - a.lat) * 0.7 }
  return [a, m1, m2, { lng: b.lng, lat: m2.lat }, b]
}
const routeLength = (r: LngLat[]) => r.slice(1).reduce((s, p, i) => s + distanceM(r[i], p), 0)
function alongRoute(r: LngLat[], t: number): LngLat & { heading: number } {
  let d = routeLength(r) * Math.max(0, Math.min(1, t))
  for (let i = 1; i < r.length; i++) {
    const seg = distanceM(r[i - 1], r[i])
    if (d <= seg || i === r.length - 1) return { ...lerp(r[i - 1], r[i], seg ? Math.min(1, d / seg) : 1), heading: bearing(r[i - 1], r[i]) }
    d -= seg
  }
  return { ...r[r.length - 1], heading: 0 }
}
function trip(a: LngLat, b: LngLat) {
  const route = fakeRoute(a, b)
  const distanceM = Math.max(500, Math.round(routeLength(route) * 1.15))
  const durationS = Math.round(distanceM / (40000 / 3600)) + 120 // ~40 km/h en ville + 2 min
  return { route, distanceM, durationS }
}

// ───────── stockage ─────────

type StoredOffer = Offer & { driverId: string }
type StoredRide = Omit<RideView, 'status' | 'driverPosition' | 'etaS' | 'startedAt' | 'completedAt' | 'rated'> & {
  approachRoute: LngLat[]; approachEtaS: number; cancelled?: boolean
}
type Store = { requests: RideRequest[]; offers: Record<string, StoredOffer[]>; declined: string[]; rides: StoredRide[]; recent: string[] }

const KEY = 'statesmob-rides'
let mem: Store = { requests: [], offers: {}, declined: [], rides: [], recent: ['p2', 'p4'] }
function load(): Store {
  try { const raw = globalThis.localStorage?.getItem(KEY); if (raw) mem = { ...mem, ...JSON.parse(raw) } } catch { /* mémoire seule */ }
  return mem
}
function save(s: Store) { mem = s; try { globalThis.localStorage?.setItem(KEY, JSON.stringify(s)) } catch { /* idem */ } }

const now = () => Date.now()
const iso = (t = now()) => new Date(t).toISOString()
const uid = (p: string) => `${p}${now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase()
const wait = (ms = 300) => new Promise<void>((r) => setTimeout(r, ms))

// Chauffeurs du bon service qui répondent quelques secondes après la demande (ou après une hausse de prix).
function makeOffers(r: RideRequest, from: number, round: number): StoredOffer[] {
  const pool = drivers.filter((d) => d.service === r.service)
  const delays = [4, 8, 13]
  return pool.map((d, i) => {
    const counter = i === 1 && round === 0
    const appears = from + delays[i] * 1000
    const dist = 600 + ((i * 937 + round * 311) % 2600)
    return {
      id: uid('O'), driverId: d.id, kind: counter ? 'counter' : 'accept',
      fareCents: counter ? r.offeredCents + 300 : r.offeredCents,
      etaS: Math.round(dist / (30000 / 3600)) + 60, distanceM: dist,
      appearsAt: iso(appears), expiresAt: iso(appears + OFFER_TTL_S * 1000),
      driver: { id: d.id, firstName: d.firstName, rating: d.rating, rides: d.rides },
      vehicle: { make: d.vehicle.make, model: d.vehicle.model, color: d.vehicle.color },
    } as StoredOffer
  })
}

function requestView(r: RideRequest): RideRequest {
  if (r.status === 'searching' && Date.parse(r.expiresAt) <= now()) return { ...r, status: 'expired' }
  return r
}

function rideView(s: StoredRide): RideView {
  const t = (now() - Date.parse(s.acceptedAt)) / 1000
  const base = { ...s, rated: s.stars != null }
  const startedAt = iso(Date.parse(s.acceptedAt) + (APPROACH_S + WAIT_S) * 1000)
  const completedAt = iso(Date.parse(startedAt) + TRIP_S * 1000)
  if (s.cancelled) return { ...base, status: 'cancelled', driverPosition: null, etaS: null }
  if (t < APPROACH_S) {
    const p = t / APPROACH_S
    return { ...base, status: 'driver_en_route', driverPosition: alongRoute(s.approachRoute, p), etaS: Math.max(60, Math.round(s.approachEtaS * (1 - p))) }
  }
  if (t < APPROACH_S + WAIT_S) return { ...base, status: 'driver_arrived', driverPosition: { ...s.pickup.point, heading: 0 }, etaS: 0 }
  if (t < APPROACH_S + WAIT_S + TRIP_S) {
    const p = (t - APPROACH_S - WAIT_S) / TRIP_S
    return { ...base, status: 'in_progress', startedAt, driverPosition: alongRoute(s.route, p), etaS: Math.max(60, Math.round(s.durationS * (1 - p))) }
  }
  return { ...base, status: 'completed', startedAt, completedAt, driverPosition: { ...s.dropoff.point, heading: 0 }, etaS: null }
}

// ───────── API ─────────

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const geo = {
  myPosition: async () => { await wait(200); return { ...myPosition } },
  reverse: async (p: LngLat): Promise<Place> => {
    const nearest = [...places].sort((a, b) => distanceM(a.point, p) - distanceM(b.point, p))[0]
    const d = distanceM(nearest.point, p)
    return d < 250 ? { ...nearest } : { id: uid('PL'), name: `Near ${nearest.name}`, detail: `${Math.round(d / 1609.34 * 10) / 10} mi away · pinned location`, point: p, kind: 'street' }
  },
  recent: async (): Promise<Place[]> => load().recent.map((id) => places.find((p) => p.id === id)).filter(Boolean).map((p) => ({ ...(p as Place), kind: 'recent' as const })),
  search: async (text: string): Promise<Place[]> => {
    await wait(150)
    const q = norm(text.trim())
    return q.length < 2 ? [] : places.filter((p) => norm(p.name).includes(q) || norm(p.detail).includes(q)).slice(0, 8)
  },
}

const fakeRides = {
  quote: async (a: LngLat, b: LngLat, service: ServiceCode): Promise<Quote> => {
    await wait(250)
    if (!inArea(a)) throw new ApiError('pickup_outside', 'This pickup is outside our service area.')
    if (!inArea(b)) throw new ApiError('dropoff_outside', 'This destination is outside our service area.')
    if (distanceM(a, b) < 300) throw new ApiError('too_short', 'Pickup and destination are too close.')
    const t = trip(a, b)
    return { ...t, recommendedCents: recommendedFare(service, t.distanceM, t.durationS) }
  },

  createRequest: async (input: { service: ServiceCode; pickup: Place; dropoff: Place; offeredCents: number; payment: Payment }): Promise<RideRequest> => {
    await wait()
    const s = load()
    if (s.requests.some((r) => requestView(r).status === 'searching')) throw new ApiError('one_searching', 'You already have a request in progress.')
    const t = trip(input.pickup.point, input.dropoff.point)
    const rec = recommendedFare(input.service, t.distanceM, t.durationS)
    if (input.offeredCents < rec) throw new ApiError('fare_too_low', `The minimum for this trip is $${rec / 100}.`)
    const r: RideRequest = { id: uid('R'), ...input, ...t, recommendedCents: rec, status: 'searching', createdAt: iso(), expiresAt: iso(now() + REQUEST_TTL_S * 1000) }
    const recent = [input.dropoff.id, ...s.recent.filter((x) => x !== input.dropoff.id)].filter((x) => places.some((p) => p.id === x)).slice(0, 4)
    save({ ...s, requests: [r, ...s.requests], offers: { ...s.offers, [r.id]: makeOffers(r, now(), 0) }, recent })
    return r
  },

  request: async (id: string): Promise<RideRequest> => {
    const r = load().requests.find((x) => x.id === id)
    if (!r) throw new ApiError('not_found', 'We could not find this request.')
    return requestView(r)
  },

  offers: async (id: string): Promise<Offer[]> => {
    const s = load()
    const t = now()
    return (s.offers[id] ?? []).filter((o) => !s.declined.includes(o.id) && Date.parse(o.appearsAt) <= t && Date.parse(o.expiresAt) > t)
  },

  raiseFare: async (id: string, cents: number) => {
    await wait()
    const s = load()
    const r = s.requests.find((x) => x.id === id)
    if (!r || requestView(r).status !== 'searching' || cents <= r.offeredCents) throw new ApiError('not_raisable', 'The new price must be higher.')
    const raised = { ...r, offeredCents: cents, expiresAt: iso(Math.max(Date.parse(r.expiresAt), now() + 300_000)) }
    const round = (s.offers[id]?.length ?? 0) / 3
    save({ ...s, requests: s.requests.map((x) => (x.id === id ? raised : x)), offers: { ...s.offers, [id]: [...(s.offers[id] ?? []), ...makeOffers(raised, now() - 2000, round)] } })
  },

  declineOffer: async (offerId: string) => { const s = load(); save({ ...s, declined: [...s.declined, offerId] }) },

  cancelRequest: async (id: string) => {
    await wait()
    const s = load()
    save({ ...s, requests: s.requests.map((r) => (r.id === id && r.status === 'searching' ? { ...r, status: 'cancelled' } : r)) })
  },

  acceptOffer: async (requestId: string, offerId: string): Promise<RideView> => {
    await wait()
    const s = load()
    const r = s.requests.find((x) => x.id === requestId)
    const o = (s.offers[requestId] ?? []).find((x) => x.id === offerId)
    if (!r || requestView(r).status !== 'searching') throw new ApiError('closed', 'This request is no longer open.')
    if (!o || Date.parse(o.expiresAt) <= now()) throw new ApiError('offer_expired', 'This offer just expired.')
    const d = drivers.find((x) => x.id === o.driverId)!
    // Le chauffeur part d'un point à quelques rues du départ.
    const start = { lat: r.pickup.point.lat + o.distanceM / 111000 * 0.7, lng: r.pickup.point.lng - o.distanceM / 86000 * 0.7 }
    const ride: StoredRide = {
      id: uid('SM'), service: r.service, fareCents: o.fareCents, payment: r.payment, pickup: r.pickup, dropoff: r.dropoff,
      route: r.route, distanceM: r.distanceM, durationS: r.durationS, driver: o.driver, vehicle: { ...d.vehicle },
      acceptedAt: iso(), approachRoute: fakeRoute(start, r.pickup.point), approachEtaS: o.etaS,
    }
    save({ ...s, requests: s.requests.map((x) => (x.id === requestId ? { ...x, status: 'matched', rideId: ride.id } : x)), rides: [ride, ...s.rides] })
    return rideView(ride)
  },

  ride: async (id: string): Promise<RideView> => {
    const r = load().rides.find((x) => x.id === id)
    if (!r) throw new ApiError('not_found', 'We could not find this ride.')
    return rideView(r)
  },

  cancelRide: async (id: string) => {
    await wait()
    const s = load()
    const r = s.rides.find((x) => x.id === id)
    if (!r) throw new ApiError('not_found', 'We could not find this ride.')
    const v = rideView(r)
    if (v.status !== 'driver_en_route' && v.status !== 'driver_arrived') throw new ApiError('not_cancellable', 'Your ride has already started.')
    save({ ...s, rides: s.rides.map((x) => (x.id === id ? { ...x, cancelled: true, cancelledAt: iso() } : x)) })
  },

  rate: async (id: string, stars: number) => {
    await wait()
    if (stars < 1 || stars > 5) throw new ApiError('invalid_stars', 'Pick 1 to 5 stars.')
    const s = load()
    save({ ...s, rides: s.rides.map((x) => (x.id === id ? { ...x, stars } : x)) })
  },

  // Où reprendre en ouvrant l'app : course en cours, demande en recherche, ou course à noter.
  active: async (): Promise<{ rideId?: string; requestId?: string; rideToRate?: string }> => {
    const s = load()
    const views = s.rides.map(rideView)
    const live = views.find((v) => v.status === 'driver_en_route' || v.status === 'driver_arrived' || v.status === 'in_progress')
    if (live) return { rideId: live.id }
    const req = s.requests.map(requestView).find((r) => r.status === 'searching')
    if (req) return { requestId: req.id }
    const toRate = views.find((v) => v.status === 'completed' && !v.rated && now() - Date.parse(v.completedAt!) < 3_600_000)
    return toRate ? { rideToRate: toRate.id } : {}
  },

  history: async (): Promise<RideView[]> => load().rides.map(rideView),

  clear: () => save({ requests: [], offers: {}, declined: [], rides: [], recent: ['p2', 'p4'] }),
}

// Base branchée : vraies demandes et vrais chauffeurs. Sinon : démo hors ligne avec chauffeurs simulés.
export const liveRides = makeLiveRides({ trip, recommendedFare, fakeRoute, alongRoute })
export const rides = live ? { ...fakeRides, ...liveRides.rides } : fakeRides

export const formatUSD = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`
export const formatMiles = (m: number) => `${(m / 1609.34).toLocaleString('en-US', { maximumFractionDigits: 1 })} mi`
export const formatMinutes = (s: number) => `${Math.max(1, Math.round(s / 60))} min`
