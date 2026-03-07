import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Banner {
    id: number;
    title: string;
    description: string;
    image: string;
    mobile_image?: string | null;
    link?: string | null;
    link_type?: string;
}

interface HeroBannerProps {
    banners: Banner[];
    autoPlay?: boolean;
    interval?: number;
    variant?: 'hero' | 'promo';
}

export default function HeroBanner({ banners, autoPlay = true, interval = 4000, variant = 'hero' }: HeroBannerProps) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const displayBanners: Banner[] =
        banners.length > 0
            ? banners
            : [
                  {
                      id: 0,
                      title: 'Welcome',
                      description: '',
                      image: '/images/3 Milk Packs at Just @ 117 130.png',
                      mobile_image: null,
                      link: null,
                      link_type: null,
                  },
              ];

    // Auto-play functionality with pause on hover
    useEffect(() => {
        if (!autoPlay || banners.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % displayBanners.length);
        }, interval);

        return () => clearInterval(timer);
    }, [autoPlay, interval, isPaused, displayBanners.length, banners.length]);

    const goToSlide = (index: number) => setCurrentSlide(index);
    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % displayBanners.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + displayBanners.length) % displayBanners.length);
    const sectionPaddingClass = variant === 'hero' ? 'pt-0 sm:pt-0 lg:pt-23' : 'pt-0';

    return (
        <section className={`relative w-full ${sectionPaddingClass}`}>
            {/* Mobile: Simple auto-height banner without thumbnails */}
            <div className="h-auto w-full px-1 lg:hidden">
                <div
                    className="relative h-full w-full overflow-hidden"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    {displayBanners.map((banner, index) => (
                        <div
                            key={banner.id}
                            className={`transition-opacity duration-500 ease-in-out ${
                                index === currentSlide ? 'block opacity-100' : 'hidden opacity-0'
                            }`}
                        >
                            {banner.link ? (
                                <Link href={banner.link} className="block w-full">
                                    <img
                                        src={banner.mobile_image || banner.image}
                                        alt={banner.title || 'Banner'}
                                        className="h-auto w-full rounded-xl object-cover"
                                        loading={index === 0 ? 'eager' : 'lazy'}
                                    />
                                </Link>
                            ) : (
                                <img
                                    src={banner.mobile_image || banner.image}
                                    alt={banner.title || 'Banner'}
                                    className="h-auto w-full rounded-xl object-cover"
                                    loading={index === 0 ? 'eager' : 'lazy'}
                                />
                            )}
                        </div>
                    ))}

                    {/* Mobile Dot Indicators */}
                    {displayBanners.length > 1 && (
                        <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
                            {displayBanners.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToSlide(index)}
                                    className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none ${
                                        index === currentSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                                    }`}
                                    aria-label={`Go to banner ${index + 1}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop: Full width with auto height and thumbnails on image */}
            <div className="hidden w-full px-1 lg:block">
                <div className="relative w-full overflow-hidden" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
                    {displayBanners.map((banner, index) => (
                        <div
                            key={banner.id}
                            className={`transition-opacity duration-500 ease-in-out ${
                                index === currentSlide ? 'block opacity-100' : 'hidden opacity-0'
                            }`}
                        >
                            {banner.link ? (
                                <Link href={banner.link} className="block w-full">
                                    <img
                                        src={banner.image}
                                        alt={banner.title || 'Banner'}
                                        className="h-auto w-full rounded-xl object-contain"
                                        loading={index === 0 ? 'eager' : 'lazy'}
                                    />
                                </Link>
                            ) : (
                                <img
                                    src={banner.image}
                                    alt={banner.title || 'Banner'}
                                    className="h-auto w-full rounded-xl object-contain"
                                    loading={index === 0 ? 'eager' : 'lazy'}
                                />
                            )}
                        </div>
                    ))}

                    {/* Navigation Arrows */}
                    {displayBanners.length > 1 && (
                        <>
                            <button
                                onClick={prevSlide}
                                className="absolute top-1/2 left-4 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition-all duration-200 hover:scale-105 hover:bg-white focus:outline-none"
                                aria-label="Previous banner"
                            >
                                <ChevronLeft className="h-5 w-5 text-gray-700" />
                            </button>
                            <button
                                onClick={nextSlide}
                                className="absolute top-1/2 right-4 z-20 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-md transition-all duration-200 hover:scale-105 hover:bg-white focus:outline-none"
                                aria-label="Next banner"
                            >
                                <ChevronRight className="h-5 w-5 text-gray-700" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
