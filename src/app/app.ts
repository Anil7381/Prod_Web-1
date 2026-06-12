import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

type Category = 'All' | 'Shoes' | 'Shirts' | 'Pants' | 'Accessories';

type Product = {
  id: number;
  name: string;
  category: Exclude<Category, 'All'>;
  price: number;
  image: string;
  sizes: string[];
  stock: number;
  active?: boolean;
};

type CartItem = Product & {
  qty: number;
  size: string;
};

type Customer = {
  name: string;
  phone: string;
  address: string;
};

type ProductsResponse = {
  products?: Product[];
};

type CheckoutStep = 'cart' | 'payment' | 'success';
type PaymentMethod = 'UPI' | 'Cash on delivery';
type AppView = 'store' | 'admin';
type AdminTab = 'dashboard' | 'products' | 'orders';

type AdminOrder = {
  orderId: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  items: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  adminVerification: string;
  fulfillmentStatus: string;
};

type AdminDataResponse = {
  ok?: boolean;
  message?: string;
  products?: Product[];
  orders?: AdminOrder[];
};

type AdminLoginResponse = {
  ok: boolean;
  message?: string;
};

const WHATSAPP_NUMBER = '919866328140';
const UPI_ID = '9866328140@ybl';
const GOOGLE_SHEETS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzAArgwiq89y1trf5VB6V27I_R1MTv0ITuAo9FqdwAryx7dRo5VKYj4fOqkOCgX3Xakbw/exec';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly storeName = 'StreetCart';
  readonly whatsappNumber = WHATSAPP_NUMBER;
  readonly upiId = UPI_ID;
  readonly categories: Category[] = ['All', 'Shoes', 'Shirts', 'Pants', 'Accessories'];
  private adminTapCount = 0;
  private lastAdminTapAt = 0;

  readonly fallbackProducts: Product[] = [
    {
      id: 1,
      name: 'Sprint Runner Sneakers',
      category: 'Shoes',
      price: 2499,
      image:
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
      sizes: ['7', '8', '9', '10'],
      stock: 12,
    },
    {
      id: 2,
      name: 'Classic White Shirt',
      category: 'Shirts',
      price: 1299,
      image:
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80',
      sizes: ['S', 'M', 'L', 'XL'],
      stock: 20,
    },
    {
      id: 3,
      name: 'Slim Fit Denim Pants',
      category: 'Pants',
      price: 1799,
      image:
        'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
      sizes: ['30', '32', '34', '36'],
      stock: 15,
    },
    {
      id: 4,
      name: 'Everyday Graphic Tee',
      category: 'Shirts',
      price: 899,
      image:
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
      sizes: ['S', 'M', 'L', 'XL'],
      stock: 25,
    },
    {
      id: 5,
      name: 'Street Cargo Pants',
      category: 'Pants',
      price: 1999,
      image:
        'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80',
      sizes: ['30', '32', '34', '36'],
      stock: 10,
    },
    {
      id: 6,
      name: 'Canvas Tote Bag',
      category: 'Accessories',
      price: 699,
      image:
        'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=900&q=80',
      sizes: ['Free'],
      stock: 30,
    },
  ];

  products = signal<Product[]>(this.fallbackProducts);
  catalogStatus = signal(
    GOOGLE_SHEETS_SCRIPT_URL
      ? 'Loading products from Google Sheets...'
      : 'Showing demo products. Add your Apps Script web app URL in app.ts to load products from Google Sheets.',
  );
  selectedCategory = signal<Category>('All');
  appView = signal<AppView>('store');
  cart = signal<CartItem[]>([]);
  checkoutStep = signal<CheckoutStep>('cart');
  paymentMethod = signal<PaymentMethod>('UPI');
  adminTab = signal<AdminTab>('dashboard');
  adminEmail = signal('');
  adminPassword = signal('');
  adminLoggedIn = signal(false);
  adminStatus = signal('Login to manage products and orders.');
  adminProducts = signal<Product[]>([]);
  adminOrders = signal<AdminOrder[]>([]);
  customer: Customer = {
    name: '',
    phone: '',
    address: '',
  };

  sheetsStatus = signal(
    'Fill your details and continue to payment.',
  );

  filteredProducts = computed(() => {
    const category = this.selectedCategory();
    return category === 'All'
      ? this.products()
      : this.products().filter((product) => product.category === category);
  });
  featuredProduct = computed(() => this.products()[0] || this.fallbackProducts[0]);

  itemCount = computed(() => this.cart().reduce((total, item) => total + item.qty, 0));
  subtotal = computed(() => this.cart().reduce((total, item) => total + item.price * item.qty, 0));
  deliveryFee = computed(() => (this.subtotal() > 1499 || this.subtotal() === 0 ? 0 : 99));
  total = computed(() => this.subtotal() + this.deliveryFee());
  upiLink = computed(() => {
    const params = new URLSearchParams({
      pa: this.upiId,
      pn: this.storeName,
      am: String(this.total()),
      cu: 'INR',
      tn: `Order from ${this.storeName}`,
    });

    return `upi://pay?${params.toString()}`;
  });
  qrImage = computed(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        this.upiLink(),
      )}`,
  );

  ngOnInit() {
    void this.loadProductsFromSheets();
  }

  showStore() {
    window.location.hash = '';
    this.appView.set('store');
  }

  showAdmin() {
    this.appView.set('admin');
  }

  handleBrandClick() {
    const now = Date.now();
    this.adminTapCount = now - this.lastAdminTapAt > 3500 ? 1 : this.adminTapCount + 1;
    this.lastAdminTapAt = now;

    if (this.adminTapCount >= 5) {
      this.adminTapCount = 0;
      this.showAdmin();
    }
  }

  async loginAdmin() {
    if (!this.adminEmail() || !this.adminPassword()) {
      this.adminStatus.set('Enter email and password.');
      return;
    }

    try {
      this.adminStatus.set('Checking login...');
      const response = await this.loadJsonp<AdminLoginResponse>('adminLogin', {
        email: this.adminEmail(),
        password: this.adminPassword(),
      });

      if (!response.ok) {
        this.adminStatus.set(response.message || 'Invalid email or password.');
        return;
      }

      this.adminLoggedIn.set(true);
      this.adminTab.set('dashboard');
      this.adminStatus.set('Loading admin data...');
      await this.loadAdminData();
    } catch {
      this.adminStatus.set('Could not login. Check Apps Script deployment.');
    }
  }

  async loadAdminData() {
    if (!GOOGLE_SHEETS_SCRIPT_URL) {
      this.adminStatus.set('Google Sheets URL is missing.');
      return;
    }

    try {
      const data = await this.loadJsonp<AdminDataResponse>('adminData', this.adminAuthParams());

      if (data.ok === false) {
        this.adminStatus.set(data.message || 'Admin access denied.');
        return;
      }

      this.adminProducts.set(data.products || []);
      this.adminOrders.set(data.orders || []);
      this.adminStatus.set('Admin data loaded.');
    } catch {
      this.adminStatus.set('Could not load admin data.');
    }
  }

  async loadProductsFromSheets() {
    if (!GOOGLE_SHEETS_SCRIPT_URL) {
      return;
    }

    try {
      const data = await this.loadProductsJsonp();
      const products = (data.products || []).filter((product) => product.stock > 0);

      if (!products.length) {
        this.catalogStatus.set('Google Sheets returned no active in-stock products. Showing demo products.');
        return;
      }

      this.products.set(products);
      this.catalogStatus.set('Products loaded from Google Sheets.');
    } catch {
      this.catalogStatus.set('Could not load products from Google Sheets. Showing demo products.');
    }
  }

  sheetsUrl(action: string, params: Record<string, string> = {}) {
    const separator = GOOGLE_SHEETS_SCRIPT_URL.includes('?') ? '&' : '?';
    const searchParams = new URLSearchParams({ action, ...params });
    return `${GOOGLE_SHEETS_SCRIPT_URL}${separator}${searchParams.toString()}`;
  }

  loadProductsJsonp() {
    return this.loadJsonp<ProductsResponse>('products');
  }

  loadJsonp<T>(action: string, params: Record<string, string> = {}) {
    return new Promise<T>((resolve, reject) => {
      const callbackName = `streetCartCallback_${Date.now()}_${Math.round(Math.random() * 1000)}`;
      const url = `${this.sheetsUrl(action, params)}&callback=${callbackName}`;
      const script = document.createElement('script');
      const callbacks = window as unknown as Record<string, (data: T) => void>;
      const cleanup = () => {
        delete callbacks[callbackName];
        script.remove();
      };
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('Google Sheets request timed out.'));
      }, 30000);

      callbacks[callbackName] = (data: T) => {
        window.clearTimeout(timeoutId);
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        window.clearTimeout(timeoutId);
        cleanup();
        reject(new Error('Could not load Google Sheets data.'));
      };

      script.src = url;
      document.body.appendChild(script);
    });
  }

  setCategory(category: Category) {
    this.selectedCategory.set(category);
  }

  addToCart(product: Product) {
    const size = product.sizes[0];
    this.checkoutStep.set('cart');
    this.cart.update((items) => {
      const existing = items.find((item) => item.id === product.id && item.size === size);

      if (existing) {
        if (existing.qty >= product.stock) {
          return items;
        }

        return items.map((item) =>
          item.id === product.id && item.size === size ? { ...item, qty: item.qty + 1 } : item,
        );
      }

      return [...items, { ...product, qty: 1, size }];
    });
  }

  productCartItem(product: Product) {
    return this.cart().find((item) => item.id === product.id && item.size === product.sizes[0]);
  }

  productQuantity(product: Product) {
    return this.productCartItem(product)?.qty || 0;
  }

  decreaseProduct(product: Product) {
    const item = this.productCartItem(product);

    if (item) {
      this.decrease(item);
    }
  }

  updateSize(item: CartItem, size: string) {
    this.cart.update((items) => {
      const updatedItems = items.filter(
        (cartItem) => !(cartItem.id === item.id && cartItem.size === item.size),
      );
      const matchingSize = updatedItems.find(
        (cartItem) => cartItem.id === item.id && cartItem.size === size,
      );

      if (matchingSize) {
        return updatedItems.map((cartItem) =>
          cartItem.id === item.id && cartItem.size === size
            ? { ...cartItem, qty: cartItem.qty + item.qty }
            : cartItem,
        );
      }

      return [...updatedItems, { ...item, size }];
    });
  }

  increase(item: CartItem) {
    if (item.qty >= item.stock) {
      return;
    }

    this.cart.update((items) =>
      items.map((cartItem) =>
        cartItem.id === item.id && cartItem.size === item.size
          ? { ...cartItem, qty: cartItem.qty + 1 }
          : cartItem,
      ),
    );
  }

  decrease(item: CartItem) {
    this.cart.update((items) =>
      items
        .map((cartItem) =>
          cartItem.id === item.id && cartItem.size === item.size
            ? { ...cartItem, qty: cartItem.qty - 1 }
            : cartItem,
        )
        .filter((cartItem) => cartItem.qty > 0),
    );
  }

  remove(item: CartItem) {
    this.cart.update((items) =>
      items.filter((cartItem) => !(cartItem.id === item.id && cartItem.size === item.size)),
    );
    this.checkoutStep.set('cart');
  }

  orderMessage() {
    const orderLines = this.cart()
      .map(
        (item) =>
          `${item.name} | Size: ${item.size} | Qty: ${item.qty} | Rs ${item.price * item.qty}`,
      )
      .join('\n');

    return [
      `New order from ${this.storeName}`,
      '',
      orderLines,
      '',
      `Subtotal: Rs ${this.subtotal()}`,
      `Delivery: Rs ${this.deliveryFee()}`,
      `Total: Rs ${this.total()}`,
      '',
      `Customer: ${this.customer.name || '-'}`,
      `Phone: ${this.customer.phone || '-'}`,
      `Address: ${this.customer.address || '-'}`,
      '',
      `Payment method: ${this.paymentMethod()}`,
      `UPI: ${this.paymentMethod() === 'UPI' ? this.upiId : '-'}`,
      this.paymentMethod() === 'UPI'
        ? 'I paid by UPI. I will attach the payment screenshot here.'
        : 'Cash on delivery order. Please confirm product availability.',
    ].join('\n');
  }

  whatsappUrl() {
    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(this.orderMessage())}`;
  }

  proceedToPayment() {
    if (this.checkoutDisabled()) {
      this.sheetsStatus.set('Add products, customer name, phone, and address before payment.');
      return;
    }

    this.sheetsStatus.set('Choose UPI or cash on delivery.');
    this.checkoutStep.set('payment');
  }

  async placeOrder() {
    if (this.checkoutDisabled()) {
      this.sheetsStatus.set('Add products, customer name, phone, and address before placing the order.');
      return;
    }

    await this.sendToSheets();
    this.checkoutStep.set('success');
    this.sheetsStatus.set(
      this.paymentMethod() === 'UPI'
        ? 'Order saved. Send payment screenshot on WhatsApp for verification.'
        : 'COD order saved. Send order on WhatsApp for owner confirmation.',
    );
  }

  async sendToSheets() {
    if (!GOOGLE_SHEETS_SCRIPT_URL) {
      this.sheetsStatus.set(
        'Order details are ready. Please confirm on WhatsApp.',
      );
      return;
    }

    const paymentMethod = this.paymentMethod() === 'Cash on delivery' ? 'COD' : 'UPI';
    const payload = {
      createdAt: new Date().toISOString(),
      customer: this.customer,
      items: this.cart(),
      subtotal: this.subtotal(),
      deliveryFee: this.deliveryFee(),
      total: this.total(),
      paymentMethod,
      paymentStatus: 'Pending',
      payment: {
        method: paymentMethod,
        status: 'Pending',
        upiId: this.paymentMethod() === 'UPI' ? this.upiId : '',
        reference: '',
      },
    };

    try {
      await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      this.sheetsStatus.set('Order saved.');
    } catch {
      this.sheetsStatus.set('Order placed. Please confirm on WhatsApp if needed.');
    }
  }

  checkoutDisabled() {
    return this.cart().length === 0 || !this.customer.name || !this.customer.phone || !this.customer.address;
  }

  startNewOrder() {
    this.cart.set([]);
    this.customer = {
      name: '',
      phone: '',
      address: '',
    };
    this.paymentMethod.set('UPI');
    this.checkoutStep.set('cart');
    this.sheetsStatus.set('Fill your details and continue to payment.');
  }

  updatePaymentMethod(method: PaymentMethod) {
    this.paymentMethod.set(method);

    if (method === 'Cash on delivery') {
      this.sheetsStatus.set('Cash on delivery selected. Place order and send it on WhatsApp.');
      return;
    }

    this.sheetsStatus.set('Pay with UPI, then place order and send screenshot on WhatsApp.');
  }

  async saveAdminProduct(product: Product) {
    const payload = {
      action: 'updateProduct',
      admin: {
        email: this.adminEmail(),
        password: this.adminPassword(),
      },
      product: {
        ...product,
        sizes: Array.isArray(product.sizes) ? product.sizes.join(',') : product.sizes,
      },
    };

    try {
      await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      this.adminStatus.set(`Saved ${product.name}. Refreshing data...`);
      await this.loadAdminData();
      await this.loadProductsFromSheets();
    } catch {
      this.adminStatus.set('Could not save product.');
    }
  }

  addAdminProduct() {
    const nextId =
      this.adminProducts().reduce((highest, product) => Math.max(highest, Number(product.id)), 0) + 1;

    this.adminProducts.update((products) => [
      {
        id: nextId,
        name: 'New Product',
        category: 'Accessories',
        price: 0,
        image: '',
        sizes: ['Free'],
        stock: 0,
        active: false,
      },
      ...products,
    ]);
    this.adminTab.set('products');
    this.adminStatus.set('Edit the new product and click Save.');
  }

  sizesText(product: Product) {
    return product.sizes.join(',');
  }

  updateProductSizes(product: Product, sizes: string) {
    product.sizes = sizes
      .split(',')
      .map((size) => size.trim())
      .filter(Boolean);
  }

  adminAuthParams() {
    return {
      email: this.adminEmail(),
      password: this.adminPassword(),
    };
  }

  totalAdminOrders() {
    return this.adminOrders().length;
  }

  upiAdminOrders() {
    return this.adminOrders().filter((order) => order.paymentMethod === 'UPI').length;
  }

  codAdminOrders() {
    return this.adminOrders().filter((order) => this.paymentLabel(order.paymentMethod) === 'COD').length;
  }

  pendingAdminOrders() {
    return this.adminOrders().filter((order) => {
      const status = `${order.paymentStatus} ${order.adminVerification} ${order.fulfillmentStatus}`.toLowerCase();
      return status.includes('pending') || status.includes('wait') || status.includes('new order');
    }).length;
  }

  adminRevenue() {
    return this.adminOrders().reduce((total, order) => total + Number(order.total || 0), 0);
  }

  activeAdminProducts() {
    return this.adminProducts().filter((product) => product.active && product.stock > 0).length;
  }

  lowStockProducts() {
    return this.adminProducts().filter((product) => product.active && product.stock > 0 && product.stock <= 5).length;
  }

  recentAdminOrders() {
    return this.adminOrders().slice(0, 5);
  }

  paymentLabel(paymentMethod: string) {
    return paymentMethod === 'Cash on delivery' ? 'COD' : paymentMethod || '-';
  }

  orderStatus(order: AdminOrder) {
    return String(order.paymentStatus || '').toLowerCase().includes('confirmed') ? 'Confirmed' : 'Pending';
  }

  orderItemLines(items: string) {
    return String(items || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('|').map((part) => part.trim());
        return {
          name: parts[0] || 'Product',
          meta: parts.slice(1, -1).join(' · '),
          price: parts[parts.length - 1] || '',
        };
      });
  }

  async updateAdminOrderStatus(order: AdminOrder, status: string) {
    order.paymentStatus = status;

    try {
      await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateOrderStatus',
          admin: {
            email: this.adminEmail(),
            password: this.adminPassword(),
          },
          orderId: order.orderId,
          status,
        }),
      });

      this.adminStatus.set(`Order ${order.orderId} marked ${status}.`);
    } catch {
      this.adminStatus.set('Could not update order status.');
    }
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  }
}
