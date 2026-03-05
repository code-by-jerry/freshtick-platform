import { usePage } from '@inertiajs/react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Crosshair } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_CENTER = { lat: 10.0, lng: 76.2 };
const GOOGLE_MAP_LIBRARIES: 'places'[] = ['places'];

interface PageProps {
    googleMapsApiKey?: string | null;
}

interface ZoneMapPickerProps {
    value: string;
    onChange: (value: string) => void;
    onAddressSelected?: (data: {
        displayName: string;
        locality?: string;
        city?: string;
        state?: string;
        country?: string;
        postcode?: string;
    }) => void;
}

interface SearchResult {
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

function parseBoundary(value: string): [number, number][] | null {
    if (!value.trim()) return null;
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return null;
        const cleaned: [number, number][] = [];
        for (const item of parsed) {
            if (!Array.isArray(item) || item.length < 2) continue;
            const lat = Number(item[0]);
            const lng = Number(item[1]);
            if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
            cleaned.push([lat, lng]);
        }
        return cleaned.length ? cleaned : null;
    } catch {
        return null;
    }
}

function serializeBoundary(points: { lat: number; lng: number }[]): string {
    const arr = points.map((p) => [p.lat, p.lng]);
    return JSON.stringify(arr);
}

function arePointsEqual(first: { lat: number; lng: number }[], second: { lat: number; lng: number }[]): boolean {
    if (first.length !== second.length) {
        return false;
    }

    for (let index = 0; index < first.length; index += 1) {
        if (first[index].lat !== second[index].lat || first[index].lng !== second[index].lng) {
            return false;
        }
    }

    return true;
}

