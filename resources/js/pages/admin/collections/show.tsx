import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Pencil, Package } from 'lucide-react';
import AdminLayout from '@/layouts/AdminLayout';
import { handleImageFallbackError, toSafeImageUrl } from '@/lib/imageFallback';

interface CategoryRef {
    id: number;
    name: string;
    slug: string;
}

interface ProductSummary {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
}

interface CollectionData {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    vertical: string;
    is_active: boolean;
    products_count: number;
    product_selection_label?: string;
    category_selection_label?: string;
    banner_image: string;
    category?: CategoryRef | null;
    configured_categories?: CategoryRef[];
    products?: ProductSummary[];
}

interface AdminCollectionsShowProps {
    collection: CollectionData;
}

export default function AdminCollectionsShow({ collection }: AdminCollectionsShowProps) {
    return (
        <AdminLayout title={collection.name}>
            <Head title={collection.name + ' - Admin'} />
            <div className="space-y-4">
                <Link href="/admin/collections" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-(--admin-dark-primary)">
                    <ArrowLeft className="h-4 w-4" />
                    Back to collections
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">{collection.name}</h2>
                    <Link
                        href={'/admin/collections/' + collection.id + '/edit'}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Pencil className="h-4 w-4" />
                        Edit
                    </Link>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Slug</dt>
                            <dd className="mt-0.5 text-sm text-gray-900">{collection.slug}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Category</dt>
                            <dd className="mt-0.5 text-sm text-gray-900">
                                {collection.configured_categories && collection.configured_categories.length > 0
                                    ? collection.configured_categories.map((item) => item.name).join(', ')
                                    : (collection.category?.name ?? 'All')}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Category mode</dt>
                            <dd className="mt-0.5 text-sm text-gray-900">{collection.category_selection_label ?? 'All categories'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Product mode</dt>
                            <dd className="mt-0.5 text-sm text-gray-900">{collection.product_selection_label ?? 'Category wise'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Vertical</dt>
                            <dd className="mt-0.5 text-sm text-gray-900">{collection.vertical}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-0.5 text-sm text-gray-900">{collection.is_active ? 'Active' : 'Inactive'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">Products count</dt>
                            <dd className="mt-0.5 text-sm text-gray-900">{collection.products_count}</dd>
                        </div>
                        {collection.description && (
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Description</dt>
                                <dd className="mt-0.5 text-sm text-gray-900">{collection.description}</dd>
                            </div>
                        )}
                    </dl>
                    {collection.banner_image && (
                        <div className="mt-4">
                            <dt className="text-sm font-medium text-gray-500">Banner</dt>
                            <dd className="mt-1">
                                <img
                                    src={toSafeImageUrl(collection.banner_image)}
                                    alt=""
                                    className="max-h-32 rounded-lg object-cover"
                                    onError={handleImageFallbackError}
                                />
                            </dd>
                        </div>
                    )}
                </div>
                {collection.products && collection.products.length > 0 && (
                    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 px-4 py-3">
                            <h3 className="text-sm font-medium text-gray-900">Recent products</h3>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {collection.products.map((p) => (
                                <li key={p.id} className="flex items-center justify-between px-4 py-3">
                                    <Link
                                        href={'/admin/products/' + p.id}
                                        className="flex items-center gap-2 font-medium text-(--admin-dark-primary) hover:underline"
                                    >
                                        <Package className="h-4 w-4 text-gray-400" />
                                        {p.name}
                                    </Link>
                                    <span className={p.is_active ? 'text-green-600' : 'text-gray-400'}>{p.is_active ? 'Active' : 'Inactive'}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
