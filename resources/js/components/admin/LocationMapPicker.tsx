import { usePage } from '@inertiajs/react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Crosshair, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const DEFAULT_CENTER = { lat: 10.027, lng: 76.308 };
const GOOGLE_MAP_LIBRARIES: 'places'[] = ['places'];

interface PageProps {
    googleMapsApiKey?: string | null;
}

interface SearchResult {
    id: string;
    primaryText: string;
    secondaryText: string;
    prediction: PlacePredictionLike;
}

interface PlaceLike {
    fetchFields: (options: { fields: string[] }) => Promise<void>;
    location?: google.maps.LatLng | null;
    formattedAddress?: string;
    displayName?: string | { text?: string };
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

interface LocationMapPickerProps {
    /**
     * Controlled latitude & longitude.
     * Pass current values if editing an existing location.
     */
    latitude?: string | number | null;
    longitude?: string | number | null;

    /** Triggered whenever the user drops a pin via map click or search result selection */
    onLocationSelect: (lat: number, lng: number, label?: string) => void;
    onLocationClear?: () => void;

    className?: string;
    mapHeight?: string;
}

export default function LocationMapPicker({
    latitude,
    longitude,
    onLocationSelect,
    onLocationClear,
    className,
    mapHeight = 'h-72',
}: LocationMapPickerProps) {
    const { googleMapsApiKey } = usePage<PageProps>().props;
    const apiKey = typeof googleMapsApiKey === 'string' ? googleMapsApiKey : '';

    const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useJsApiLoader({
        id: 'admin-location-map-picker-google-script',
        googleMapsApiKey: apiKey,
        libraries: GOOGLE_MAP_LIBRARIES,
    });

    const mapRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const placesLibraryRef = useRef<PlacesLibraryLike | null>(null);
    const placesSessionTokenRef = useRef<unknown | null>(null);
    const placesSearchRequestIdRef = useRef(0);

    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [placesAutocompleteError, setPlacesAutocompleteError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [toolMessage, setToolMessage] = useState<string | null>(null);

    const hasSelectedLocation = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

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
            title: 'Selected location',
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
        if (!apiKey || googleMapsLoadError) {
            setStatus('error');
            return;
        }

        if (!isGoogleMapsLoaded) {
            setStatus('loading');
            return;
        }

        setStatus('ready');
    }, [apiKey, googleMapsLoadError, isGoogleMapsLoaded]);

