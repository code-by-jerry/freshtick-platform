import { Link } from '@inertiajs/react';

export default function DailyHomeSections() {
    return (
        <section className="bg-white py-16 lg:py-20">
            <div className="container mx-auto max-w-5xl px-4 sm:px-6">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-10 text-center sm:px-8">
                    <p className="text-xs font-semibold tracking-wide text-(--theme-primary-1) uppercase">Daily Fresh</p>
                    <h2 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">Daily Fresh experience is coming soon</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600 sm:text-base">
                        We are preparing a dedicated Daily Fresh home experience. You can continue shopping from our current Society Fresh setup.
                    </p>
                    <div className="mt-6">
                        <Link
                            href="/?vertical=society_fresh"
                            className="inline-flex items-center rounded-full bg-(--theme-primary-1) px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--theme-primary-1-dark)"
                        >
                            Continue with Society Fresh
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
