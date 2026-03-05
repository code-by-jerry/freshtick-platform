import { Head, Link, router } from '@inertiajs/react';
import { Heart, ArrowRight, PackageOpen, Tag, Star, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { product as productRoute } from '@/routes/catalog';

interface ProductVariant {
    id: number;
    name: string;
    price: number;
    is_active: boolean;
}

interface WishlistProduct {
    id: number;
    name: string;
    slug: string;
    image?: string | null;
    images?: string[];
    price: number;
    compare_at_price?: number | null;
    unit?: string | null;
    weight?: number | null;
    is_subscription_eligible: boolean;
    variants?: ProductVariant[];
}

interface WishlistPageProps {
    products: WishlistProduct[];
}

const getSafeUrl = (url: string | null | undefined): string => {
    if (!url) return '/placeholder.png';
    if (url.startsWith('http') || url.startsWith('/')) return url;
    return `/storage/${url}`;
};

const formatCurrency = (val: string | number) => `₹${Number(val).toFixed(2)}`;

export default function Wishlist({ products }: WishlistPageProps) {
    const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
    const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({});

    const handleRemove = (productId: number) => {
        setRemovingIds((prev) => new Set(prev).add(productId));
        router.post(
            `/wishlist/toggle/${productId}`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setRemovingIds((prev) => {
                        const next = new Set(prev);
                        next.delete(productId);
                        return next;
                    });
                },
            },
        );
    };

    return (
        <UserLayout>
            <Head title="My Wishlist - Freshtick" />
            <div className="min-h-screen bg-gray-50/50 pt-24 sm:pt-26">
                <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-8 lg:px-6 lg:py-10">
                    {/* Page header */}
                    <div className="mb-6 sm:mb-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
                                <Heart className="h-5 w-5 text-red-500" strokeWidth={2} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">My Wishlist</h1>
                                <p className="text-sm text-gray-500">
                                    {products.length === 0
                                        ? 'No products saved yet'
                                        : `${products.length} ${products.length === 1 ? 'item' : 'items'} saved`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {products.length === 0 ? (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                                <PackageOpen className="h-8 w-8 text-red-400" />
                            </div>
                            <h2 className="mb-2 text-lg font-semibold text-gray-900">Your wishlist is empty</h2>
                            <p className="mb-6 max-w-sm text-sm text-gray-500">
                                Discover products you love and save them here for later. Start browsing our fresh product collection!
                            </p>
                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--theme-primary-1)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-1-dark)]"
                            >
                                Browse Products
                                <ArrowRight className="h-4 w-4" strokeWidth={2} />
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
                            {products.map((product) => {
                                const isRemoving = removingIds.has(product.id);
                                const selectedVariantIdx = selectedVariants[product.id] ?? 0;
                                const variant = product.variants?.[selectedVariantIdx];
                                const displayPrice = variant ? variant.price : product.price;
                                const thumbUrl = getSafeUrl(product.images?.[0] || product.image);
                                const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
                                const discountPct = hasDiscount ? Math.round((1 - product.price / product.compare_at_price!) * 100) : 0;

                                return (
                                    <article
                                        key={product.id}
                                        className={`group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-[var(--theme-primary-1)]/40 hover:shadow-md ${isRemoving ? 'pointer-events-none opacity-50' : ''}`}
                                    >
                                        {/* Remove from wishlist button */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemove(product.id)}
                                            aria-label="Remove from wishlist"
                                            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:text-red-500"
                                        >
                                            <Heart className="h-4 w-4 fill-red-500 text-red-500" strokeWidth={2} />
                                        </button>

                                        {/* Discount badge */}
                                        {hasDiscount && (
                                            <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                                <Tag className="h-2.5 w-2.5" strokeWidth={2} />
                                                {discountPct}% OFF
                                            </span>
                                        )}

                                        {/* Product image */}
                                        <Link href={productRoute(product.slug)} className="block">
                                            <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
                                                <img
                                                    src={thumbUrl}
                                                    alt={product.name}
                                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                    loading="lazy"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = '/placeholder.png';
                                                    }}
                                                />
                                            </div>
                                        </Link>

                                        {/* Product info */}
                                        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                                            <Link href={productRoute(product.slug)} className="mb-1 block">
                                                <h2 className="line-clamp-2 text-sm font-semibold text-gray-900 transition-colors group-hover:text-[var(--theme-primary-1)]">
                                                    {product.name}
                                                </h2>
                                            </Link>

                                            {/* Unit/Weight */}
                                            {(product.unit || product.weight) && (
                                                <p className="mb-2 text-xs text-gray-400">
                                                    {product.weight ? `${product.weight}` : ''}
                                                    {product.unit ? ` ${product.unit}` : ''}
                                                </p>
                                            )}

                                            {/* Variants selector */}
                                            {product.variants && product.variants.length > 1 && (
                                                <div className="mb-3 flex flex-wrap gap-1.5">
                                                    {product.variants
                                                        .filter((v) => v.is_active)
                                                        .map((v, i) => (
                                                            <button
                                                                key={v.id}
                                                                type="button"
                                                                onClick={() => setSelectedVariants((prev) => ({ ...prev, [product.id]: i }))}
                                                                className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                                                                    i === selectedVariantIdx
                                                                        ? 'border-[var(--theme-primary-1)] bg-[var(--theme-primary-1)]/10 text-[var(--theme-primary-1)]'
                                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                                }`}
                                                            >
                                                                {v.name}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}

                                            {/* Price */}
                                            <div className="mt-auto flex items-baseline gap-2">
                                                <span className="text-base font-bold text-gray-900">{formatCurrency(displayPrice)}</span>
                                                {hasDiscount && (
                                                    <span className="text-xs text-gray-400 line-through">
                                                        {formatCurrency(product.compare_at_price!)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Subscription badge */}
                                            {product.is_subscription_eligible && (
                                                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[var(--theme-primary-1)]">
                                                    <Star className="h-3 w-3" strokeWidth={2} />
                                                    Subscription available
                                                </p>
                                            )}

                                            {/* Action buttons */}
                                            <div className="mt-3 flex flex-col gap-2">
                                                {product.is_subscription_eligible ? (
                                                    <>
                                                        <Link
                                                            href={`/subscriptions/create?product=${product.id}`}
                                                            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary-1)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-1-dark)]"
                                                        >
                                                            Subscribe
                                                        </Link>
                                                        <Link
                                                            href={`/products/${product.slug}`}
                                                            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                                        >
                                                            View Details
                                                        </Link>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary-1)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-1-dark)]"
                                                        >
                                                            <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                                                            Add to Cart
                                                        </button>
                                                        <Link
                                                            href={`/products/${product.slug}`}
                                                            className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                                                        >
                                                            View Details
                                                        </Link>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {/* Browse more CTA */}
                    {products.length > 0 && (
                        <div className="mt-10 flex justify-center">
                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 rounded-xl border border-[var(--theme-primary-1)] px-6 py-3 text-sm font-semibold text-[var(--theme-primary-1)] transition-colors hover:bg-[var(--theme-primary-1)]/10"
                            >
                                Continue Shopping
                                <ArrowRight className="h-4 w-4" strokeWidth={2} />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </UserLayout>
    );
}
