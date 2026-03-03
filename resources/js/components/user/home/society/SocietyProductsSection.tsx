import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Heart, Package, ShoppingCart } from 'lucide-react';
import { type Dispatch, type RefObject, type SetStateAction } from 'react';
import ProductCardMedia, { type MediaItem } from '@/components/user/ProductCardMedia';
import { product as productRoute } from '@/routes/catalog';

interface ProductVariant {
    id: number;
    name: string;
    price: number;
    is_active: boolean;
}

interface ProductItem {
    id: number;
    name: string;
    slug: string;
    image: string;
    price: number;
    compare_at_price: number | null;
    is_subscription_eligible: boolean;
    unit: string | null;
    weight: number | null;
    images?: string[] | null;
    variants: ProductVariant[];
}

interface SocietyProductsSectionProps {
    products: ProductItem[];
    wishlistedProductIds: Set<number>;
    productSliderRef: RefObject<HTMLDivElement | null>;
    productActivePage: number;
    setProductActivePage: Dispatch<SetStateAction<number>>;
    setSelectedVariants: Dispatch<SetStateAction<Record<number, number>>>;
    similarCardMediaIndex: Record<string, number>;
    setSimilarCardMediaIndexForKey: (key: string, index: number) => void;
    toggleProductWishlist: (id: number) => void;
    getDisplayPrice: (product: ProductItem) => number;
    getSelectedVariantId: (product: ProductItem) => number | null;
    getSafeUrl: (url: string | null | undefined) => string;
    formatPrice: (price: number) => string;
}

