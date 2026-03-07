import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { uploadImageToAdmin } from '@/lib/adminUpload';
import { FALLBACK_IMAGE_URL, handleImageFallbackError } from '@/lib/imageFallback';
import type { SharedData } from '@/types';

interface CategoryOption {
    id: number;
    name: string;
    slug: string;
}

interface ProductOption {
    id: number;
    name: string;
    slug: string;
    category_id: number | null;
}

interface AdminCollectionsCreateProps {
    verticalOptions: Record<string, string>;
    categories: CategoryOption[];
    products: ProductOption[];
    productSelectionOptions: Record<string, string>;
    categorySelectionOptions: Record<string, string>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-3">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="space-y-5 p-5">{children}</div>
        </div>
    );
}

export default function AdminCollectionsCreate({
    verticalOptions,
    categories,
    products,
    productSelectionOptions,
    categorySelectionOptions,
}: AdminCollectionsCreateProps) {
    const { csrf_token: csrfToken } = (usePage().props as unknown as SharedData) ?? {};
    const fallbackImage = FALLBACK_IMAGE_URL;
    const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
    const [bannerImagePreview, setBannerImagePreview] = useState<string | null>(null);
    const [bannerMobileImageFile, setBannerMobileImageFile] = useState<File | null>(null);
    const [bannerMobileImagePreview, setBannerMobileImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const bannerMobileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        name: '',
        slug: '',
        description: '',
        category_id: null as number | null,
        product_selection_mode: 'category',
        category_selection_mode: 'all',
        category_ids: [] as number[],
        product_ids: [] as number[],
        random_products_limit: 12,
        banner_image: '',
        banner_mobile_image: '',
        display_order: 0,
        is_active: true,
        vertical: 'both',
        starts_at: '',
        ends_at: '',
        link_url: '',
        meta_title: '',
        meta_description: '',
    });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isUploading || form.processing) return;
        try {
            const hasFiles = bannerImageFile || bannerMobileImageFile;
            if (hasFiles) setIsUploading(true);
            if (bannerImageFile) {
                const url = await uploadImageToAdmin(bannerImageFile, 'collections', csrfToken);
                form.setData('banner_image', url);
                setBannerImageFile(null);
                setBannerImagePreview(null);
            }
            if (bannerMobileImageFile) {
                const url = await uploadImageToAdmin(bannerMobileImageFile, 'collections', csrfToken);
                form.setData('banner_mobile_image', url);
                setBannerMobileImageFile(null);
                setBannerMobileImagePreview(null);
            }
            if (hasFiles) setIsUploading(false);
            form.post('/admin/collections');
        } catch (err) {
            setIsUploading(false);
            alert('Failed to upload image: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const inputCls =
        'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-(--admin-dark-primary) focus:ring-1 focus:ring-(--admin-dark-primary)';
    const labelCls = 'block text-sm font-medium text-gray-700';
    const selectedCategoryIds = new Set(form.data.category_ids);
    const filteredProducts =
        form.data.category_selection_mode === 'selected' && selectedCategoryIds.size > 0
            ? products.filter((product) => product.category_id !== null && selectedCategoryIds.has(product.category_id))
            : products;

    const toggleCategory = (categoryId: number) => {
        if (selectedCategoryIds.has(categoryId)) {
            form.setData(
                'category_ids',
                form.data.category_ids.filter((id) => id !== categoryId),
            );
            return;
        }

        form.setData('category_ids', [...form.data.category_ids, categoryId]);
    };

    const selectedProductIds = new Set(form.data.product_ids);

    const toggleProduct = (productId: number) => {
        if (selectedProductIds.has(productId)) {
            form.setData(
                'product_ids',
                form.data.product_ids.filter((id) => id !== productId),
            );
            return;
        }

        form.setData('product_ids', [...form.data.product_ids, productId]);
    };

    return (
        <AdminLayout title="Add collection">
            <Head title="Add collection - Admin" />
            <form onSubmit={submit} className="space-y-6">
                <Link href="/admin/collections" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-(--admin-dark-primary)">
                    <ArrowLeft className="h-4 w-4" /> Back to collections
                </Link>

                {/* ── Basic information ─────────────────────── */}
                <Section title="Basic information">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Name *</label>
                            <input
                                type="text"
                                required
                                className={inputCls}
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                            />
                            {form.errors.name && <p className="mt-1 text-sm text-red-600">{form.errors.name}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Slug</label>
                            <input type="text" className={inputCls} value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} />
                            {form.errors.slug && <p className="mt-1 text-sm text-red-600">{form.errors.slug}</p>}
                        </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Category</label>
                            <select
                                className={inputCls}
                                value={form.data.category_id ?? ''}
                                onChange={(e) => form.setData('category_id', e.target.value ? Number(e.target.value) : null)}
                            >
                                <option value="">None</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Vertical</label>
                            <select className={inputCls} value={form.data.vertical} onChange={(e) => form.setData('vertical', e.target.value)}>
                                {Object.entries(verticalOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Description</label>
                        <textarea
                            rows={3}
                            className={inputCls}
                            value={form.data.description}
                            onChange={(e) => form.setData('description', e.target.value)}
                        />
                    </div>
                </Section>

                <Section title="Collection setup">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Product mode</label>
                            <select
                                className={inputCls}
                                value={form.data.product_selection_mode}
                                onChange={(e) => form.setData('product_selection_mode', e.target.value as 'category' | 'manual' | 'random')}
                            >
                                {Object.entries(productSelectionOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            {form.errors.product_selection_mode && <p className="mt-1 text-sm text-red-600">{form.errors.product_selection_mode}</p>}
                        </div>
                        <div>
                            <label className={labelCls}>Category mode</label>
                            <select
                                className={inputCls}
                                value={form.data.category_selection_mode}
                                onChange={(e) => form.setData('category_selection_mode', e.target.value as 'all' | 'selected')}
                            >
                                {Object.entries(categorySelectionOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            {form.errors.category_selection_mode && (
                                <p className="mt-1 text-sm text-red-600">{form.errors.category_selection_mode}</p>
                            )}
                        </div>
                    </div>

                    {form.data.category_selection_mode === 'selected' && (
                        <div>
                            <label className={labelCls}>Select categories</label>
                            <div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                                {categories.map((category) => (
                                    <label
                                        key={category.id}
                                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-gray-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCategoryIds.has(category.id)}
                                            onChange={() => toggleCategory(category.id)}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <span>{category.name}</span>
                                    </label>
                                ))}
                            </div>
                            {form.errors.category_ids && <p className="mt-1 text-sm text-red-600">{form.errors.category_ids}</p>}
                        </div>
                    )}

                    {form.data.product_selection_mode === 'manual' && (
                        <div>
                            <label className={labelCls}>Select products</label>
                            <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                                {filteredProducts.length === 0 ? (
                                    <p className="px-3 py-2 text-sm text-gray-500">No products available for current category filter.</p>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <label
                                            key={product.id}
                                            className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 hover:bg-gray-50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedProductIds.has(product.id)}
                                                onChange={() => toggleProduct(product.id)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <span className="truncate">{product.name}</span>
                                        </label>
                                    ))
                                )}
                            </div>
                            {form.errors.product_ids && <p className="mt-1 text-sm text-red-600">{form.errors.product_ids}</p>}
                        </div>
                    )}

                    {form.data.product_selection_mode === 'random' && (
                        <div>
                            <label className={labelCls}>Random products limit</label>
                            <input
                                type="number"
                                min={1}
                                max={100}
                                className={inputCls}
                                value={form.data.random_products_limit}
                                onChange={(e) => form.setData('random_products_limit', Number(e.target.value) || 1)}
                            />
                            {form.errors.random_products_limit && <p className="mt-1 text-sm text-red-600">{form.errors.random_products_limit}</p>}
                        </div>
                    )}
                </Section>

                {/* ── Banner images ─────────────────────────── */}
                <Section title="Banner images">
                    <div className="grid gap-5 sm:grid-cols-2">
                        {/* Desktop banner */}
                        <div>
                            <label className={labelCls}>Desktop banner *</label>
                            <p className="mt-0.5 mb-2 text-xs text-gray-500">Upload a file or enter image URL</p>
                            {bannerImagePreview && (
                                <div className="relative mb-3 inline-block">
                                    <img
                                        src={bannerImagePreview || fallbackImage}
                                        alt=""
                                        className="h-28 w-auto max-w-full rounded-lg border border-gray-200 object-cover"
                                        onError={handleImageFallbackError}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBannerImageFile(null);
                                            setBannerImagePreview(null);
                                            form.setData('banner_image', '');
                                        }}
                                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:border-(--admin-dark-primary) hover:bg-gray-100">
                                <Upload className="h-4 w-4" />
                                <span>{bannerImageFile ? bannerImageFile.name : 'Choose banner image'}</span>
                                <input
                                    ref={bannerInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                            setBannerImageFile(f);
                                            form.setData('banner_image', '');
                                            const r = new FileReader();
                                            r.onloadend = () => setBannerImagePreview(r.result as string);
                                            r.readAsDataURL(f);
                                        }
                                    }}
                                />
                            </label>
                            <div className="relative my-3">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-500">Or enter URL</span>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="https://..."
                                className={inputCls}
                                value={form.data.banner_image}
                                onChange={(e) => {
                                    form.setData('banner_image', e.target.value);
                                    if (e.target.value) {
                                        setBannerImageFile(null);
                                        setBannerImagePreview(null);
                                    }
                                }}
                                disabled={!!bannerImageFile}
                            />
                            {form.errors.banner_image && <p className="mt-1 text-sm text-red-600">{form.errors.banner_image}</p>}
                        </div>
                        {/* Mobile banner */}
                        <div>
                            <label className={labelCls}>Mobile banner</label>
                            <p className="mt-0.5 mb-2 text-xs text-gray-500">Upload a file or enter image URL</p>
                            {bannerMobileImagePreview && (
                                <div className="relative mb-3 inline-block">
                                    <img
                                        src={bannerMobileImagePreview || fallbackImage}
                                        alt=""
                                        className="h-28 w-auto max-w-full rounded-lg border border-gray-200 object-cover"
                                        onError={handleImageFallbackError}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBannerMobileImageFile(null);
                                            setBannerMobileImagePreview(null);
                                            form.setData('banner_mobile_image', '');
                                        }}
                                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:border-(--admin-dark-primary) hover:bg-gray-100">
                                <Upload className="h-4 w-4" />
                                <span>{bannerMobileImageFile ? bannerMobileImageFile.name : 'Choose mobile banner'}</span>
                                <input
                                    ref={bannerMobileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                            setBannerMobileImageFile(f);
                                            form.setData('banner_mobile_image', '');
                                            const r = new FileReader();
                                            r.onloadend = () => setBannerMobileImagePreview(r.result as string);
                                            r.readAsDataURL(f);
                                        }
                                    }}
                                />
                            </label>
                            <div className="relative my-3">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-500">Or enter URL</span>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="https://..."
                                className={inputCls}
                                value={form.data.banner_mobile_image}
                                onChange={(e) => {
                                    form.setData('banner_mobile_image', e.target.value);
                                    if (e.target.value) {
                                        setBannerMobileImageFile(null);
                                        setBannerMobileImagePreview(null);
                                    }
                                }}
                                disabled={!!bannerMobileImageFile}
                            />
                        </div>
                    </div>
                </Section>

                {/* ── Schedule & settings ───────────────────── */}
                <Section title="Schedule & settings">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Starts at</label>
                            <input
                                type="datetime-local"
                                className={inputCls}
                                value={form.data.starts_at}
                                onChange={(e) => form.setData('starts_at', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Ends at</label>
                            <input
                                type="datetime-local"
                                className={inputCls}
                                value={form.data.ends_at}
                                onChange={(e) => form.setData('ends_at', e.target.value)}
                            />
                            {form.errors.ends_at && <p className="mt-1 text-sm text-red-600">{form.errors.ends_at}</p>}
                        </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Link URL</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={form.data.link_url}
                                onChange={(e) => form.setData('link_url', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Display order</label>
                            <input
                                type="number"
                                min={0}
                                className={inputCls}
                                value={form.data.display_order}
                                onChange={(e) => form.setData('display_order', Number(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={form.data.is_active}
                            onChange={(e) => form.setData('is_active', e.target.checked)}
                        />
                        <span className="text-sm text-gray-700">Active</span>
                    </label>
                </Section>

                {/* ── SEO ───────────────────────────────────── */}
                <Section title="SEO">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Meta title</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={form.data.meta_title}
                                onChange={(e) => form.setData('meta_title', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Meta description</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={form.data.meta_description}
                                onChange={(e) => form.setData('meta_description', e.target.value)}
                            />
                        </div>
                    </div>
                </Section>

                {/* ── Actions ──────────────────────────────── */}
                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={form.processing || isUploading}
                        className="rounded-lg bg-(--admin-dark-primary) px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-70"
                    >
                        {isUploading ? 'Uploading…' : form.processing ? 'Saving…' : 'Create collection'}
                    </button>
                    <Link
                        href="/admin/collections"
                        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
