import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, MapPin, Calendar, Clock, CreditCard, Truck, FileText, Shield, CheckCircle2, AlertCircle, Loader2, Wallet } from 'lucide-react';
import { useState } from 'react';
import UserLayout from '@/layouts/UserLayout';

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => {
            open: () => void;
        };
    }
}

interface Product {
    id: number;
    name: string;
    image: string | null;
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

interface DeliveryDate {
    date: string;
    label: string;
    is_tomorrow: boolean;
}

interface CheckoutIndexProps {
    cart: {
        id: number;
        coupon_code: string | null;
    };
    items: CartItem[];
    summary: CartSummary;
    addresses: Address[];
    defaultAddressId: number | null;
    deliveryCharge: number;
    deliveryDates: DeliveryDate[];
    walletBalance: number;
}

const DELIVERY_SLOTS = [
    { id: '06:00', label: 'Morning', time: '6 AM - 9 AM' },
    { id: '16:00', label: 'Evening', time: '4 PM - 7 PM' },
] as const;

type DeliverySlotId = (typeof DELIVERY_SLOTS)[number]['id'];

export default function CheckoutIndex({
    cart,
    items,
    summary,
    addresses,
    defaultAddressId,
    deliveryCharge,
    deliveryDates,
    walletBalance,
}: CheckoutIndexProps) {
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isOnlineProcessing, setIsOnlineProcessing] = useState(false);

    const { data, setData, post, processing, errors } = useForm<{
        user_address_id: number | null;
        scheduled_delivery_date: string;
        scheduled_delivery_time: DeliverySlotId;
        payment_method: string;
        delivery_instructions: string;
    }>({
        user_address_id: defaultAddressId || addresses[0]?.id || null,
        scheduled_delivery_date: deliveryDates[0]?.date || '',
        scheduled_delivery_time: DELIVERY_SLOTS[0].id,
        payment_method: walletBalance >= summary.total ? 'wallet' : 'cod',
        delivery_instructions: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (data.payment_method === 'upi' || data.payment_method === 'gateway') {
            setIsOnlineProcessing(true);
            void startOnlineCheckout();

            return;
        }

        post('/checkout', {
            onError: () => {
                setCheckoutError('Failed to place order. Please review details and try again.');
            },
        });
    };

    const getCsrfToken = (): string => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

        return token ?? '';
    };