export default function SocietyProductsSection({
    products,
    wishlistedProductIds,
    productSliderRef,
    productActivePage,
    setProductActivePage,
    setSelectedVariants,
    similarCardMediaIndex,
    setSimilarCardMediaIndexForKey,
    toggleProductWishlist,
    getDisplayPrice,
    getSelectedVariantId,
    getSafeUrl,
    formatPrice,
}: SocietyProductsSectionProps) {
    return (
        <section id="products" className="bg-linear-to-b from-white to-gray-50/30 py-10 sm:py-12 lg:py-14" aria-labelledby="products-heading">
            <div className="container mx-auto px-3 sm:px-4 lg:px-6">
                <div className="mb-6 flex items-center justify-between sm:mb-5">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--theme-primary-1)/10 sm:h-9 sm:w-9">
                            <Package className="h-4 w-4 text-(--theme-primary-1) sm:h-5 sm:w-5" />
                        </div>
                        <div>
                            <h2 id="products-heading" className="text-lg font-bold text-(--theme-primary-1-dark) sm:text-xl">
                                Our Products
                            </h2>
                            <p className="text-xs text-gray-400 sm:text-sm">Fresh dairy delivered</p>
                        </div>
                    </div>

                    <div className="hidden items-center gap-2 lg:flex">
                        <button
                            type="button"
                            onClick={() => {
                                const slider = document.getElementById('product-slider');
                                if (slider) {
                                    slider.scrollBy({ left: -slider.offsetWidth / 4, behavior: 'smooth' });
                                }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                            aria-label="Previous products"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const slider = document.getElementById('product-slider');
                                if (slider) {
                                    slider.scrollBy({ left: slider.offsetWidth / 4, behavior: 'smooth' });
                                }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                            aria-label="Next products"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                        <Link
                            href="/products"
                            className="ml-2 rounded-lg border border-(--theme-primary-1) px-3 py-1.5 text-xs font-medium text-(--theme-primary-1) transition-all hover:bg-(--theme-primary-1) hover:text-white sm:text-sm"
                        >
                            View All
                        </Link>
                    </div>

                    <Link
                        href="/products"
                        className="rounded-lg border border-(--theme-primary-1) px-3 py-1.5 text-xs font-medium text-(--theme-primary-1) transition-all hover:bg-(--theme-primary-1) hover:text-white sm:text-sm lg:hidden"
                    >
                        View All
                    </Link>
                </div>

                <div
                    ref={productSliderRef}
                    id="product-slider"
                    className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto sm:gap-4 lg:gap-4"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    onScroll={() => {
                        const slider = productSliderRef.current;
                        if (slider) {
                            const scrollLeft = slider.scrollLeft;
                            const maxScroll = slider.scrollWidth - slider.clientWidth;
                            const pageCount = Math.ceil(products.length / (window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 2 : 4));
                            const currentPage = Math.round((scrollLeft / maxScroll) * (pageCount - 1));
                            setProductActivePage(Math.min(currentPage, pageCount - 1));
                        }
                    }}
                >
                    {products.map((product) => {
                        const isWishlisted = wishlistedProductIds.has(product.id);
                        const displayPrice = getDisplayPrice(product);
                        const activeVariantId = getSelectedVariantId(product);
                        const hasVariants = product.variants.length > 0;
                        const hasDiscount = product.compare_at_price && product.compare_at_price > displayPrice;
                        const discountPct = hasDiscount
                            ? Math.round(((product.compare_at_price - displayPrice) / product.compare_at_price) * 100)
                            : 0;
                        const isPlan = product.is_subscription_eligible;

                        const mediaList: MediaItem[] = [];
                        if (product.images && product.images.length > 0) {
                            product.images.forEach((img) => mediaList.push({ type: 'image', url: getSafeUrl(img) }));
                        } else if (product.image) {
                            mediaList.push({ type: 'image', url: getSafeUrl(product.image) });
                        } else {
                            mediaList.push({ type: 'image', url: '/placeholder.png' });
                        }

                        return (
                            <article
                                key={product.id}
                                className="group relative flex w-[calc(50%-6px)] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-(--theme-primary-1)/40 hover:shadow-lg sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]"
                            >
                                <Link
                                    href={productRoute(product.slug)}
                                    className="relative aspect-square w-full overflow-hidden bg-(--theme-secondary)/10 sm:aspect-4/3"
                                >
                                    <ProductCardMedia
                                        media={mediaList}
                                        alt={product.name}
                                        productKey={product.id.toString()}
                                        currentIndexMap={similarCardMediaIndex}
                                        onIndexChange={setSimilarCardMediaIndexForKey}
                                        className="h-full w-full"
                                        imageClassName="group-hover:scale-105"
                                    />
                                    {hasDiscount && (
                                        <span className="absolute top-2 left-2 z-10 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow sm:text-[10px]">
                                            {discountPct}% OFF
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleProductWishlist(product.id);
                                        }}
                                        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                                        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white sm:h-8 sm:w-8"
                                    >
                                        <Heart
                                            className={`h-3.5 w-3.5 transition-all duration-200 sm:h-4 sm:w-4 ${isWishlisted ? 'scale-110 fill-red-500 text-red-500' : 'text-gray-400 group-hover:text-red-400'}`}
                                            strokeWidth={2}
                                        />
                                    </button>
                                </Link>

                                <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                                    <Link href={productRoute(product.slug)}>
                                        <h3 className="mb-1 line-clamp-1 text-xs font-semibold text-gray-800 transition-colors group-hover:text-(--theme-primary-1) sm:text-sm">
                                            {product.name}
                                        </h3>
                                    </Link>

                                    {isPlan ? (
                                        <p className="mb-1.5 text-[10px] font-medium text-gray-600 sm:text-xs">Subscription Available</p>
                                    ) : product.unit ? (
                                        <p className="mb-1.5 text-[10px] text-gray-400 sm:text-xs">
                                            {product.weight ? `${product.weight} ${product.unit}` : product.unit}
                                        </p>
                                    ) : null}

                                    {hasVariants && !isPlan && (
                                        <div className="mb-2 flex flex-wrap gap-1">
                                            {product.variants
                                                .filter((v) => v.is_active)
                                                .map((v) => (
                                                    <button
                                                        key={v.id}
                                                        type="button"
                                                        onClick={() => setSelectedVariants((prev) => ({ ...prev, [product.id]: v.id }))}
                                                        className={`rounded-md border px-2 py-0.5 text-[9px] font-medium transition-all sm:text-[10px] ${
                                                            activeVariantId === v.id
                                                                ? 'border-(--theme-primary-1) bg-(--theme-primary-1)/10 text-(--theme-primary-1)'
                                                                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        {v.name}
                                                    </button>
                                                ))}
                                        </div>
                                    )}

                                    {!isPlan && (
                                        <div className="mt-auto mb-2 flex items-baseline gap-1.5">
                                            <span className="text-sm font-bold text-(--theme-primary-1) sm:text-base">
                                                {formatPrice(displayPrice)}
                                            </span>
                                            {hasDiscount && (
                                                <span className="text-[10px] text-gray-400 line-through sm:text-xs">
                                                    {formatPrice(product.compare_at_price as number)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {isPlan && (
                                        <div className="mt-auto mb-2 flex items-baseline gap-1.5">
                                            <span className="text-sm font-bold text-(--theme-primary-1) sm:text-base">
                                                {formatPrice(displayPrice)}/ Unit
                                            </span>
                                        </div>
                                    )}

                                    <Link
                                        href={isPlan ? `/subscription?product=${product.id}` : productRoute(product.slug)}
                                        className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-md bg-(--theme-primary-1) py-2 text-center text-[11px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-(--theme-primary-1-dark) hover:shadow-md active:scale-[0.97] sm:py-2.5 sm:text-xs"
                                    >
                                        {isPlan ? (
                                            'Subscribe'
                                        ) : (
                                            <>
                                                <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.5} />
                                                Add to Cart
                                            </>
                                        )}
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-4 flex items-center justify-center gap-4 lg:hidden">
                    <button
                        type="button"
                        onClick={() => {
                            const slider = document.getElementById('product-slider');
                            if (slider) {
                                const cardWidth = window.innerWidth < 640 ? slider.offsetWidth / 2 : slider.offsetWidth / 2;
                                slider.scrollBy({ left: -cardWidth, behavior: 'smooth' });
                            }
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                        aria-label="Previous products"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                        {Array.from({
                            length: Math.min(5, Math.ceil(products.length / (typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 2))),
                        }).map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    const slider = document.getElementById('product-slider');
                                    if (slider) {
                                        const cardWidth = window.innerWidth < 640 ? slider.offsetWidth / 2 : slider.offsetWidth / 2;
                                        slider.scrollTo({ left: i * cardWidth * 2, behavior: 'smooth' });
                                    }
                                }}
                                className={`h-2 w-2 rounded-full transition-colors ${
                                    i === productActivePage ? 'bg-(--theme-primary-1)' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                                aria-label={`Go to products page ${i + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const slider = document.getElementById('product-slider');
                            if (slider) {
                                const cardWidth = window.innerWidth < 640 ? slider.offsetWidth / 2 : slider.offsetWidth / 2;
                                slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
                            }
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                        aria-label="Next products"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </section>
    );
}
