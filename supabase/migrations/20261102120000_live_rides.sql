-- StatesMob : courses réelles entre un passager et un chauffeur (test d'acceptation).
-- Chaque appareil se connecte en anonyme (un compte par rôle). Les tables sont fermées par RLS :
-- toute lecture et écriture passe par les fonctions ci-dessous (security definer), qui vérifient auth.uid().

-- ─────────────────────────── tables ───────────────────────────

create table drivers (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (length(first_name) between 1 and 60),
  last_name text not null default '',
  phone text not null default '',
  city text not null default '',
  vehicle jsonb not null,                         -- {type, seats, make, model, year, color, plate}
  services text[] not null check (services <@ array['standard','suv','premium']::text[] and cardinality(services) > 0),
  rating numeric(2,1) not null default 5.0,
  ratings_count integer not null default 0,
  rides_count integer not null default 0,
  approved_at timestamptz not null,               -- démo : validation automatique quelques secondes après l'envoi
  online boolean not null default false,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table ride_requests (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references auth.users(id) on delete cascade,
  passenger_name text not null default 'Passenger',
  service text not null check (service in ('standard','suv','premium')),
  pickup jsonb not null,                          -- Place {id, name, detail, point:{lng,lat}}
  dropoff jsonb not null,
  route jsonb not null default '[]',
  distance_m integer not null check (distance_m > 0),
  duration_s integer not null check (duration_s > 0),
  recommended_cents integer not null check (recommended_cents > 0),
  offered_cents integer not null,
  payment text not null check (payment in ('card','cash')),
  status text not null default 'searching' check (status in ('searching','matched','cancelled')),
  ride_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  check (offered_cents >= recommended_cents)
);
create index on ride_requests (status, service, expires_at);
create index on ride_requests (passenger_id, created_at desc);

create table offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references ride_requests(id) on delete cascade,
  driver_id uuid not null references drivers(id) on delete cascade,
  fare_cents integer not null check (fare_cents > 0),
  kind text not null check (kind in ('accept','counter')),
  eta_s integer not null default 300,
  distance_m integer not null default 2000,
  status text not null default 'open' check (status in ('open','declined','accepted','withdrawn')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 seconds'
);
create index on offers (request_id, status);
create index on offers (driver_id, created_at desc);

create table rides (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references ride_requests(id),
  passenger_id uuid not null references auth.users(id) on delete cascade,
  passenger_name text not null,
  driver_id uuid not null references drivers(id) on delete cascade,
  service text not null,
  fare_cents integer not null,
  payment text not null,
  pickup jsonb not null, dropoff jsonb not null, route jsonb not null,
  distance_m integer not null, duration_s integer not null,
  approach_eta_s integer not null,
  status text not null default 'driver_en_route'
    check (status in ('driver_en_route','driver_arrived','in_progress','completed','cancelled')),
  accepted_at timestamptz not null default now(),
  arrived_at timestamptz, started_at timestamptz, completed_at timestamptz, cancelled_at timestamptz,
  cancelled_by text check (cancelled_by in ('passenger','driver')),
  stars smallint check (stars between 1 and 5)
);
create index on rides (passenger_id, accepted_at desc);
create index on rides (driver_id, accepted_at desc);

alter table drivers enable row level security;
alter table ride_requests enable row level security;
alter table offers enable row level security;
alter table rides enable row level security;
-- Aucune policy : les clients n'accèdent jamais aux tables directement.
revoke all on drivers, ride_requests, offers, rides from anon, authenticated;

-- ─────────────────────────── vues JSON ───────────────────────────

create or replace function _uid() returns uuid language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in' using hint = 'Sign in again.'; end if;
  return auth.uid();
end $$;

create or replace function _request_json(r ride_requests) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', r.id, 'service', r.service, 'pickup', r.pickup, 'dropoff', r.dropoff,
    'distanceM', r.distance_m, 'durationS', r.duration_s, 'route', r.route,
    'recommendedCents', r.recommended_cents, 'offeredCents', r.offered_cents, 'payment', r.payment,
    'status', case when r.status = 'searching' and r.expires_at <= now() then 'expired' else r.status end,
    'createdAt', r.created_at, 'expiresAt', r.expires_at, 'rideId', r.ride_id,
    'passengerName', r.passenger_name)
$$;

create or replace function _driver_public(d drivers) returns jsonb language sql stable as $$
  select jsonb_build_object('id', d.id, 'firstName', d.first_name, 'rating', d.rating, 'rides', d.rides_count)
$$;

create or replace function _ride_json(x rides) returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', x.id, 'status', x.status, 'service', x.service, 'fareCents', x.fare_cents, 'payment', x.payment,
    'pickup', x.pickup, 'dropoff', x.dropoff, 'route', x.route, 'distanceM', x.distance_m, 'durationS', x.duration_s,
    'approachEtaS', x.approach_eta_s, 'passengerName', x.passenger_name,
    'driver', _driver_public(d),
    'vehicle', jsonb_build_object('make', d.vehicle->>'make', 'model', d.vehicle->>'model', 'color', d.vehicle->>'color', 'plate', d.vehicle->>'plate'),
    'acceptedAt', x.accepted_at, 'arrivedAt', x.arrived_at, 'startedAt', x.started_at,
    'completedAt', x.completed_at, 'cancelledAt', x.cancelled_at, 'cancelledBy', x.cancelled_by,
    'stars', x.stars, 'rated', x.stars is not null)
  from drivers d where d.id = x.driver_id
