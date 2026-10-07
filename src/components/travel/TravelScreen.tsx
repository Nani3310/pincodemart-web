'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Dialog } from '@/components/ui/Dialog';
import { AlertCircle, Car, Ticket, Home, Menu, Plus, MapPin, Phone } from 'lucide-react';
import { TravelService, RentalListing } from '@/types';
import { ConcernButton } from '@/components/ui/ConcernButton';
import { BottomNav } from '@/components/ui/BottomNav';
import { calculateDistanceKm, compareDistance, Coordinates, formatDistanceKm } from '@/lib/utils';

type TravelTab = 'tickets' | 'rides' | 'rentals' | 'my-listings';
type PublishType = 'tickets' | 'rides' | 'rentals';
type TravelServiceWithDistance = TravelService & { distanceKm?: number | null };
type RentalListingWithDistance = RentalListing & { distanceKm?: number | null };

const ticketTypes = ['Train', 'Bus', 'Flight', 'Movie', 'Event', 'Other'];

const initialTravelForm = {
  from: '',
  to: '',
  date: '',
  time: '',
  price: '',
  ticketType: ticketTypes[0],
  ticketsAvailable: '',
  vehicleType: '',
  capacity: '',
  vacancy: '',
  durationMins: '',
  distanceKm: '',
  contactPhone: '',
};

const initialRentalForm = {
  title: '',
  city: '',
  address: '',
  rent: '',
  bedrooms: '',
  contactPhone: '',
};

