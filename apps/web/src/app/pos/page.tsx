'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShoppingCart, X, Plus, Minus, Tag, User, CreditCard, Banknote, Smartphone, Zap, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient, formatApiError } from '@/lib/api';
import { formatMoney, toCents } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  price: string;
  imageUrl?: string;
  category?: { name: string; color?: string };
  isActive: boolean;
  trackInventory: boolean;
}

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
}

interface Category {
  id: string;
  name: string;
  color?: string;
}

const PAYMENT_MODES = [
  { id: 'tap', label: 'Tap to Pay', icon: Smartphone, description: 'NFC contactless' },
  { id: 'card', label: 'Card Reader', icon: CreditCard, description: 'Chip/swipe' },
  { id: 'cash', label: 'Cash', icon: Banknote, description: 'Physical cash' },
] as const;

export default function POSPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tipPercent, setTipPercent] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);

  const { data: categoriesData } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: () => apiClient.get<Category[]>('/products/categories'),
  });

  const { data: productsData } = useQuery({
    queryKey: ['pos-products', selectedCategory, search],
    queryFn: () =>
      apiClient.get<{ data: Product[] }>('/products', {
        params: {
          categoryId: selectedCategory,
          search: search || undefined,
          isActive: true,
          limit: 100,
        },
      }),
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiClient.get<{ id: string; name: string }[]>('/locations'),
  });

  useEffect(() => {
    if (locationsData && locationsData.length > 0 && !locationId) {
      setLocationId(locationsData[0].id);
    }
  }, [locationsData]);

  const products = (productsData as unknown as { data?: Product[] })?.data || (productsData as unknown as Product[]) || [];
  const categories = (categoriesData as unknown as Category[]) || [];

  const addToCart = (product: Product) => {
    const priceCents = Math.round(parseFloat(String(product.price)) * 100);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, totalAmount: (i.quantity + 1) * priceCents }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unitPrice: priceCents,
          quantity: 1,
          totalAmount: priceCents,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + delta, totalAmount: (i.quantity + delta) * i.unitPrice }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.totalAmount, 0);
  const discountAmount = Math.round(subtotal * (discount / 100));
  const afterDiscount = subtotal - discountAmount;
  const tipAmount = tipPercent !== null
    ? Math.round(afterDiscount * (tipPercent / 100))
    : customTip
    ? toCents(parseFloat(customTip) || 0)
    : 0;
  const total = afterDiscount + tipAmount;

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleCheckout = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    if (!locationId) return toast.error('No location selected');
    if (!paymentMode) return toast.error('Select a payment method');

    setIsCheckingOut(true);
    try {
      // 1. Create order
      const order = await apiClient.post<{ id: string; orderNumber: string }>('/orders', {
        locationId,
        items: cart.map((i) => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        discountAmount,
        tipAmount,
      });

      if (paymentMode === 'cash') {
        // Immediate cash processing
        await apiClient.post('/payments/cash', {
          orderId: order.id,
          amount: total,
          tendered: total,
        }, {
          headers: { 'X-Idempotency-Key': `cash-${order.id}-${Date.now()}` },
        });

        toast.success(`Order #${order.orderNumber} completed!`);
        setCart([]);
        setTipPercent(null);
        setCustomTip('');
        setDiscount(0);
        setPaymentMode(null);
      } else {
        // Card / Tap to Pay - create payment intent
        const payment = await apiClient.post<{ clientSecret: string; paymentIntentId: string }>(
          '/payments/create',
          {
            orderId: order.id,
            paymentMethod: paymentMode === 'tap' ? 'TAP_TO_PAY' : 'CARD_PRESENT',
          },
          {
            headers: { 'X-Idempotency-Key': `pi-${order.id}-${Date.now()}` },
          },
        );

        // In production, the mobile SDK handles the terminal interaction.
        // Here we show a confirmation prompt.
        toast.info(`Payment intent created: ${payment.paymentIntentId}. Use Stripe Terminal SDK on mobile to complete.`);
      }
    } catch (error) {
      toast.error(formatApiError(error));
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Products panel */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* POS Header */}
        <div className="flex items-center gap-3 border-b px-4 py-3 bg-card">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon-sm">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">TapFlow POS</span>
          </div>
          <div className="flex-1 max-w-md mx-auto">
            <Input
              placeholder="Search products or scan barcode..."
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">
              {locationsData?.[0]?.name || 'No location'}
            </span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 py-2 border-b overflow-x-auto flex-shrink-0 bg-card">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              !selectedCategory
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Package className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">No products found</p>
              <Link href="/dashboard/products/new">
                <Button className="mt-4" size="sm">Add your first product</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((product) => {
                const inCart = cart.find((i) => i.productId === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`pos-product-card ${inCart ? 'in-cart' : ''}`}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full aspect-square object-cover rounded-lg mb-2"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center mb-2">
                        <Package className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                    <p className="text-sm font-medium leading-tight line-clamp-2">{product.name}</p>
                    <p className="text-sm font-bold text-primary mt-1">
                      {formatMoney(Math.round(parseFloat(String(product.price)) * 100))}
                    </p>
                    {inCart && (
                      <Badge className="absolute top-2 right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {inCart.quantity}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="flex flex-col w-80 xl:w-96 border-l bg-card flex-shrink-0">
        {/* Cart header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-semibold">Cart</span>
            {cartItemCount > 0 && (
              <Badge variant="secondary">{cartItemCount}</Badge>
            )}
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-muted-foreground h-7">
              Clear
            </Button>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Tap products to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-2 rounded-lg bg-background p-2.5"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{formatMoney(item.unitPrice)} each</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <p className="w-14 text-right text-sm font-semibold flex-shrink-0">
                  {formatMoney(item.totalAmount)}
                </p>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-muted-foreground hover:text-destructive ml-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals & payment */}
        {cart.length > 0 && (
          <div className="border-t p-3 space-y-3">
            {/* Tip */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">TIP</p>
              <div className="grid grid-cols-4 gap-1.5">
                {[15, 18, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => { setTipPercent(tipPercent === pct ? null : pct); setCustomTip(''); }}
                    className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      tipPercent === pct
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatMoney(discountAmount)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip {tipPercent ? `(${tipPercent}%)` : ''}</span>
                  <span>{formatMoney(tipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span>
                <span className="text-primary">{formatMoney(total)}</span>
              </div>
            </div>

            {/* Payment methods */}
            <div className="space-y-1.5">
              {PAYMENT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setPaymentMode(mode.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                    paymentMode === mode.id
                      ? 'bg-primary/10 border-2 border-primary text-primary'
                      : 'bg-secondary/50 border-2 border-transparent hover:bg-secondary'
                  }`}
                >
                  <mode.icon className="h-4.5 w-4.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold leading-none">{mode.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
                  </div>
                </button>
              ))}
            </div>

            <Button
              size="xl"
              className="w-full"
              disabled={!paymentMode || isCheckingOut}
              loading={isCheckingOut}
              onClick={handleCheckout}
            >
              {isCheckingOut ? 'Processing...' : `Charge ${formatMoney(total)}`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}