    const loadRazorpayScript = async (): Promise<boolean> => {
        if (window.Razorpay) {
            return true;
        }

        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const verifyOrderPayment = async (
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string,
    ): Promise<{ redirect_url: string }> => {
        const response = await fetch('/checkout/verify-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': getCsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: razorpaySignature,
            }),
        });

        const payload = (await response.json()) as {
            success?: boolean;
            error?: string;
            redirect_url?: string;
        };

        if (!response.ok || !payload.success || !payload.redirect_url) {
            throw new Error(payload.error ?? 'Unable to verify payment.');
        }

        return { redirect_url: payload.redirect_url };
    };

    const startOnlineCheckout = async (): Promise<void> => {
        setCheckoutError(null);

        const payload = {
            user_address_id: data.user_address_id,
            scheduled_delivery_date: data.scheduled_delivery_date,
            scheduled_delivery_time: data.scheduled_delivery_time,
            payment_method: data.payment_method,
            delivery_instructions: data.delivery_instructions,
        };

        try {
            const initiateResponse = await fetch('/checkout/initiate-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(payload),
            });

            const initiatePayload = (await initiateResponse.json()) as {
                success?: boolean;
                error?: string;
                message?: string;
                errors?: Record<string, string[]>;
                gateway_data?: Record<string, unknown>;
            };

            if (!initiateResponse.ok || !initiatePayload.success || !initiatePayload.gateway_data) {
                const firstValidationError = initiatePayload.errors
                    ? Object.values(initiatePayload.errors)
                          .flat()
                          .find((value) => value && value.length > 0)
                    : undefined;

                setCheckoutError(firstValidationError ?? initiatePayload.error ?? initiatePayload.message ?? 'Failed to start online payment.');
                setIsOnlineProcessing(false);

                return;
            }

            const loaded = await loadRazorpayScript();

            if (!loaded || !window.Razorpay) {
                setCheckoutError('Unable to load Razorpay checkout. Please try again.');
                setIsOnlineProcessing(false);

                return;
            }

            const razorpay = new window.Razorpay({
                ...initiatePayload.gateway_data,
                handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                    try {
                        const verification = await verifyOrderPayment(
                            response.razorpay_order_id,
                            response.razorpay_payment_id,
                            response.razorpay_signature,
                        );

                        window.location.href = verification.redirect_url;
                    } catch (verifyError) {
                        setCheckoutError(verifyError instanceof Error ? verifyError.message : 'Payment verification failed.');
                        setIsOnlineProcessing(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setCheckoutError('Payment was cancelled. You can retry anytime from checkout.');
                        setIsOnlineProcessing(false);
                    },
                },
            });

            razorpay.open();
        } catch (error) {
            setCheckoutError(error instanceof Error ? error.message : 'Unable to process payment right now.');
            setIsOnlineProcessing(false);
        }
    };

    const selectedAddress = addresses.find((a) => a.id === data.user_address_id);
    const subtotal = summary.subtotal;
    const discount = summary.discount;
    const total = summary.total;
    const canPayWithWallet = walletBalance >= total;

    const PAYMENT_METHODS = [
        {
            id: 'wallet',
            label: 'Pay with Wallet',
            description: canPayWithWallet ? `Balance: ₹${walletBalance.toFixed(2)}` : `Insufficient balance (₹${walletBalance.toFixed(2)})`,
            icon: Wallet,
            disabled: !canPayWithWallet,
        },
        { id: 'cod', label: 'Cash on Delivery', description: 'Pay when your order arrives', icon: Truck, disabled: false },
        { id: 'upi', label: 'UPI / Online', description: 'Google Pay, PhonePe, Cards', icon: CreditCard, disabled: false },
    ] as const;

    return (
        <UserLayout>
            <Head title="Checkout" />
            <div className="min-h-screen bg-gray-50/50 pt-20 pb-24 sm:pt-24 sm:pb-8">
                <div className="container mx-auto max-w-7xl px-4 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
                    {/* Back + title */}
                    <nav className="mb-6 flex items-center gap-3 sm:mb-8" aria-label="Breadcrumb">
                        <Link
                            href="/cart"
                            className="flex items-center gap-1.5 rounded-lg text-sm font-medium text-gray-600 transition-colors hover:text-[var(--theme-primary-1)] focus:ring-2 focus:ring-[var(--theme-primary-1)] focus:ring-offset-2 focus:outline-none"
                        >
                            <ChevronLeft className="h-5 w-5 shrink-0" strokeWidth={2} />
                            <span className="hidden sm:inline">Back to Cart</span>
                        </Link>
                        <span className="text-sm text-gray-400" aria-hidden>
                            |
                        </span>
                        <h1 className="text-lg font-bold text-gray-900 sm:text-xl">Checkout</h1>
                    </nav>

                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-6 lg:grid-cols-10 lg:gap-8">
                            {/* Left: Delivery details */}
                            <div className="space-y-4 lg:col-span-6">
                                {/* Delivery Address */}
                                <section
                                    className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6"
                                    aria-labelledby="address-heading"
                                >
                                    <h2 id="address-heading" className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                                        <MapPin className="h-5 w-5 text-[var(--theme-primary-1)]" strokeWidth={2} />
                                        Delivery Address
                                    </h2>
                                    {addresses.length === 0 ? (
                                        <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center">
                                            <MapPin className="mx-auto h-8 w-8 text-gray-400" />
                                            <p className="mt-2 text-sm text-gray-600">No addresses found</p>
                                            <Link
                                                href="/profile/addresses"
                                                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--theme-primary-1)] hover:underline"
                                            >
                                                Add an address
                                            </Link>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {addresses.map((addr) => {
                                                const isSelected = data.user_address_id === addr.id;
                                                return (
                                                    <label
                                                        key={addr.id}
                                                        className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition-colors ${
                                                            isSelected
                                                                ? 'border-[var(--theme-primary-1)] bg-[var(--theme-primary-1)]/5'
                                                                : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="user_address_id"
                                                            value={addr.id}
                                                            checked={isSelected}
                                                            onChange={() => setData('user_address_id', addr.id)}
                                                            className="mt-1 h-4 w-4 border-gray-300 text-[var(--theme-primary-1)] focus:ring-[var(--theme-primary-1)]"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-semibold text-gray-900">{addr.label}</span>
                                                                {addr.is_default && (
                                                                    <span className="rounded bg-[var(--theme-primary-1)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--theme-primary-1)]">
                                                                        Default
                                                                    </span>
                                                                )}
                                                                {addr.zone && (
                                                                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                                                                        Serviceable
                                                                    </span>
                                                                )}
                                                                {!addr.zone && (
                                                                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                                                                        Not serviceable
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
                                    )}
                                    {errors.user_address_id && (
                                        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600" role="alert">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                                            {errors.user_address_id}
                                        </p>
                                    )}
                                </section>

                                {/* Delivery Schedule */}
                                <section
                                    className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6"
                                    aria-labelledby="schedule-heading"
                                >
                                    <h2 id="schedule-heading" className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                                        <Calendar className="h-5 w-5 text-[var(--theme-primary-1)]" strokeWidth={2} />
                                        Delivery Schedule
                                    </h2>

                                    {/* Delivery Date */}
                                    <div className="mb-4">
                                        <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">Select date</p>
                                        <div className="flex flex-wrap gap-2">
                                            {deliveryDates.map((d) => (
                                                <button
                                                    key={d.date}
                                                    type="button"
                                                    onClick={() => setData('scheduled_delivery_date', d.date)}
                                                    className={`flex min-w-[100px] flex-col items-center rounded-xl border-2 px-4 py-3 transition-colors ${
                                                        data.scheduled_delivery_date === d.date
                                                            ? 'border-[var(--theme-primary-1)] bg-[var(--theme-primary-1)]/10 text-[var(--theme-primary-1)]'
                                                            : 'border-gray-200 bg-gray-50/80 text-gray-700 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <span className="text-sm font-semibold">{d.label}</span>
                                                    {d.is_tomorrow && <span className="mt-0.5 text-[10px] text-gray-500">Tomorrow</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Time slots */}
                                    <div>
                                        <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">Time slot</p>
                                        <div className="flex flex-wrap gap-2 sm:gap-3">
                                            {DELIVERY_SLOTS.map((slot) => (
                                                <button
                                                    key={slot.id}
                                                    type="button"
                                                    onClick={() => setData('scheduled_delivery_time', slot.id)}
                                                    className={`flex min-w-[120px] flex-1 items-center gap-2 rounded-xl border-2 px-4 py-3 text-left transition-colors sm:min-w-0 ${
                                                        data.scheduled_delivery_time === slot.id
                                                            ? 'border-[var(--theme-primary-1)] bg-[var(--theme-primary-1)]/10 text-[var(--theme-primary-1)]'
                                                            : 'border-gray-200 bg-gray-50/80 text-gray-700 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <Clock className="h-4 w-4 shrink-0" strokeWidth={2} />
                                                    <div>
                                                        <span className="block text-sm font-semibold">{slot.label}</span>
                                                        <span className="block text-[10px] text-gray-500 sm:text-xs">{slot.time}</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </section>

                                {/* Payment Method */}
                                <section
                                    className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6"
                                    aria-labelledby="payment-heading"
                                >
                                    <h2 id="payment-heading" className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                                        <CreditCard className="h-5 w-5 text-[var(--theme-primary-1)]" strokeWidth={2} />
                                        Payment Method
                                    </h2>
                                    <div className="space-y-2">
                                        {PAYMENT_METHODS.map((method) => {
                                            const Icon = method.icon;
                                            const isSelected = data.payment_method === method.id;
                                            const isDisabled = method.disabled;
                                            return (
                                                <label
                                                    key={method.id}
                                                    className={`flex gap-3 rounded-xl border-2 p-4 transition-colors ${
                                                        isDisabled
                                                            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
                                                            : isSelected
                                                              ? 'cursor-pointer border-[var(--theme-primary-1)] bg-[var(--theme-primary-1)]/5'
                                                              : 'cursor-pointer border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="payment_method"
                                                        value={method.id}
                                                        checked={isSelected}
                                                        onChange={() => !isDisabled && setData('payment_method', method.id)}
                                                        disabled={isDisabled}
                                                        className="mt-1 h-4 w-4 border-gray-300 text-[var(--theme-primary-1)] focus:ring-[var(--theme-primary-1)] disabled:opacity-50"
                                                    />
                                                    <Icon
                                                        className={`h-5 w-5 ${method.id === 'wallet' && canPayWithWallet ? 'text-emerald-500' : 'text-gray-500'}`}
                                                        strokeWidth={2}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <span className={`font-semibold ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>
                                                            {method.label}
                                                        </span>
                                                        <p
                                                            className={`mt-0.5 text-xs ${method.id === 'wallet' && !canPayWithWallet ? 'text-red-500' : 'text-gray-500'}`}
                                                        >
                                                            {method.description}
                                                        </p>
                                                        {method.id === 'wallet' && !canPayWithWallet && (
                                                            <Link
                                                                href="/wallet/recharge"
                                                                className="mt-1 inline-block text-xs font-medium text-[var(--theme-primary-1)] hover:underline"
                                                            >
                                                                Add money →
                                                            </Link>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* Delivery Instructions */}
                                <section
                                    className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6"
                                    aria-labelledby="instructions-heading"
                                >
                                    <h2
                                        id="instructions-heading"
                                        className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg"
                                    >
                                        <FileText className="h-5 w-5 text-[var(--theme-primary-1)]" strokeWidth={2} />
                                        Delivery Instructions (Optional)
                                    </h2>
                                    <textarea
                                        placeholder="E.g., Leave at the gate, ring the doorbell, etc."
                                        value={data.delivery_instructions}
                                        onChange={(e) => setData('delivery_instructions', e.target.value)}
                                        rows={3}
                                        className="w-full rounded-xl border-2 border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium text-gray-900 transition-colors placeholder:text-gray-400 focus:border-[var(--theme-primary-1)] focus:bg-white focus:ring-2 focus:ring-[var(--theme-primary-1)]/20 focus:outline-none"
                                    />
                                </section>
                            </div>

                            {/* Right: Order Summary */}
                            <div className="lg:col-span-4">
                                <div className="sticky top-24 space-y-4">
                                    {/* Order Items Summary */}
                                    <section
                                        className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm sm:p-6"
                                        aria-labelledby="summary-heading"
                                    >
                                        <h2 id="summary-heading" className="mb-4 text-base font-bold text-gray-900 sm:text-lg">
                                            Order Summary ({summary.unique_items} items)
                                        </h2>
                                        <ul className="max-h-[300px] space-y-3 overflow-y-auto">
                                            {items.map((item) => (
                                                <li key={item.id} className="flex gap-3">
                                                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                        <img
                                                            src={item.product.image || '/images/placeholder-product.png'}
                                                            alt={item.product.name}
                                                            className="h-full w-full object-contain p-1"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-1 text-sm font-medium text-gray-900">{item.product.name}</p>
                                                        {item.variant && <p className="text-[11px] text-gray-500">{item.variant.name}</p>}
                                                        <p className="text-xs text-gray-500">
                                                            ₹{parseFloat(item.price).toFixed(2)} × {item.quantity}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-900">₹{parseFloat(item.subtotal).toFixed(2)}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>

                                    {/* Bill details */}
                                    <section
                                        className="rounded-2xl border border-gray-200/80 bg-[var(--theme-primary-1)]/5 p-4 shadow-sm sm:p-6"
                                        aria-labelledby="bill-heading"
                                    >
                                        <h2 id="bill-heading" className="mb-4 text-base font-bold text-gray-900 sm:text-lg">
                                            Bill details
                                        </h2>
                                        <dl className="space-y-2 text-sm">
                                            <div className="flex justify-between text-gray-700">
                                                <dt>Item total</dt>
                                                <dd className="font-semibold">₹{subtotal.toFixed(2)}</dd>
                                            </div>
                                            <div className="flex justify-between text-gray-700">
                                                <dt className="flex items-center gap-1">
                                                    <Truck className="h-4 w-4" />
                                                    Delivery
                                                </dt>
                                                <dd
                                                    className={deliveryCharge === 0 ? 'font-semibold text-[var(--theme-primary-1)]' : 'font-semibold'}
                                                >
                                                    {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge.toFixed(2)}`}
                                                </dd>
                                            </div>
                                            {discount > 0 && (
                                                <div className="flex justify-between text-green-600">
                                                    <dt>Discount</dt>
                                                    <dd className="font-semibold">–₹{discount.toFixed(2)}</dd>
                                                </div>
                                            )}
                                            <div className="flex justify-between border-t border-gray-200 pt-3 text-base font-bold text-gray-900">
                                                <dt>Total</dt>
                                                <dd>₹{total.toFixed(2)}</dd>
                                            </div>
                                        </dl>

                                        {/* Security badge */}
                                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 text-xs text-gray-600">
                                            <Shield className="h-4 w-4 text-green-600" />
                                            <span>Secure checkout</span>
                                        </div>

                                        {/* Global errors */}
                                        {(errors as unknown as Record<string, string>).checkout && (
                                            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                                <p className="flex items-center gap-1.5">
                                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                                    {(errors as unknown as Record<string, string>).checkout}
                                                </p>
                                            </div>
                                        )}

                                        {checkoutError && (
                                            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                                <p className="flex items-center gap-1.5">
                                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                                    {checkoutError}
                                                </p>
                                            </div>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={processing || isOnlineProcessing || !selectedAddress?.zone}
                                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary-1)] py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-1-dark)] focus:ring-2 focus:ring-[var(--theme-primary-1)] focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {processing || isOnlineProcessing ? (
                                                <>
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle2 className="h-5 w-5" />
                                                    Place Order – ₹{total.toFixed(2)}
                                                </>
                                            )}
                                        </button>

                                        {!selectedAddress?.zone && (
                                            <p className="mt-2 text-center text-xs text-red-600">Selected address is not serviceable</p>
                                        )}
                                    </section>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Sticky CTA on mobile */}
                    <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-gray-200 bg-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
                        <div className="container mx-auto flex max-w-7xl items-center justify-between gap-4">
                            <div>
                                <p className="text-xs text-gray-500">Total</p>
                                <p className="text-xl font-bold text-gray-900">₹{total.toFixed(2)}</p>
                            </div>
                            <button
                                type="submit"
                                form="checkout-form"
                                onClick={handleSubmit}
                                disabled={processing || isOnlineProcessing || !selectedAddress?.zone}
                                className="flex max-w-[200px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary-1)] py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-1-dark)] focus:ring-2 focus:ring-[var(--theme-primary-1)] focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing || isOnlineProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Place Order'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </UserLayout>
    );
}