$$;

-- ─────────────────────────── passager ───────────────────────────

create or replace function create_request(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _uid(); r ride_requests;
begin
  if exists (select 1 from ride_requests where passenger_id = me and status = 'searching' and expires_at > now()) then
    raise exception 'one_searching' using hint = 'You already have a request in progress.';
  end if;
  if (p->>'offeredCents')::int < (p->>'recommendedCents')::int then
    raise exception 'fare_too_low' using hint = 'Your price is below the minimum for this trip.';
  end if;
  insert into ride_requests (passenger_id, passenger_name, service, pickup, dropoff, route, distance_m, duration_s, recommended_cents, offered_cents, payment)
  values (me, coalesce(nullif(trim(p->>'passengerName'), ''), 'Passenger'), p->>'service', p->'pickup', p->'dropoff', coalesce(p->'route', '[]'),
          (p->>'distanceM')::int, (p->>'durationS')::int, (p->>'recommendedCents')::int, (p->>'offeredCents')::int, p->>'payment')
  returning * into r;
  return _request_json(r);
end $$;

create or replace function get_request(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r ride_requests;
begin
  select * into r from ride_requests where id = p_id and passenger_id = _uid();
  if not found then raise exception 'not_found' using hint = 'We could not find this request.'; end if;
  return _request_json(r);
end $$;

create or replace function request_offers(p_id uuid) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id, 'fareCents', o.fare_cents, 'kind', o.kind, 'etaS', o.eta_s, 'distanceM', o.distance_m,
      'appearsAt', o.created_at, 'expiresAt', o.expires_at, 'driver', _driver_public(d),
      'vehicle', jsonb_build_object('make', d.vehicle->>'make', 'model', d.vehicle->>'model', 'color', d.vehicle->>'color'))
    order by o.created_at), '[]')
  from offers o join ride_requests r on r.id = o.request_id join drivers d on d.id = o.driver_id
  where o.request_id = p_id and r.passenger_id = auth.uid() and o.status = 'open' and o.expires_at > now()
$$;

create or replace function raise_fare(p_id uuid, p_cents int) returns void
language plpgsql security definer set search_path = public as $$
begin
  update ride_requests set offered_cents = p_cents, expires_at = greatest(expires_at, now() + interval '5 minutes')
  where id = p_id and passenger_id = _uid() and status = 'searching' and expires_at > now() and p_cents > offered_cents;
  if not found then raise exception 'not_raisable' using hint = 'The new price must be higher.'; end if;
  -- Les offres « au prix demandé » plus basses ne valent plus : le chauffeur doit renvoyer.
  update offers set status = 'withdrawn' where request_id = p_id and status = 'open' and fare_cents < p_cents;
end $$;

create or replace function decline_offer(p_offer uuid) returns void
language sql security definer set search_path = public as $$
  update offers o set status = 'declined' from ride_requests r
  where o.id = p_offer and r.id = o.request_id and r.passenger_id = auth.uid() and o.status = 'open'
$$;

create or replace function cancel_request(p_id uuid) returns void
language sql security definer set search_path = public as $$
  with r as (update ride_requests set status = 'cancelled' where id = p_id and passenger_id = auth.uid() and status = 'searching' returning id)
  update offers set status = 'withdrawn' where request_id in (select id from r) and status = 'open'
$$;

