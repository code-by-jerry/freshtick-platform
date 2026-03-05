import { Link, router, usePage } from '@inertiajs/react';
import {
    ClipboardList,
    Grid3X3,
    Heart,
    Home,
    LayoutDashboard,
    LogOut,
    MapPin,
    Menu,
    Package,
    Repeat,
    Search,
    Settings,
    ShoppingCart,
    TicketPercent,
    User,
    Wallet,
    X,
    ChevronRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import LocationModal from '@/components/user/LocationModal';
import { getVerticalFromQuery, type StrictVertical } from '@/lib/vertical';

const NAV_LINKS = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Products', href: '/products', icon: Package },
    { label: 'Subscriptions', href: '/subscription', icon: Repeat },
];

interface Location {
    address_line_1: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
}

interface UserData {
    id: number;
    name?: string;
    email?: string;
    avatar?: string;
}

interface HeaderProps {
    showTopBanner: boolean;
}

export default function Header({ showTopBanner }: HeaderProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [webMenuOpen, setWebMenuOpen] = useState(false);
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [desktopSearchQuery, setDesktopSearchQuery] = useState('');
    const [isMobileSearchPinned, setIsMobileSearchPinned] = useState(false);
    const { url } = usePage();

    const pageProps = usePage().props as unknown as {
        auth?: { user?: UserData; wishlisted_products?: number[] };
        cart?: { items_count?: number };
        zone?: { id: number; name: string; code: string } | null;
        location?: Location | null;
    };
    const auth = pageProps.auth;
    const authUser = auth?.user;
    const wishlistCount = auth?.wishlisted_products?.length || 0;
    const cartItemsCount = pageProps.cart?.items_count || 0;
    const zone = pageProps.zone;
    const location = pageProps.location;
    const addressWords = location?.address_line_1?.trim().split(/\s+/).filter(Boolean) ?? [];
    const compactAddress = addressWords.slice(0, 3).join(' ');
    const locationDisplay =
        compactAddress !== '' ? `${compactAddress}${addressWords.length > 3 ? '…' : ''}` : location?.city || zone?.name || 'Select location';
    const [currentPath, currentQuery = ''] = url.split('?');
    const urlVertical = getVerticalFromQuery(currentQuery);
    const [activeVertical, setActiveVertical] = useState<StrictVertical>(urlVertical);
    const mobileHeaderTitle = 'High Quality, Freshness';

    const actionIconButtonClass =
        'flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none';

    const webPanelLinks = [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Dashboard', href: authUser ? '/profile' : '/login', icon: LayoutDashboard },
        { label: 'Categories', href: '/catalog', icon: Grid3X3 },
        { label: 'Products', href: '/products', icon: Package },
        { label: 'Wallet', href: '/wallet', icon: Wallet },
        { label: 'Coupons', href: '/cart', icon: TicketPercent },
        { label: 'My Orders', href: '/orders', icon: ClipboardList },
        { label: 'My Subscription', href: '/subscriptions', icon: Repeat },
        { label: 'Wishlist', href: '/wishlist', icon: Heart },
    ];

    useEffect(() => {
        // Auto-open modal if zone is missing and we are not on the location page
        if (authUser && !zone && !window.location.pathname.startsWith('/location')) {
            setIsLocationModalOpen(true);
        }
    }, [authUser, zone]);

    useEffect(() => {
        if (!mobileMenuOpen && !webMenuOpen) {
            return;
        }

        const onEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMobileMenuOpen(false);
                setWebMenuOpen(false);
            }
        };

        document.addEventListener('keydown', onEscape);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onEscape);
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen, webMenuOpen]);

    useEffect(() => {
        setActiveVertical(urlVertical);
    }, [urlVertical]);

    useEffect(() => {
        const handleMobileScroll = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileSearchPinned(false);

                return;
            }

            setIsMobileSearchPinned((previousPinned) => {
                const pinThreshold = 32;
                const unpinThreshold = 10;

                return previousPinned ? window.scrollY > unpinThreshold : window.scrollY > pinThreshold;
            });
        };

        handleMobileScroll();
        window.addEventListener('scroll', handleMobileScroll, { passive: true });
        window.addEventListener('resize', handleMobileScroll);

        return () => {
            window.removeEventListener('scroll', handleMobileScroll);
            window.removeEventListener('resize', handleMobileScroll);
        };
    }, []);

    const handleLogout = () => {
        router.post('/logout');
    };

    const handleVerticalToggle = (vertical: StrictVertical) => {
        if (activeVertical === vertical) {
            return;
        }

        setActiveVertical(vertical);

        const nextParams = new URLSearchParams(currentQuery);
        nextParams.set('vertical', vertical);

        const nextQuery = nextParams.toString();
        const nextUrl = nextQuery ? `${currentPath}?${nextQuery}` : currentPath;

        router.visit(nextUrl, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const handleDesktopSearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const query = desktopSearchQuery.trim();

        if (query === '') {
            router.visit('/catalog/search');

            return;
        }

        router.visit(`/catalog/search?q=${encodeURIComponent(query)}`);
    };

    return (
        <>
            <header
                className={`right-0 left-0 z-1200 border-b border-gray-200 bg-white shadow-sm transition-all duration-300 ease-out lg:fixed ${
                    showTopBanner ? 'lg:top-8' : 'lg:top-0'
                }`}
            >
                <div className="bg-(--theme-primary-1-dark) px-3 py-2 text-white lg:hidden">
                    <div
                        className={`overflow-hidden transition-all duration-300 ease-out ${
                            isMobileSearchPinned ? 'max-h-0 -translate-y-1 opacity-0' : 'max-h-44 translate-y-0 opacity-100'
                        }`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => setIsLocationModalOpen(true)}
                                className="min-w-0 flex-1 text-left focus:outline-none"
                                aria-label="Select location"
                            >
                                <div className="truncate text-base leading-tight font-semibold">{mobileHeaderTitle}</div>
                                <div className="mt-0.5 flex items-center gap-1 text-xs text-white/90">
                                    <span className="truncate">{locationDisplay}</span>
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 rotate-90" strokeWidth={2} />
                                </div>
                            </button>

                            <div className="flex shrink-0 items-center gap-2">
                                <Link
                                    href="/wallet"
                                    className="inline-flex items-center gap-1.5 rounded-2xl border border-white/50 bg-white px-2.5 py-1 text-(--theme-primary-1-dark) shadow-sm"
                                    aria-label="Wallet"
                                >
                                    <Wallet className="h-4 w-4" strokeWidth={2.2} />
                                    <span className="text-sm font-semibold">₹0</span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => setMobileMenuOpen(true)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-transparent text-white focus:ring-2 focus:ring-white/80 focus:ring-offset-1 focus:ring-offset-(--theme-primary-1-dark) focus:outline-none"
                                    aria-label="Open menu"
                                >
                                    <User className="h-5 w-5" strokeWidth={2} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-3 rounded-2xl bg-[#4dbfa6]/30 p-1.5">
                            <div className="grid grid-cols-2 gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleVerticalToggle('daily_fresh')}
                                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus:outline-none ${
                                        activeVertical === 'daily_fresh' ? 'bg-[#4dbfa6] text-white' : 'bg-white text-[#4dbfa6] shadow-sm'
                                    }`}
                                >
                                    Daily Fresh
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleVerticalToggle('society_fresh')}
                                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus:outline-none ${
                                        activeVertical === 'society_fresh' ? 'bg-[#4dbfa6] text-white' : 'bg-white text-[#4dbfa6] shadow-sm'
                                    }`}
                                >
                                    Society Fresh
                                </button>
                            </div>
                        </div>
                    </div>

                    <form
                        onSubmit={handleDesktopSearch}
                        className={
                            isMobileSearchPinned
                                ? 'fixed top-0 right-0 left-0 z-1200 bg-(--theme-primary-1-dark) px-3 py-2 shadow-md transition-all duration-300 ease-out'
                                : 'mt-3 transition-all duration-300 ease-out'
                        }
                    >
                        <div className="relative">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-gray-700"
                                strokeWidth={2.2}
                            />
                            <input
                                type="search"
                                value={desktopSearchQuery}
                                onChange={(event) => setDesktopSearchQuery(event.target.value)}
                                placeholder='Search for "Milk"'
                                className="h-11 w-full rounded-2xl border border-white/60 bg-white py-2 pr-3 pl-11 text-base text-gray-800 outline-none placeholder:text-gray-700/80"
                            />
                        </div>
                    </form>

                    {isMobileSearchPinned && <div className="h-15" aria-hidden="true" />}
                </div>

                <div className="container mx-auto hidden max-w-7xl px-4 sm:px-5 lg:block lg:px-6">
                    <div className="items-center justify-between gap-2.5 py-2 sm:py-2.5 lg:flex lg:py-2.5">
                        <div className="flex min-w-0 items-center gap-3 lg:gap-4">
                            <Link
                                href="/"
                                className="flex shrink-0 items-center rounded-xl bg-white px-2.5 py-1.5 transition-all duration-200 focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none"
                                aria-label="Freshtick Home"
                            >
                                <img src="/logo_new.png" alt="Freshtick" className="h-5.5 w-auto sm:h-6 lg:h-7" loading="eager" />
                            </Link>

                            <button
                                type="button"
                                onClick={() => setIsLocationModalOpen(true)}
                                className="hidden items-center gap-1.5 border-b border-gray-300 px-0 py-1 text-[12px] font-medium text-gray-700 transition-colors hover:border-(--theme-primary-1) hover:text-(--theme-primary-1) focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none lg:inline-flex"
                            >
                                <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                <span className="max-w-40 truncate">{locationDisplay}</span>
                            </button>
                        </div>

                        {/* Actions: Pincode, Login, Wishlist, Cart */}
                        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3.5">
                            <form onSubmit={handleDesktopSearch} className="hidden items-center lg:flex">
                                <div className="relative">
                                    <Search
                                        className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
                                        strokeWidth={2}
                                    />
                                    <input
                                        type="search"
                                        value={desktopSearchQuery}
                                        onChange={(event) => setDesktopSearchQuery(event.target.value)}
                                        placeholder="Search products"
                                        className="h-8 w-52 rounded-full border border-gray-200 bg-white py-1 pr-3 pl-8 text-xs text-gray-700 transition-colors outline-none placeholder:text-gray-400 hover:border-gray-300 focus:border-(--theme-primary-1)"
                                    />
                                </div>
                            </form>

                            <div className="hidden items-center rounded-full border border-gray-200 bg-gray-50 p-0.5 lg:flex">
                                <button
                                    type="button"
                                    onClick={() => handleVerticalToggle('daily_fresh')}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none ${
                                        activeVertical === 'daily_fresh'
                                            ? 'bg-(--theme-primary-1) text-white'
                                            : 'text-gray-600 hover:text-(--theme-primary-1)'
                                    }`}
                                >
                                    Daily
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleVerticalToggle('society_fresh')}
                                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus:outline-none ${
                                        activeVertical === 'society_fresh'
                                            ? 'bg-(--theme-primary-1) text-white'
                                            : 'text-gray-600 hover:text-(--theme-primary-1)'
                                    }`}
                                >
                                    Society
                                </button>
                            </div>

                            <Link href="/wishlist" className={`${actionIconButtonClass} relative`} aria-label="Wishlist">
                                <Heart className="h-3.5 w-3.5" strokeWidth={2} />
                                {wishlistCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] leading-none font-semibold text-white ring-2 ring-white">
                                        {wishlistCount}
                                    </span>
                                )}
                            </Link>

                            <Link href="/cart" className={`${actionIconButtonClass} relative`} aria-label="Cart">
                                <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2} />
                                {cartItemsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-(--theme-primary-1) px-0.5 text-[9px] leading-none font-semibold text-white ring-2 ring-white">
                                        {cartItemsCount}
                                    </span>
                                )}
                            </Link>

                            <button
                                type="button"
                                onClick={() => setWebMenuOpen(true)}
                                className={`${actionIconButtonClass} hidden lg:flex`}
                                aria-label="More options"
                            >
                                <Menu className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} initialLocation={location} />

            <div className={`fixed inset-0 z-1300 hidden lg:block ${webMenuOpen ? 'visible' : 'invisible'}`}>
                <button
                    type="button"
                    onClick={() => setWebMenuOpen(false)}
                    className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${webMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                    aria-label="Close options panel"
                />
                <aside
                    className={`absolute top-0 left-0 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-all duration-300 ease-out ${
                        webMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-95'
                    }`}
                >
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <div>
                            <p className="text-sm font-semibold text-gray-900">More Options</p>
                            <p className="text-xs text-gray-500">Quick links for your account</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setWebMenuOpen(false)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-all duration-300 hover:bg-gray-100 hover:text-(--theme-primary-1) focus:ring-2 focus:ring-(--theme-primary-1) focus:outline-none"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" strokeWidth={2} />
                        </button>
                    </div>

                    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
                        {webPanelLinks.map((item) => {
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setWebMenuOpen(false)}
                                    className="group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-(--theme-primary-1)"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <Icon className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-(--theme-primary-1)" strokeWidth={2} />
                                        {item.label}
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
                                </Link>
                            );
                        })}

                        <div className="my-2 border-t border-gray-100" />

                        <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-lg border border-gray-200/80 bg-gray-50/60 px-4 py-3 text-left text-sm font-medium text-gray-700"
                            onClick={() => {
                                setWebMenuOpen(false);
                                setIsLocationModalOpen(true);
                            }}
                        >
                            <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
                            <span className="truncate">{locationDisplay}</span>
                        </button>

                        <div className="my-2 border-t border-gray-100" />

                        {authUser ? (
                            <>
                                <Link
                                    href="/profile"
                                    onClick={() => setWebMenuOpen(false)}
                                    className="group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-(--theme-primary-1)"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <User className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-(--theme-primary-1)" strokeWidth={2} />
                                        Profile
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
                                </Link>
                                <Link
                                    href="/profile"
                                    onClick={() => setWebMenuOpen(false)}
                                    className="group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-(--theme-primary-1)"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <Settings className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-(--theme-primary-1)" strokeWidth={2} />
                                        Settings
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setWebMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="group flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
                                        Logout
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-rose-300" strokeWidth={2} />
                                </button>
                            </>
                        ) : (
                            <Link
                                href="/login"
                                onClick={() => setWebMenuOpen(false)}
                                className="group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-(--theme-primary-1)"
                            >
                                <span className="flex items-center gap-2.5">
                                    <User className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-(--theme-primary-1)" strokeWidth={2} />
                                    Login
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
                            </Link>
                        )}
                    </nav>
                </aside>
            </div>

            {/* Mobile drawer */}
            <div className={`fixed inset-0 z-1300 lg:hidden ${mobileMenuOpen ? 'visible' : 'invisible'}`}>
                <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
                        mobileMenuOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                    aria-label="Close overlay"
                />
                <div
                    className={`absolute top-0 right-0 flex h-full w-full max-w-xs flex-col bg-white shadow-2xl transition-all duration-300 ease-out ${
                        mobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-95'
                    }`}
                >
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <img src="/logo_new.png" alt="FreshTick" className="h-8 w-auto" />
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-all duration-300 hover:bg-gray-100 hover:text-(--theme-primary-1) focus:ring-2 focus:ring-(--theme-primary-1) focus:outline-none"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" strokeWidth={2} />
                        </button>
                    </div>
                    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-4">
                        {NAV_LINKS.map((item, i) => {
                            const Icon = item.icon;
                            const isAnchor = item.href.startsWith('#');
                            const className =
                                'nav-drawer-item group flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-gray-700 opacity-0 transition-colors hover:bg-gray-50 hover:text-(--theme-primary-1)';
                            const style = mobileMenuOpen ? { animationDelay: `${i * 50}ms` } : undefined;
                            const content = (
                                <>
                                    <span className="flex items-center gap-2.5">
                                        <Icon className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-(--theme-primary-1)" strokeWidth={2} />
                                        {item.label}
                                    </span>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} />
                                </>
                            );
                            if (isAnchor) {
                                return (
                                    <a key={item.label} href={item.href} className={className} style={style} onClick={() => setMobileMenuOpen(false)}>
                                        {content}
                                    </a>
                                );
                            }
                            return (
                                <Link key={item.label} href={item.href} className={className} style={style} onClick={() => setMobileMenuOpen(false)}>
                                    {content}
                                </Link>
                            );
                        })}
                        <div className="my-3 border-t border-gray-100" />
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-lg border border-gray-200/80 bg-gray-50/60 px-4 py-3 text-left text-sm font-medium text-gray-600"
                            onClick={() => {
                                setMobileMenuOpen(false);
                                setIsLocationModalOpen(true);
                            }}
                        >
                            <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
                            <span>{zone?.name ?? 'Select location'}</span>
                        </button>

                        {authUser && (
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    handleLogout();
                                }}
                                className="nav-drawer-item group mt-1 flex w-full items-center gap-2.5 rounded-lg px-4 py-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                            >
                                <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
                                Sign out
                            </button>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                            <Link
                                href={authUser ? '/profile' : '/login'}
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-(--theme-primary-1)"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <User className="h-4 w-4" strokeWidth={2} />
                                {authUser ? 'Account' : 'Login'}
                            </Link>
                            <Link
                                href="/wishlist"
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-(--theme-primary-1)"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <div className="relative">
                                    <Heart className="h-4 w-4" strokeWidth={2} />
                                    {wishlistCount > 0 && (
                                        <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                                            {wishlistCount}
                                        </span>
                                    )}
                                </div>
                                Wishlist
                            </Link>
                            <Link
                                href="/cart"
                                className="flex flex-1 items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-(--theme-primary-1)"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <div className="relative">
                                    <ShoppingCart className="h-4 w-4" strokeWidth={2} />
                                    {cartItemsCount > 0 && (
                                        <span className="absolute -top-1 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-(--theme-primary-1) px-1 text-[9px] font-semibold text-white">
                                            {cartItemsCount}
                                        </span>
                                    )}
                                </div>
                                Cart
                            </Link>
                        </div>
                    </nav>
                </div>
            </div>
        </>
    );
}
