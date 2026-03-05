import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { type Dispatch, type RefObject, type SetStateAction } from 'react';

interface Category {
    id: number;
    name: string;
    slug: string;
    image: string | null;
}

interface SocietyCategoriesSectionProps {
    categories: Category[];
    categorySliderRef: RefObject<HTMLDivElement | null>;
    categoryActivePage: number;
    setCategoryActivePage: Dispatch<SetStateAction<number>>;
}

export default function SocietyCategoriesSection({
    categories,
    categorySliderRef,
    categoryActivePage,
    setCategoryActivePage,
}: SocietyCategoriesSectionProps) {
    const defaultCategoryImage = '/images/dairy-products.png';

    const resolveCategoryImage = (image: string | null) => {
        if (!image) {
            return defaultCategoryImage;
        }

        if (image.startsWith('http') || image.startsWith('/')) {
            return image;
        }

        if (image.startsWith('demo/') || image.startsWith('images/') || image.startsWith('video/')) {
            return `/${image}`;
        }

        return `/storage/${image}`;
    };

    return (
        <section className="bg-white py-10 sm:py-12 lg:py-14" aria-labelledby="trending-categories-heading">
            <div className="container mx-auto px-3 sm:px-4 lg:px-6">
                <div className="mb-6 flex items-center justify-between sm:mb-5">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--theme-primary-1)/10 sm:h-9 sm:w-9">
                            <Package className="h-4 w-4 text-(--theme-primary-1) sm:h-5 sm:w-5" />
                        </div>
                        <div>
                            <h2 id="trending-categories-heading" className="text-lg font-bold text-(--theme-primary-1-dark) sm:text-xl">
                                Browse Categories
                            </h2>
                            <p className="text-xs text-gray-400 sm:text-sm">Fresh dairy delivered</p>
                        </div>
                    </div>

                    <div className="hidden items-center gap-2 lg:flex">
                        <button
                            type="button"
                            onClick={() => {
                                const slider = document.getElementById('category-slider');
                                if (slider) {
                                    slider.scrollBy({ left: -slider.offsetWidth / 6, behavior: 'smooth' });
                                }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                            aria-label="Previous categories"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const slider = document.getElementById('category-slider');
                                if (slider) {
                                    slider.scrollBy({ left: slider.offsetWidth / 6, behavior: 'smooth' });
                                }
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                            aria-label="Next categories"
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
                    ref={categorySliderRef}
                    id="category-slider"
                    className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto sm:gap-3 lg:gap-3"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    onScroll={() => {
                        const slider = categorySliderRef.current;
                        if (slider) {
                            const scrollLeft = slider.scrollLeft;
                            const maxScroll = slider.scrollWidth - slider.clientWidth;
                            const pageCount = Math.ceil(categories.length / (window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 6));
                            const currentPage = Math.round((scrollLeft / maxScroll) * (pageCount - 1));
                            setCategoryActivePage(Math.min(currentPage, pageCount - 1));
                        }
                    }}
                >
                    {categories.map((category) => (
                        <Link
                            key={category.id}
                            href={`/products?category=${category.slug}`}
                            className="group relative w-[calc(50%-4px)] shrink-0 snap-start overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100 transition-all duration-200 hover:shadow-md hover:ring-(--theme-primary-1)/20 sm:w-[calc(33.333%-8px)] lg:w-[calc(16.666%-10px)]"
                        >
                            <div className="aspect-square w-full overflow-hidden bg-linear-to-br from-gray-50 to-gray-100">
                                {category.image ? (
                                    <img
                                        src={resolveCategoryImage(category.image)}
                                        alt={category.name}
                                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110"
                                        loading="lazy"
                                        onError={(event) => {
                                            (event.target as HTMLImageElement).src = defaultCategoryImage;
                                        }}
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-(--theme-primary-1)/10 to-(--theme-primary-1)/5">
                                        <Package className="h-6 w-6 text-(--theme-primary-1)/30 sm:h-8 sm:w-8" strokeWidth={1.5} />
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-1.5 sm:p-2">
                                <h3 className="truncate text-center text-[10px] font-medium text-white sm:text-xs">{category.name}</h3>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="mt-4 flex items-center justify-center gap-4 lg:hidden">
                    <button
                        type="button"
                        onClick={() => {
                            const slider = document.getElementById('category-slider');
                            if (slider) {
                                const cardWidth = window.innerWidth < 640 ? slider.offsetWidth / 2 : slider.offsetWidth / 3;
                                slider.scrollBy({ left: -cardWidth, behavior: 'smooth' });
                            }
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                        aria-label="Previous categories"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                        {Array.from({
                            length: Math.min(5, Math.ceil(categories.length / (typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 3))),
                        }).map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    const slider = categorySliderRef.current;
                                    if (slider) {
                                        const cardWidth = window.innerWidth < 640 ? slider.offsetWidth / 2 : slider.offsetWidth / 3;
                                        slider.scrollTo({ left: i * cardWidth * (window.innerWidth < 640 ? 2 : 3), behavior: 'smooth' });
                                    }
                                }}
                                className={`h-2 w-2 rounded-full transition-colors ${
                                    i === categoryActivePage ? 'bg-(--theme-primary-1)' : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                                aria-label={`Go to page ${i + 1}`}
                            />
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            const slider = document.getElementById('category-slider');
                            if (slider) {
                                const cardWidth = window.innerWidth < 640 ? slider.offsetWidth / 2 : slider.offsetWidth / 3;
                                slider.scrollBy({ left: cardWidth, behavior: 'smooth' });
                            }
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                        aria-label="Next categories"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </section>
    );
}
