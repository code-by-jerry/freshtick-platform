import { MapPin, MapPinned } from 'lucide-react';

export default function SocietyDeliveryMarqueeSection() {
    return (
        <section className="marquee-dark mt-0 overflow-hidden border-y border-gray-700/50 py-2 sm:py-2.5">
            <div className="flex items-center overflow-hidden">
                <div className="animate-marquee-slow flex flex-1 items-center whitespace-nowrap">
                    {[...Array(3)].map((_, copyIndex) => (
                        <div key={copyIndex} className="flex min-w-max items-center gap-1.5 px-4 sm:gap-2 sm:px-6">
                            <span className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-(--theme-secondary) uppercase sm:text-sm">
                                <MapPinned className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                                We deliver to
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-(--theme-secondary) uppercase sm:text-sm">
                                <MapPinned className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                                Ernakulam
                            </span>
                            {['Kaloor', 'Panampilly Nagar', 'High Court (Kochi)', 'Nayarambalam'].map((location) => (
                                <span
                                    key={`ern-${copyIndex}-${location}`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-white/70 sm:text-sm"
                                >
                                    <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />
                                    {location}
                                </span>
                            ))}
                            <span className="inline-flex items-center gap-1 text-xs font-bold tracking-wide text-(--theme-secondary) uppercase sm:text-sm">
                                <MapPinned className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                                Malappuram
                            </span>
                            {['Malipuram', 'Alathurpadi'].map((location) => (
                                <span
                                    key={`mal-${copyIndex}-${location}`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-white/70 sm:text-sm"
                                >
                                    <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} />
                                    {location}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
