import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, MapPin, Plus, Minus, Trash2, Tag, Truck, FileText, CheckCircle2, AlertCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { useState } from 'react';
import UserLayout from '@/layouts/UserLayout';
import { handleImageFallbackError, toSafeImageUrl } from '@/lib/imageFallback';
import { product as productRoute } from '@/routes/catalog';
import type { SharedData } from '@/types';

interface Product {
    id: number;
    name: string;
    slug: string;
    image: string | null;
    sku: string;
}

interface CartItem {
    id: number;
    product_id: number;
    product: Product;
    variant: {
        id: number;
        name: string;
        price: string;
    } | null;
    quantity: number;
    price: string;
    subtotal: string;
    is_subscription: boolean;
    subscription_plan_id: number | null;
}

interface CartSummary {
    items_count: number;
    unique_items: number;
    subtotal: number;
    discount: number;
    delivery_charge: number;
    total: number;
    has_subscription_items: boolean;
    verticals: string[];
}

interface Address {
    id: number;
    label: string;
    address_line_1: string;
    address_line_2: string | null;
    city: string;
    state: string;
    pincode: string;
    is_default: boolean;
    zone: {
        id: number;
        name: string;
    } | null;
}

interface CartIndexProps {
    cart: {
        id: number;
        coupon_code: string | null;
    };
    items: CartItem[];
    summary: CartSummary;
    addresses: Address[];
    available_coupons?: Array<{
        code: string;
        name: string;
        discount_label: string;
        min_order_amount: string | null;
    }>;
}