export default function ZoneMapPicker({ value, onChange, onAddressSelected }: ZoneMapPickerProps) {
    const { googleMapsApiKey } = usePage<PageProps>().props;
    const apiKey = typeof googleMapsApiKey === 'string' ? googleMapsApiKey : '';

    const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useJsApiLoader({
        id: 'admin-zone-map-picker-google-script',
        googleMapsApiKey: apiKey,
        libraries: GOOGLE_MAP_LIBRARIES,
    });

    const mapRef = useRef<google.maps.Map | null>(null);
    const polygonRef = useRef<google.maps.Polygon | null>(null);
    const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
    const polygonListenersRef = useRef<google.maps.MapsEventListener[]>([]);
    const removeModeRef = useRef(false);
    const onAddressSelectedRef = useRef<ZoneMapPickerProps['onAddressSelected'] | undefined>(undefined);
    const pointsRef = useRef<{ lat: number; lng: number }[]>([]);
    const placesLibraryRef = useRef<PlacesLibraryLike | null>(null);
    const placesSessionTokenRef = useRef<unknown | null>(null);
    const placesSearchRequestIdRef = useRef(0);
    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [placesAutocompleteError, setPlacesAutocompleteError] = useState<string | null>(null);
    const [isRemoveMode, setIsRemoveMode] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [toolMessage, setToolMessage] = useState<string | null>(null);

    useEffect(() => {
        onAddressSelectedRef.current = onAddressSelected;
    }, [onAddressSelected]);

    useEffect(() => {
        removeModeRef.current = isRemoveMode;
    }, [isRemoveMode]);

    useEffect(() => {
        if (!apiKey || googleMapsLoadError) {
            setStatus('error');
            setErrorMessage('Google Maps key is missing or invalid.');
            return;
        }

        if (!isGoogleMapsLoaded) {
            setStatus('loading');
            return;
        }

        setStatus('ready');
    }, [apiKey, googleMapsLoadError, isGoogleMapsLoaded]);

    const getAddressComponent = useCallback((components: AddressComponentLike[], type: string): string => {
        const component = components.find((item) => Array.isArray(item.types) && item.types.includes(type));

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
    }, []);

    const toAddressMetadata = useCallback(
        (displayName: string, components: AddressComponentLike[]) => {
            const cityLike =
                getAddressComponent(components, 'locality') ||
                getAddressComponent(components, 'administrative_area_level_3') ||
                getAddressComponent(components, 'administrative_area_level_2') ||
                getAddressComponent(components, 'sublocality_level_1');

            const locality =
                getAddressComponent(components, 'neighborhood') ||
                getAddressComponent(components, 'sublocality') ||
                getAddressComponent(components, 'sublocality_level_1') ||
                cityLike;

            return {
                displayName,
                locality: locality || undefined,
                city: cityLike || undefined,
                state: getAddressComponent(components, 'administrative_area_level_1') || undefined,
                country: getAddressComponent(components, 'country') || undefined,
                postcode: getAddressComponent(components, 'postal_code') || undefined,
            };
        },
        [getAddressComponent],
    );

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
            title: 'Zone point',
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

    const clearPolygonListeners = useCallback((): void => {
        polygonListenersRef.current.forEach((listener) => listener.remove());
        polygonListenersRef.current = [];
    }, []);

    const syncBoundaryFromPath = useCallback(
        (path: google.maps.MVCArray<google.maps.LatLng>): void => {
            const points = path.getArray().map((latLng) => ({
                lat: Number(latLng.lat().toFixed(6)),
                lng: Number(latLng.lng().toFixed(6)),
            }));

            pointsRef.current = points;

            if (points.length === 0) {
                setIsRemoveMode(false);
            }

            onChange(points.length > 0 ? serializeBoundary(points) : '');
        },
        [onChange],
    );

    const removeNearestPoint = useCallback(
        (lat: number, lng: number): boolean => {
            const map = mapRef.current;

            if (!map || pointsRef.current.length === 0 || !window.google?.maps) {
                return false;
            }

            const projection = map.getProjection();
            if (!projection) {
                return false;
            }

            const clickPoint = projection.fromLatLngToPoint(new google.maps.LatLng(lat, lng));
            if (!clickPoint) {
                return false;
            }

            const zoom = map.getZoom() ?? 12;
            const scale = Math.pow(2, zoom);
            const thresholdInPixels = 20;
            const thresholdSquared = thresholdInPixels * thresholdInPixels;

            let nearestIndex = -1;
            let nearestDistanceSquared = Number.POSITIVE_INFINITY;

            pointsRef.current.forEach((point, index) => {
                const pointAsPixel = projection.fromLatLngToPoint(new google.maps.LatLng(point.lat, point.lng));
                if (!pointAsPixel) {
                    return;
                }

                const deltaX = (pointAsPixel.x - clickPoint.x) * scale;
                const deltaY = (pointAsPixel.y - clickPoint.y) * scale;
                const distanceSquared = deltaX * deltaX + deltaY * deltaY;

                if (distanceSquared < nearestDistanceSquared) {
                    nearestDistanceSquared = distanceSquared;
                    nearestIndex = index;
                }
            });

            if (nearestIndex < 0 || nearestDistanceSquared > thresholdSquared) {
                return false;
            }

            if (polygonRef.current) {
                polygonRef.current.getPath().removeAt(nearestIndex);
                return true;
            }

            const nextPoints = pointsRef.current.filter((_, index) => index !== nearestIndex);
            pointsRef.current = nextPoints;
            onChange(nextPoints.length > 0 ? serializeBoundary(nextPoints) : '');

            if (nextPoints.length === 0) {
                setIsRemoveMode(false);
            }

            return true;
        },
        [onChange],
    );

    const drawPolygon = useCallback(
        (points: { lat: number; lng: number }[]): void => {
            if (!mapRef.current) {
                return;
            }

            clearPolygonListeners();

            if (polygonRef.current) {
                polygonRef.current.setMap(null);
                polygonRef.current = null;
            }

            if (points.length === 0) {
                return;
            }

            const polygon = new google.maps.Polygon({
                paths: points,
                strokeColor: '#0f766e',
                strokeOpacity: 1,
                strokeWeight: 2,
                fillColor: '#0f766e',
                fillOpacity: 0.15,
                editable: true,
                map: mapRef.current,
            });

            const path = polygon.getPath();
            polygonListenersRef.current = [
                path.addListener('set_at', () => syncBoundaryFromPath(path)),
                path.addListener('insert_at', () => syncBoundaryFromPath(path)),
                path.addListener('remove_at', () => syncBoundaryFromPath(path)),
                polygon.addListener('click', (event: google.maps.PolyMouseEvent) => {
                    if (!removeModeRef.current) {
                        return;
                    }

                    if (typeof event.vertex === 'number') {
                        path.removeAt(event.vertex);
                        return;
                    }

                    const clickedLatLng = event.latLng;
                    if (!clickedLatLng) {
                        return;
                    }

                    removeNearestPoint(clickedLatLng.lat(), clickedLatLng.lng());
                }),
                polygon.addListener('rightclick', (event: google.maps.PolyMouseEvent) => {
                    if (typeof event.vertex === 'number') {
                        path.removeAt(event.vertex);
                    }
                }),
            ];

            polygonRef.current = polygon;

            if (points.length >= 2) {
                const bounds = new google.maps.LatLngBounds();
                points.forEach((point) => bounds.extend(point));
                mapRef.current.fitBounds(bounds, 20);
            }
        },
        [clearPolygonListeners, removeNearestPoint, syncBoundaryFromPath],
    );

    const fitBoundaryToView = useCallback((): void => {
        if (!mapRef.current || pointsRef.current.length < 2) {
            return;
        }

        const bounds = new google.maps.LatLngBounds();
        pointsRef.current.forEach((point) => bounds.extend(point));
        mapRef.current.fitBounds(bounds, 20);
    }, []);

    const emitAddressForPoint = useCallback(
        async (lat: number, lng: number): Promise<void> => {
            if (!onAddressSelectedRef.current || !window.google?.maps) {
                return;
            }

            try {
                const geocoder = new google.maps.Geocoder();
                const response = await geocoder.geocode({ location: { lat, lng } });
                const first = response.results?.[0];
                if (!first) {
                    return;
                }

                onAddressSelectedRef.current(toAddressMetadata(first.formatted_address, first.address_components ?? []));
            } catch {
                // ignore reverse geocoder failures
            }
        },
        [toAddressMetadata],
    );

    const handleMapClick = useCallback(
        (event: google.maps.MapMouseEvent): void => {
            if (!event.latLng) {
                return;
            }

            const lat = Number(event.latLng.lat().toFixed(6));
            const lng = Number(event.latLng.lng().toFixed(6));

            setToolMessage(null);

            if (isRemoveMode) {
                removeNearestPoint(lat, lng);
                return;
            }

            pointsRef.current = [...pointsRef.current, { lat, lng }];
            drawPolygon(pointsRef.current);
            onChange(serializeBoundary(pointsRef.current));
            void setMarkerPosition(lat, lng);
            void emitAddressForPoint(lat, lng);
        },
        [drawPolygon, emitAddressForPoint, isRemoveMode, onChange, removeNearestPoint, setMarkerPosition],
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

                if (mapRef.current) {
                    mapRef.current.setCenter({ lat, lng });
                    mapRef.current.setZoom(15);
                }

                void setMarkerPosition(lat, lng);
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
    }, [setMarkerPosition]);

    const handleMapLoad = useCallback(
        (map: google.maps.Map): void => {
            mapRef.current = map;

            const existing = parseBoundary(value);
            if (existing && existing.length >= 3) {
                pointsRef.current = existing.map(([lat, lng]) => ({ lat, lng }));
                drawPolygon(pointsRef.current);
            }
        },
        [drawPolygon, value],
    );

    const handleMapUnmount = useCallback((): void => {
        clearPolygonListeners();

        if (polygonRef.current) {
            polygonRef.current.setMap(null);
        }

        if (markerRef.current) {
            markerRef.current.map = null;
        }

        polygonRef.current = null;
        markerRef.current = null;
        mapRef.current = null;
        pointsRef.current = [];
    }, [clearPolygonListeners]);

    useEffect(() => {
        if (!mapRef.current) {
            return;
        }

        const parsedBoundary = parseBoundary(value);
        const nextPoints = parsedBoundary ? parsedBoundary.map(([lat, lng]) => ({ lat, lng })) : [];

        if (arePointsEqual(pointsRef.current, nextPoints)) {
            return;
        }

        pointsRef.current = nextPoints;
        drawPolygon(nextPoints);

        const lastPoint = nextPoints[nextPoints.length - 1];
        if (lastPoint) {
            void setMarkerPosition(lastPoint.lat, lastPoint.lng);
        }
    }, [drawPolygon, setMarkerPosition, value]);

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
                    fields: ['formattedAddress', 'location', 'addressComponents', 'displayName'],
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

                if (onAddressSelectedRef.current) {
                    onAddressSelectedRef.current(
                        toAddressMetadata(selectedLabel, Array.isArray(place.addressComponents) ? place.addressComponents : []),
                    );
                }

                await refreshPlacesSessionToken();

                setSearchQuery(selectedLabel);
                setResults([]);
            } catch {
                setToolMessage('Unable to load selected place details. Please try another suggestion.');
            }
        },
        [refreshPlacesSessionToken, setMarkerPosition, toAddressMetadata],
    );

    const handleUndoLastPoint = useCallback((): void => {
        if (pointsRef.current.length === 0) {
            return;
        }

        const nextPoints = pointsRef.current.slice(0, -1);
        pointsRef.current = nextPoints;
        drawPolygon(nextPoints);
        onChange(nextPoints.length > 0 ? serializeBoundary(nextPoints) : '');

        if (nextPoints.length === 0) {
            setIsRemoveMode(false);
        }
    }, [drawPolygon, onChange]);

    const handleClearBoundary = useCallback((): void => {
        pointsRef.current = [];
        drawPolygon([]);
        onChange('');
        setIsRemoveMode(false);
    }, [drawPolygon, onChange]);

    if (status === 'error') {
        return (
            <div className="mt-3 rounded-lg border border-dashed border-red-300 bg-red-50 p-3 text-xs text-red-900">
                Unable to load map: {errorMessage}. You can still save the zone using pincodes only.
            </div>
        );
    }

    return (
        <div className="mt-3 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
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
                    placeholder="Search a place or area to jump the map"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs shadow-sm"
                />
                <button
                    type="button"
                    disabled={searching || searchQuery.trim().length < 2 || !isGoogleMapsLoaded}
                    onClick={() => void handleSearch(searchQuery)}
                    className="shrink-0 rounded-lg bg-(--admin-dark-primary) px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-70"
                >
                    {searching ? 'Searching…' : 'Search'}
                </button>
            </div>

            {results.length > 0 && (
                <div className="space-y-1 rounded-lg border border-gray-200 bg-white p-2 text-xs shadow-sm">
                    {results.map((result) => (
                        <button
                            key={result.id}
                            type="button"
                            onClick={() => void focusResult(result)}
                            className="block w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-left text-[11px] leading-snug hover:bg-gray-100"
                        >
                            <span className="block font-medium text-gray-800">{result.primaryText}</span>
                            {result.secondaryText !== '' && <span className="block text-gray-500">{result.secondaryText}</span>}
                        </button>
                    ))}
                </div>
            )}

            {placesAutocompleteError && <div className="text-xs text-red-600">{placesAutocompleteError}</div>}

            <div className="text-xs text-gray-600">
                {isRemoveMode
                    ? 'Remove mode is ON. Tap/click a pivot point (or near it) to remove it.'
                    : 'Click to add corners. Drag existing points to reshape, drag midpoints to add new points, and right-click any point to remove it.'}
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    disabled={isLocating || !isGoogleMapsLoaded}
                >
                    <Crosshair className="h-3.5 w-3.5" />
                    {isLocating ? 'Locating…' : 'Use my location'}
                </button>
                <button
                    type="button"
                    onClick={() => setIsRemoveMode((previous) => !previous)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                        isRemoveMode
                            ? 'border-(--admin-dark-primary) bg-(--admin-dark-primary) text-white'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    disabled={pointsRef.current.length === 0}
                >
                    {isRemoveMode ? 'Remove mode: ON' : 'Remove mode: OFF'}
                </button>
                <button
                    type="button"
                    onClick={handleUndoLastPoint}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    disabled={pointsRef.current.length === 0}
                >
                    Undo last point
                </button>
                <button
                    type="button"
                    onClick={handleClearBoundary}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    disabled={pointsRef.current.length === 0}
                >
                    Clear boundary
                </button>
                <button
                    type="button"
                    onClick={fitBoundaryToView}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    disabled={pointsRef.current.length < 2}
                >
                    Fit boundary
                </button>
            </div>

            {toolMessage && <div className="text-xs text-red-600">{toolMessage}</div>}

            <div className="h-72 w-full overflow-hidden rounded-lg border border-gray-200">
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
