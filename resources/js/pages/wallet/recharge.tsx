import { Head, router } from '@inertiajs/react';
import { ArrowLeft, CreditCard, Smartphone, Wallet as WalletIcon } from 'lucide-react';
import { useState } from 'react';

declare global {
    interface Window {
        Razorpay?: new (options: Record<string, unknown>) => {
            open: () => void;
        };
    }
}

interface Wallet {
    id: number;
    balance: string;
    currency: string;
}

interface Props {
    wallet: Wallet;
    suggestedAmounts: number[];
}

export default function WalletRecharge({ wallet, suggestedAmounts }: Props) {
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'gateway' | 'upi'>('gateway');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatCurrency = (amt: string | number) => {
        return `₹${Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };

    const handleAmountSelect = (amt: number) => {
        setAmount(amt.toString());
        setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount < 10) {
            setError('Minimum recharge amount is ₹10');
            return;
        }
        if (numericAmount > 50000) {
            setError('Maximum recharge amount is ₹50,000');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        void startRazorpayRecharge(numericAmount);
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

    const verifyRecharge = async (razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<void> => {
        const response = await fetch('/wallet/recharge/verify', {
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

        const payload = (await response.json()) as { success?: boolean; error?: string };

        if (!response.ok || !payload.success) {
            throw new Error(payload.error ?? 'Failed to verify payment.');
        }
    };

    const startRazorpayRecharge = async (numericAmount: number): Promise<void> => {
        try {
            const initiateResponse = await fetch('/wallet/recharge/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    amount: numericAmount,
                    payment_method: paymentMethod,
                }),
            });

            const initiatePayload = (await initiateResponse.json()) as {
                success?: boolean;
                error?: string;
                mock?: boolean;
                gateway_data?: Record<string, unknown>;
            };

            if (!initiateResponse.ok || !initiatePayload.success) {
                setError(initiatePayload.error ?? 'Failed to initiate payment');
                setIsSubmitting(false);

                return;
            }

            if (initiatePayload.mock) {
                setIsSubmitting(false);
                router.visit('/wallet');

                return;
            }

            const loaded = await loadRazorpayScript();

            if (!loaded || !window.Razorpay || !initiatePayload.gateway_data) {
                setError('Could not load payment gateway. Please try again.');
                setIsSubmitting(false);

                return;
            }

            const gatewayData = initiatePayload.gateway_data;
            const razorpay = new window.Razorpay({
                ...gatewayData,
                handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                    try {
                        await verifyRecharge(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
                        router.visit('/wallet');
                    } catch (verifyError) {
                        setError(verifyError instanceof Error ? verifyError.message : 'Payment verification failed');
                    } finally {
                        setIsSubmitting(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setIsSubmitting(false);
                    },
                },
            });

            razorpay.open();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to process recharge');
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <Head title="Add Money to Wallet" />

            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
                    <div className="mx-auto flex max-w-lg items-center gap-4 px-4 py-4">
                        <button onClick={() => window.history.back()} className="rounded-lg p-2 hover:bg-gray-100">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-lg font-semibold">Add Money</h1>
                    </div>
                </header>

                <div className="mx-auto max-w-lg px-4 py-6">
                    {/* Current Balance */}
                    <div className="mb-6 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white">
                        <p className="text-sm text-emerald-100">Current Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(wallet.balance)}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Amount Input */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Enter Amount</label>
                            <div className="relative">
                                <span className="absolute top-1/2 left-4 -translate-y-1/2 text-xl font-medium text-gray-500">₹</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value);
                                        setError(null);
                                    }}
                                    placeholder="0"
                                    min="10"
                                    max="50000"
                                    className="w-full rounded-xl border border-gray-300 py-4 pr-4 pl-10 text-2xl font-semibold focus:border-emerald-500 focus:ring-emerald-500"
                                />
                            </div>
                            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                        </div>

                        {/* Suggested Amounts */}
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-500">Quick Select</p>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                                {suggestedAmounts.map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => handleAmountSelect(amt)}
                                        className={`rounded-lg border py-2 text-sm font-medium transition ${
                                            amount === amt.toString()
                                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                                        }`}
                                    >
                                        ₹{amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <p className="mb-2 text-sm font-medium text-gray-700">Payment Method</p>
                            <div className="space-y-2">
                                <label
                                    className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                                        paymentMethod === 'gateway'
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="gateway"
                                        checked={paymentMethod === 'gateway'}
                                        onChange={() => setPaymentMethod('gateway')}
                                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <CreditCard className="h-6 w-6 text-gray-500" />
                                    <div>
                                        <p className="font-medium text-gray-900">Card / Net Banking</p>
                                        <p className="text-xs text-gray-500">Pay securely with your card or net banking</p>
                                    </div>
                                </label>

                                <label
                                    className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                                        paymentMethod === 'upi'
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-gray-300 bg-white hover:border-gray-400'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="upi"
                                        checked={paymentMethod === 'upi'}
                                        onChange={() => setPaymentMethod('upi')}
                                        className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <Smartphone className="h-6 w-6 text-gray-500" />
                                    <div>
                                        <p className="font-medium text-gray-900">UPI</p>
                                        <p className="text-xs text-gray-500">GPay, PhonePe, Paytm & more</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !amount}
                            className="w-full rounded-xl bg-emerald-600 py-4 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                `Add ₹${amount || '0'} to Wallet`
                            )}
                        </button>
                    </form>

                    {/* Info */}
                    <div className="mt-6 rounded-lg bg-gray-100 p-4">
                        <p className="text-xs text-gray-600">
                            <strong>Note:</strong> Minimum recharge is ₹10, maximum is ₹50,000. Wallet balance can be used for orders and
                            subscriptions.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
