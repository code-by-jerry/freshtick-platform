import { Head, Link, router, usePage } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { handleImageFallbackError, toSafeImageUrl } from '@/lib/imageFallback';
import { product as productRoute } from '@/routes/catalog';

interface Banner {
    id: number;
    name: string;
    slug: string;
    banner_image: string;
    banner_mobile_image?: string | null;
    link_url?: string | null;
}

interface Category {
    id: number;
    name: string;
    slug: string;
    image?: string | null;
    icon?: string | null;
    products_count: number;
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
    city: string;
    state: string;
}

interface CatalogHomeProps {
    vertical: string;
    verticalOptions: Record<string, string>;
    zone: Zone;
    banners: Banner[];
    categories: Category[];
    featuredProducts: Product[];
}

export default function CatalogHome({ vertical, verticalOptions, banners, categories, featuredProducts }: CatalogHomeProps) {
    const [selectedVertical, setSelectedVertical] = useState(vertical);
    const [addingProductId, setAddingProductId] = useState<number | null>(null);
    const auth = (usePage().props as { auth?: { user?: unknown; wishlisted_products?: number[] } }).auth;
    const wishlistedProductIds = new Set(auth?.wishlisted_products || []);

    const handleVerticalChange = (newVertical: string) => {
        setSelectedVertical(newVertical);
        router.get('/catalog', { vertical: newVertical }, { preserveState: true, preserveScroll: true });
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
            <Head title="Catalog" />
            <div className="min-h-screen bg-gray-50">
                {/* Vertical Tabs */}
                <div className="sticky top-0 z-10 border-b bg-white">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex space-x-1">
                            {Object.entries(verticalOptions).map(([value, label]) => (
                                <button
                                    key={value}
                                    onClick={() => handleVerticalChange(value)}
                                    className={`px-6 py-4 text-sm font-medium transition-colors ${
                                        selectedVertical === value ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Hero Banners */}
                {banners.length > 0 && (
                    <div className="relative h-64 w-full overflow-hidden md:h-96">
                        <div className="flex h-full transition-transform duration-500">
                            {banners.map((banner) => (
                                <div key={banner.id} className="relative h-full min-w-full">
                                    <img src={banner.banner_image} alt={banner.name} className="h-full w-full object-cover" />
                                    <div className="bg-opacity-20 absolute inset-0 flex items-center justify-center bg-black">
                                        <div className="text-center text-white">
                                            <h2 className="mb-2 text-3xl font-bold md:text-4xl">{banner.name}</h2>
                                            {banner.link_url && (
                                                <Link
                                                    href={banner.link_url}
                                                    className="mt-4 inline-block rounded-lg bg-white px-6 py-2 text-gray-900 hover:bg-gray-100"
                                                >
                                                    Shop Now
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Categories Grid */}
                    {categories.length > 0 ? (
                        <section className="mb-12">
                            <h2 className="mb-6 text-2xl font-bold">Shop by Category</h2>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                                {categories.map((category) => (
                                    <Link
                                        key={category.id}
                                        href={`/categories/${category.slug}?vertical=${selectedVertical}`}
                                        className="rounded-lg bg-white p-4 text-center transition-shadow hover:shadow-md"
                                    >
                                        {category.image ? (
                                            <img src={category.image} alt={category.name} className="mb-2 h-24 w-full rounded object-cover" />
                                        ) : (
                                            <div className="mb-2 flex h-24 w-full items-center justify-center rounded bg-gray-200">
                                                {category.icon || '📦'}
                                            </div>
                                        )}
                                        <h3 className="text-sm font-medium">{category.name}</h3>
                                        <p className="mt-1 text-xs text-gray-500">{category.products_count} products</p>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ) : (
                        <section className="mb-12">
                            <h2 className="mb-6 text-2xl font-bold">Shop by Category</h2>
                            <div className="rounded-lg bg-white p-8 text-center">
                                <p className="text-gray-500">No categories available for this vertical yet.</p>
                            </div>
                        </section>
                    )}

                    {/* Featured Products */}
                    {featuredProducts.length > 0 ? (
                        <section>
                            <h2 className="mb-6 text-2xl font-bold">Featured Products</h2>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                                {featuredProducts.map((product) => (
                                    <Link
                                        key={product.id}
                                        href={productRoute(product.slug, { query: { vertical: selectedVertical } })}
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
                                            src={toSafeImageUrl(product.image)}
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
                        </section>
                    ) : (
                        <section>
                            <h2 className="mb-6 text-2xl font-bold">Featured Products</h2>
                            <div className="rounded-lg bg-white p-8 text-center">
                                <p className="text-gray-500">No featured products available for this vertical yet.</p>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </UserLayout>
    );
}
