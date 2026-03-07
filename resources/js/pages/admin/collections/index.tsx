import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Pencil, Eye, Trash2, Power } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';

interface CategoryRef {
    id: number;
    name: string;
    slug: string;
}

interface CollectionData {
    id: number;
    name: string;
    slug: string;
    vertical: string;
    is_active: boolean;
    products_count: number;
    product_selection_mode: string;
    configured_category_names?: string[];
    category?: CategoryRef | null;
}

interface AdminCollectionsIndexProps {
    collections: CollectionData[];
    verticalOptions: Record<string, string>;
    productSelectionOptions: Record<string, string>;
    filters: { vertical: string };
}

export default function AdminCollectionsIndex({ collections, verticalOptions, productSelectionOptions, filters }: AdminCollectionsIndexProps) {
    const { flash } = (usePage().props as { flash?: { message?: string } }) ?? {};

    const applyFilter = (vertical: string) => {
        const params = new URLSearchParams();
        if (vertical) params.set('vertical', vertical);
        router.get('/admin/collections' + (params.toString() ? '?' + params.toString() : ''));
    };

    return (
        <AdminLayout title="Collections">
            <Head title="Collections - Admin" />
            <div className="space-y-4">
                {flash?.message && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{flash.message}</div>}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">Collections</h2>
                        <select
                            value={filters.vertical}
                            onChange={(e) => applyFilter(e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                        >
                            {Object.entries(verticalOptions).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Link
                        href="/admin/collections/create"
                        className="inline-flex items-center gap-2 rounded-lg bg-(--admin-dark-primary) px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                    >
                        <Plus className="h-4 w-4" />
                        Add collection
                    </Link>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categories</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product mode</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vertical</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Products</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {collections.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                                        No collections yet. Create one to get started.
                                    </td>
                                </tr>
                            ) : (
                                collections.map((col) => (
                                    <tr key={col.id}>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <Link
                                                href={'/admin/collections/' + col.id}
                                                className="font-medium text-(--admin-dark-primary) hover:underline"
                                            >
                                                {col.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {col.configured_category_names && col.configured_category_names.length > 0
                                                ? col.configured_category_names.join(', ')
                                                : (col.category?.name ?? 'All')}
                                        </td>
                                        <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                                            {productSelectionOptions[col.product_selection_mode] ?? col.product_selection_mode}
                                        </td>
                                        <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">
                                            {verticalOptions[col.vertical] ?? col.vertical}
                                        </td>
                                        <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-600">{col.products_count}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={col.is_active ? 'text-green-600' : 'text-gray-400'}>
                                                {col.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-1">
                                                <Link
                                                    href={'/admin/collections/' + col.id}
                                                    className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                                <Link
                                                    href={'/admin/collections/' + col.id + '/edit'}
                                                    className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                                <Link
                                                    href={'/admin/collections/' + col.id + '/toggle-status'}
                                                    method="post"
                                                    as="button"
                                                    className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                                    title={col.is_active ? 'Disable' : 'Enable'}
                                                >
                                                    <Power className="h-4 w-4" />
                                                </Link>
                                                <Link
                                                    href={'/admin/collections/' + col.id}
                                                    method="delete"
                                                    as="button"
                                                    className="rounded p-2 text-red-500 hover:bg-red-50"
                                                    title="Delete"
                                                    preserveScroll
                                                    onBefore={() => (confirm('Delete this collection?') ? undefined : false)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
