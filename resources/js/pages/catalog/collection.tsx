import { Head, Link, router, usePage } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { FALLBACK_IMAGE_URL, handleImageFallbackError } from '@/lib/imageFallback';
import { product as productRoute } from '@/routes/catalog';

interface Collection {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    banner_image: string;
    banner_mobile_image?: string | null;
}

interface Product {
    id: number;
    name: string;
    slug: string;
    image?: string | null;
    price: string;
    compare_at_price?: string | null;
}

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface CollectionPageProps {
    collection: Collection;
    vertical: string;
    zone: Zone;
    products: Product[];
    filters: {
        sort?: string;
    };
}

export default function CollectionPage({ collection, vertical, products }: CollectionPageProps) {
    const auth = (usePage().props as { auth?: { user?: unknown; wishlisted_products?: number[] } }).auth;
    const wishlistedProductIds = new Set(auth?.wishlisted_products || []);
    const [addingProductId, setAddingProductId] = useState<number | null>(null);
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
            <Head title={collection.name} />
            <div className="min-h-screen bg-gray-50">
                {/* Collection Banner */}
                <div className="relative h-64 w-full overflow-hidden md:h-96">
                    <img
                        src={getSafeImageUrl(collection.banner_image)}
                        alt={collection.name}
                        className="h-full w-full object-cover"
                        onError={handleImageFallbackError}
                    />
                    <div className="bg-opacity-40 absolute inset-0 flex items-center justify-center bg-black">
                        <div className="text-center text-white">
                            <h1 className="mb-4 text-4xl font-bold md:text-5xl">{collection.name}</h1>
                            {collection.description && <p className="max-w-2xl px-4 text-lg md:text-xl">{collection.description}</p>}
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Products Grid */}
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
                            <p className="text-gray-500">No products found in this collection.</p>
                        </div>
                    )}
                </div>
            </div>
        </UserLayout>
    );
}
