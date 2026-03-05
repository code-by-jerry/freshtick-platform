import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, Mail, Phone, Play, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import HeroBanner from '@/components/user/HeroBanner';
import DailyHomeSections from '@/components/user/home/daily/DailyHomeSections';
import SocietyCategoriesSection from '@/components/user/home/society/SocietyCategoriesSection';
import SocietyDeliveryMarqueeSection from '@/components/user/home/society/SocietyDeliveryMarqueeSection';
import SocietyHomeSections from '@/components/user/home/society/SocietyHomeSections';
import SocietyProductsSection from '@/components/user/home/society/SocietyProductsSection';
import SocietySubscriptionStepsSection from '@/components/user/home/society/SocietySubscriptionStepsSection';
import UserLayout from '@/layouts/UserLayout';
import { getVerticalFromQuery } from '@/lib/vertical';

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

// Carousel slides data - kept for reference if needed in future
/*
const carouselSlides: CarouselSlide[] = [
    {
        id: 1,
        title: 'FROM OUR FARM TO',
        subtitle: 'YOUR HOME, WITH LOVE.',
        description: 'Fresh, pure milk delivered daily to your doorstep.',
        image: '/demo/Fresh Curd.png',
    },
    {
        id: 2,
        title: 'FRESH DAILY',
        subtitle: 'PURE QUALITY.',
        description: 'Farm-fresh dairy products, delivered every morning.',
        image: '/demo/Ghee.png',
    },
    {
        id: 3,
        title: 'NATURALLY RICH',
        subtitle: 'NATURALLY PURE.',
        description: 'Premium quality dairy, straight from our farm.',
        image: '/demo/panneer.png',
    },
];
*/

const TESTIMONIALS = [
    { quote: 'Milk tastes just like village milk. Delivery is always on time.', name: 'Rashid', location: 'Malappuram', recent: '2 days ago' },
    { quote: 'Fresh curd every morning. My family loves it!', name: 'Priya', location: 'Manjeri', recent: '1 week ago' },
    { quote: 'Best ghee in town. Quality is unmatched.', name: 'Rajesh', location: 'Perinthalmanna', recent: '3 days ago' },
    {
        quote: 'Subscription is so convenient. Pause when we travel, resume when we’re back.',
        name: 'Anitha',
        location: 'Kozhikode',
        recent: '5 days ago',
    },
    { quote: 'Morning delivery before 7 AM—perfect for our chai.', name: 'Suresh', location: 'Palakkad', recent: 'Yesterday' },
    { quote: 'No preservatives, real taste. Kids finally drink milk without fuss.', name: 'Deepa', location: 'Thrissur', recent: '4 days ago' },
];

const STORIES = [
    { id: 1, src: '/video/stories/14214919_2160_3840_25fps.mp4', label: 'Fresh from farm', views: '2.1K' },
    { id: 2, src: '/video/stories/4764773-uhd_2160_3840_30fps.mp4', label: 'Morning delivery', views: '1.8K' },
    { id: 3, src: '/video/stories/4911096-uhd_2160_4096_25fps.mp4', label: 'Pure quality', views: '3.4K' },
    { id: 4, src: '/video/stories/4911443-uhd_2160_4096_25fps.mp4', label: 'Farm to home', views: '1.2K' },
    { id: 5, src: '/video/stories/8064134-hd_1080_1920_24fps.mp4', label: 'Daily fresh', views: '2.9K' },
] as const;

const PRODUCTS_PER_VIEW = { mobile: 2, sm: 3, md: 5, lg: 6 };
const TESTIMONIALS_PER_VIEW = { mobile: 1, sm: 2, lg: 3 };
const GAP_PX = 16; // gap-4
const TESTIMONIAL_GAP_PX = 16;

interface Banner {
    id: number;
    title: string;
    description: string;
    image: string;
    mobile_image: string;
    link: string | null;
    link_type: string;
}

interface Category {
    id: number;
    name: string;
    slug: string;
    image: string | null;
    vertical?: string;
}

interface SubscriptionPlanItem {
    id: number;
    product_id: number;
    product_name: string;
    units: number;
    total_price: number;
    per_unit_price: number;
}

interface SubscriptionPlanFeature {
    id: number;
    title: string;
    highlight: boolean;
}

interface SubscriptionPlan {
    id: number;
    name: string;
    description: string;
    frequency_type: string;
    discount_type: string;
    discount_value: number;
    items: SubscriptionPlanItem[];
    features: SubscriptionPlanFeature[];
}

interface HomeProps {
    banners: Banner[];
    categories: Category[];
    products: ProductItem[];
    subscriptionPlans: SubscriptionPlan[];
}

