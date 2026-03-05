import { Head, Link, router, usePage } from '@inertiajs/react';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import UserLayout from '@/layouts/UserLayout';

interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string | null;
    image?: string | null;
}

interface Product {
    id: number;
    name: string;
    slug: string;
    image?: string | null;
    price: string;
    compare_at_price?: string | null;
    short_description?: string | null;
}

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface CategoryPageProps {
    category: Category;
    vertical: string;
    zone: Zone;
    products: Product[];
    filters: {
        sort?: string;
        min_price?: number;
        max_price?: number;
    };
}

export default function CategoryPage({ category, vertical, products, filters }: CategoryPageProps) {
    const [sortBy, setSortBy] = useState(filters.sort || 'display_order');
    const [addingProductId, setAddingProductId] = useState<number | null>(null);
    const auth = (usePage().props as { auth?: { user?: unknown; wishlisted_products?: number[] } }).auth;
    const wishlistedProductIds = new Set(auth?.wishlisted_products || []);

    const toggleWishlist = (event: React.MouseEvent, productId: number) => {
        event.preventDefault();
        event.stopPropagation();

        if (!auth?.user) {
            router.get('/login');
            return;
        }

        router.post(`/wishlist/toggle/${productId}`, {}, { preserveScroll: true, preserveState: true });
    };

    const addToCart = (event: React.MouseEvent, productId: number) => {
        event.preventDefault();
        event.stopPropagation();

        if (addingProductId === productId) {
            return;
        }

        setAddingProductId(productId);
        router.post(
            '/cart/add',
            { product_id: productId, quantity: 1 },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setAddingProductId((current) => (current === productId ? null : current)),
            },
        );
    };

    const handleSortChange = (newSort: string) => {
        setSortBy(newSort);
        router.get(`/categories/${category.slug}`, { ...filters, sort: newSort, vertical }, { preserveState: true });
    };

    return (
        <UserLayout>
            <Head title={category.name} />
            <div className="min-h-screen bg-gray-50">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Category Header */}
                    <div className="mb-8">
                        {category.image && <img src={category.image} alt={category.name} className="mb-4 h-64 w-full rounded-lg object-cover" />}
                        <h1 className="mb-2 text-3xl font-bold">{category.name}</h1>
                        {category.description && <p className="text-gray-600">{category.description}</p>}
                    </div>

                    {/* Filters and Sort */}
                    <div className="mb-6 flex flex-col items-center justify-between gap-4 rounded-lg bg-white p-4 md:flex-row">
                        <div className="text-sm text-gray-600">
                            {products.length} {products.length === 1 ? 'product' : 'products'} found
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => handleSortChange(e.target.value)}
                            className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="display_order">Default</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="name_asc">Name: A to Z</option>
                            <option value="name_desc">Name: Z to A</option>
                        </select>
                    </div>

                    {/* Products Grid */}
                    {products.length > 0 ? (
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                            {products.map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/products/${product.slug}?vertical=${vertical}`}
                                    className="relative overflow-hidden rounded-lg bg-white transition-shadow hover:shadow-md"
                                >
                                    <button
                                        type="button"
                                        onClick={(event) => toggleWishlist(event, product.id)}
                                        aria-label={wishlistedProductIds.has(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                                        className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                                    >
                                        <Heart
                                            className={`h-4 w-4 ${wishlistedProductIds.has(product.id) ? 'fill-red-500 text-red-500' : 'fill-white text-black'}`}
                                            strokeWidth={2}
                                        />
                                    </button>
                                    {product.image && <img src={product.image} alt={product.name} className="h-48 w-full object-cover" />}
                                    <div className="p-4">
                                        <h3 className="mb-2 line-clamp-2 text-sm font-medium">{product.name}</h3>
                                        {product.short_description && (
                                            <p className="mb-2 line-clamp-2 text-xs text-gray-500">{product.short_description}</p>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold">₹{product.price}</span>
                                            {product.compare_at_price && (
                                                <span className="text-sm text-gray-500 line-through">₹{product.compare_at_price}</span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(event) => addToCart(event, product.id)}
                                            disabled={addingProductId === product.id}
                                            className="mt-3 w-full rounded-md bg-(--theme-primary-1) px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-(--theme-primary-1-dark) disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {addingProductId === product.id ? 'Adding...' : 'Add to Cart'}
                                        </button>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-gray-500">No products found in this category.</p>
                        </div>
                    )}
                </div>
            </div>
        </UserLayout>
    );
}
