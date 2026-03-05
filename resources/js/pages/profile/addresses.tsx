import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { MapPin, Plus, User, Pencil, Trash2, Star, Map as MapIcon, Search, Crosshair, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import type { SharedData } from '@/types';

const ADDRESS_TYPES = [
    { value: 'home', label: 'Home' },
    { value: 'work', label: 'Work' },
    { value: 'other', label: 'Other' },
] as const;

type AddressType = (typeof ADDRESS_TYPES)[number]['value'];

interface UserAddressData {
    id: number;
    type: string;
    label: string | null;
    address_line_1: string;
    address_line_2: string | null;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
    is_default: boolean;
}

interface AddressesPageProps {
    addresses: UserAddressData[];
}

interface AddressSearchResult {
    id: string;
    primaryText: string;
    secondaryText: string;
    prediction: PlacePredictionLike;
}

interface AddressComponentLike {
    longText?: string;
    long_name?: string;
    types?: string[];
}

interface PlaceLike {
    fetchFields: (options: { fields: string[] }) => Promise<void>;
    location?: google.maps.LatLng | null;
    formattedAddress?: string;
    displayName?: string | { text?: string };
    addressComponents?: AddressComponentLike[];
}

interface PlacePredictionLike {
    text?: { toString: () => string };
    placeId?: string;
    toPlace: () => PlaceLike;
}

interface PlaceSuggestionLike {
    placePrediction?: PlacePredictionLike;
}

interface AutocompleteSuggestionStaticLike {
    fetchAutocompleteSuggestions: (request: Record<string, unknown>) => Promise<{ suggestions?: PlaceSuggestionLike[] }>;
}

interface PlacesLibraryLike extends google.maps.PlacesLibrary {
    AutocompleteSuggestion?: AutocompleteSuggestionStaticLike;
    AutocompleteSessionToken?: new () => unknown;
}

const ADDRESS_MAP_DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const GOOGLE_MAP_LIBRARIES: 'places'[] = ['places'];

const emptyAddress = {
    type: 'home' as AddressType,
    label: '',
    address_line_1: '',
    address_line_2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    is_default: false,
};

export default function ProfileAddresses({ addresses }: AddressesPageProps) {
    const { theme, flash } = (usePage().props as unknown as SharedData & { flash?: { message?: string } }) ?? {};
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const addForm = useForm(emptyAddress);
    const editingAddress = addresses.find((a) => a.id === editingId);
    const editForm = useForm({
        type: (editingAddress?.type ?? 'home') as AddressType,
        label: editingAddress?.label ?? '',
        address_line_1: editingAddress?.address_line_1 ?? '',
        address_line_2: editingAddress?.address_line_2 ?? '',
        landmark: editingAddress?.landmark ?? '',
        city: editingAddress?.city ?? '',
        state: editingAddress?.state ?? '',
        pincode: editingAddress?.pincode ?? '',
        is_default: editingAddress?.is_default ?? false,
    });

    useEffect(() => {
        if (editingAddress) {
            editForm.setData({
                type: editingAddress.type as AddressType,
                label: editingAddress.label ?? '',
                address_line_1: editingAddress.address_line_1,
                address_line_2: editingAddress.address_line_2 ?? '',
                landmark: editingAddress.landmark ?? '',
                city: editingAddress.city,
                state: editingAddress.state,
                pincode: editingAddress.pincode,
                is_default: editingAddress.is_default,
            });
        }
    }, [editingId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (theme) {
            document.documentElement.style.setProperty('--theme-primary-1', theme.primary_1);
            document.documentElement.style.setProperty('--theme-primary-2', theme.primary_2);
            document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
            document.documentElement.style.setProperty('--theme-tertiary', theme.tertiary);
        }
    }, [theme]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addForm.post('/profile/addresses', {
            preserveScroll: true,
            onSuccess: () => {
                addForm.reset();
                setShowAddForm(false);
            },
        });
    };

    const handleUpdate = (id: number, e: React.FormEvent) => {
        e.preventDefault();
        editForm.put(`/profile/addresses/${id}`, {
            preserveScroll: true,
            onSuccess: () => setEditingId(null),
        });
    };

    const handleDelete = (id: number) => {
        if (!confirm('Remove this address?')) return;
        router.delete(`/profile/addresses/${id}`, { preserveScroll: true });
    };

    const handleSetDefault = (id: number) => {
        router.post(`/profile/addresses/${id}/default`, {}, { preserveScroll: true });
    };

    return (
        <UserLayout>
            <Head title="Addresses" />
            <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
                <h1 className="text-2xl font-bold text-gray-900">Addresses</h1>
                <p className="mt-1 text-sm text-gray-600">Manage your delivery addresses.</p>

                {flash?.message && (
                    <div className="mt-4 rounded-lg bg-(--theme-primary-1)/10 px-4 py-3 text-sm text-(--theme-primary-1)">{flash.message}</div>
                )}

                <div className="mt-6 flex flex-col gap-6 sm:flex-row">
                    <nav className="flex shrink-0 gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-2 sm:flex-col sm:gap-0">
                        <Link
                            href="/profile"
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white hover:text-gray-900"
                        >
                            <User className="h-4 w-4" />
                            Profile
                        </Link>
                        <Link
                            href="/profile/addresses"
                            className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-(--theme-primary-1) shadow-sm"
                        >
                            <MapPin className="h-4 w-4" />
                            Addresses
                        </Link>
                    </nav>

                    <div className="min-w-0 flex-1 space-y-4">
                        {!showAddForm ? (
                            <button
                                type="button"
                                onClick={() => setShowAddForm(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-6 text-sm font-medium text-gray-600 hover:border-(--theme-primary-1) hover:text-(--theme-primary-1)"
                            >
                                <Plus className="h-5 w-5" />
                                Add address
                            </button>
                        ) : (
                            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-semibold text-gray-900">Add address</h2>
                                <form onSubmit={handleAdd} className="mt-4 space-y-4">
                                    <AddressFormFields form={addForm} formId="add" />
                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={addForm.processing}
                                            className="rounded-lg bg-(--theme-primary-1) px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
                                        >
                                            {addForm.processing ? 'Adding…' : 'Add address'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddForm(false);
                                                addForm.reset();
                                            }}
                                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {addresses.length === 0 && !showAddForm && (
                            <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
                                No addresses yet. Add one above.
                            </p>
                        )}

                        {addresses.map((addr) => (
                            <div key={addr.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                {editingId === addr.id ? (
                                    <>
                                        <h2 className="text-lg font-semibold text-gray-900">Edit address</h2>
                                        <form onSubmit={(e) => handleUpdate(addr.id, e)} className="mt-4 space-y-4">
                                            <AddressFormFields form={editForm} formId={`edit-${addr.id}`} />
                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    disabled={editForm.processing}
                                                    className="rounded-lg bg-(--theme-primary-1) px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId(null)}
                                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                                        {ADDRESS_TYPES.find((t) => t.value === addr.type)?.label ?? addr.type}
                                                    </span>
                                                    {addr.is_default && (
                                                        <span className="flex items-center gap-1 rounded bg-(--theme-primary-1)/10 px-2 py-0.5 text-xs font-medium text-(--theme-primary-1)">
                                                            <Star className="h-3 w-3 fill-current" />
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-2 text-sm text-gray-900">
                                                    {addr.address_line_1}
                                                    {addr.address_line_2 && `, ${addr.address_line_2}`}
                                                </p>
                                                {addr.landmark && <p className="text-xs text-gray-500">Landmark: {addr.landmark}</p>}
                                                <p className="mt-1 text-sm text-gray-600">
                                                    {addr.city}, {addr.state} – {addr.pincode}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                {!addr.is_default && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetDefault(addr.id)}
                                                        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-(--theme-primary-1)"
                                                        title="Set as default"
                                                    >
                                                        <Star className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingId(addr.id)}
                                                    className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(addr.id)}
                                                    className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                    title="Remove"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </UserLayout>
    );
}

function AddressFormFields({
    form,
    formId = 'form',
}: {
    form: ReturnType<typeof useForm<typeof emptyAddress & { address_line_1?: string; city?: string; state?: string; pincode?: string }>>;
    formId?: string;
}) {
    const { googleMapsApiKey } = usePage<SharedData>().props;
    const apiKey = typeof googleMapsApiKey === 'string' ? googleMapsApiKey : '';

    const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useJsApiLoader({
        id: 'profile-addresses-google-map-script',
        googleMapsApiKey: apiKey,
        libraries: GOOGLE_MAP_LIBRARIES,
    });

    const [isMapOpen, setIsMapOpen] = useState(false);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const placesLibraryRef = useRef<PlacesLibraryLike | null>(null);
    const placesSessionTokenRef = useRef<unknown | null>(null);
    const placesSearchRequestIdRef = useRef(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [placesAutocompleteError, setPlacesAutocompleteError] = useState<string | null>(null);
    const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [toolMessage, setToolMessage] = useState<string | null>(null);

    const ensureMarker = useCallback(async (): Promise<google.maps.marker.AdvancedMarkerElement | null> => {
        if (!mapRef.current || !window.google?.maps) {
            return null;
        }

        if (markerRef.current) {
            markerRef.current.map = mapRef.current;
            return markerRef.current;
        }

        const markerLibrary = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
        const marker = new markerLibrary.AdvancedMarkerElement({
            map: mapRef.current,
            title: 'Selected address location',
        });

        markerRef.current = marker;

        return marker;
    }, []);

    const setMarkerPosition = useCallback(
        async (lat: number, lng: number): Promise<void> => {
            if (!mapRef.current) {
                return;
            }

            const marker = await ensureMarker();
            if (!marker) {
                return;
            }

            marker.map = mapRef.current;
            marker.position = { lat, lng };
            mapRef.current.panTo({ lat, lng });
        },
        [ensureMarker],
    );

    const ensurePlacesLibrary = useCallback(async (): Promise<PlacesLibraryLike> => {
        if (placesLibraryRef.current) {
            return placesLibraryRef.current;
        }

        const placesLibrary = (await google.maps.importLibrary('places')) as PlacesLibraryLike;
        placesLibraryRef.current = placesLibrary;

        return placesLibrary;
    }, []);

    const ensurePlacesSessionToken = useCallback(async (): Promise<unknown | null> => {
        const placesLibrary = await ensurePlacesLibrary();

        if (!placesLibrary.AutocompleteSessionToken) {
            return null;
        }

        if (placesSessionTokenRef.current === null) {
            placesSessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
        }

        return placesSessionTokenRef.current;
    }, [ensurePlacesLibrary]);

    const refreshPlacesSessionToken = useCallback(async (): Promise<void> => {
        const placesLibrary = await ensurePlacesLibrary();

        if (!placesLibrary.AutocompleteSessionToken) {
            placesSessionTokenRef.current = null;
            return;
        }

        placesSessionTokenRef.current = new placesLibrary.AutocompleteSessionToken();
    }, [ensurePlacesLibrary]);

    useEffect(() => {
        if (!isMapOpen || !isGoogleMapsLoaded || mapLocation || !navigator.geolocation) {
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = Number(position.coords.latitude.toFixed(6));
                const lng = Number(position.coords.longitude.toFixed(6));

                setMapLocation({ lat, lng });
                if (mapRef.current) {
                    mapRef.current.setCenter({ lat, lng });
                    mapRef.current.setZoom(14);
                }
            },
            () => {},
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0,
            },
        );
    }, [isGoogleMapsLoaded, isMapOpen, mapLocation]);

    useEffect(() => {
        if (!mapLocation) {
            return;
        }

        void setMarkerPosition(mapLocation.lat, mapLocation.lng);
        if (mapRef.current) {
            const currentZoom = mapRef.current.getZoom() ?? 12;
            mapRef.current.setZoom(Math.max(currentZoom, 15));
        }
    }, [mapLocation, setMarkerPosition]);

    const getAddressComponent = (components: AddressComponentLike[], type: string): string => {
        const component = components.find((addressComponent) => Array.isArray(addressComponent.types) && addressComponent.types.includes(type));

        if (!component) {
            return '';
        }

        if (typeof component.longText === 'string' && component.longText.trim() !== '') {
            return component.longText;
        }

        if (typeof component.long_name === 'string' && component.long_name.trim() !== '') {
            return component.long_name;
        }

        return '';
    };

    const handleSearchLocation = useCallback(
        async (query: string): Promise<void> => {
            const trimmedQuery = query.trim();

            if (trimmedQuery.length < 2) {
                setSearchResults([]);
                setIsSearching(false);
                setPlacesAutocompleteError(null);
                return;
            }

            if (!isGoogleMapsLoaded || !window.google?.maps) {
                return;
            }

            const requestId = ++placesSearchRequestIdRef.current;

            setToolMessage(null);
            setIsSearching(true);
            setSearchResults([]);
            setPlacesAutocompleteError(null);

            try {
                const placesLibrary = await ensurePlacesLibrary();
                const autocompleteSuggestion = placesLibrary.AutocompleteSuggestion;

                if (!autocompleteSuggestion) {
                    throw new Error('AutocompleteSuggestion API unavailable');
                }

                const sessionToken = await ensurePlacesSessionToken();
                const mapCenter = mapRef.current?.getCenter();

                const buildRequest = (options: { withIndiaHint: boolean; withMapBias: boolean }): Record<string, unknown> => {
                    const request: Record<string, unknown> = {
                        input: trimmedQuery,
                        language: 'en-US',
                    };

                    if (sessionToken !== null) {
                        request.sessionToken = sessionToken;
                    }

                    if (options.withIndiaHint) {
                        request.includedRegionCodes = ['in'];
                        request.region = 'in';
                    }

                    if (mapCenter) {
                        const center = {
                            lat: mapCenter.lat(),
                            lng: mapCenter.lng(),
                        };

                        request.origin = center;

                        if (options.withMapBias) {
                            request.locationBias = {
                                center,
                                radius: 50000,
                            };
                        }
                    }

                    return request;
                };

                const mapSuggestionsToResults = (suggestions?: PlaceSuggestionLike[]): AddressSearchResult[] => {
                    return (Array.isArray(suggestions) ? suggestions : [])
                        .map((suggestion, index) => {
                            const prediction = suggestion.placePrediction;
                            if (!prediction) {
                                return null;
                            }

                            const label = prediction.text?.toString().trim() ?? '';
                            if (label === '') {
                                return null;
                            }

                            const [primaryText, ...secondaryParts] = label.split(',');

                            return {
                                id: prediction.placeId ?? `${label}-${index}`,
                                primaryText: primaryText.trim(),
                                secondaryText: secondaryParts.join(',').trim(),
                                prediction,
                            };
                        })
                        .filter((result): result is AddressSearchResult => result !== null);
                };

                const primaryResponse = await autocompleteSuggestion.fetchAutocompleteSuggestions(
                    buildRequest({ withIndiaHint: true, withMapBias: true }),
                );

                if (requestId !== placesSearchRequestIdRef.current) {
                    return;
                }

                let nextResults = mapSuggestionsToResults(primaryResponse.suggestions);

                if (nextResults.length === 0) {
                    const fallbackResponse = await autocompleteSuggestion.fetchAutocompleteSuggestions(
                        buildRequest({ withIndiaHint: false, withMapBias: false }),
                    );

                    if (requestId !== placesSearchRequestIdRef.current) {
                        return;
                    }

                    nextResults = mapSuggestionsToResults(fallbackResponse.suggestions);
                }

                setSearchResults(nextResults);
            } catch {
                if (requestId !== placesSearchRequestIdRef.current) {
                    return;
                }

                setSearchResults([]);
                setPlacesAutocompleteError('Place suggestions are unavailable. Please check Places API (New).');
            } finally {
                if (requestId === placesSearchRequestIdRef.current) {
                    setIsSearching(false);
                }
            }
        },
        [ensurePlacesLibrary, ensurePlacesSessionToken, isGoogleMapsLoaded],
    );

    useEffect(() => {
        if (!isMapOpen) {
            return;
        }

        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            setPlacesAutocompleteError(null);
            return;
        }

        const timer = window.setTimeout(() => {
            void handleSearchLocation(trimmedQuery);
        }, 300);

        return () => {
            window.clearTimeout(timer);
        };
    }, [handleSearchLocation, isMapOpen, searchQuery]);

    const handleSelectSearchResult = useCallback(
        async (result: AddressSearchResult): Promise<void> => {
            setToolMessage(null);
            setPlacesAutocompleteError(null);

            try {
                const place = result.prediction.toPlace();
                await place.fetchFields({
                    fields: ['formattedAddress', 'location', 'displayName', 'addressComponents'],
                });

                const placeDisplayName = typeof place.displayName === 'string' ? place.displayName : place.displayName?.text;
                const selectedLabel =
                    place.formattedAddress ??
                    placeDisplayName ??
                    `${result.primaryText}${result.secondaryText !== '' ? `, ${result.secondaryText}` : ''}`;

                if (!place.location) {
                    setToolMessage('Could not resolve selected place coordinates.');
                    return;
                }

                const lat = Number(place.location.lat().toFixed(6));
                const lng = Number(place.location.lng().toFixed(6));

                setMapLocation({ lat, lng });
                setSearchQuery(selectedLabel);
                setSearchResults([]);

                if (mapRef.current) {
                    mapRef.current.setCenter({ lat, lng });
                    mapRef.current.setZoom(15);
                }

                await setMarkerPosition(lat, lng);
                await refreshPlacesSessionToken();
            } catch {
                setToolMessage('Unable to load selected place details. Please try another suggestion.');
            }
        },
        [refreshPlacesSessionToken, setMarkerPosition],
    );

    const handleGoogleMapClick = (event: google.maps.MapMouseEvent): void => {
        if (!event.latLng) {
            return;
        }

        setToolMessage(null);
        const lat = Number(event.latLng.lat().toFixed(6));
        const lng = Number(event.latLng.lng().toFixed(6));
        setMapLocation({ lat, lng });
    };

    const handleDetectCurrentLocation = useCallback((): void => {
        if (!navigator.geolocation) {
            setToolMessage('Geolocation is not supported on this browser.');
            return;
        }

        setToolMessage(null);
        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = Number(position.coords.latitude.toFixed(6));
                const lng = Number(position.coords.longitude.toFixed(6));

                setMapLocation({ lat, lng });

                if (mapRef.current) {
                    mapRef.current.setCenter({ lat, lng });
                    mapRef.current.setZoom(15);
                }

                setIsLocating(false);
            },
            () => {
                setToolMessage('Unable to fetch your current location.');
                setIsLocating(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0,
            },
        );
    }, []);

    const handleClearMapSelection = useCallback((): void => {
        setToolMessage(null);
        setMapLocation(null);
        setSearchResults([]);
        setSearchQuery('');
        setPlacesAutocompleteError(null);

        if (markerRef.current) {
            markerRef.current.map = null;
        }

        if (mapRef.current) {
            mapRef.current.setCenter(ADDRESS_MAP_DEFAULT_CENTER);
            mapRef.current.setZoom(6);
        }
    }, []);

    const handleConfirmMapLocation = async (): Promise<void> => {
        if (!mapLocation || !isGoogleMapsLoaded || !window.google?.maps) {
            return;
        }

        setIsReverseGeocoding(true);

        try {
            const geocoder = new google.maps.Geocoder();
            const geocodeResult = await geocoder.geocode({
                location: mapLocation,
            });
            const firstResult = geocodeResult.results?.[0];

            if (!firstResult) {
                return;
            }

            const addressComponents = firstResult.address_components;
            const streetNumber = getAddressComponent(addressComponents, 'street_number');
            const route = getAddressComponent(addressComponents, 'route');
            const premise = getAddressComponent(addressComponents, 'premise');
            const subPremise = getAddressComponent(addressComponents, 'subpremise');
            const city =
                getAddressComponent(addressComponents, 'locality') ||
                getAddressComponent(addressComponents, 'administrative_area_level_3') ||
                getAddressComponent(addressComponents, 'administrative_area_level_2');
            const state = getAddressComponent(addressComponents, 'administrative_area_level_1');
            const pincode = getAddressComponent(addressComponents, 'postal_code');

            const primaryAddress = [premise, subPremise, streetNumber, route].filter((value) => value.length > 0).join(', ');

            form.setData({
                ...form.data,
                address_line_1: primaryAddress || firstResult.formatted_address,
                city,
                state,
                pincode,
            });
        } catch (error) {
            console.error('Error reverse geocoding:', error);
        } finally {
            setIsReverseGeocoding(false);
            setIsMapOpen(false);
        }
    };

    return (
        <>
            <div className="mb-4">
                {!isMapOpen ? (
                    <button
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-100 hover:text-(--theme-primary-1)"
                    >
                        <MapIcon className="h-4 w-4" />
                        Pick on map (Auto-fill address)
                    </button>
                ) : (
                    <div className="relative rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-inner ring-1 ring-gray-900/5">
                        <button
                            type="button"
                            onClick={() => setIsMapOpen(false)}
                            className="absolute top-2 right-2 z-10 rounded-md border border-gray-100 bg-white p-1.5 text-gray-400 shadow-sm hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        <h3 className="mb-3 text-sm font-bold text-gray-800">Find your location</h3>

                        <div className="relative mb-3 flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search area..."
                                    className="block w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm text-gray-900 shadow-sm focus:border-(--theme-primary-1) focus:ring-1 focus:ring-(--theme-primary-1)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void handleSearchLocation(searchQuery);
                                        }
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleSearchLocation(searchQuery)}
                                disabled={isSearching || searchQuery.trim().length < 2 || !isGoogleMapsLoaded}
                                className="shrink-0 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:opacity-50"
                            >
                                {isSearching ? '...' : 'Search'}
                            </button>
                        </div>

                        {placesAutocompleteError && <div className="mb-2 text-xs text-red-600">{placesAutocompleteError}</div>}

                        <div className="mb-3 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={handleDetectCurrentLocation}
                                disabled={isLocating || !isGoogleMapsLoaded}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <Crosshair className="h-3.5 w-3.5" />
                                {isLocating ? 'Locating…' : 'Use my location'}
                            </button>
                            <button
                                type="button"
                                onClick={handleClearMapSelection}
                                disabled={!mapLocation && searchQuery.trim() === ''}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                <X className="h-3.5 w-3.5" />
                                Clear pin
                            </button>
                        </div>

                        {toolMessage && <div className="mb-2 text-xs text-red-600">{toolMessage}</div>}

                        <p className="mb-2 text-xs text-gray-500">Search, detect, clear, or tap on map to pick the exact address point.</p>

                        {searchResults.length > 0 && (
                            <div className="absolute z-1001 mt-1 max-h-40 w-[calc(100%-2rem)] overflow-auto rounded-lg border border-gray-100 bg-white shadow-xl">
                                <ul className="py-1">
                                    {searchResults.map((result) => (
                                        <li
                                            key={result.id}
                                            onClick={() => void handleSelectSearchResult(result)}
                                            className="cursor-pointer border-b border-gray-50 py-2 pr-4 pl-3 text-xs text-gray-800 last:border-0 hover:bg-gray-50 hover:text-(--theme-primary-1)"
                                        >
                                            <span className="block truncate font-medium">{result.primaryText}</span>
                                            {result.secondaryText !== '' && (
                                                <span className="block truncate text-[11px] text-gray-500">{result.secondaryText}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="relative z-0 h-60 w-full overflow-hidden rounded-lg border border-gray-300 shadow-sm">
                            {!apiKey || googleMapsLoadError ? (
                                <div className="flex h-full items-center justify-center bg-red-50 px-3 text-center text-xs text-red-700">
                                    Google Maps is unavailable. Check your API key and enabled APIs.
                                </div>
                            ) : !isGoogleMapsLoaded ? (
                                <div className="flex h-full items-center justify-center bg-gray-50 px-3 text-xs text-gray-500">Loading map...</div>
                            ) : (
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    center={mapLocation ?? ADDRESS_MAP_DEFAULT_CENTER}
                                    zoom={mapLocation ? 15 : 6}
                                    onLoad={(map) => {
                                        mapRef.current = map;

                                        if (mapLocation) {
                                            void setMarkerPosition(mapLocation.lat, mapLocation.lng);
                                        }
                                    }}
                                    onUnmount={() => {
                                        if (markerRef.current) {
                                            markerRef.current.map = null;
                                        }

                                        markerRef.current = null;
                                        mapRef.current = null;
                                    }}
                                    onClick={handleGoogleMapClick}
                                    options={{
                                        streetViewControl: false,
                                        fullscreenControl: true,
                                        mapTypeControl: true,
                                        gestureHandling: 'greedy',
                                    }}
                                />
                            )}

                            <div className="pointer-events-none absolute right-0 bottom-3 left-0 z-1000 flex justify-center px-3">
                                <button
                                    type="button"
                                    onClick={handleConfirmMapLocation}
                                    disabled={isReverseGeocoding || !mapLocation || !isGoogleMapsLoaded}
                                    className="pointer-events-auto flex items-center gap-2 rounded-full bg-(--theme-primary-1) px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-300 hover:opacity-90 disabled:translate-y-4 disabled:opacity-0"
                                >
                                    <Crosshair className="h-3.5 w-3.5" />
                                    {isReverseGeocoding ? 'Fetching...' : 'Confirm Location'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-(--theme-primary-1) focus:ring-1 focus:ring-(--theme-primary-1) sm:text-sm"
                        value={form.data.type}
                        onChange={(e) => form.setData('type', e.target.value as AddressType)}
                    >
                        {ADDRESS_TYPES.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Label (optional)</label>
                    <input
                        type="text"
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-(--theme-primary-1) focus:ring-1 focus:ring-(--theme-primary-1) sm:text-sm"
                        value={form.data.label}
                        onChange={(e) => form.setData('label', e.target.value)}
                        placeholder="e.g. Home, Office"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Address line 1 *</label>
                <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-(--theme-primary-1) focus:ring-1 focus:ring-(--theme-primary-1) sm:text-sm"
                    value={form.data.address_line_1}
                    onChange={(e) => form.setData('address_line_1', e.target.value)}
                />
                {form.errors.address_line_1 && <p className="mt-1 text-sm text-red-600">{form.errors.address_line_1}</p>}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Address line 2 (optional)</label>
                <input
                    type="text"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-(--theme-primary-1) focus:ring-1 focus:ring-(--theme-primary-1) sm:text-sm"
                    value={form.data.address_line_2}
                    onChange={(e) => form.setData('address_line_2', e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Landmark (optional)</label>
                <input
                    type="text"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-(--theme-primary-1) focus:ring-1 focus:ring-(--theme-primary-1) sm:text-sm"
                    value={form.data.landmark}
                    onChange={(e) => form.setData('landmark', e.target.value)}
                />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700">City *</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-(--theme-primary-1) focus:ring-1 focus:ring-(--theme-primary-1) sm:text-sm"
                        value={form.data.city}
                        onChange={(e) => form.setData('city', e.target.value)}
                    />
                    {form.errors.city && <p className="mt-1 text-sm text-red-600">{form.errors.city}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">State *</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-(--theme-primary-1) focus:ring-1 focus:ring-(--theme-primary-1) sm:text-sm"
                        value={form.data.state}
                        onChange={(e) => form.setData('state', e.target.value)}
                    />
                    {form.errors.state && <p className="mt-1 text-sm text-red-600">{form.errors.state}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Pincode *</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-(--theme-primary-1) focus:ring-1 focus:ring-(--theme-primary-1) sm:text-sm"
                        value={form.data.pincode}
                        onChange={(e) => form.setData('pincode', e.target.value)}
                    />
                    {form.errors.pincode && <p className="mt-1 text-sm text-red-600">{form.errors.pincode}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <input
                    id={`is_default_${formId}`}
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-(--theme-primary-1) focus:ring-(--theme-primary-1)"
                    checked={form.data.is_default}
                    onChange={(e) => form.setData('is_default', e.target.checked)}
                />
                <label htmlFor={`is_default_${formId}`} className="text-sm text-gray-700">
                    Set as default address
                </label>
            </div>
        </>
    );
}