export default function TravelScreen() {
  const searchParams = useSearchParams();
  const requestedType = searchParams.get('type');
  const [activeTab, setActiveTab] = useState<TravelTab>(
    requestedType === 'rides' || requestedType === 'tickets' || requestedType === 'rentals'
      ? requestedType
      : 'rentals',
  );
  const [loading, setLoading] = useState(true);
  const [travelServices, setTravelServices] = useState<TravelService[]>([]);
  const [rentalListings, setRentalListings] = useState<RentalListing[]>([]);
  const [myTravel,setMyTravel]=useState<TravelService[]>([]);
  const [myRentals,setMyRentals]=useState<RentalListing[]>([]);
  const [myListingsError,setMyListingsError]=useState('');
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [publishType, setPublishType] = useState<PublishType>('tickets');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishMessage, setPublishMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [rentalSearch, setRentalSearch] = useState('');
  const [showRentalFilters, setShowRentalFilters] = useState(false);
  const [maxRent, setMaxRent] = useState('');
  const [minBedrooms, setMinBedrooms] = useState('');
  const [travelForm, setTravelForm] = useState(initialTravelForm);
  const [rentalForm, setRentalForm] = useState(initialRentalForm);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (activeTab === 'my-listings') {
        setMyListingsError('');
        const {data:{user}}=await supabase.auth.getUser();
        if(!user){setMyTravel([]);setMyRentals([]);setMyListingsError('Please sign in to view your listings.');return;}
        const [travel,rentals]=await Promise.all([supabase.from('travel_services').select('*').eq('provider_id',user.id).order('created_at',{ascending:false}),supabase.from('rental_listings').select('*').eq('owner_id',user.id).order('created_at',{ascending:false})]);
        if(travel.error)throw travel.error;if(rentals.error)throw rentals.error;
        setMyTravel(travel.data||[]);setMyRentals(rentals.data||[]);
      } else if (activeTab === 'tickets' || activeTab === 'rides') {
        const { data } = await supabase
          .from('travel_services')
          .select('id, provider_id, service_type, departure_location, destination_location, scheduled_date, scheduled_time, price_inr, contact_phone, approval_status, payment_status, is_active, ride_duration_mins, distance_km, vehicle_type, capacity, vacancy, photo_urls, pincode, latitude, longitude, created_at')
          .eq('is_active', true)
          .eq('approval_status', 'approved')
          .eq('service_type', activeTab === 'tickets' ? 'switch_ticket' : 'book_ride')
          .order('scheduled_date', { ascending: true })
          .limit(50);
        
        if (data) setTravelServices(data);
      } else if (activeTab === 'rentals') {
        const { data } = await supabase
          .from('rental_listings')
          .select('id, owner_id, title, description, city, address_line, map_link, rent_inr, bedrooms, capacity, vacancy, contact_phone, approval_status, payment_status, is_active, media_urls, pincode, latitude, longitude, created_at')
          .eq('is_active', true)
          .eq('approval_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (data) setRentalListings(data);
      }
    } catch (error) {
      console.error('Error loading travel data:', error);
      if(activeTab==='my-listings')setMyListingsError('Could not load your listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 },
    );
  }, []);

  const handlePublish = (type: PublishType) => {
    setPublishType(type);
    setPublishError('');
    setPublishMessage('');
    setShowPublishDialog(true);
    setShowMenu(false);
  };

  const resetPublishForms = () => {
    setTravelForm(initialTravelForm);
    setRentalForm(initialRentalForm);
  };

  const handleAcceptTicket = (service: TravelService) => {
    if (service.contact_phone) {
      window.open(`tel:${encodeURIComponent(service.contact_phone)}`, '_self', 'noopener,noreferrer');
      return;
    }

    setPublishMessage('This ticket does not have a contact phone. Please try another listing.');
  };

  const validateTravelForm = () => {
    const missing: string[] = [];
    if (!travelForm.from.trim()) missing.push('From');
    if (!travelForm.to.trim()) missing.push('To');
    if (!travelForm.date) missing.push('Date');
    if (!travelForm.time) missing.push('Time');
    if (!travelForm.price || Number(travelForm.price) <= 0) missing.push('Price');
    if (!travelForm.contactPhone.trim()) missing.push('Contact phone');
    if (publishType === 'tickets') {
      if (!travelForm.ticketType.trim()) missing.push('Ticket type');
      if (!travelForm.ticketsAvailable || Number(travelForm.ticketsAvailable) <= 0) missing.push('Tickets available');
    }
    return missing;
  };

  const handleSubmitPublish = async () => {
    try {
      setPublishing(true);
      setPublishError('');
      setPublishMessage('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPublishError(`Please sign in to publish this ${publishType === 'rentals' ? 'stay' : publishType === 'tickets' ? 'ticket' : 'ride'}.`);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, pincode, latitude, longitude')
        .eq('id', user.id)
        .single();

      if (publishType === 'rentals') {
        const missing: string[] = [];
        if (!rentalForm.title.trim()) missing.push('Title');
        if (!rentalForm.city.trim()) missing.push('City');
        if (!rentalForm.address.trim()) missing.push('Address');
        if (!rentalForm.rent || Number(rentalForm.rent) <= 0) missing.push('Rent');
        if (!rentalForm.contactPhone.trim()) missing.push('Contact phone');
        if (missing.length > 0) {
          setPublishError(`Please fill: ${missing.join(', ')}`);
          return;
        }

        const { error } = await supabase.from('rental_listings').insert({
          owner_id: user.id,
          title: rentalForm.title.trim(),
          city: rentalForm.city.trim(),
          address_line: rentalForm.address.trim(),
          rent_inr: Number(rentalForm.rent),
          bedrooms: rentalForm.bedrooms ? Number(rentalForm.bedrooms) : null,
          contact_phone: rentalForm.contactPhone.trim(),
          payment_status: 'completed',
          approval_status: 'pending',
          is_active: false,
          pincode: profile?.pincode ?? null,
          latitude: profile?.latitude ?? userCoordinates?.latitude ?? null,
          longitude: profile?.longitude ?? userCoordinates?.longitude ?? null,
        });

        if (error) throw error;
      } else {
        const missing = validateTravelForm();
        if (missing.length > 0) {
          setPublishError(`Please fill: ${missing.join(', ')}`);
          return;
        }

        const isTicket = publishType === 'tickets';
        const availableCount = isTicket
          ? Number(travelForm.ticketsAvailable)
          : travelForm.vacancy
            ? Number(travelForm.vacancy)
            : null;

        const { error } = await supabase.from('travel_services').insert({
          provider_id: user.id,
          service_type: isTicket ? 'switch_ticket' : 'book_ride',
          departure_location: travelForm.from.trim(),
          destination_location: travelForm.to.trim(),
          scheduled_date: travelForm.date,
          scheduled_time: travelForm.time,
          price_inr: Number(travelForm.price),
          contact_phone: travelForm.contactPhone.trim() || profile?.phone || null,
          ride_duration_mins: isTicket || !travelForm.durationMins ? null : Number(travelForm.durationMins),
          distance_km: isTicket || !travelForm.distanceKm ? null : Number(travelForm.distanceKm),
          vehicle_type: isTicket ? travelForm.ticketType : travelForm.vehicleType.trim() || null,
          capacity: isTicket
            ? Number(travelForm.ticketsAvailable)
            : travelForm.capacity
              ? Number(travelForm.capacity)
              : null,
          vacancy: availableCount,
          photo_urls: [],
          payment_status: 'completed',
          approval_status: 'pending',
          is_active: false,
          pincode: profile?.pincode ?? null,
          latitude: profile?.latitude ?? userCoordinates?.latitude ?? null,
          longitude: profile?.longitude ?? userCoordinates?.longitude ?? null,
        });

        if (error) throw error;
      }

      await loadData();
      resetPublishForms();
      setShowPublishDialog(false);
      setPublishMessage('Listing submitted. It will appear after admin approval.');
    } catch (error) {
      console.error('Error publishing listing:', error);
      setPublishError(error instanceof Error ? error.message : 'Could not publish listing. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const visibleTravelServices = travelServices.map<TravelServiceWithDistance>((service) => {
    const distanceKm = userCoordinates && service.latitude != null && service.longitude != null
      ? calculateDistanceKm(userCoordinates, { latitude: service.latitude, longitude: service.longitude })
      : null;

    return { ...service, distanceKm };
  }).filter((service) => {
    const from = searchFrom.trim().toLowerCase();
    const to = searchTo.trim().toLowerCase();
    return (!from || service.departure_location.toLowerCase().includes(from)) &&
      (!to || service.destination_location.toLowerCase().includes(to));
  }).sort((a, b) => compareDistance(a.distanceKm, b.distanceKm));

  const visibleRentals = rentalListings.map<RentalListingWithDistance>((rental) => {
    const distanceKm = userCoordinates && rental.latitude != null && rental.longitude != null
      ? calculateDistanceKm(userCoordinates, { latitude: rental.latitude, longitude: rental.longitude })
      : null;

    return { ...rental, distanceKm };
  }).filter((rental) => {
    const query = rentalSearch.trim().toLowerCase();
    return (!maxRent || rental.rent_inr <= Number(maxRent)) && (!minBedrooms || (rental.bedrooms ?? 0) >= Number(minBedrooms)) && (!query ||
      rental.title.toLowerCase().includes(query) ||
      rental.city?.toLowerCase().includes(query) ||
      rental.pincode?.includes(query));
	  }).sort((a, b) => compareDistance(a.distanceKm, b.distanceKm));

  const activeListingCount = activeTab === 'rentals' ? visibleRentals.length : visibleTravelServices.length;
  const isSortedByLocation = Boolean(userCoordinates);

  if (loading) {
    return (
      <div className="min-h-dvh app-page-bg flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh app-page-bg page-travel pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="travel-header reference-container">
        <div className="flex justify-between gap-3 items-start"><div><h1>Travel</h1><p>Tickets, rides, and rental homes near you</p></div><button className="provider-toggle" onClick={()=>setShowMenu(!showMenu)} aria-expanded={showMenu} aria-label="Provider console"><Menu/><span>Provider<br/>Console</span></button></div>
        {showMenu && <><button className="provider-backdrop" aria-label="Close provider console" onClick={()=>setShowMenu(false)}/><div className="provider-menu"><div><h2>Provider console</h2><p>Publish or manage travel listings</p></div><button onClick={()=>handlePublish('rentals')}>Publish rental home</button><button onClick={()=>handlePublish('tickets')}>Publish ticket</button><button onClick={()=>handlePublish('rides')}>Publish ride</button><button onClick={()=>{setActiveTab('my-listings');setShowMenu(false)}}>My listings</button></div></>}
        <div className="travel-tabs">{[{id:'rentals',label:'Rent Home'},{id:'tickets',label:'Tickets'},{id:'rides',label:'Rides'},{id:'my-listings',label:'My Listings'}].map(tab=><button key={tab.id} className={activeTab===tab.id?'active':''} onClick={()=>{setActiveTab(tab.id as TravelTab);setShowMenu(false)}}>{tab.label}</button>)}</div>
      </header>

      {publishMessage && (
        <div className="mx-auto max-w-6xl px-4 mb-4">
          <div className="rounded-lg border border-primary/25 bg-primary-light p-3 text-sm font-medium text-primary-dark">
            {publishMessage}
          </div>
        </div>
      )}

      {/* Search Panel */}
      {(activeTab === 'tickets' || activeTab === 'rides') && (
        <div className="mx-auto max-w-6xl px-4 mb-4">
          <Card className="travel-search-card">
            <h3 className="font-extrabold text-slate-900 text-sm mb-3">
              {activeTab === 'tickets' ? 'Search tickets' : 'Search rides'}
            </h3>
            <div className="space-y-2.5">
              <Input
                type="text"
                placeholder="From"
                value={searchFrom}
                onChange={(event) => setSearchFrom(event.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl text-sm"
              />
              <Input
                type="text"
                placeholder="To"
                value={searchTo}
                onChange={(event) => setSearchTo(event.target.value)}
                className="bg-slate-50 border-slate-200 rounded-xl text-sm"
              />
            </div>
            <div className="text-right mt-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setSearchFrom('');
                  setSearchTo('');
                }}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                + Optional filters / Clear
              </button>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full text-sm font-extrabold shadow-md"
              onClick={() => void loadData()}
            >
              {activeTab === 'tickets' ? 'Search tickets' : 'Search rides'}
            </Button>
          </Card>
        </div>
      )}

      {activeTab === 'rentals' && <div className="reference-container travel-search-wrap"><Card className="travel-search-card"><h3>Search rental homes</h3><Input placeholder="Destination / City" value={rentalSearch} onChange={e=>setRentalSearch(e.target.value)} className="rental-destination"/><div className="optional-filter-row"><button onClick={()=>setShowRentalFilters(!showRentalFilters)} aria-expanded={showRentalFilters}>+ Optional filters</button></div>{showRentalFilters && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4"><Input label="Maximum monthly rent" type="number" min="0" value={maxRent} onChange={e=>setMaxRent(e.target.value)}/><Input label="Minimum bedrooms" type="number" min="0" value={minBedrooms} onChange={e=>setMinBedrooms(e.target.value)}/></div>}<Button className="rental-search-button" onClick={()=>void loadData()}>Search rentals</Button></Card></div>}

      {/* Listings */}
      <div className="mx-auto max-w-6xl px-4">
        <div className={activeTab==='my-listings'?'hidden':'mb-3 flex flex-wrap items-center justify-between gap-2'}>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Available listings</h2>
            <p className="text-xs text-slate-500">
              {activeListingCount} result{activeListingCount === 1 ? '' : 's'}
            </p>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {isSortedByLocation ? 'Nearest first' : 'Enable location for nearest first'}
          </span>
        </div>

        {activeTab === 'my-listings' ? (
          <div className="my-travel-listings">{myListingsError?<p role="alert">{myListingsError}</p>:myTravel.length+myRentals.length===0?<p>You haven&apos;t published any listings yet.</p>:<div className="grid gap-3 sm:grid-cols-2">{myRentals.map(item=><Card className="p-4" key={item.id}><h3 className="font-semibold">{item.title}</h3><p>{item.city}</p><p>{'\u20b9'}{item.rent_inr} / month</p><span className="text-xs text-primary capitalize">{item.approval_status}</span></Card>)}{myTravel.map(item=><Card className="p-4" key={item.id}><h3 className="font-semibold">{item.departure_location} to {item.destination_location}</h3><p>{item.scheduled_date}</p><p>{'\u20b9'}{item.price_inr}</p><span className="text-xs text-primary capitalize">{item.approval_status}</span></Card>)}</div>}</div>
        ) : activeTab === 'rentals' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleRentals.length === 0 ? (
              <p className="rental-empty sm:col-span-2">No matching rentals.</p>
            ) : (
              visibleRentals.map((rental) => (
                <Card key={rental.id} className="bg-white overflow-hidden rounded-2xl shadow-sm border border-slate-100">
                  <div className="h-40 bg-primary-light flex items-center justify-center">
                    {rental.media_urls && rental.media_urls.length > 0 ? (
                      <img src={rental.media_urls[0]} alt={rental.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <Home className="w-12 h-12 text-slate-400" />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="truncate font-bold text-slate-900">{rental.title}</h3>
                    <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{rental.city}</span>
                      {formatDistanceKm(rental.distanceKm) && (
                        <span className="flex-shrink-0 font-medium text-blue-600">- {formatDistanceKm(rental.distanceKm)}</span>
                      )}
                    </div>
                    <p className="text-emerald-600 font-extrabold text-base mt-2">₹{rental.rent_inr}/month</p>
                    {rental.bedrooms && (
                      <p className="text-slate-600 text-xs mt-0.5">{rental.bedrooms} bedrooms</p>
                    )}
                    {rental.contact_phone && (
                      <Button
                        size="sm"
                        variant="accept"
                        className="w-full mt-3 font-bold"
                        onClick={() => window.open(`tel:${encodeURIComponent(rental.contact_phone!)}`)}
                      >
                        <Phone className="w-4 h-4 mr-1.5" />
                        Contact Owner
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleTravelServices.length === 0 ? (
              <p className="text-center text-slate-500 py-8 sm:col-span-2">
                No {activeTab === 'tickets' ? 'tickets' : 'rides'} available
              </p>
            ) : (
              visibleTravelServices.map((service) => (
                <Card key={service.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                  <div className="flex flex-col justify-between h-full">
                    <div>
                      <div className="font-extrabold text-slate-900 text-base">
                        {service.departure_location} → {service.destination_location}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>{service.scheduled_date} - {service.scheduled_time}</span>
                      </div>
                      {service.vehicle_type && (
                        <div className="text-xs font-semibold text-blue-600 mt-1.5">
                          {activeTab === 'tickets' ? `Ticket: ${service.vehicle_type}` : `Ride: ${service.vehicle_type}`}
                        </div>
                      )}
                      {service.vacancy != null && (
                        <div className="text-xs text-slate-600 mt-0.5">
                          {service.vacancy} {activeTab === 'tickets' ? 'tickets left' : 'seats available'}
                        </div>
                      )}
                      <p className="text-emerald-600 font-black text-lg mt-2">₹{service.price_inr}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="accept"
                        className="w-full font-extrabold shadow-md shadow-emerald-500/20"
                        onClick={() => handleAcceptTicket(service)}
                      >
                        <Phone className="w-4 h-4 mr-1.5" />
                        {activeTab === 'tickets' ? 'Accept Ticket / Call' : 'Book Ride / Call'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Publish Dialog */}
      <Dialog
        isOpen={showPublishDialog}
        onClose={() => setShowPublishDialog(false)}
        title={`Publish ${publishType === 'rentals' ? 'stay' : publishType === 'tickets' ? 'ticket' : 'ride'}`}
        className="max-h-[calc(100dvh-2rem)]"
      >
        <div className="space-y-4 pb-1">
          {publishError && (
            <div className="flex items-center gap-2 rounded-lg border border-primary-accent/35 bg-primary-accent/10 p-3 text-sm text-error">
              <AlertCircle className="h-4 w-4" />
              {publishError}
            </div>
          )}

          {publishType === 'tickets' || publishType === 'rides' ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              {publishType === 'tickets' ? (
                <Ticket className="w-12 h-12 text-primary mb-3 animate-pulse" />
              ) : (
                <Car className="w-12 h-12 text-primary mb-3 animate-pulse" />
              )}
              <h2 className="text-xl font-bold text-text-primary mb-1">Coming soon</h2>
              <p className="text-text-secondary text-sm">
                Publishing {publishType === 'tickets' ? 'tickets' : 'rides'} will be available soon!
              </p>
              <Button className="mt-6 w-full" onClick={() => setShowPublishDialog(false)}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <Input
                type="text"
                placeholder="Title"
                value={rentalForm.title}
                onChange={(event) => setRentalForm({ ...rentalForm, title: event.target.value })}
              />
              <Input
                type="text"
                placeholder="City / location"
                value={rentalForm.city}
                onChange={(event) => setRentalForm({ ...rentalForm, city: event.target.value })}
              />
              <Input
                type="text"
                placeholder="Full address"
                value={rentalForm.address}
                onChange={(event) => setRentalForm({ ...rentalForm, address: event.target.value })}
              />
              <Input
                type="number"
                placeholder="Rent (₹/month)"
                value={rentalForm.rent}
                onChange={(event) => setRentalForm({ ...rentalForm, rent: event.target.value })}
              />
              <Input
                type="number"
                placeholder="Bedrooms"
                value={rentalForm.bedrooms}
                onChange={(event) => setRentalForm({ ...rentalForm, bedrooms: event.target.value })}
              />
              <Input
                type="tel"
                placeholder="Contact phone"
                value={rentalForm.contactPhone}
                onChange={(event) => setRentalForm({ ...rentalForm, contactPhone: event.target.value })}
              />
            </>
          )}

          {/* Commented out unused travel forms
          {publishType !== 'rentals' && (
            <>
              <Input
                type="text"
                placeholder="From location"
                value={travelForm.from}
                onChange={(event) => setTravelForm({ ...travelForm, from: event.target.value })}
              />
              <Input
                type="text"
                placeholder="To location"
                value={travelForm.to}
                onChange={(event) => setTravelForm({ ...travelForm, to: event.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={travelForm.date}
                  onChange={(event) => setTravelForm({ ...travelForm, date: event.target.value })}
                />
                <Input
                  type="time"
                  value={travelForm.time}
                  onChange={(event) => setTravelForm({ ...travelForm, time: event.target.value })}
                />
              </div>
              <Input
                type="number"
                placeholder="Price (₹)"
                value={travelForm.price}
                onChange={(event) => setTravelForm({ ...travelForm, price: event.target.value })}
              />
              {publishType === 'tickets' ? (
                <>
                  <select
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                    value={travelForm.ticketType}
                    onChange={(event) => setTravelForm({ ...travelForm, ticketType: event.target.value })}
                  >
                    {ticketTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    placeholder="Tickets available"
                    value={travelForm.ticketsAvailable}
                    onChange={(event) => setTravelForm({ ...travelForm, ticketsAvailable: event.target.value })}
                  />
                </>
              ) : (
                <>
                  <Input
                    type="text"
                    placeholder="Vehicle type"
                    value={travelForm.vehicleType}
                    onChange={(event) => setTravelForm({ ...travelForm, vehicleType: event.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="Total seats"
                      value={travelForm.capacity}
                      onChange={(event) => setTravelForm({ ...travelForm, capacity: event.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Seats left"
                      value={travelForm.vacancy}
                      onChange={(event) => setTravelForm({ ...travelForm, vacancy: event.target.value })}
                    />
                  </div>
                </>
              )}
              <Input
                type="tel"
                placeholder="Contact phone"
                value={travelForm.contactPhone}
                onChange={(event) => setTravelForm({ ...travelForm, contactPhone: event.target.value })}
              />
            </>
          )}
          */}

          {publishType === 'rentals' && (
            <div className="sticky bottom-0 -mx-4 -mb-4 border-t border-border bg-surface/95 p-4 backdrop-blur">
              <Button className="w-full" onClick={handleSubmitPublish} disabled={publishing}>
                {publishing ? 'Publishing...' : 'Submit for approval'}
              </Button>
              <p className="mt-2 text-center text-xs text-text-secondary">Listing fee: ₹9. Admin approval required before it goes live.</p>
            </div>
          )}
        </div>
      </Dialog>
      <ConcernButton />
      <BottomNav />
    </div>
  );
}
