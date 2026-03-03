export default function SocietySubscriptionStepsSection() {
    return (
        <section
            className="relative overflow-hidden bg-linear-to-b from-gray-50 to-gray-100 py-10 sm:py-12 lg:py-14"
            aria-labelledby="subscription-steps-heading"
        >
            <div className="section-icon-bg pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
                <img
                    src="/images/icons/milk-bottle.png"
                    alt=""
                    className="absolute top-[12%] left-[2%] h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14"
                    style={{ opacity: 0.05, transform: 'rotate(-18deg)' }}
                />
                <img
                    src="/images/icons/farm.png"
                    alt=""
                    className="absolute top-[10%] right-[4%] h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12"
                    style={{ opacity: 0.04, transform: 'rotate(14deg)' }}
                />
                <img
                    src="/images/icons/animal.png"
                    alt=""
                    className="absolute bottom-[18%] left-[1%] h-8 w-8 sm:h-10 sm:w-10"
                    style={{ opacity: 0.04, transform: 'rotate(10deg)' }}
                />
                <img
                    src="/images/icons/milk-bottle%20(1).png"
                    alt=""
                    className="absolute right-[7%] bottom-[12%] h-10 w-10 sm:h-12 sm:w-12"
                    style={{ opacity: 0.05, transform: 'rotate(-12deg)' }}
                />
                <img
                    src="/images/icons/discount.png"
                    alt=""
                    className="absolute top-1/2 left-[18%] h-6 w-6 -translate-y-1/2 sm:h-8 sm:w-8"
                    style={{ opacity: 0.03, transform: 'rotate(18deg)' }}
                />
                <img
                    src="/images/icons/milk%20(1).png"
                    alt=""
                    className="absolute top-1/2 right-[20%] h-6 w-6 -translate-y-1/2 sm:h-8 sm:w-8"
                    style={{ opacity: 0.04, transform: 'rotate(-10deg)' }}
                />
            </div>
            <style>{`
                @keyframes blob-bounce {
                    0% { transform: translate(-100%, -100%) translate3d(0, 0, 0); }
                    25% { transform: translate(-100%, -100%) translate3d(100%, 0, 0); }
                    50% { transform: translate(-100%, -100%) translate3d(100%, 100%, 0); }
                    75% { transform: translate(-100%, -100%) translate3d(0, 100%, 0); }
                    100% { transform: translate(-100%, -100%) translate3d(0, 0, 0); }
                }
                .subscription-card {
                    position: relative;
                    border-radius: 12px;
                    z-index: 1111;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .subscription-card:hover {
                    transform: translateY(-6px);
                    box-shadow: 0 16px 20px -4px rgba(0, 0, 0, 0.1), 0 8px 8px -4px rgba(0, 0, 0, 0.04);
                }
                .subscription-card-bg {
                    position: absolute;
                    top: 4px;
                    left: 4px;
                    right: 4px;
                    bottom: 4px;
                    z-index: 2;
                    background: rgba(255, 255, 255, .95);
                    backdrop-filter: blur(20px);
                    border-radius: 8px;
                    overflow: hidden;
                    outline: 2px solid white;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .subscription-card:hover .subscription-card-bg {
                    box-shadow: 0 0 0 2px rgba(58, 154, 133, 0.25);
                }
                .subscription-card-blob {
                    position: absolute;
                    z-index: 1;
                    top: 50%;
                    left: 50%;
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    opacity: 1;
                    filter: blur(10px);
                    animation: blob-bounce 5s infinite ease;
                    transition: opacity 0.4s ease;
                }
                .subscription-card:hover .subscription-card-blob {
                    opacity: 0.8;
                }
                @media (max-width: 640px) {
                    .subscription-card-blob {
                        width: 80px;
                        height: 80px;
                    }
                }
            `}</style>
            <div className="relative z-10 container mx-auto px-3 sm:px-4 lg:px-6">
                <div className="mb-6 flex flex-row items-center justify-center gap-3 sm:mb-5 sm:gap-4">
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
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </div>
                    <div className="text-left">
                        <h2 id="subscription-steps-heading" className="text-lg font-bold text-(--theme-primary-1-dark) sm:text-xl">
                            How Subscription Works
                        </h2>
                        <p className="text-xs text-gray-400 sm:text-sm">Simple steps to get fresh dairy</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-4">
                    {[
                        {
                            step: '1',
                            title: 'Choose Products',
                            description: 'Milk, curd, paneer, ghee',
                            image: '/images/dairy-products.png',
                            imageAlt: 'Dairy products',
                            blobColor: 'var(--theme-primary-1)',
                        },
                        {
                            step: '2',
                            title: 'Set Quantity & Schedule',
                            description: 'Daily / Alternate days',
                            image: '/images/calendar.png',
                            imageAlt: 'Calendar schedule',
                            blobColor: 'var(--theme-secondary)',
                        },
                        {
                            step: '3',
                            title: 'We Deliver Every Morning',
                            description: 'Fresh before 7 AM',
                            image: '/images/motorbike.png',
                            imageAlt: 'Delivery',
                            blobColor: 'var(--theme-primary-1)',
                        },
                        {
                            step: '4',
                            title: 'Pause / Modify Anytime',
                            description: 'Full control, no lock-in',
                            image: '/images/pause.png',
                            imageAlt: 'Pause or modify',
                            blobColor: 'var(--theme-secondary)',
                        },
                    ].map((item, index) => (
                        <article
                            key={`step-${index}`}
                            className="subscription-card group relative h-full min-h-50 w-full overflow-hidden sm:min-h-60 lg:min-h-70"
                        >
                            <div className="subscription-card-blob" style={{ backgroundColor: item.blobColor }} />
                            <div className="absolute top-3 left-3 z-30 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs font-bold text-(--theme-primary-1) shadow-sm sm:top-4 sm:left-4 sm:h-7 sm:w-7 sm:text-sm">
                                {item.step}
                            </div>
                            <div className="subscription-card-bg flex flex-col items-center justify-center p-4 sm:p-5">
                                <div className="mb-4 flex shrink-0 flex-col items-center">
                                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-(--theme-primary-1)/10 to-(--theme-primary-1)/5 p-2.5 shadow-inner transition-all duration-400 group-hover:scale-110 group-hover:shadow-(--theme-primary-1)/10 group-hover:shadow-lg sm:h-24 sm:w-24 sm:p-3 lg:h-28 lg:w-28">
                                        <div className="absolute inset-0 rounded-2xl ring-1 ring-black/5 ring-inset group-hover:ring-(--theme-primary-1)/20" />
                                        <img
                                            src={item.image}
                                            alt={item.imageAlt}
                                            className="h-full w-full object-contain transition-transform duration-400 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                                <h3 className="mb-2 text-center text-sm leading-tight font-bold text-gray-800 transition-colors duration-300 group-hover:text-(--theme-primary-1) sm:text-base">
                                    {item.title}
                                </h3>
                                <p className="text-center text-[11px] leading-relaxed font-medium text-gray-500 transition-colors duration-300 group-hover:text-gray-700 sm:text-xs">
                                    {item.description}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
