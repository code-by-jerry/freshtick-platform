import { Head, Link, router, usePage } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { FALLBACK_IMAGE_URL, handleImageFallbackError } from '@/lib/imageFallback';
import { product as productRoute } from '@/routes/catalog';

interface Product {
    id: number;
    name: string;
    slug: string;
    image?: string | null;
    price: string;
    compare_at_price?: string | null;
    short_description?: string | null;
}

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface SearchPageProps {
    query: string;
    vertical: string;
    zone: Zone;
    products: Product[];
}

export default function SearchPage({ query, vertical, products }: SearchPageProps) {
    const [searchQuery, setSearchQuery] = useState(query);
    const [addingProductId, setAddingProductId] = useState<number | null>(null);
    const auth = (usePage().props as { auth?: { user?: unknown; wishlisted_products?: number[] } }).auth;
    const wishlistedProductIds = new Set(auth?.wishlisted_products || []);

    const fallbackImage = FALLBACK_IMAGE_URL;

    const getSafeImageUrl = (url: string | null | undefined): string => {
        if (!url) {
            return fallbackImage;
        }

        if (url.startsWith('http') || url.startsWith('/')) {
            return url;
        }

        return `/storage/${url}`;
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/catalog/search', { q: searchQuery, vertical }, { preserveState: true });
    };

    const toggleWishlist = (event: React.MouseEvent, productId: number) => {
        event.preventDefault();
        event.stopPropagation();

        if (!auth?.user) {
            router.get('/login');
            return;
        }

        router.post(`/wishlist/toggle/${productId}`, {}, { preserveScroll: true, preserveState: true });
    };

    const addToCart = (event: React.MouseEvent, productId: number) => {
        event.preventDefault();
        event.stopPropagation();

        if (addingProductId === productId) {
            return;
        }

        setAddingProductId(productId);
        router.post(
            '/cart/add',
            { product_id: productId, quantity: 1 },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setAddingProductId((current) => (current === productId ? null : current)),
            },
        );
    };

    return (
        <UserLayout>
            <Head title={`Search: ${query}`} />
            <div className="min-h-screen bg-gray-50">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="mb-8">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products..."
                                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                            <button type="submit" className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700">
                                Search
                            </button>
                        </div>
                    </form>

                    {/* Results */}
                    {query && (
                        <div className="mb-4">
                            <h1 className="text-2xl font-bold">
                                Search results for &quot;{query}&quot; ({products.length} {products.length === 1 ? 'result' : 'results'})
                            </h1>
                        </div>
                    )}

                    {products.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                            {products.map((product) => (
                                <Link
                                    key={product.id}
                                    href={productRoute(product.slug, { query: { vertical } })}
                                    className="relative overflow-hidden rounded-lg bg-white transition-shadow hover:shadow-md"
                                >
                                    <button
                                        type="button"
                                        onClick={(event) => toggleWishlist(event, product.id)}
                                        aria-label={wishlistedProductIds.has(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                                        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                                    >
                                        <Heart
                                            className={`h-4 w-4 ${wishlistedProductIds.has(product.id) ? 'fill-red-500 text-red-500' : 'fill-white text-black'}`}
                                            strokeWidth={2}
                                        />
                                    </button>
                                    <img
                                        src={getSafeImageUrl(product.image)}
                                        alt={product.name}
                                        className="h-48 w-full object-cover"
                                        onError={handleImageFallbackError}
                                    />
                                    <div className="p-4">
                                        <h3 className="mb-2 line-clamp-2 text-sm font-medium">{product.name}</h3>
                                        {product.short_description && (
                                            <p className="mb-2 line-clamp-2 text-xs text-gray-500">{product.short_description}</p>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold">₹{product.price}</span>
                                            {product.compare_at_price && (
                                                <span className="text-sm text-gray-500 line-through">₹{product.compare_at_price}</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(event) => addToCart(event, product.id)}
                                            disabled={addingProductId === product.id}
                                            className="mt-3 w-full rounded-md bg-(--theme-primary-1) px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-(--theme-primary-1-dark) disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {addingProductId === product.id ? 'Adding...' : 'Add to Cart'}
                                        </button>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-gray-500">No products found. Try a different search term.</p>
                        </div>
                    )}
                </div>
            </div>
        </UserLayout>
    );
}
