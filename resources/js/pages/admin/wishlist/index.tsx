import { Head } from '@inertiajs/react';

interface TopProduct {
    id: number;
    name: string;
    slug: string;
    image: string;
    wishlisted_count: number;
    price: number;
}

interface TopUser {
    id: number;
    name: string;
    email: string;
    wishlisted_count: number;
}

interface Stats {
    total_wishlisted_items: number;
    unique_users: number;
    unique_products: number;
}

interface Props {
    topProducts: TopProduct[];
    topUsers: TopUser[];
    stats: Stats;
}

export default function WishlistInsights({ topProducts, topUsers, stats }: Props) {
    return (
        <>
            <Head title="Wishlist Insights" />
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">Wishlist Insights</h1>
                <div className="mb-6 grid grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-gray-500">Total Wishlisted Items</p>
                        <p className="text-2xl font-bold">{stats.total_wishlisted_items}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-gray-500">Unique Users</p>
                        <p className="text-2xl font-bold">{stats.unique_users}</p>
                    </div>
                    <div className="rounded-lg border p-4">
                        <p className="text-sm text-gray-500">Unique Products</p>
                        <p className="text-2xl font-bold">{stats.unique_products}</p>
                    </div>
                </div>
            </div>
        </>
    );
}
