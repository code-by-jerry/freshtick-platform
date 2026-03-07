import { Head, Link, router } from '@inertiajs/react';
import { Edit, Eye, Plus, Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { handleImageFallbackError, toSafeImageUrl } from '@/lib/imageFallback';

interface Banner {
    id: number;
    name: string;
    type: string;
    vertical: string;
    image: string;
    is_active: boolean;
    display_order: number;
    starts_at: string | null;
    ends_at: string | null;
}

interface PaginatedBanners {
    data: Banner[];
    current_page: number;
    last_page: number;
}

interface Props {
    banners: PaginatedBanners;
    filters: { search?: string; type?: string; status?: string; vertical?: string };
    typeOptions: Record<string, string>;
    verticalOptions: Record<string, string>;
}

export default function BannersIndex({ banners, filters, typeOptions, verticalOptions }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/banners', { ...filters, search }, { preserveState: true });
    };

    const handleToggle = (id: number) => {
        router.post(`/admin/banners/${id}/toggle-status`);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this banner?')) {
            router.delete(`/admin/banners/${id}`);
        }
    };

    return (
        <AdminLayout>
            <Head title="Banners" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900">Banners</h1>
                    <Link
                        href="/admin/banners/create"
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" />
                        Create Banner
                    </Link>
                </div>

                {/* Search */}
                <div className="rounded-xl bg-white p-4 shadow-sm">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search banners..."
                                className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10"
                            />
                        </div>
                        <select
                            value={filters.type || ''}
                            onChange={(e) => router.get('/admin/banners', { ...filters, type: e.target.value || undefined }, { preserveState: true })}
                            className="rounded-lg border border-gray-300 px-4 py-2"
                        >
                            <option value="">All Types</option>
                            {Object.entries(typeOptions).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filters.vertical || ''}
                            onChange={(e) =>
                                router.get('/admin/banners', { ...filters, vertical: e.target.value || undefined }, { preserveState: true })
                            }
                            className="rounded-lg border border-gray-300 px-4 py-2"
                        >
                            {Object.entries(verticalOptions).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
                            Search
                        </button>
                    </form>
                </div>

                {/* Banners Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {banners.data.map((banner) => (
                        <div key={banner.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
                            <div className="aspect-video w-full overflow-hidden bg-gray-100">
                                <img
                                    src={toSafeImageUrl(banner.image)}
                                    alt={banner.name}
                                    className="h-full w-full object-cover"
                                    onError={handleImageFallbackError}
                                />
                            </div>
                            <div className="p-4">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{banner.name}</h3>
                                        <p className="text-sm text-gray-500 capitalize">{typeOptions[banner.type] || banner.type}</p>
                                        <p className="text-xs text-gray-400 capitalize">{verticalOptions[banner.vertical] || banner.vertical}</p>
                                    </div>
                                    <button onClick={() => handleToggle(banner.id)} className={banner.is_active ? 'text-green-600' : 'text-gray-400'}>
                                        {banner.is_active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                                    </button>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">Order: {banner.display_order}</span>
                                    <div className="flex items-center gap-2">
                                        <Link href={`/admin/banners/${banner.id}`} className="text-gray-600 hover:text-gray-900">
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                        <Link href={`/admin/banners/${banner.id}/edit`} className="text-indigo-600 hover:text-indigo-700">
                                            <Edit className="h-4 w-4" />
                                        </Link>
                                        <button onClick={() => handleDelete(banner.id)} className="text-red-600 hover:text-red-700">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {banners.data.length === 0 && <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">No banners found</div>}
            </div>
        </AdminLayout>
    );
}
