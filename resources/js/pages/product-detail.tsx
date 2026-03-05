import { Head, Link, router, usePage } from '@inertiajs/react';
import { Heart, Star, ChevronDown, ChevronRight, Clock, Tag, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import ProductCardMedia, { type MediaItem } from '@/components/user/ProductCardMedia';
import UserLayout from '@/layouts/UserLayout';
import { FALLBACK_IMAGE_URL, handleImageFallbackError } from '@/lib/imageFallback';
import { product as productRoute } from '@/routes/catalog';

interface Product {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    short_description?: string | null;
    image?: string | null;
    images?: string[] | null;
    price: string | number;
    compare_at_price?: string | number | null;
    is_subscription_eligible: boolean;
    requires_bottle: boolean;
    bottle_deposit?: string | number | null;
    variants?: Array<{
        id: number;
        name: string;
        sku: string;
        price: string | number;
        stock_quantity: number;
        is_active: boolean;
    }>;
}

interface RelatedProduct {
    id: number;
    name: string;
    slug: string;
    image?: string | null;
    price: string | number;
    is_subscription_eligible?: boolean;
    variants?: unknown[];
}

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface ProductPageProps {
    product: Product;
    vertical: string;
    zone: Zone;
    price: number | string;
    relatedProducts: RelatedProduct[];
    crossSellProducts?: RelatedProduct[];
    upsellProducts?: RelatedProduct[];
    isFreeSampleEligible: boolean;
}

interface Review {
    id: string;
    name: string;
    rating: number;
    date: string;
    text: string;
    verified?: boolean;
    helpfulCount?: number;
}

const MOCK_REVIEWS: Review[] = [
    {
        id: '1',
        name: 'Priya M.',
        rating: 5,
        date: '2 days ago',
        text: 'Best quality we have used. Fresh and aromatic. Delivery always on time.',
        verified: true,
        helpfulCount: 12,
    },
    {
        id: '2',
        name: 'Rajesh K.',
        rating: 5,
        date: '1 week ago',
        text: 'Quality is unmatched. My family prefers this over store-bought.',
        verified: true,
        helpfulCount: 8,
    },
    {
        id: '3',
        name: 'Anitha S.',
        rating: 4,
        date: '2 weeks ago',
        text: 'Good product. Would order again. Packaging could be sturdier.',
        verified: false,
        helpfulCount: 3,
    },
    {
        id: '4',
        name: 'Suresh P.',
        rating: 5,
        date: '3 days ago',
        text: 'Morning delivery is a game-changer. Quality is always consistent.',
        verified: true,
        helpfulCount: 5,
    },
    {
        id: '5',
        name: 'Deepa R.',
        rating: 4,
        date: '5 days ago',
        text: 'Consistent quality. Subscribed for monthly delivery.',
        verified: true,
        helpfulCount: 2,
    },
];

const WHY_SHOP = [
    { icon: Clock, title: 'Morning delivery', text: 'Fresh at your doorstep before 7 AM, every day.' },
    { icon: Tag, title: 'Best prices', text: 'Direct from farm. No middlemen, no markups.' },
    { icon: ShoppingBag, title: 'Wide range', text: 'Milk, curd, ghee, butter, and more.' },
];

export default function ProductDetail({ product, price, relatedProducts }: ProductPageProps) {
    const fallbackImage = FALLBACK_IMAGE_URL;

    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
    const [mediaIndex, setMediaIndex] = useState(0);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    const auth = (usePage().props as { auth?: { user?: unknown; wishlisted_products?: number[] } }).auth;
    const wishlistedProductIds = new Set(auth?.wishlisted_products || []);

    // Convert current product to wishlisted state
    const wishlisted = wishlistedProductIds.has(product.id);

    const [similarCardMediaIndex, setSimilarCardMediaIndex] = useState<Record<string, number>>({});

    const getSafeUrl = (url: string | null | undefined): string => {
        if (!url) return fallbackImage;
        if (url.startsWith('http') || url.startsWith('/')) return url;
        return `/storage/${url}`;
    };

    const mediaList: MediaItem[] = [];
    if (product.images && product.images.length > 0) {
        product.images.forEach((img) => mediaList.push({ type: 'image', url: getSafeUrl(img) }));
    } else if (product.image) {
        mediaList.push({ type: 'image', url: getSafeUrl(product.image) });
    } else {
        mediaList.push({ type: 'image', url: fallbackImage });
    }

    const variant = product.variants?.[selectedVariantIndex];
    const displayPrice = variant ? variant.price : product.price || price;
    const displayMrp = product.compare_at_price;

    // Formatting currency wrapper
    const formatCurrency = (val: string | number) => `₹${Number(val).toFixed(2)}`;

    const productRating = 4.5;
    const ratingCount = 128;
    const isPlan = product.is_subscription_eligible;

    const triggerToggleWishlist = (id: number) => {
        if (!auth?.user) {
            router.get('/login');
            return;
        }
        router.post(`/wishlist/toggle/${id}`, {}, { preserveScroll: true, preserveState: true });
    };

    const handleAddToCart = () => {
        if (isAddingToCart) {
            return;
        }

        setIsAddingToCart(true);
        router.post(
            '/cart/add',
            { product_id: product.id, quantity: 1 },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setIsAddingToCart(false),
            },
        );
    };

    const toggleSimilarWishlist = (e: React.MouseEvent, productId: number) => {
        e.preventDefault();
        e.stopPropagation();
        triggerToggleWishlist(productId);
    };

    const setSimilarCardMediaIndexForKey = (key: string, index: number) => {
        setSimilarCardMediaIndex((prev) => ({ ...prev, [key]: index }));
    };

    // Use relatedProducts as similar items
    const similar = (relatedProducts || []).slice(0, 4);

    return (
        <UserLayout>
            <Head title={`${product.name} - Freshtick`} />
            <div className="min-h-screen bg-gray-50/50 pt-24 sm:pt-24">
                <div className="container mx-auto max-w-7xl px-4 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
                    {/* Breadcrumbs */}
                    <nav className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 sm:mb-6 sm:text-sm" aria-label="Breadcrumb">
                        <Link href="/" className="transition-colors hover:text-(--theme-primary-1)">
                            Home
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        <Link href="/products" className="transition-colors hover:text-(--theme-primary-1)">
                            Products
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                        <span className="truncate font-medium text-gray-900">{product.name}</span>
                    </nav>

                    <section className="mb-10 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:mb-12 sm:p-6 lg:mb-10 lg:grid lg:grid-cols-9 lg:gap-6 lg:p-8">
                        {/* Media */}
                        <div className="mb-6 lg:col-span-5 lg:mb-0">
                            <div className="relative aspect-3/4 min-h-95 w-full overflow-hidden rounded-xl bg-(--theme-secondary)/10 sm:min-h-120 lg:min-h-140">
                                {mediaList.length > 0 && mediaList[mediaIndex] && mediaList[mediaIndex].type === 'image' ? (
                                    <img
                                        src={mediaList[mediaIndex].url}
                                        alt={product.name}
                                        className="h-full w-full object-cover"
                                        loading="eager"
                                        onError={handleImageFallbackError}
                                    />
                                ) : mediaList.length > 0 && mediaList[mediaIndex] ? (
                                    <video src={mediaList[mediaIndex].url} className="h-full w-full object-cover" muted loop playsInline autoPlay />
                                ) : null}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        triggerToggleWishlist(product.id);
                                    }}
                                    aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                                    className="absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                                >
                                    <Heart
                                        className={`h-4 w-4 ${wishlisted ? 'fill-red-500 text-red-500' : 'fill-white text-black'}`}
                                        strokeWidth={2}
                                    />
                                </button>
                            </div>
                            {mediaList.length > 1 && (
                                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                    {mediaList.map((item, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setMediaIndex(i)}
                                            className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:h-16 sm:w-16 ${
                                                i === mediaIndex ? 'border-(--theme-primary-1)' : 'border-transparent bg-gray-100'
                                            }`}
                                        >
                                            {item.type === 'image' ? (
                                                <img
                                                    src={item.url}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                    onError={handleImageFallbackError}
                                                />
                                            ) : (
                                                <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="lg:col-span-4 lg:min-w-0">
                            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl">{product.name}</h1>

                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">
                                    <Star className="h-4 w-4 fill-amber-500" strokeWidth={0} />
                                    <span className="font-semibold">{productRating}</span>
                                </span>
                                <span className="text-gray-500">({ratingCount} ratings)</span>
                            </div>

                            <p className="mt-2 text-sm text-gray-600">
                                {product.short_description || product.description?.replace(/<[^>]*>?/gm, '')?.substring(0, 100)}
                            </p>

                            {!isPlan && product.variants && product.variants.length > 0 && (
                                <>
                                    <div className="mt-3 flex flex-wrap items-baseline gap-2">
                                        {displayMrp && <span className="text-sm text-gray-400 line-through">{formatCurrency(displayMrp)}</span>}
                                        <span className="text-xl font-bold text-(--theme-primary-1) sm:text-2xl">{formatCurrency(displayPrice)}</span>
                                        {displayMrp &&
                                            (() => {
                                                const mrpNum = parseFloat(displayMrp.toString());
                                                const priceNum = parseFloat(displayPrice.toString());
                                                const pct = mrpNum > 0 ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;
                                                return pct > 0 ? <span className="text-xs font-semibold text-green-600">{pct}% off</span> : null;
                                            })()}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Inclusive of all taxes</p>

                                    <p className="mt-3 text-sm font-medium text-gray-600">Select unit</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {product.variants.map((v, i) => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => setSelectedVariantIndex(i)}
                                                className={`rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                                                    i === selectedVariantIndex
                                                        ? 'border-(--theme-primary-1) bg-(--theme-primary-1)/10 text-(--theme-primary-1)'
                                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                                }`}
                                            >
                                                {v.name} &mdash; {formatCurrency(v.price)}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                            {(!product.variants || product.variants.length === 0) && (
                                <>
                                    <div className="mt-3 flex flex-wrap items-baseline gap-2">
                                        {displayMrp && <span className="text-sm text-gray-400 line-through">{formatCurrency(displayMrp)}</span>}
                                        <span className="text-xl font-bold text-(--theme-primary-1) sm:text-2xl">{formatCurrency(displayPrice)}</span>
                                        {displayMrp &&
                                            (() => {
                                                const mrpNum = parseFloat(displayMrp.toString());
                                                const priceNum = parseFloat(displayPrice.toString());
                                                const pct = mrpNum > 0 ? Math.round(((mrpNum - priceNum) / mrpNum) * 100) : 0;
                                                return pct > 0 ? <span className="text-xs font-semibold text-green-600">{pct}% off</span> : null;
                                            })()}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">Inclusive of all taxes</p>
                                </>
                            )}

                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleAddToCart}
                                    disabled={isAddingToCart}
                                    className="w-full rounded-xl bg-(--theme-primary-1) px-4 py-3.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--theme-primary-1-dark) focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none sm:w-auto sm:max-w-xs sm:flex-1"
                                >
                                    {isAddingToCart ? 'Adding...' : 'Add to cart'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => triggerToggleWishlist(product.id)}
                                    aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-pink-500 px-4 py-3 text-sm font-semibold text-pink-600 transition-colors hover:bg-pink-50 sm:w-auto"
                                >
                                    <Heart
                                        className={`h-4 w-4 ${wishlisted ? 'fill-red-500 text-red-500' : 'fill-white text-black'}`}
                                        strokeWidth={2}
                                    />
                                    <span>Wishlist</span>
                                </button>
                                {isPlan && (
                                    <Link
                                        href={`/subscription?product=${product.id}`}
                                        className="w-full rounded-xl border-2 border-(--theme-primary-1) bg-white px-4 py-3.5 text-center text-sm font-semibold text-(--theme-primary-1) transition-colors hover:bg-(--theme-primary-1)/10 focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none sm:w-auto sm:max-w-xs sm:flex-1"
                                    >
                                        Subscribe
                                    </Link>
                                )}
                            </div>

                            {/* Product details – expandable */}
                            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/50">
                                <button
                                    type="button"
                                    onClick={() => setDetailsOpen((b) => !b)}
                                    className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold text-gray-900"
                                >
                                    Product details
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                                        strokeWidth={2}
                                    />
                                </button>
                                {detailsOpen && (
                                    <div className="border-t border-gray-200 px-4 py-3">
                                        <div
                                            className="prose max-w-none text-sm text-gray-600"
                                            dangerouslySetInnerHTML={{ __html: product.description || 'No description available.' }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Why shop */}
                            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
                                <h2 className="mb-3 text-sm font-semibold text-gray-900">Why shop from Freshtick?</h2>
                                <ul className="space-y-3">
                                    {WHY_SHOP.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <li key={item.title} className="flex gap-3">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-(--theme-primary-1)/10 text-(--theme-primary-1)">
                                                    <Icon className="h-4 w-4" strokeWidth={2} />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                                    <p className="text-xs text-gray-600 sm:text-sm">{item.text}</p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section
                        className="mb-10 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:mb-12 sm:p-6 lg:mb-14 lg:p-8"
                        aria-labelledby="reviews-heading"
                    >
                        <h2 id="reviews-heading" className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">
                            Customer reviews
                        </h2>
                        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-4">
                            {MOCK_REVIEWS.map((review) => (
                                <article key={review.id} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 sm:p-4">
                                    <div className="flex gap-2.5">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--theme-primary-1)/15 text-xs font-semibold text-(--theme-primary-1)">
                                            {review.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="text-xs font-semibold text-gray-900">{review.name}</span>
                                                {review.verified && (
                                                    <span
                                                        className="inline-flex items-center gap-0.5 text-[10px] text-green-600"
                                                        title="Verified purchase"
                                                    >
                                                        <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-500 sm:text-xs">
                                                <span className="flex items-center gap-0.5 text-amber-500" aria-label={`${review.rating} stars`}>
                                                    {[1, 2, 3, 4, 5].map((i) => (
                                                        <Star
                                                            key={i}
                                                            className={`h-3 w-3 ${i <= review.rating ? 'fill-amber-500' : 'fill-gray-200'}`}
                                                            strokeWidth={0}
                                                        />
                                                    ))}
                                                </span>
                                                <span>{review.date}</span>
                                            </div>
                                            <p className="mt-1.5 line-clamp-2 text-xs text-gray-700 sm:line-clamp-3">{review.text}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    {similar.length > 0 && (
                        <section className="mb-8" aria-labelledby="similar-heading">
                            <h2 id="similar-heading" className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">
                                Similar products
                            </h2>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                                {similar.map((p) => {
                                    const isWishlisted = wishlistedProductIds.has(p.id);
                                    const simMedia = [{ type: 'image', url: getSafeUrl(p.image) }] as MediaItem[];
                                    return (
                                        <article
                                            key={p.id}
                                            className="group flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-(--theme-primary-1)/40 hover:shadow-md"
                                            role="listitem"
                                        >
                                            <div className="relative aspect-square w-full overflow-hidden bg-(--theme-secondary)/10 sm:aspect-4/3">
                                                <ProductCardMedia
                                                    media={simMedia}
                                                    alt={p.name}
                                                    productKey={p.id.toString()}
                                                    currentIndexMap={similarCardMediaIndex}
                                                    onIndexChange={setSimilarCardMediaIndexForKey}
                                                    className="h-full w-full"
                                                    imageClassName="group-hover:scale-105"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => toggleSimilarWishlist(e, p.id)}
                                                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                                                    className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full transition-colors sm:top-1.5 sm:right-1.5 sm:h-7 sm:w-7"
                                                >
                                                    <Heart
                                                        className={`h-3 w-3 sm:h-4 sm:w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'fill-white text-black'}`}
                                                        strokeWidth={2}
                                                    />
                                                </button>
                                            </div>
                                            <div className="flex flex-1 flex-col p-2 sm:p-2.5">
                                                <Link
                                                    href={productRoute(p.slug)}
                                                    className="mb-0.5 line-clamp-2 text-xs font-bold text-gray-800 transition-colors hover:text-(--theme-primary-1) sm:text-sm"
                                                >
                                                    {p.name}
                                                </Link>
                                                {p.is_subscription_eligible ? (
                                                    <p className="mb-1 text-[10px] font-medium text-gray-600 sm:text-xs">Subscription Available</p>
                                                ) : (
                                                    <p className="mb-1 text-xs font-semibold text-(--theme-primary-1) sm:text-sm">
                                                        {formatCurrency(p.price)}/ Unit
                                                    </p>
                                                )}
                                                <Link
                                                    href={p.is_subscription_eligible ? `/subscription?product=${p.id}` : '#'}
                                                    className="mt-auto w-full rounded-md bg-(--theme-primary-1) py-2 text-center text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-(--theme-primary-1-dark) focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none sm:py-2 sm:text-xs"
                                                >
                                                    {p.is_subscription_eligible ? 'Subscribe' : 'Add'}
                                                </Link>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </UserLayout>
    );
}