export default function CartIndex({ cart, items, summary, addresses, available_coupons = [] }: CartIndexProps) {
    const { auth } = usePage<SharedData>().props;
    const isAuthenticated = Boolean(auth?.user);

    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null);
    const [couponCode, setCouponCode] = useState(cart.coupon_code || '');
    const [couponError, setCouponError] = useState<string | null>(null);
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    const isApplyingCoupon = Boolean(loading.couponAction);
    const hasAppliedCoupon = Boolean(cart.coupon_code);

    const updateQuantity = (itemId: number, delta: number, currentQuantity: number) => {
        const newQuantity = currentQuantity + delta;
        setLoading((prev) => ({ ...prev, [`item-${itemId}`]: true }));

        if (newQuantity <= 0) {
            router.delete(`/cart/items/${itemId}`, {
                preserveScroll: true,
                onFinish: () => setLoading((prev) => ({ ...prev, [`item-${itemId}`]: false })),
            });
        } else {
            router.put(
                `/cart/items/${itemId}`,
                { quantity: newQuantity },
                {
                    preserveScroll: true,
                    onFinish: () => setLoading((prev) => ({ ...prev, [`item-${itemId}`]: false })),
                },
            );
        }
    };

    const removeItem = (itemId: number) => {
        setLoading((prev) => ({ ...prev, [`item-${itemId}`]: true }));
        router.delete(`/cart/items/${itemId}`, {
            preserveScroll: true,
            onFinish: () => setLoading((prev) => ({ ...prev, [`item-${itemId}`]: false })),
        });
    };

    const applyCoupon = (selectedCode?: string) => {
        if (!isAuthenticated) {
            setCouponError('Please login to apply coupon codes.');

            return;
        }

        const code = (selectedCode ?? couponCode).trim().toUpperCase();
        if (!code) {
            setCouponError('Enter a coupon code');

            return;
        }

        setLoading((prev) => ({ ...prev, couponAction: true }));
        router.post(
            '/coupons/apply',
            { code },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCouponCode(code);
                    setCouponError(null);
                },
                onError: (errors) => {
                    const errorMessage =
                        (typeof errors.code === 'string' && errors.code) ||
                        (typeof errors.error === 'string' && errors.error) ||
                        'Invalid or expired coupon';

                    setCouponError(errorMessage);
                },
                onFinish: () => setLoading((prev) => ({ ...prev, couponAction: false })),
            },
        );
    };

    const removeCoupon = () => {
        setLoading((prev) => ({ ...prev, couponAction: true }));
        router.delete('/coupons/remove', {
            preserveScroll: true,
            onSuccess: () => {
                setCouponCode('');
                setCouponError(null);
            },
            onFinish: () => setLoading((prev) => ({ ...prev, couponAction: false })),
        });
    };

    const proceedToCheckout = () => {
        router.get('/checkout');
    };

    const isEmpty = items.length === 0;
    const subtotal = summary.subtotal;
    const discount = summary.discount;
    const deliveryFee = summary.delivery_charge;
    const toPay = summary.total;

    return (
        <UserLayout>
            <Head title="Your Cart" />
            <div className="min-h-screen bg-gray-50/50 pt-20 pb-24 sm:pt-24 sm:pb-8">
                <div className="container mx-auto max-w-7xl px-4 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
                    {/* Back + title */}
                    <nav className="mb-6 flex items-center gap-3 sm:mb-8" aria-label="Breadcrumb">
                        <Link
                            href="/products"
                            className="flex items-center gap-1.5 rounded-lg text-sm font-medium text-gray-600 transition-colors hover:text-(--theme-primary-1) focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none"
                        >
                            <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
                            <span className="hidden sm:inline">Continue Shopping</span>
                        </Link>
                        <span className="text-sm text-gray-400" aria-hidden>
                            |
                        </span>
                        <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Your Cart</h1>
                        {!isEmpty && (
                            <span className="rounded-full bg-(--theme-primary-1) px-2 py-0.5 text-xs font-semibold text-white">
                                {summary.items_count}
                            </span>
                        )}
                    </nav>

                    {isEmpty ? (
                        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-(--theme-primary-1)/10 text-(--theme-primary-1)">
                                <ShoppingBag className="h-8 w-8" strokeWidth={1.5} />
                            </div>
                            <h2 className="mt-4 text-xl font-bold text-gray-900">Your cart is empty</h2>
                            <p className="mt-2 text-sm text-gray-600">Add products from our catalog to get started.</p>
                            <Link
                                href="/products"
                                className="mt-6 inline-flex items-center justify-center rounded-xl bg-(--theme-primary-1) px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--theme-primary-1-dark) focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none"
                            >
                                Shop Products
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-10 lg:gap-8">
                            {/* Left: Cart Items + Address Selection */}
                            <div className="space-y-4 lg:col-span-6">
                                {/* Cart Items */}
                                <section
                                    className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6"
                                    aria-labelledby="cart-heading"
                                >
                                    <h2 id="cart-heading" className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                                        <FileText className="h-5 w-5 text-(--theme-primary-1)" strokeWidth={2} />
                                        Order Items ({summary.unique_items})
                                    </h2>
                                    <ul className="space-y-4">
                                        {items.map((item) => {
                                            const isLoading = loading[`item-${item.id}`];
                                            return (
                                                <li key={item.id} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 sm:p-4">
                                                    <Link
                                                        href={productRoute(item.product.slug)}
                                                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-(--theme-secondary)/20 sm:h-20 sm:w-20"
                                                    >
                                                        <img
                                                            src={toSafeImageUrl(item.product.image)}
                                                            alt={item.product.name}
                                                            className="h-full w-full object-contain p-1"
                                                            loading="lazy"
                                                            onError={handleImageFallbackError}
                                                        />
                                                    </Link>
                                                    <div className="min-w-0 flex-1">
                                                        <Link
                                                            href={productRoute(item.product.slug)}
                                                            className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-(--theme-primary-1) sm:text-base"
                                                        >
                                                            {item.product.name}
                                                        </Link>
                                                        {item.variant && (
                                                            <p className="mt-0.5 text-[11px] font-medium text-gray-600 sm:text-xs">
                                                                Option: {item.variant.name}
                                                            </p>
                                                        )}
                                                        {item.is_subscription && (
                                                            <span className="mt-1 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                                                                Subscription
                                                            </span>
                                                        )}
                                                        <p className="mt-0.5 text-xs font-semibold text-(--theme-primary-1) sm:text-sm">
                                                            ₹{parseFloat(item.price).toFixed(2)}/unit
                                                        </p>
                                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                                            <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateQuantity(item.id, -1, item.quantity)}
                                                                    disabled={isLoading}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-l-lg text-gray-600 transition-colors hover:bg-gray-100 focus:ring-2 focus:ring-(--theme-primary-1) focus:outline-none focus:ring-inset disabled:opacity-50"
                                                                    aria-label="Decrease quantity"
                                                                >
                                                                    {isLoading ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Minus className="h-4 w-4" strokeWidth={2} />
                                                                    )}
                                                                </button>
                                                                <span
                                                                    className="flex h-8 min-w-8 items-center justify-center text-sm font-semibold text-gray-900"
                                                                    aria-live="polite"
                                                                >
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateQuantity(item.id, 1, item.quantity)}
                                                                    disabled={isLoading}
                                                                    className="flex h-8 w-8 items-center justify-center rounded-r-lg text-gray-600 transition-colors hover:bg-gray-100 focus:ring-2 focus:ring-(--theme-primary-1) focus:outline-none focus:ring-inset disabled:opacity-50"
                                                                    aria-label="Increase quantity"
                                                                >
                                                                    {isLoading ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Plus className="h-4 w-4" strokeWidth={2} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(item.id)}
                                                                disabled={isLoading}
                                                                className="flex items-center gap-1 rounded text-xs font-medium text-red-600 hover:underline focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
                                                                aria-label={`Remove ${item.product.name} from cart`}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                                                                Remove
                                                            </button>
                                                        </div>
                                                        <p className="mt-2 text-xs font-medium text-gray-700">
                                                            Subtotal: <span className="text-gray-900">₹{parseFloat(item.subtotal).toFixed(2)}</span>
                                                        </p>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                                        <Link
                                            href="/products"
                                            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-(--theme-primary-1) bg-white px-4 py-2 text-sm font-semibold text-(--theme-primary-1) transition-colors hover:bg-(--theme-primary-1)/10 focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none"
                                        >
                                            <Plus className="h-4 w-4" strokeWidth={2} />
                                            Add more items
                                        </Link>
                                    </div>
                                </section>

                                {/* Delivery Address */}
                                {addresses.length > 0 && (
                                    <section
                                        className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6"
                                        aria-labelledby="address-heading"
                                    >
                                        <h2
                                            id="address-heading"
                                            className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg"
                                        >
                                            <MapPin className="h-5 w-5 text-(--theme-primary-1)" strokeWidth={2} />
                                            Delivery Address
                                        </h2>
                                        <div className="space-y-2">
                                            {addresses.map((addr) => {
                                                const isSelected = selectedAddressId === addr.id;
                                                return (
                                                    <label
                                                        key={addr.id}
                                                        className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition-colors ${
                                                            isSelected
                                                                ? 'border-(--theme-primary-1) bg-(--theme-primary-1)/5'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="address"
                                                            value={addr.id}
                                                            checked={isSelected}
                                                            onChange={() => setSelectedAddressId(addr.id)}
                                                            className="mt-1 h-4 w-4 border-gray-300 text-(--theme-primary-1) focus:ring-(--theme-primary-1)"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-semibold text-gray-900">{addr.label}</span>
                                                                {addr.is_default && (
                                                                    <span className="rounded bg-(--theme-primary-1)/20 px-1.5 py-0.5 text-[10px] font-semibold text-(--theme-primary-1)">
                                                                        Default
                                                                    </span>
                                                                )}
                                                                {addr.zone && (
                                                                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                                                                        {addr.zone.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="mt-1 text-sm text-gray-600">
                                                                {addr.address_line_1}
                                                                {addr.address_line_2 && `, ${addr.address_line_2}`}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {addr.city}, {addr.state} – {addr.pincode}
                                                            </p>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                        <Link
                                            href="/profile/addresses"
                                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-(--theme-primary-1)/50 bg-(--theme-primary-1)/5 py-3 text-sm font-semibold text-(--theme-primary-1) transition-colors hover:bg-(--theme-primary-1)/10 focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none"
                                        >
                                            <Plus className="h-4 w-4" strokeWidth={2} />
                                            Manage addresses
                                        </Link>
                                    </section>
                                )}
                            </div>

                            {/* Right: Bill Summary */}
                            <div className="lg:col-span-4">
                                <div className="sticky top-24 space-y-4">
                                    {/* Offers */}
                                    <section
                                        className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6"
                                        aria-labelledby="offers-heading"
                                    >
                                        <h2 id="offers-heading" className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                                            <Tag className="h-5 w-5 text-(--theme-primary-1)" strokeWidth={2} />
                                            Offers & benefits
                                        </h2>
                                        {!isAuthenticated ? (
                                            <div className="rounded-xl bg-blue-50 px-4 py-3 text-blue-800">
                                                <p className="text-sm font-medium">Login to apply and save with coupon codes.</p>
                                                <Link href="/login" className="mt-1 inline-block text-xs font-semibold underline hover:no-underline">
                                                    Go to login
                                                </Link>
                                            </div>
                                        ) : hasAppliedCoupon ? (
                                            <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-3 text-green-800">
                                                <span className="flex items-center gap-2 text-sm font-semibold">
                                                    <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                                                    {cart.coupon_code} applied {summary.discount > 0 ? `(–₹${summary.discount.toFixed(2)})` : ''}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={removeCoupon}
                                                    disabled={isApplyingCoupon}
                                                    className="text-xs font-medium text-green-700 underline hover:no-underline disabled:opacity-60"
                                                >
                                                    {isApplyingCoupon ? 'Removing…' : 'Remove'}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter code"
                                                        value={couponCode}
                                                        onChange={(e) => {
                                                            setCouponCode(e.target.value);
                                                            setCouponError(null);
                                                        }}
                                                        onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                                                        className="min-w-0 flex-1 rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium uppercase placeholder:text-gray-400 placeholder:normal-case focus:border-(--theme-primary-1) focus:bg-white focus:ring-2 focus:ring-(--theme-primary-1)/20 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => applyCoupon()}
                                                        disabled={isApplyingCoupon}
                                                        className="shrink-0 rounded-xl bg-(--theme-primary-1) px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-(--theme-primary-1-dark) focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none disabled:opacity-60"
                                                    >
                                                        {isApplyingCoupon ? 'Applying…' : 'Apply'}
                                                    </button>
                                                </div>

                                                {available_coupons.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                                                            Available coupons
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            {available_coupons.slice(0, 3).map((coupon) => (
                                                                <button
                                                                    key={coupon.code}
                                                                    type="button"
                                                                    disabled={isApplyingCoupon}
                                                                    onClick={() => applyCoupon(coupon.code)}
                                                                    className="flex w-full items-start justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-white disabled:opacity-60"
                                                                >
                                                                    <span className="min-w-0">
                                                                        <span className="block text-xs font-bold text-gray-900">{coupon.code}</span>
                                                                        <span className="block truncate text-xs text-gray-600">{coupon.name}</span>
                                                                    </span>
                                                                    <span className="shrink-0 text-xs font-semibold text-(--theme-primary-1)">
                                                                        {coupon.discount_label}
                                                                    </span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {couponError && (
                                            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                                {couponError}
                                            </p>
                                        )}
                                    </section>

                                    {/* Bill details */}
                                    <section
                                        className="rounded-2xl border border-gray-200/80 bg-(--theme-primary-1)/5 p-4 shadow-sm sm:p-6"
                                        aria-labelledby="bill-heading"
                                    >
                                        <h2 id="bill-heading" className="mb-4 text-base font-bold text-gray-900 sm:text-lg">
                                            Bill details (includes taxes)
                                        </h2>
                                        <dl className="space-y-2 text-sm">
                                            <div className="flex justify-between text-gray-700">
                                                <dt>Item total ({summary.items_count} items)</dt>
                                                <dd className="font-semibold">₹{subtotal.toFixed(2)}</dd>
                                            </div>
                                            <div className="flex justify-between text-gray-700">
                                                <dt className="flex items-center gap-1">
                                                    <Truck className="h-4 w-4" />
                                                    Delivery
                                                </dt>
                                                <dd className={deliveryFee === 0 ? 'font-semibold text-(--theme-primary-1)' : 'font-semibold'}>
                                                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                                                </dd>
                                            </div>
                                            {discount > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <dt>Discount</dt>
                                                    <dd className="font-semibold">–₹{discount.toFixed(2)}</dd>
                                                </div>
                                            )}
                                            <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
                                                <dt>To pay</dt>
                                                <dd>₹{toPay.toFixed(2)}</dd>
                                            </div>
                                        </dl>
                                        <button
                                            onClick={proceedToCheckout}
                                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-(--theme-primary-1) py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-(--theme-primary-1-dark) focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none"
                                        >
                                            Proceed to Checkout
                                        </button>
                                    </section>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sticky CTA on mobile when cart has items */}
                    {!isEmpty && (
                        <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-gray-200 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
                            <div className="container mx-auto flex max-w-7xl items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs text-gray-500">To pay</p>
                                    <p className="text-xl font-bold text-gray-900">₹{toPay.toFixed(2)}</p>
                                </div>
                                <button
                                    onClick={proceedToCheckout}
                                    className="flex max-w-50 flex-1 items-center justify-center rounded-xl bg-(--theme-primary-1) py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-(--theme-primary-1-dark) focus:ring-2 focus:ring-(--theme-primary-1) focus:ring-offset-2 focus:outline-none"
                                >
                                    Checkout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </UserLayout>
    );
}