export default function Home({ banners, categories, products = [], subscriptionPlans = [] }: HomeProps) {
    // Old carousel state - removed (using HeroBanner component now)
    // const [currentSlide, setCurrentSlide] = useState(0);

    const [cardsPerView, setCardsPerView] = useState(4);
    const [, setStepPx] = useState(0);
    const [testimonialCardsPerView, setTestimonialCardsPerView] = useState(1);
    const [, setTestimonialStepPx] = useState(0);
    const [similarCardMediaIndex, setSimilarCardMediaIndex] = useState<Record<string, number>>({});
    const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);
    const [storyProgress, setStoryProgress] = useState(0);
    const page = usePage<{ auth?: { user?: unknown; wishlisted_products?: number[] } }>();
    const auth = page.props.auth;
    const [, currentQuery = ''] = page.url.split('?');
    const selectedVertical = getVerticalFromQuery(currentQuery);
    const wishlistedProductIds = new Set(auth?.wishlisted_products || []);
    const [selectedVariants, setSelectedVariants] = useState<Record<number, number>>({});
    const [categoryActivePage, setCategoryActivePage] = useState(0);
    const [productActivePage, setProductActivePage] = useState(0);
    const [storiesActivePage, setStoriesActivePage] = useState(0);
    const [testimonialsActivePage, setTestimonialsActivePage] = useState(0);
    const productSliderRef = useRef<HTMLDivElement>(null);
    const categorySliderRef = useRef<HTMLDivElement>(null);
    const storiesSliderRef = useRef<HTMLDivElement>(null);
    const testimonialsSliderRef = useRef<HTMLDivElement>(null);

    // Manage sub-variant selection (e.g., 480ml vs 1L)
    // We'll filter by a search string on product_name
    const [subVariantSearch, setSubVariantSearch] = useState('480ml');

    const handleSubVariantChange = (variant: '480ml' | '1L') => {
        setSubVariantSearch(variant);
    };

    // Helper to get the correct item for a plan based on the subVariantSearch
    const getPlanItem = (plan: SubscriptionPlan) => {
        // Try to find an item that contains the search string (case-insensitive)
        return plan.items.find((i) => i.product_name.toLowerCase().includes(subVariantSearch.toLowerCase())) || plan.items[0]; // Fallback to first item if not found
    };

    // Helper to get unique product names across all items to show tabs
    // Assuming all plans have similar product structures, we pick unique "variants" from the first plan
    // In a real app, you might want to fetch available variants separately or compute from all plans
    const availableVariants = ['480ml', '1L']; // Hardcoded for now based on requirement, could be dynamic

    const toggleProductWishlist = (id: number) => {
        if (!auth?.user) {
            router.get('/login');
            return;
        }
        router.post(`/wishlist/toggle/${id}`, {}, { preserveScroll: true, preserveState: true });
    };

    const setSimilarCardMediaIndexForKey = (key: string, index: number) => {
        setSimilarCardMediaIndex((prev) => ({ ...prev, [key]: index }));
    };

    const DEFAULT_IMAGE_FALLBACK = '/images/dairy-products.png';

    const getSafeUrl = (url: string | null | undefined) => {
        if (!url) return DEFAULT_IMAGE_FALLBACK;
        if (url.startsWith('http') || url.startsWith('/')) return url;
        if (url.startsWith('demo/') || url.startsWith('images/') || url.startsWith('video/')) return `/${url}`;
        return `/storage/${url}`;
    };

    /** Get the currently displayed price for a product (selected variant or base price) */
    const getDisplayPrice = (product: ProductItem) => {
        if (product.variants.length > 0) {
            const selectedId = selectedVariants[product.id];
            const variant = selectedId ? product.variants.find((v) => v.id === selectedId) : product.variants[0];
            return variant ? variant.price : product.price;
        }
        return product.price;
    };

    const getSelectedVariantId = (product: ProductItem) => {
        return selectedVariants[product.id] ?? (product.variants.length > 0 ? product.variants[0].id : null);
    };

    const dailyCategories = categories.filter((category) => category.vertical === 'daily_fresh' || category.vertical === 'both');
    const societyCategories = categories.filter((category) => category.vertical === 'society_fresh' || category.vertical === 'both');
    const mobileCategories = selectedVertical === 'daily_fresh' ? dailyCategories : societyCategories;

    const formatPrice = (price: number) => {
        return '₹' + price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
    const testimonialSliderRef = useRef<HTMLDivElement>(null);
    const storyVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const updateCardsPerView = () => {
            const w = window.innerWidth;
            if (w >= 1024) setCardsPerView(PRODUCTS_PER_VIEW.lg);
            else if (w >= 768) setCardsPerView(PRODUCTS_PER_VIEW.md);
            else if (w >= 640) setCardsPerView(PRODUCTS_PER_VIEW.sm);
            else setCardsPerView(PRODUCTS_PER_VIEW.mobile);
        };
        updateCardsPerView();
        window.addEventListener('resize', updateCardsPerView);
        return () => window.removeEventListener('resize', updateCardsPerView);
    }, []);

    useEffect(() => {
        const el = productSliderRef.current;
        if (!el) return;
        const updateStep = () => {
            const width = el.offsetWidth;
            setStepPx((width - (cardsPerView - 1) * GAP_PX) / cardsPerView + GAP_PX);
        };
        updateStep();
        const ro = new ResizeObserver(updateStep);
        ro.observe(el);
        return () => ro.disconnect();
    }, [cardsPerView]);

    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            if (w >= 1024) setTestimonialCardsPerView(TESTIMONIALS_PER_VIEW.lg);
            else if (w >= 640) setTestimonialCardsPerView(TESTIMONIALS_PER_VIEW.sm);
            else setTestimonialCardsPerView(TESTIMONIALS_PER_VIEW.mobile);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        const el = testimonialSliderRef.current;
        if (!el) return;
        const updateStep = () => {
            const width = el.offsetWidth;
            setTestimonialStepPx((width - (testimonialCardsPerView - 1) * TESTIMONIAL_GAP_PX) / testimonialCardsPerView + TESTIMONIAL_GAP_PX);
        };
        updateStep();
        const ro = new ResizeObserver(updateStep);
        ro.observe(el);
        return () => ro.disconnect();
    }, [testimonialCardsPerView]);

    useEffect(() => {
        if (storyViewerIndex === null) {
            setStoryProgress(0);
            storyVideoRef.current?.pause();
            return;
        }
        const video = storyVideoRef.current;
        if (!video) return;
        setStoryProgress(0);
        video.currentTime = 0;
        video.play().catch(() => {});
        const onTimeUpdate = () => setStoryProgress(video.duration ? (100 * video.currentTime) / video.duration : 0);
        const onEnded = () => {
            if (storyViewerIndex < STORIES.length - 1) setStoryViewerIndex(storyViewerIndex + 1);
            else setStoryViewerIndex(null);
        };
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('ended', onEnded);
        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('ended', onEnded);
        };
    }, [storyViewerIndex]);

    if (selectedVertical === 'daily_fresh') {
        return (
            <UserLayout>
                <Head title="FreshTick - Daily Fresh" />

                {mobileCategories.length > 0 && (
                    <section className="bg-white py-2 lg:hidden">
                        <div className="container mx-auto px-3">
                            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                                {mobileCategories.map((category) => (
                                    <Link
                                        key={category.id}
                                        href={`/categories/${category.slug}?vertical=daily_fresh`}
                                        className="w-22 shrink-0 rounded-xl border border-gray-200 bg-white p-2 text-center shadow-sm"
                                    >
                                        <img
                                            src={getSafeUrl(category.image)}
                                            alt={category.name}
                                            className="mx-auto h-11 w-11 rounded-lg object-cover"
                                            loading="lazy"
                                            onError={(event) => {
                                                (event.target as HTMLImageElement).src = DEFAULT_IMAGE_FALLBACK;
                                            }}
                                        />
                                        <p className="mt-1.5 line-clamp-2 text-[11px] leading-tight font-medium text-gray-700">{category.name}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <HeroBanner banners={banners} autoPlay={true} interval={5000} />

                <DailyHomeSections />
            </UserLayout>
        );
    }

    return (
        <UserLayout>
            <Head title="FreshTick - Fresh Dairy Delivered Daily" />

            {mobileCategories.length > 0 && (
                <section className="bg-white py-2 lg:hidden">
                    <div className="container mx-auto px-3">
                        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                            {mobileCategories.map((category) => (
                                <Link
                                    key={category.id}
                                    href={`/categories/${category.slug}?vertical=society_fresh`}
                                    className="w-22 shrink-0 rounded-xl border border-gray-200 bg-white p-2 text-center shadow-sm"
                                >
                                    <img
                                        src={getSafeUrl(category.image)}
                                        alt={category.name}
                                        className="mx-auto h-11 w-11 rounded-lg object-cover"
                                        loading="lazy"
                                        onError={(event) => {
                                            (event.target as HTMLImageElement).src = DEFAULT_IMAGE_FALLBACK;
                                        }}
                                    />
                                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-tight font-medium text-gray-700">{category.name}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Hero Banner Section - Compact with thumbnails */}
            <HeroBanner banners={banners} autoPlay={true} interval={5000} />

            <SocietyHomeSections>
                <SocietyDeliveryMarqueeSection />

                <SocietyCategoriesSection
                    categories={societyCategories}
                    categorySliderRef={categorySliderRef}
                    categoryActivePage={categoryActivePage}
                    setCategoryActivePage={setCategoryActivePage}
                />

                <SocietySubscriptionStepsSection />

                <SocietyProductsSection
                    products={products}
                    wishlistedProductIds={wishlistedProductIds}
                    productSliderRef={productSliderRef}
                    productActivePage={productActivePage}
                    setProductActivePage={setProductActivePage}
                    setSelectedVariants={setSelectedVariants}
                    similarCardMediaIndex={similarCardMediaIndex}
                    setSimilarCardMediaIndexForKey={setSimilarCardMediaIndexForKey}
                    toggleProductWishlist={toggleProductWishlist}
                    getDisplayPrice={getDisplayPrice}
                    getSelectedVariantId={getSelectedVariantId}
                    getSafeUrl={getSafeUrl}
                    formatPrice={formatPrice}
                />

                {/* Why Choose Us – Auto-scrolling Slider with Consistent Pattern */}
                <section className="bg-linear-to-b from-white via-gray-50/50 to-white py-10 sm:py-12 lg:py-14" aria-labelledby="why-choose-heading">
                    <div className="container mx-auto px-3 sm:px-4 lg:px-6">
                        {/* Centered Header with Icon */}
                        <div className="mb-6 flex flex-col items-center justify-center sm:mb-5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--theme-primary-1)/10 sm:h-9 sm:w-9">
                                    <svg
                                        className="h-4 w-4 text-(--theme-primary-1) sm:h-5 sm:w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <h2 id="why-choose-heading" className="text-lg font-bold text-(--theme-primary-1-dark) sm:text-xl">
                                        Why Choose Us
                                    </h2>
                                    <p className="text-xs text-gray-400 sm:text-sm">Building trust through quality</p>
                                </div>
                            </div>
                        </div>

                        {/* Auto-scrolling Why Choose Us Slider */}
                        <div className="relative overflow-hidden py-4">
                            <style>{`
                                @keyframes scroll-why-choose {
                                    0% { transform: translateX(0); }
                                    100% { transform: translateX(-50%); }
                                }
                                .why-choose-scroll {
                                    animation: scroll-why-choose 20s linear infinite;
                                }
                                .why-choose-scroll:hover {
                                    animation-play-state: paused;
                                }
                            `}</style>
                            <div className="why-choose-scroll flex gap-3 sm:gap-4 lg:gap-4">
                                {/* Duplicate items for seamless loop */}
                                {[
                                    ...[
                                        {
                                            title: 'Sourced from local Kerala farms',
                                            image: '/images/why-choose-us/Sourced from local Kerala farms.png',
                                        },
                                        { title: 'No preservatives', image: '/images/why-choose-us/no-preservatives.png' },
                                        { title: 'Hygienic processing', image: '/images/why-choose-us/Hygienic processing.png' },
                                        { title: 'Morning delivery before 7 AM', image: '/images/why-choose-us/morning-delivery.png' },
                                        { title: 'Cancel / pause anytime', image: '/images/why-choose-us/Cancel-pause anytime.png' },
                                        { title: 'Quality checked daily', image: '/images/why-choose-us/Quality checked daily.png' },
                                        { title: 'Cold-chain maintained', image: '/images/why-choose-us/Cold-chain maintained.png' },
                                        { title: 'Transparent pricing', image: '/images/why-choose-us/transparent-pricing.png' },
                                    ],
                                    ...[
                                        {
                                            title: 'Sourced from local Kerala farms',
                                            image: '/images/why-choose-us/Sourced from local Kerala farms.png',
                                        },
                                        { title: 'No preservatives', image: '/images/why-choose-us/no-preservatives.png' },
                                        { title: 'Hygienic processing', image: '/images/why-choose-us/Hygienic processing.png' },
                                        { title: 'Morning delivery before 7 AM', image: '/images/why-choose-us/morning-delivery.png' },
                                        { title: 'Cancel / pause anytime', image: '/images/why-choose-us/Cancel-pause anytime.png' },
                                        { title: 'Quality checked daily', image: '/images/why-choose-us/Quality checked daily.png' },
                                        { title: 'Cold-chain maintained', image: '/images/why-choose-us/Cold-chain maintained.png' },
                                        { title: 'Transparent pricing', image: '/images/why-choose-us/transparent-pricing.png' },
                                    ],
                                ].map((item, index) => (
                                    <div
                                        key={`${item.title}-${index}`}
                                        className="group flex w-[calc(33.333%-8px)] shrink-0 flex-col items-center sm:w-[calc(25%-12px)] lg:w-[calc(16.666%-14px)]"
                                    >
                                        {/* Icon container - larger, no bg */}
                                        <div className="relative mb-2 flex h-16 w-16 items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 sm:h-20 sm:w-20">
                                            <img
                                                src={item.image}
                                                alt={item.title}
                                                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                                                loading="lazy"
                                            />
                                        </div>

                                        {/* Title - centered, compact */}
                                        <h3 className="text-center text-[10px] leading-tight font-semibold text-gray-700 transition-colors duration-200 group-hover:text-(--theme-primary-1) sm:text-xs">
                                            {item.title}
                                        </h3>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Morning Delivery Promise – Modern Compact Design */}
                <section className="relative overflow-hidden bg-(--theme-primary-1) py-8 sm:py-10 lg:py-12">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10" aria-hidden>
                        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/20 blur-3xl sm:h-96 sm:w-96" />
                        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/20 blur-3xl sm:h-96 sm:w-96" />
                    </div>

                    <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Main Content Card */}
                        <div className="overflow-hidden rounded-xl bg-white shadow-xl lg:rounded-2xl">
                            <div className="flex flex-col lg:flex-row">
                                {/* Left: Content */}
                                <div className="flex-1 p-5 sm:p-6 lg:p-8">
                                    {/* Badge */}
                                    <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-(--theme-primary-1)/10 px-2.5 py-1 text-[10px] font-semibold text-(--theme-primary-1) sm:text-xs">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Morning Delivery
                                    </span>

                                    {/* Heading */}
                                    <h2 className="mb-3 text-xl leading-tight font-bold text-gray-900 sm:text-2xl lg:text-3xl">
                                        Wake Up to <span className="text-(--theme-primary-1)">Freshness</span> Every Day
                                    </h2>

                                    {/* Description */}
                                    <p className="mb-4 text-xs leading-relaxed text-gray-600 sm:text-sm">
                                        Milk delivered before your day starts—no store visits, no forgetting. Start your morning with the freshest
                                        dairy products right at your doorstep.
                                    </p>

                                    {/* Feature Grid */}
                                    <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3">
                                        {[
                                            { text: 'Before 7 AM', icon: 'clock', desc: 'Daily delivery' },
                                            { text: 'No store visits', icon: 'home', desc: 'Doorstep service' },
                                            { text: 'Never miss milk', icon: 'check', desc: 'Reliable supply' },
                                            { text: 'Farm to door', icon: 'truck', desc: 'Fresh & pure' },
                                        ].map((point) => (
                                            <div
                                                key={point.text}
                                                className="group rounded-lg bg-gray-50 p-2.5 transition-all hover:bg-(--theme-primary-1)/5 hover:shadow-md sm:p-3"
                                            >
                                                <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-md bg-(--theme-primary-1) text-white shadow-sm transition-transform group-hover:scale-110 sm:h-10 sm:w-10">
                                                    {point.icon === 'clock' && (
                                                        <svg
                                                            className="h-4 w-4 sm:h-5 sm:w-5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    )}
                                                    {point.icon === 'home' && (
                                                        <svg
                                                            className="h-4 w-4 sm:h-5 sm:w-5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                                            />
                                                        </svg>
                                                    )}
                                                    {point.icon === 'check' && (
                                                        <svg
                                                            className="h-4 w-4 sm:h-5 sm:w-5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    )}
                                                    {point.icon === 'truck' && (
                                                        <svg
                                                            className="h-4 w-4 sm:h-5 sm:w-5"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                                                            />
                                                        </svg>
                                                    )}
                                                </div>
                                                <h4 className="text-xs font-bold text-gray-800 sm:text-sm">{point.text}</h4>
                                                <p className="text-[10px] text-gray-500 sm:text-xs">{point.desc}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA Buttons */}
                                    <div className="flex flex-wrap gap-2.5 sm:gap-3">
                                        <a
                                            href="/login"
                                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-(--theme-primary-1) px-4 py-2.5 text-xs font-bold text-white shadow-(--theme-primary-1)/30 shadow-md transition-all hover:-translate-y-0.5 hover:bg-(--theme-primary-1-dark) hover:shadow-lg active:scale-95 sm:px-5 sm:py-3 sm:text-sm"
                                        >
                                            Subscribe Now
                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </a>
                                        <a
                                            href="#"
                                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 transition-all hover:border-(--theme-primary-1) hover:text-(--theme-primary-1) active:scale-95 sm:px-5 sm:py-3 sm:text-sm"
                                        >
                                            Check delivery area
                                        </a>
                                    </div>
                                </div>

                                {/* Right: Video */}
                                <div className="relative aspect-video w-full lg:aspect-auto lg:w-[42%]">
                                    <video
                                        src="/video/fresh-milk.mp4"
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        preload="auto"
                                        className="h-full w-full object-cover"
                                        aria-label="Fresh milk delivery"
                                    />
                                    <div
                                        className="absolute inset-0 bg-linear-to-r from-white/20 via-transparent to-transparent lg:from-white/30"
                                        aria-hidden
                                    />

                                    {/* Floating Stats Card */}
                                    <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 p-2 shadow-lg backdrop-blur-sm sm:bottom-4 sm:left-4 sm:p-3 lg:bottom-6 lg:left-6">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--theme-primary-1)/10 text-(--theme-primary-1) sm:h-10 sm:w-10">
                                                <svg
                                                    className="h-4 w-4 sm:h-5 sm:w-5"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={2}
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-500 sm:text-xs">Delivery Success</p>
                                                <p className="text-base font-bold text-gray-900 sm:text-lg">99.8%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Our Stories – Slider with Navigation (Same layout as Categories/Products) */}
                <section className="bg-(--theme-primary-1) py-10 sm:py-12 lg:py-14" aria-labelledby="our-stories-heading">
                    <div className="container mx-auto px-3 sm:px-4 lg:px-6">
                        {/* Compact Header with Icon and Nav Buttons */}
                        <div className="mb-6 flex items-center justify-between sm:mb-5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 sm:h-9 sm:w-9">
                                    <Play className="h-4 w-4 text-white sm:h-5 sm:w-5" fill="currentColor" />
                                </div>
                                <div>
                                    <h2 id="our-stories-heading" className="text-lg font-bold text-white sm:text-xl">
                                        Our Stories
                                    </h2>
                                    <p className="text-xs text-white/70 sm:text-sm">Freshtick Shorts — fresh updates</p>
                                </div>
                            </div>

                            {/* Web: Nav buttons near View All */}
                            <div className="hidden items-center gap-2 lg:flex">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const slider = document.getElementById('stories-slider');
                                        if (slider) slider.scrollBy({ left: -slider.offsetWidth / 6, behavior: 'smooth' });
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-(--theme-primary-1) shadow-md transition-all hover:bg-white/90 hover:shadow-lg"
                                    aria-label="Previous stories"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const slider = document.getElementById('stories-slider');
                                        if (slider) slider.scrollBy({ left: slider.offsetWidth / 6, behavior: 'smooth' });
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-(--theme-primary-1) shadow-md transition-all hover:bg-white/90 hover:shadow-lg"
                                    aria-label="Next stories"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Stories Slider */}
                        <div
                            ref={storiesSliderRef}
                            id="stories-slider"
                            className="scrollbar-hide mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 sm:gap-4 lg:mb-0"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            onScroll={() => {
                                const slider = storiesSliderRef.current;
                                if (slider) {
                                    const scrollLeft = slider.scrollLeft;
                                    const maxScroll = slider.scrollWidth - slider.clientWidth;
                                    const pageCount = Math.ceil(STORIES.length / (window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 6));
                                    const currentPage = Math.round((scrollLeft / maxScroll) * (pageCount - 1));
                                    setStoriesActivePage(Math.min(currentPage, pageCount - 1));
                                }
                            }}
                        >
                            {STORIES.map((story, index) => (
                                <button
                                    key={story.id}
                                    type="button"
                                    onClick={() => setStoryViewerIndex(index)}
                                    className="group flex w-[calc(33.333%-8px)] shrink-0 snap-start flex-col rounded-xl text-left focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-(--theme-primary-1) focus:outline-none sm:w-[calc(25%-12px)] lg:w-[calc(16.666%-14px)]"
                                    aria-label={`Watch short: ${story.label}`}
                                >
                                    {/* Short video preview – vertical 9:16 */}
                                    <div className="relative w-full overflow-hidden rounded-lg bg-gray-200">
                                        <div className="aspect-9/16 w-full">
                                            <video
                                                src={story.src}
                                                className="h-full w-full object-cover"
                                                muted
                                                loop
                                                playsInline
                                                preload="metadata"
                                                aria-hidden
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity group-hover:bg-black/30">
                                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md sm:h-12 sm:w-12">
                                                    <Play
                                                        className="h-5 w-5 text-(--theme-primary-1) sm:h-6 sm:w-6"
                                                        strokeWidth={2}
                                                        fill="currentColor"
                                                    />
                                                </span>
                                            </div>
                                            <span className="absolute right-1.5 bottom-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur sm:text-xs">
                                                {story.views} views
                                            </span>
                                        </div>
                                    </div>
                                    {/* User / channel details */}
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="flex h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/20 ring-1 ring-white/40">
                                            <img src="/images/logo_light.png" alt="" className="h-full w-full object-contain p-0.5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-semibold text-white sm:text-sm">Freshtick</p>
                                            <p className="truncate text-[10px] text-white/80 sm:text-xs">{story.label}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Mobile: Bottom nav with pagination */}
                        <div className="flex items-center justify-center gap-4 lg:hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    const slider = document.getElementById('stories-slider');
                                    if (slider) slider.scrollBy({ left: -slider.offsetWidth / 2, behavior: 'smooth' });
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-(--theme-primary-1) shadow-md transition-all hover:bg-white/90"
                                aria-label="Previous stories"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            {/* Pagination dots */}
                            <div className="flex items-center gap-1.5">
                                {[...Array(Math.min(5, Math.ceil(STORIES.length / 2)))].map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            const slider = document.getElementById('stories-slider');
                                            if (slider) slider.scrollTo({ left: i * slider.offsetWidth, behavior: 'smooth' });
                                        }}
                                        className={`h-2 w-2 rounded-full transition-all ${
                                            i === storiesActivePage ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                                        }`}
                                        aria-label={`Go to stories page ${i + 1}`}
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    const slider = document.getElementById('stories-slider');
                                    if (slider) slider.scrollBy({ left: slider.offsetWidth / 2, behavior: 'smooth' });
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-(--theme-primary-1) shadow-md transition-all hover:bg-white/90"
                                aria-label="Next stories"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Story viewer fullscreen overlay – video fills viewport, close above tap zones */}
                {storyViewerIndex !== null && (
                    <div
                        className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-black"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Story viewer"
                    >
                        {/* Video – fills entire viewport */}
                        <div className="absolute inset-0">
                            <video
                                ref={storyVideoRef}
                                src={STORIES[storyViewerIndex].src}
                                className="h-full w-full object-contain"
                                playsInline
                                muted={false}
                            />
                        </div>
                        {/* Progress bars – above video, above tap zones so close is clickable */}
                        <div className="absolute top-0 right-0 left-0 z-20 flex gap-1 px-2 pt-3 sm:gap-1.5 sm:px-3 sm:pt-4">
                            {STORIES.map((_, i) => (
                                <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                                    <div
                                        className="h-full rounded-full bg-white transition-[width] duration-75"
                                        style={{ width: i < storyViewerIndex ? '100%' : i === storyViewerIndex ? `${storyProgress}%` : '0%' }}
                                    />
                                </div>
                            ))}
                        </div>
                        {/* Brand + close – z-20 so button is clickable (above tap zones) */}
                        <div className="absolute top-10 right-0 left-0 z-20 flex items-center justify-between px-4 sm:top-12 sm:px-6">
                            <span className="text-sm font-semibold text-white/90">Freshtick</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setStoryViewerIndex(null);
                                }}
                                className="relative z-20 rounded-full p-2 text-white/90 transition-colors hover:bg-white/20 hover:text-white focus:ring-2 focus:ring-white/50 focus:outline-none"
                                aria-label="Close story"
                            >
                                <X className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
                            </button>
                        </div>
                        {/* Tap zones: left = prev, right = next (z-10, below header so close works) */}
                        <div className="absolute inset-0 z-10 flex">
                            <button
                                type="button"
                                className="w-2/5 shrink-0 focus:outline-none"
                                onClick={() => setStoryViewerIndex(storyViewerIndex > 0 ? storyViewerIndex - 1 : null)}
                                aria-label="Previous story"
                            />
                            <button
                                type="button"
                                className="flex-1 focus:outline-none"
                                onClick={() => setStoryViewerIndex(storyViewerIndex < STORIES.length - 1 ? storyViewerIndex + 1 : null)}
                                aria-label="Next story"
                            />
                        </div>
                    </div>
                )}

                {/* Subscription Plans – white cards, 480ml/1L tabs, primary outline */}
                <section id="subscriptions" className="bg-white py-12 sm:py-16 lg:py-20">
                    <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 sm:text-3xl lg:text-4xl">Subscription Plans</h2>

                        {/* Variant tabs */}
                        <div className="mb-8 flex justify-center gap-2">
                            {availableVariants.map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={() => handleSubVariantChange(v as '480ml' | '1L')}
                                    className={`rounded-lg border-2 px-5 py-2.5 text-sm font-semibold transition-all sm:px-6 sm:py-3 sm:text-base ${
                                        subVariantSearch === v
                                            ? 'border-(--theme-primary-1) bg-(--theme-primary-1) text-white'
                                            : 'border-gray-300 bg-white text-gray-700 hover:border-(--theme-primary-1) hover:text-(--theme-primary-1)'
                                    }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        <div className="grid gap-5 sm:grid-cols-3 sm:gap-6">
                            {subscriptionPlans.map((plan) => {
                                const item = getPlanItem(plan);
                                return (
                                    <div
                                        key={plan.id}
                                        className="flex flex-col rounded-xl border-2 border-(--theme-primary-1) bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                                    >
                                        <div className="mb-3 flex items-start justify-between gap-2">
                                            <h3 className="text-lg font-bold text-gray-900 sm:text-xl">{plan.name}</h3>
                                            {plan.discount_type !== 'none' && plan.discount_value > 0 && (
                                                <span className="shrink-0 rounded bg-(--theme-primary-1) px-2 py-0.5 text-xs font-bold text-white">
                                                    {plan.discount_type === 'percentage'
                                                        ? `${Math.round(plan.discount_value)}% OFF`
                                                        : `₹${Math.round(plan.discount_value)} OFF`}
                                                </span>
                                            )}
                                        </div>
                                        {item && (
                                            <>
                                                <p className="mb-2 text-sm text-gray-600">{item.product_name}</p>
                                                <p className="mb-2 text-sm text-gray-600">{item.units} Unit(s)</p>
                                                <p className="mb-1 text-xl font-bold text-(--theme-primary-1) sm:text-2xl">
                                                    ₹{Math.round(item.total_price)}
                                                </p>
                                                <p className="mb-3 text-sm font-medium text-gray-700">₹{Math.round(item.per_unit_price)}/Unit(s)</p>
                                            </>
                                        )}
                                        <ul className="mb-4 space-y-1.5 border-t border-gray-100 pt-3" role="list">
                                            {plan.features.map((feature) => (
                                                <li key={feature.id} className="flex items-center gap-2 text-sm text-gray-700">
                                                    <span
                                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${feature.highlight ? 'bg-(--theme-secondary) text-(--theme-primary-1)' : 'bg-gray-100 text-gray-500'}`}
                                                    >
                                                        <svg
                                                            className="h-3 w-3"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                            strokeWidth={2.5}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </span>
                                                    <span>{feature.title}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link
                                            href={`/subscription?plan=${plan.id}`}
                                            className="mt-auto rounded-lg bg-(--theme-primary-1) px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--theme-primary-1-dark) sm:py-3 sm:text-base"
                                        >
                                            Subscribe
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Customer Testimonials – Slider with Navigation (Same layout as Categories/Products) */}
                <section className="relative overflow-hidden bg-gray-50 py-10 sm:py-12 lg:py-14" aria-label="Customer testimonials">
                    <div className="section-icon-bg pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
                        <img
                            src="/images/icons/milk-bottle.png"
                            alt=""
                            className="absolute top-[8%] left-[2%] h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16"
                            style={{ opacity: 0.06, transform: 'rotate(-15deg)' }}
                        />
                        <img
                            src="/images/icons/farm.png"
                            alt=""
                            className="absolute top-[5%] right-[4%] h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14"
                            style={{ opacity: 0.05, transform: 'rotate(10deg)' }}
                        />
                        <img
                            src="/images/icons/animal.png"
                            alt=""
                            className="absolute bottom-[15%] left-[1%] h-10 w-10 sm:h-12 sm:w-12"
                            style={{ opacity: 0.05, transform: 'rotate(8deg)' }}
                        />
                        <img
                            src="/images/icons/milk-bottle%20(1).png"
                            alt=""
                            className="absolute right-[8%] bottom-[10%] h-12 w-12 sm:h-14 sm:w-14"
                            style={{ opacity: 0.06, transform: 'rotate(-8deg)' }}
                        />
                        <img
                            src="/images/icons/discount.png"
                            alt=""
                            className="absolute top-1/2 left-[15%] h-8 w-8 -translate-y-1/2 sm:h-10 sm:w-10"
                            style={{ opacity: 0.04, transform: 'rotate(12deg)' }}
                        />
                        <img
                            src="/images/icons/milk%20(1).png"
                            alt=""
                            className="absolute top-1/2 right-[18%] h-8 w-8 -translate-y-1/2 sm:h-10 sm:w-10"
                            style={{ opacity: 0.05, transform: 'rotate(-6deg)' }}
                        />
                    </div>
                    <div className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-6">
                        {/* Compact Header with Icon and Nav Buttons */}
                        <div className="mb-6 flex items-center justify-between sm:mb-5">
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--theme-primary-1)/10 sm:h-9 sm:w-9">
                                    <svg
                                        className="h-4 w-4 text-(--theme-primary-1) sm:h-5 sm:w-5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-(--theme-primary-1-dark) sm:text-xl">What Our Customers Say</h2>
                                    <p className="text-xs text-gray-400 sm:text-sm">Real feedback from Kerala</p>
                                </div>
                            </div>

                            {/* Web: Nav buttons near View All */}
                            <div className="hidden items-center gap-2 lg:flex">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const slider = document.getElementById('testimonials-slider');
                                        if (slider) slider.scrollBy({ left: -slider.offsetWidth / 3, behavior: 'smooth' });
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                                    aria-label="Previous testimonials"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const slider = document.getElementById('testimonials-slider');
                                        if (slider) slider.scrollBy({ left: slider.offsetWidth / 3, behavior: 'smooth' });
                                    }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark) hover:shadow-lg"
                                    aria-label="Next testimonials"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Testimonials Slider */}
                        <div
                            ref={testimonialsSliderRef}
                            id="testimonials-slider"
                            className="scrollbar-hide mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-4 sm:gap-4 lg:mb-0"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            role="list"
                            onScroll={() => {
                                const slider = testimonialsSliderRef.current;
                                if (slider) {
                                    const scrollLeft = slider.scrollLeft;
                                    const maxScroll = slider.scrollWidth - slider.clientWidth;
                                    const pageCount = Math.ceil(
                                        TESTIMONIALS.length / (window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3),
                                    );
                                    const currentPage = Math.round((scrollLeft / maxScroll) * (pageCount - 1));
                                    setTestimonialsActivePage(Math.min(currentPage, pageCount - 1));
                                }
                            }}
                        >
                            {TESTIMONIALS.map((t, index) => (
                                <article
                                    key={index}
                                    className="flex w-[calc(85%-8px)] shrink-0 snap-start flex-col rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-14px)]"
                                    role="listitem"
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <div className="flex gap-0.5 text-(--theme-tertiary)">
                                            {[...Array(5)].map((_, i) => (
                                                <svg key={i} className="h-4 w-4 fill-current" viewBox="0 0 20 20" aria-hidden>
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-medium text-(--theme-primary-1) sm:text-xs">{t.recent}</span>
                                    </div>
                                    <p className="mb-3 line-clamp-3 flex-1 text-sm leading-relaxed text-gray-700 sm:text-base">"{t.quote}"</p>
                                    <div className="flex items-center gap-2 border-t border-gray-100 pt-2 sm:pt-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--theme-primary-1)/15 text-xs font-bold text-(--theme-primary-1) sm:h-9 sm:w-9 sm:text-sm">
                                            {t.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-gray-900">{t.name}</p>
                                            <p className="flex items-center gap-1 truncate text-xs text-gray-600">
                                                <MapPin className="h-3 w-3 shrink-0 text-(--theme-primary-1)" strokeWidth={2} />
                                                {t.location}, Kerala
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* Mobile: Bottom nav with pagination */}
                        <div className="flex items-center justify-center gap-4 lg:hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    const slider = document.getElementById('testimonials-slider');
                                    if (slider) slider.scrollBy({ left: -slider.offsetWidth / 1.5, behavior: 'smooth' });
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark)"
                                aria-label="Previous testimonials"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            {/* Pagination dots */}
                            <div className="flex items-center gap-1.5">
                                {[...Array(Math.min(5, Math.ceil(TESTIMONIALS.length / 1.5)))].map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            const slider = document.getElementById('testimonials-slider');
                                            if (slider) slider.scrollTo({ left: i * slider.offsetWidth * 0.7, behavior: 'smooth' });
                                        }}
                                        className={`h-2 w-2 rounded-full transition-all ${
                                            i === testimonialsActivePage ? 'bg-(--theme-primary-1)' : 'bg-gray-300 hover:bg-gray-400'
                                        }`}
                                        aria-label={`Go to testimonials page ${i + 1}`}
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    const slider = document.getElementById('testimonials-slider');
                                    if (slider) slider.scrollBy({ left: slider.offsetWidth / 1.5, behavior: 'smooth' });
                                }}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-(--theme-primary-1) text-white shadow-md transition-all hover:bg-(--theme-primary-1-dark)"
                                aria-label="Next testimonials"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Support – enhanced compact design */}
                <section className="bg-linear-to-b from-white to-gray-50/30 py-8 sm:py-10 lg:py-12">
                    <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6">
                            {/* Col 1: Active Support GIF + App CTA */}
                            <div className="flex w-full flex-col gap-4">
                                <div className="group relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-(--theme-primary-1)/10 to-(--theme-primary-1)/5 shadow-md transition-all duration-500 hover:shadow-lg sm:h-50 lg:h-55">
                                    <img
                                        src="/images/Active%20Support.gif"
                                        alt="Mobile app support"
                                        className="h-full max-h-full w-full max-w-full object-contain object-center p-3 transition-transform duration-500 group-hover:scale-105 sm:p-4"
                                        loading="lazy"
                                    />
                                </div>
                                <div className="shrink-0 rounded-xl bg-linear-to-r from-(--theme-primary-1) to-(--theme-primary-1-dark) p-4 shadow-lg sm:p-5">
                                    <p className="text-xs font-semibold text-white/95 sm:text-sm">
                                        Manage subscriptions from your phone — pause, increase, decrease anytime.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <a
                                            href="/login"
                                            className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-(--theme-primary-1) shadow-sm transition-all duration-300 hover:scale-105 hover:bg-white/95 hover:shadow-md active:scale-95 sm:px-5 sm:py-2.5 sm:text-sm"
                                        >
                                            Get Started
                                        </a>
                                        <a
                                            href="/login"
                                            className="rounded-lg border-2 border-white/80 bg-transparent px-4 py-2 text-xs font-semibold text-white transition-all duration-300 hover:scale-105 hover:border-white hover:bg-white/10 active:scale-95 sm:px-5 sm:py-2.5 sm:text-sm"
                                        >
                                            Subscribe Now
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Col 2: Support contact card */}
                            <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md transition-all duration-300 hover:shadow-lg">
                                <div className="border-b border-gray-100 bg-linear-to-r from-gray-50 to-white px-4 py-3 sm:px-5 sm:py-3.5">
                                    <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Support</h2>
                                    <p className="mt-0.5 text-xs text-gray-600 sm:text-sm">We're here to help you</p>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    <a
                                        href="tel:7736121233"
                                        className="group flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:bg-(--theme-primary-1)/5 sm:px-5 sm:py-3.5"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--theme-primary-1)/20 to-(--theme-primary-1)/10 text-(--theme-primary-1) shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:from-(--theme-primary-1)/30 group-hover:to-(--theme-primary-1)/20 sm:h-10 sm:w-10">
                                            <Phone className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 transition-colors duration-300 group-hover:text-(--theme-primary-1) sm:text-base">
                                                Call Us
                                            </p>
                                            <p className="text-xs text-gray-600 sm:text-sm">7736121233</p>
                                        </div>
                                        <ExternalLink
                                            className="h-4 w-4 shrink-0 text-gray-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-(--theme-primary-1) sm:h-5 sm:w-5"
                                            strokeWidth={2}
                                            aria-hidden
                                        />
                                    </a>
                                    <a
                                        href="https://wa.me/917736121233"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:bg-(--theme-primary-1)/5 sm:px-5 sm:py-3.5"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#25D366]/20 to-[#25D366]/10 text-[#25D366] shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:from-[#25D366]/30 group-hover:to-[#25D366]/20 sm:h-10 sm:w-10">
                                            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                            </svg>
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 transition-colors duration-300 group-hover:text-[#25D366] sm:text-base">
                                                Chat With Us
                                            </p>
                                            <p className="text-xs text-gray-600 sm:text-sm">7736121233</p>
                                        </div>
                                        <ExternalLink
                                            className="h-4 w-4 shrink-0 text-gray-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#25D366] sm:h-5 sm:w-5"
                                            strokeWidth={2}
                                            aria-hidden
                                        />
                                    </a>
                                    <a
                                        href="mailto:support@freshtick.in"
                                        className="group flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:bg-(--theme-primary-1)/5 sm:px-5 sm:py-3.5"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--theme-primary-1)/20 to-(--theme-primary-1)/10 text-(--theme-primary-1) shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:from-(--theme-primary-1)/30 group-hover:to-(--theme-primary-1)/20 sm:h-10 sm:w-10">
                                            <Mail className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 transition-colors duration-300 group-hover:text-(--theme-primary-1) sm:text-base">
                                                Email Us
                                            </p>
                                            <p className="text-xs text-gray-600 sm:text-sm">support@freshtick.in</p>
                                        </div>
                                        <ExternalLink
                                            className="h-4 w-4 shrink-0 text-gray-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-(--theme-primary-1) sm:h-5 sm:w-5"
                                            strokeWidth={2}
                                            aria-hidden
                                        />
                                    </a>
                                    <div className="flex items-start gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-(--theme-primary-1)/20 to-(--theme-primary-1)/10 text-(--theme-primary-1) shadow-sm sm:h-10 sm:w-10">
                                            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-gray-900 sm:text-base">Address</p>
                                            <p className="mt-0.5 text-xs leading-relaxed text-gray-600 sm:text-sm">
                                                Door No: VI / 404K, 2nd floor Karakattu Building, Nayarambalam PO, Nayarambalam, Puduvypin, Kochi,
                                                Kerala, India, 682509
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </SocietyHomeSections>
        </UserLayout>
    );
}
