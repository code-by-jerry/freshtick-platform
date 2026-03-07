import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FALLBACK_IMAGE_URL, handleImageFallbackError } from '@/lib/imageFallback';
import type { SharedData } from '@/types';

interface Zone {
    id: number;
    name: string;
}

interface AdminBannersCreateProps {
    typeOptions: Record<string, string>;
    linkTypeOptions: Record<string, string>;
    verticalOptions: Record<string, string>;
    zones: Zone[];
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

const inputCls =
    'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-(--admin-dark-primary) focus:ring-1 focus:ring-(--admin-dark-primary)';
const labelCls = 'block text-sm font-medium text-gray-700';

export default function AdminBannersCreate({ typeOptions, linkTypeOptions, verticalOptions, zones }: AdminBannersCreateProps) {
    const { csrf_token: csrfToken } = (usePage().props as unknown as SharedData) ?? {};
    const fallbackImage = FALLBACK_IMAGE_URL;
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [mobileImagePreview, setMobileImagePreview] = useState<string | null>(null);
    const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mobileFileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm({
        name: '',
        type: 'home',
        vertical: 'both',
        title: '',
        description: '',
        image: '',
        image_file: null as File | null,
        mobile_image: '',
        mobile_image_file: null as File | null,
        link_url: '',
        link_type: 'none',
        link_id: '',
        display_order: 0,
        is_active: true,
        starts_at: '',
        ends_at: '',
        zones: [] as number[],
    });

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            form.setData('image_file', file);
            form.setData('image', '');
            const r = new FileReader();
            r.onloadend = () => setImagePreview(r.result as string);
            r.readAsDataURL(file);
        }
    };
    const handleMobileImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMobileImageFile(file);
            form.setData('mobile_image_file', file);
            form.setData('mobile_image', '');
            const r = new FileReader();
            r.onloadend = () => setMobileImagePreview(r.result as string);
            r.readAsDataURL(file);
        }
    };
    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        form.setData('image_file', null);
        form.setData('image', '');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const clearMobileImage = () => {
        setMobileImageFile(null);
        setMobileImagePreview(null);
        form.setData('mobile_image_file', null);
        form.setData('mobile_image', '');
        if (mobileFileInputRef.current) mobileFileInputRef.current.value = '';
    };
    const handleZoneToggle = (zoneId: number) => {
        const z = form.data.zones;
        form.setData('zones', z.includes(zoneId) ? z.filter((id) => id !== zoneId) : [...z, zoneId]);
    };

    const uploadFile = async (file: File, folder: string): Promise<string> => {
        const token =
            csrfToken ||
            document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ||
            document.querySelector('input[name="_token"]')?.getAttribute('value') ||
            '';
        const xsrfCookie = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
        const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' };
        if (token) headers['X-CSRF-TOKEN'] = token;
        else if (xsrfCookie) headers['X-XSRF-TOKEN'] = xsrfCookie.replace(/^"(.*)"$/, '$1');
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        const res = await fetch('/admin/files/upload', { method: 'POST', headers, credentials: 'same-origin', body: fd });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'File upload failed');
        }
        const result = await res.json();
        if (result.success && result.url) return result.url;
        throw new Error(result.message || 'Upload failed');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isUploading || form.processing) return;
        setIsUploading(true);
        try {
            if (imageFile) {
                const url = await uploadFile(imageFile, 'banners');
                form.setData('image', url);
                form.setData('image_file', null);
                setImageFile(null);
            }
            if (mobileImageFile) {
                const url = await uploadFile(mobileImageFile, 'banners/mobile');
                form.setData('mobile_image', url);
                form.setData('mobile_image_file', null);
                setMobileImageFile(null);
            }
            form.post('/admin/banners', { onFinish: () => setIsUploading(false) });
        } catch (error) {
            setIsUploading(false);
            alert('Failed to upload image: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    return (
        <AdminLayout title="Create banner">
            <Head title="Create Banner - Admin" />
            <form onSubmit={handleSubmit} className="space-y-6">
                <Link href="/admin/banners" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-(--admin-dark-primary)">
                    <ArrowLeft className="h-4 w-4" /> Back to banners
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
                            <label className={labelCls}>Type *</label>
                            <select className={inputCls} value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}>
                                {Object.entries(typeOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                            {form.errors.type && <p className="mt-1 text-sm text-red-600">{form.errors.type}</p>}
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Vertical *</label>
                        <select className={inputCls} value={form.data.vertical} onChange={(e) => form.setData('vertical', e.target.value)}>
                            {Object.entries(verticalOptions).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        {form.errors.vertical && <p className="mt-1 text-sm text-red-600">{form.errors.vertical}</p>}
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Title</label>
                            <input type="text" className={inputCls} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />
                        </div>
                        <div>
                            <label className={labelCls}>Description</label>
                            <input
                                type="text"
                                className={inputCls}
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                            />
                        </div>
                    </div>
                </Section>

                {/* ── Banner images ─────────────────────────── */}
                <Section title="Banner images">
                    <div className="grid gap-5 sm:grid-cols-2">
                        {/* Desktop */}
                        <div>
                            <label className={labelCls}>Desktop banner *</label>
                            <p className="mt-0.5 mb-2 text-xs text-gray-500">Recommended: 1920×600 or 21:9 ratio</p>
                            {(imagePreview || form.data.image) && (
                                <div className="relative mb-3 inline-block">
                                    <img
                                        src={imagePreview || form.data.image || fallbackImage}
                                        alt="Preview"
                                        className="h-28 w-auto max-w-full rounded-lg border border-gray-200 object-cover"
                                        onError={handleImageFallbackError}
                                    />
                                    <button
                                        type="button"
                                        onClick={clearImage}
                                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:border-(--admin-dark-primary) hover:bg-gray-100">
                                <Upload className="h-4 w-4" />
                                <span>{imageFile ? imageFile.name : 'Choose image file'}</span>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
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
                                placeholder="https://…"
                                className={inputCls}
                                value={form.data.image}
                                onChange={(e) => {
                                    form.setData('image', e.target.value);
                                    if (e.target.value) {
                                        setImageFile(null);
                                        setImagePreview(null);
                                        form.setData('image_file', null);
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }
                                }}
                                disabled={!!imageFile}
                            />
                            {form.errors.image && <p className="mt-1 text-sm text-red-600">{form.errors.image}</p>}
                        </div>
                        {/* Mobile */}
                        <div>
                            <label className={labelCls}>
                                Mobile banner <span className="text-xs font-normal text-gray-400">— optional</span>
                            </label>
                            <p className="mt-0.5 mb-2 text-xs text-gray-500">Recommended: 640×480 or 4:3 ratio</p>
                            {(mobileImagePreview || form.data.mobile_image) && (
                                <div className="relative mb-3 inline-block">
                                    <img
                                        src={mobileImagePreview || form.data.mobile_image || fallbackImage}
                                        alt="Mobile preview"
                                        className="h-28 w-auto max-w-full rounded-lg border border-gray-200 object-cover"
                                        onError={handleImageFallbackError}
                                    />
                                    <button
                                        type="button"
                                        onClick={clearMobileImage}
                                        className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}
                            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:border-(--admin-dark-primary) hover:bg-gray-100">
                                <Upload className="h-4 w-4" />
                                <span>{mobileImageFile ? mobileImageFile.name : 'Choose mobile image'}</span>
                                <input
                                    ref={mobileFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleMobileImageFileChange}
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
                                placeholder="https://…"
                                className={inputCls}
                                value={form.data.mobile_image}
                                onChange={(e) => {
                                    form.setData('mobile_image', e.target.value);
                                    if (e.target.value) {
                                        setMobileImageFile(null);
                                        setMobileImagePreview(null);
                                        form.setData('mobile_image_file', null);
                                        if (mobileFileInputRef.current) mobileFileInputRef.current.value = '';
                                    }
                                }}
                                disabled={!!mobileImageFile}
                            />
                        </div>
                    </div>
                </Section>

                {/* ── Link settings ─────────────────────────── */}
                <Section title="Link settings">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>Link type</label>
                            <select className={inputCls} value={form.data.link_type} onChange={(e) => form.setData('link_type', e.target.value)}>
                                {Object.entries(linkTypeOptions).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Link ID / URL</label>
                            <input
                                type="text"
                                placeholder={form.data.link_type === 'external' ? 'https://example.com' : 'ID or slug'}
                                className={inputCls}
                                value={form.data.link_id}
                                onChange={(e) => form.setData('link_id', e.target.value)}
                            />
                        </div>
                    </div>
                </Section>

                {/* ── Schedule & settings ───────────────────── */}
                <Section title="Schedule & settings">
                    <div className="grid gap-5 sm:grid-cols-3">
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
                        <div>
                            <label className={labelCls}>Start date</label>
                            <input
                                type="datetime-local"
                                className={inputCls}
                                value={form.data.starts_at}
                                onChange={(e) => form.setData('starts_at', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>End date</label>
                            <input
                                type="datetime-local"
                                className={inputCls}
                                value={form.data.ends_at}
                                onChange={(e) => form.setData('ends_at', e.target.value)}
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

                {/* ── Zone visibility ───────────────────────── */}
                {zones.length > 0 && (
                    <Section title="Zone visibility">
                        <p className="text-xs text-gray-500">Leave empty to show in all zones</p>
                        <div className="flex flex-wrap gap-2">
                            {zones.map((zone) => (
                                <label
                                    key={zone.id}
                                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${form.data.zones.includes(zone.id) ? 'border-(--admin-dark-primary) bg-(--admin-dark-primary) text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-(--admin-dark-primary)'}`}
                                >
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={form.data.zones.includes(zone.id)}
                                        onChange={() => handleZoneToggle(zone.id)}
                                    />
                                    <span className="text-sm">{zone.name}</span>
                                </label>
                            ))}
                        </div>
                    </Section>
                )}

                {/* ── Actions ──────────────────────────────── */}
                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={form.processing || isUploading}
                        className="flex items-center gap-2 rounded-lg bg-(--admin-dark-primary) px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {(form.processing || isUploading) && (
                            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                        )}
                        {isUploading ? 'Uploading…' : form.processing ? 'Saving…' : 'Create banner'}
                    </button>
                    <Link
                        href="/admin/banners"
                        className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
