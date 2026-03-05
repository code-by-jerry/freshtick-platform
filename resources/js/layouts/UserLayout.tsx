import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Footer from '@/components/user/Footer';
import Header from '@/components/user/Header';
import TopBanner from '@/components/user/TopBanner';
import type { SharedData } from '@/types';

interface UserLayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
    showTopBanner?: boolean;
}

export default function UserLayout({ children, showHeader = true, showTopBanner = true }: UserLayoutProps) {
    const { theme } = (usePage().props as unknown as SharedData) ?? {};
    const [isTopBannerVisible, setIsTopBannerVisible] = useState(true);
    const [navigating, setNavigating] = useState(false);

    useEffect(() => {
        if (theme) {
            document.documentElement.style.setProperty('--theme-primary-1', theme.primary_1);
            document.documentElement.style.setProperty('--theme-primary-2', theme.primary_2);
            document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
            document.documentElement.style.setProperty('--theme-tertiary', theme.tertiary);
            document.documentElement.style.setProperty('--theme-primary-1-dark', '#3a9a85');
        }
    }, [theme]);

    useEffect(() => {
        if (!showTopBanner) {
            setIsTopBannerVisible(false);

            return;
        }

        const handleScroll = () => {
            const scrollY = window.scrollY;
            setIsTopBannerVisible(scrollY <= 0);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [showTopBanner]);

    useEffect(() => {
        const startHandler = router.on('start', () => setNavigating(true));
        const finishHandler = router.on('finish', () => setNavigating(false));
        return () => {
            startHandler();
            finishHandler();
        };
    }, []);

    return (
        <div className={`min-h-screen bg-white${navigating ? 'cursor-wait' : ''}`}>
            {showTopBanner && (
                <div className="hidden lg:block">
                    <TopBanner visible={isTopBannerVisible} />
                </div>
            )}
            {showHeader && <Header showTopBanner={showTopBanner && isTopBannerVisible} />}
            <main>{children}</main>
            <Footer />
        </div>
    );
}