create or replace function accept_offer(p_request uuid, p_offer uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _uid(); r ride_requests; o offers; x rides;
begin
  select * into r from ride_requests where id = p_request and passenger_id = me for update;
  if not found or r.status <> 'searching' or r.expires_at <= now() then
    raise exception 'closed' using hint = 'This request is no longer open.';
  end if;
  select * into o from offers where id = p_offer and request_id = p_request for update;
  if not found or o.status <> 'open' or o.expires_at <= now() then
    raise exception 'offer_expired' using hint = 'This offer just expired.';
  end if;
  if exists (select 1 from rides where driver_id = o.driver_id and status in ('driver_en_route','driver_arrived','in_progress')) then
    update offers set status = 'withdrawn' where id = o.id;
    raise exception 'driver_busy' using hint = 'This driver just took another ride.';
  end if;
  insert into rides (request_id, passenger_id, passenger_name, driver_id, service, fare_cents, payment, pickup, dropoff, route, distance_m, duration_s, approach_eta_s)
  values (r.id, me, r.passenger_name, o.driver_id, r.service, o.fare_cents, r.payment, r.pickup, r.dropoff, r.route, r.distance_m, r.duration_s, o.eta_s)
  returning * into x;
  update ride_requests set status = 'matched', ride_id = x.id where id = r.id;
  update offers set status = case when id = o.id then 'accepted' else 'withdrawn' end where request_id = r.id and status = 'open';
  -- Le chauffeur retenu retire ses autres offres en cours.
  update offers set status = 'withdrawn' where driver_id = o.driver_id and status = 'open';
  return _ride_json(x);
end $$;

create or replace function get_ride(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare x rides;
begin
  select * into x from rides where id = p_id and (passenger_id = _uid() or driver_id = auth.uid());
  if not found then raise exception 'not_found' using hint = 'We could not find this ride.'; end if;
  return _ride_json(x);
end $$;

create or replace function cancel_ride(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := _uid();
begin
  update rides set status = 'cancelled', cancelled_at = now(), cancelled_by = case when driver_id = me then 'driver' else 'passenger' end
  where id = p_id and (passenger_id = me or driver_id = me) and status in ('driver_en_route','driver_arrived');
  if not found then raise exception 'not_cancellable' using hint = 'This ride has already started.'; end if;
end $$;

create or replace function rate_ride(p_id uuid, p_stars int) returns void
language plpgsql security definer set search_path = public as $$
declare d uuid;
begin
  if p_stars not between 1 and 5 then raise exception 'invalid_stars' using hint = 'Pick 1 to 5 stars.'; end if;
  update rides set stars = p_stars where id = p_id and passenger_id = _uid() and status = 'completed' and stars is null returning driver_id into d;
  if d is null then raise exception 'not_ratable' using hint = 'This ride can''t be rated.'; end if;
  update drivers set rating = round(((rating * (ratings_count + 1)) + p_stars) / (ratings_count + 2), 1), ratings_count = ratings_count + 1 where id = d;
end $$;

create or replace function my_rides() returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(_ride_json(x) order by x.accepted_at desc), '[]')
  from (select * from rides where passenger_id = auth.uid() order by accepted_at desc limit 50) x
$$;

create or replace function my_active() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v uuid;
begin
  if me is null then return '{}'; end if;
  select id into v from rides where passenger_id = me and status in ('driver_en_route','driver_arrived','in_progress') order by accepted_at desc limit 1;
  if v is not null then return jsonb_build_object('rideId', v); end if;
  select id into v from ride_requests where passenger_id = me and status = 'searching' and expires_at > now() order by created_at desc limit 1;
  if v is not null then return jsonb_build_object('requestId', v); end if;
  select id into v from rides where passenger_id = me and status = 'completed' and stars is null and completed_at > now() - interval '1 hour' order by completed_at desc limit 1;
  if v is not null then return jsonb_build_object('rideToRate', v); end if;
  return '{}';
end $$;

-- ─────────────────────────── chauffeur ───────────────────────────

create or replace function _driver_json(d drivers) returns jsonb language sql stable as $$
  select jsonb_build_object('id', d.id, 'firstName', d.first_name, 'lastName', d.last_name, 'city', d.city,
    'vehicle', d.vehicle, 'services', to_jsonb(d.services), 'rating', d.rating, 'rides', d.rides_count,
    'approvedAt', d.approved_at, 'approved', d.approved_at <= now(),
    'online', d.online and d.last_seen > now() - interval '2 minutes')
$$;

create or replace function driver_register(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _uid(); d drivers;
begin
  insert into drivers (id, first_name, last_name, phone, city, vehicle, services, approved_at)
  values (me, trim(p->>'firstName'), coalesce(trim(p->>'lastName'), ''), coalesce(p->>'phone', ''), coalesce(p->>'city', ''),
          p->'vehicle', array(select jsonb_array_elements_text(p->'services')), now() + interval '45 seconds')
  on conflict (id) do update set first_name = excluded.first_name, last_name = excluded.last_name, phone = excluded.phone,
    city = excluded.city, vehicle = excluded.vehicle, services = excluded.services
  returning * into d;
  return _driver_json(d);
end $$;

create or replace function driver_me() returns jsonb
language sql security definer set search_path = public as $$
  select _driver_json(d) from drivers d where d.id = auth.uid()
$$;

create or replace function driver_set_online(p_online boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d drivers;
begin
  update drivers set online = p_online, last_seen = now() where id = _uid() and approved_at <= now() returning * into d;
  if not found then raise exception 'not_approved' using hint = 'Your driver account is not approved yet.'; end if;
  return _driver_json(d);
end $$;

-- Demandes ouvertes que ce chauffeur peut prendre, avec sa propre offre s'il en a envoyé une.
-- Sert aussi de « battement de cœur » : rester sur l'écran garde le chauffeur en ligne.
create or replace function driver_feed() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _uid(); d drivers; ride uuid;
begin
  update drivers set last_seen = now() where id = me and online returning * into d;
  if not found then return jsonb_build_object('online', false, 'requests', '[]'::jsonb); end if;
  select id into ride from rides where driver_id = me and status in ('driver_en_route','driver_arrived','in_progress') order by accepted_at desc limit 1;
  return jsonb_build_object('online', true, 'rideId', ride, 'requests', coalesce((
    select jsonb_agg(_request_json(r) || jsonb_build_object('myOffer', (
        select jsonb_build_object('id', o.id, 'fareCents', o.fare_cents, 'status', case when o.status = 'open' and o.expires_at <= now() then 'expired' else o.status end, 'expiresAt', o.expires_at)
        from offers o where o.request_id = r.id and o.driver_id = me order by o.created_at desc limit 1))
      order by r.created_at desc)
    from ride_requests r
    where r.status = 'searching' and r.expires_at > now() and r.service = any(d.services) and r.passenger_id <> me
  ), '[]'::jsonb));
end $$;

create or replace function driver_send_offer(p_request uuid, p_cents int) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := _uid(); d drivers; r ride_requests;
begin
  select * into d from drivers where id = me and online and approved_at <= now();
  if not found then raise exception 'offline' using hint = 'Go online to send offers.'; end if;
  if exists (select 1 from rides where driver_id = me and status in ('driver_en_route','driver_arrived','in_progress')) then
    raise exception 'busy' using hint = 'Finish your current ride first.';
  end if;
  select * into r from ride_requests where id = p_request and status = 'searching' and expires_at > now() and service = any(d.services);
  if not found then raise exception 'closed' using hint = 'This request is no longer open.'; end if;
  if p_cents < r.offered_cents then raise exception 'too_low' using hint = 'Your offer can''t be below the passenger''s price.'; end if;
  update offers set status = 'withdrawn' where request_id = r.id and driver_id = me and status = 'open';
  insert into offers (request_id, driver_id, fare_cents, kind, eta_s, distance_m)
  values (r.id, me, p_cents, case when p_cents = r.offered_cents then 'accept' else 'counter' end, 240 + floor(random() * 300)::int, 800 + floor(random() * 2400)::int);
end $$;

create or replace function driver_advance(p_ride uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := _uid(); x rides;
begin
  update rides set status = p_status,
    arrived_at = case when p_status = 'driver_arrived' then now() else arrived_at end,
    started_at = case when p_status = 'in_progress' then now() else started_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end
  where id = p_ride and driver_id = me and (
    (status = 'driver_en_route' and p_status = 'driver_arrived') or
    (status = 'driver_arrived' and p_status = 'in_progress') or
    (status = 'in_progress' and p_status = 'completed'))
  returning * into x;
  if not found then raise exception 'bad_step' using hint = 'This step is not available any more.'; end if;
  if p_status = 'completed' then update drivers set rides_count = rides_count + 1 where id = me; end if;
  return _ride_json(x);
end $$;

create or replace function driver_rides() returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(_ride_json(x) order by x.accepted_at desc), '[]')
  from (select * from rides where driver_id = auth.uid() order by accepted_at desc limit 50) x
$$;

-- ─────────────────────────── droits ───────────────────────────

revoke execute on all functions in schema public from public, anon;
grant execute on function
  create_request(jsonb), get_request(uuid), request_offers(uuid), raise_fare(uuid, int), decline_offer(uuid),
  cancel_request(uuid), accept_offer(uuid, uuid), get_ride(uuid), cancel_ride(uuid), rate_ride(uuid, int), my_rides(), my_active(),
  driver_register(jsonb), driver_me(), driver_set_online(boolean), driver_feed(), driver_send_offer(uuid, int),
  driver_advance(uuid, text), driver_rides()
to authenticated;