    // Allow external coordinate changes (e.g., if user types lat/lng in input fields manually outside)
    useEffect(() => {
        if (!isGoogleMapsLoaded) {
            return;
        }

        const lat = Number(latitude);
        const lng = Number(longitude);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
        }

        void setMarkerPosition(lat, lng);
    }, [isGoogleMapsLoaded, latitude, longitude, setMarkerPosition]);

    const handleMapClick = useCallback(
        (event: google.maps.MapMouseEvent): void => {
            if (!event.latLng) {
                return;
            }

            const lat = Number(event.latLng.lat().toFixed(6));
            const lng = Number(event.latLng.lng().toFixed(6));

            setToolMessage(null);
            void setMarkerPosition(lat, lng);
            onLocationSelect(lat, lng);
        },
        [onLocationSelect, setMarkerPosition],
    );

    const handleUseMyLocation = useCallback((): void => {
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

                void setMarkerPosition(lat, lng);
                onLocationSelect(lat, lng, 'Current location');
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
    }, [onLocationSelect, setMarkerPosition]);

    const handleClearPin = useCallback((): void => {
        if (markerRef.current) {
            markerRef.current.map = null;
        }

        if (mapRef.current) {
            mapRef.current.setCenter(DEFAULT_CENTER);
            mapRef.current.setZoom(12);
        }

        setResults([]);
        setSearchQuery('');
        setToolMessage(null);
        onLocationClear?.();
    }, [onLocationClear]);

    const handleSearch = useCallback(
        async (query: string): Promise<void> => {
            const trimmedQuery = query.trim();

            if (trimmedQuery.length < 2) {
                setResults([]);
                setSearching(false);
                setPlacesAutocompleteError(null);
                return;
            }

            if (!isGoogleMapsLoaded || !window.google?.maps) {
                return;
            }

            const requestId = ++placesSearchRequestIdRef.current;

            setSearching(true);
            setResults([]);
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

                const mapSuggestionsToResults = (suggestions?: PlaceSuggestionLike[]): SearchResult[] => {
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
                        .filter((result): result is SearchResult => result !== null);
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

                setResults(nextResults);
            } catch {
                if (requestId !== placesSearchRequestIdRef.current) {
                    return;
                }

                setResults([]);
                setPlacesAutocompleteError('Place suggestions are unavailable. Please check Places API (New).');
            } finally {
                if (requestId === placesSearchRequestIdRef.current) {
                    setSearching(false);
                }
            }
        },
        [ensurePlacesLibrary, ensurePlacesSessionToken, isGoogleMapsLoaded],
    );

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery.length < 2) {
            setResults([]);
            setSearching(false);
            setPlacesAutocompleteError(null);
            return;
        }

        const timer = window.setTimeout(() => {
            void handleSearch(trimmedQuery);
        }, 300);

        return () => {
            window.clearTimeout(timer);
        };
    }, [handleSearch, searchQuery]);

    const focusResult = useCallback(
        async (result: SearchResult): Promise<void> => {
            if (!mapRef.current) {
                return;
            }

            setToolMessage(null);
            setPlacesAutocompleteError(null);

            try {
                const place = result.prediction.toPlace();
                await place.fetchFields({
                    fields: ['formattedAddress', 'location', 'displayName'],
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

                mapRef.current.setCenter({ lat, lng });
                const currentZoom = mapRef.current.getZoom() ?? 12;
                mapRef.current.setZoom(Math.max(currentZoom, 15));
                void setMarkerPosition(lat, lng);

                onLocationSelect(lat, lng, selectedLabel);

                await refreshPlacesSessionToken();

                setResults([]);
                setSearchQuery(selectedLabel);
            } catch {
                setToolMessage('Unable to load selected place details. Please try another suggestion.');
            }
        },
        [onLocationSelect, refreshPlacesSessionToken, setMarkerPosition],
    );

    const handleMapLoad = useCallback(
        (map: google.maps.Map): void => {
            mapRef.current = map;

            const lat = Number(latitude);
            const lng = Number(longitude);

            if (Number.isFinite(lat) && Number.isFinite(lng)) {
                void setMarkerPosition(lat, lng);
                map.setCenter({ lat, lng });
                map.setZoom(12);
            }
        },
        [latitude, longitude, setMarkerPosition],
    );

    const handleMapUnmount = useCallback((): void => {
        if (markerRef.current) {
            markerRef.current.map = null;
        }

        markerRef.current = null;
        mapRef.current = null;
    }, []);

    if (status === 'error') {
        return <div className="mt-3 rounded-lg border border-dashed border-red-300 bg-red-50 p-3 text-xs text-red-900">Unable to load map.</div>;
    }

    return (
        <div className={cn('mt-3 space-y-2', className)}>
            <div className="relative z-9999 flex flex-col gap-2 sm:flex-row">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            void handleSearch(searchQuery);
                        }
                    }}
                    placeholder="Search a place to drop pin..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-(--admin-dark-primary) focus:ring-(--admin-dark-primary)"
                />
                <button
                    type="button"
                    disabled={searching || searchQuery.trim().length < 2 || !isGoogleMapsLoaded}
                    onClick={() => void handleSearch(searchQuery)}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-(--admin-dark-primary) px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
                >
                    <Search className="h-4 w-4" />
                    {searching ? '...' : 'Search'}
                </button>
            </div>

            {results.length > 0 && (
                <div className="relative z-9999 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-sm">
                    {results.map((result) => (
                        <button
                            key={result.id}
                            type="button"
                            onClick={() => void focusResult(result)}
                            className="block w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-left leading-snug transition-colors hover:bg-gray-100"
                        >
                            <span className="block font-medium text-gray-800">{result.primaryText}</span>
                            {result.secondaryText !== '' && <span className="block text-xs text-gray-500">{result.secondaryText}</span>}
                        </button>
                    ))}
                </div>
            )}

            {placesAutocompleteError && <div className="text-xs text-red-600">{placesAutocompleteError}</div>}

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={isLocating || !isGoogleMapsLoaded}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    <Crosshair className="h-3.5 w-3.5" />
                    {isLocating ? 'Locating…' : 'Use my location'}
                </button>
                <button
                    type="button"
                    onClick={handleClearPin}
                    disabled={!hasSelectedLocation}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    <X className="h-3.5 w-3.5" />
                    Clear pin
                </button>
            </div>

            {toolMessage && <div className="text-xs text-red-600">{toolMessage}</div>}

            <div className="text-xs text-gray-600">Search, use current location, or tap on the map to place the hub pin.</div>

            <div className={cn('w-full overflow-hidden rounded-lg border border-gray-300 shadow-inner', mapHeight)} style={{ zIndex: 1 }}>
                {!apiKey || !isGoogleMapsLoaded ? (
                    <div className="flex h-full items-center justify-center bg-gray-50 text-xs text-gray-500">Loading map…</div>
                ) : (
                    <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '100%' }}
                        center={DEFAULT_CENTER}
                        zoom={12}
                        onLoad={handleMapLoad}
                        onUnmount={handleMapUnmount}
                        onClick={handleMapClick}
                        options={{
                            mapTypeControl: true,
                            streetViewControl: false,
                            fullscreenControl: true,
                            gestureHandling: 'greedy',
                            mapId: 'DEMO_MAP_ID',
                        }}
                    />
                )}
            </div>

            {status === 'loading' && <div className="text-xs text-gray-500">Loading map…</div>}
        </div>
    );
}
