// Courses réelles (base Supabase) avec la même interface que la démo de ./ride.ts.
// Le trajet et le prix conseillé sont calculés sur l'appareil ; la base garde la demande, les offres et la course.
import { booking } from './booking'
import { rpc } from './supabase'
import type { LngLat, Offer, Payment, Place, RideRequest, RideView, ServiceCode } from './ride'

type Helpers = {
  trip: (a: LngLat, b: LngLat) => { route: LngLat[]; distanceM: number; durationS: number }
  recommendedFare: (s: ServiceCode, distM: number, durS: number) => number
  fakeRoute: (a: LngLat, b: LngLat) => LngLat[]
  alongRoute: (r: LngLat[], t: number) => LngLat & { heading: number }
}

// Ce que renvoient get_ride / accept_offer : la course sans position du chauffeur.
export type RawRide = Omit<RideView, 'driverPosition' | 'etaS'> & {
  approachEtaS: number; arrivedAt?: string; passengerName: string; cancelledBy?: 'passenger' | 'driver'
}

const since = (isoDate?: string) => (isoDate ? (Date.now() - Date.parse(isoDate)) / 1000 : 0)

export function makeLiveRides(h: Helpers) {
  // Position du chauffeur déduite des heures de la course (le GPS viendra avec l'app native).
  const toView = (x: RawRide): RideView & { passengerName: string; cancelledBy?: 'passenger' | 'driver' } => {
    const seed = parseInt(x.id.replace(/\D/g, '').slice(0, 4) || '7', 10)
    const start = { lat: x.pickup.point.lat + 0.006 + (seed % 7) / 1000, lng: x.pickup.point.lng - 0.008 - (seed % 5) / 1000 }
    if (x.status === 'driver_en_route') {
      const p = Math.min(0.95, since(x.acceptedAt) / x.approachEtaS)
      return { ...x, driverPosition: h.alongRoute(h.fakeRoute(start, x.pickup.point), p), etaS: Math.max(60, Math.round(x.approachEtaS * (1 - p))) }
    }
    if (x.status === 'driver_arrived') return { ...x, driverPosition: { ...x.pickup.point, heading: 0 }, etaS: 0 }
    if (x.status === 'in_progress') {
      const p = Math.min(0.97, since(x.startedAt) / x.durationS)
      return { ...x, driverPosition: h.alongRoute(x.route, p), etaS: Math.max(60, Math.round(x.durationS * (1 - p))) }
    }
    if (x.status === 'completed') return { ...x, driverPosition: { ...x.dropoff.point, heading: 0 }, etaS: null }
    return { ...x, driverPosition: null, etaS: null }
  }

  const rides = {
    createRequest: async (input: { service: ServiceCode; pickup: Place; dropoff: Place; offeredCents: number; payment: Payment }): Promise<RideRequest> => {
      const t = h.trip(input.pickup.point, input.dropoff.point)
      const passengerName = (booking.savedContact()?.fullName ?? '').split(' ')[0]
      return rpc('passenger', 'create_request', {
        p: { ...input, ...t, recommendedCents: h.recommendedFare(input.service, t.distanceM, t.durationS), passengerName },
      })
    },
    request: (id: string) => rpc<RideRequest>('passenger', 'get_request', { p_id: id }),
    offers: (id: string) => rpc<Offer[]>('passenger', 'request_offers', { p_id: id }),
    raiseFare: (id: string, cents: number) => rpc<void>('passenger', 'raise_fare', { p_id: id, p_cents: cents }),
    declineOffer: (offerId: string) => rpc<void>('passenger', 'decline_offer', { p_offer: offerId }),
    cancelRequest: (id: string) => rpc<void>('passenger', 'cancel_request', { p_id: id }),
    acceptOffer: async (requestId: string, offerId: string) => toView(await rpc<RawRide>('passenger', 'accept_offer', { p_request: requestId, p_offer: offerId })),
    ride: async (id: string) => toView(await rpc<RawRide>('passenger', 'get_ride', { p_id: id })),
    cancelRide: (id: string) => rpc<void>('passenger', 'cancel_ride', { p_id: id }),
    rate: (id: string, stars: number) => rpc<void>('passenger', 'rate_ride', { p_id: id, p_stars: stars }),
    active: () => rpc<{ rideId?: string; requestId?: string; rideToRate?: string }>('passenger', 'my_active'),
    history: async () => (await rpc<RawRide[]>('passenger', 'my_rides')).map(toView),
  }
  return { rides, toView }
}
