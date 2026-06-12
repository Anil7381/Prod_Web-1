import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createClient } from '@supabase/supabase-js';

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

type ProductRow = {
  id: number;
  name: string;
  category: Exclude<Category, 'All'>;
  price: number;
  image_url: string | null;
  sizes: string[] | string | null;
  stock: number;
  active: boolean;
};

type OrderRow = {
  id: string;
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  items: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: string;
};

const WHATSAPP_NUMBER = '919866328140';
const UPI_ID = '9866328140@ybl';
const SUPABASE_URL = 'https://jfwuumnupwedbroegygc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lPg6iqdp1zfBr3zXYgB8TA_xFoqtkFn';
const PRODUCT_IMAGE_BUCKET = 'product-images';

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
  readonly supabase = this.createSupabaseClient();
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
    this.supabase
      ? 'Loading products from Supabase...'
      : 'Showing demo products. Add your Supabase URL and anon key in app.ts.',
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
  currentOrderId = signal('');
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
    void this.loadProductsFromSupabase();
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

    if (!this.supabase) {
      this.adminStatus.set('Add Supabase URL and anon key in app.ts first.');
      return;
    }

    try {
      this.adminStatus.set('Checking login...');
      const { error } = await this.supabase.auth.signInWithPassword({
        email: this.adminEmail(),
        password: this.adminPassword(),
      });

      if (error) {
        this.adminStatus.set(error.message || 'Invalid email or password.');
        return;
      }

      this.adminLoggedIn.set(true);
      this.adminTab.set('dashboard');
      this.adminStatus.set('Loading admin data...');
      await this.loadAdminData();
    } catch {
      this.adminStatus.set('Could not login. Check Supabase settings.');
    }
  }

  async loadAdminData() {
    if (!this.supabase) {
      this.adminStatus.set('Supabase URL/key is missing.');
      return;
    }

    try {
      const [{ data: products, error: productsError }, { data: orders, error: ordersError }] =
        await Promise.all([
          this.supabase.from('products').select('*').order('id', { ascending: true }),
          this.supabase.from('orders').select('*').order('created_at', { ascending: false }),
        ]);

      if (productsError || ordersError) {
        throw productsError || ordersError;
      }

      this.adminProducts.set((products || []).map((product) => this.mapProductRow(product as ProductRow)));
      this.adminOrders.set((orders || []).map((order) => this.mapOrderRow(order as OrderRow)));
      this.adminStatus.set('Admin data loaded.');
    } catch {
      this.adminStatus.set('Could not load admin data.');
    }
  }

  async loadProductsFromSupabase() {
    if (!this.supabase) {
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .gt('stock', 0)
        .order('id', { ascending: true });

      if (error) {
        throw error;
      }

      const products = (data || []).map((product) => this.mapProductRow(product as ProductRow));

      if (!products.length) {
        this.catalogStatus.set('Supabase returned no active in-stock products. Showing demo products.');
        return;
      }

      this.products.set(products);
      this.catalogStatus.set('Products loaded from Supabase.');
    } catch {
      this.catalogStatus.set('Could not load products from Supabase. Showing demo products.');
    }
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
    const paymentMethod = this.paymentMethod();
    const isUpi = paymentMethod === 'UPI';
    const orderId = this.currentOrderId() || 'Not saved yet';
    const orderLines = this.cart()
      .map((item, index) => {
        const lineTotal = this.formatMessagePrice(item.price * item.qty);
        return `${index + 1}. ${item.name}\n   Size: ${item.size} | Qty: ${item.qty} | Amount: ${lineTotal}`;
      })
      .join('\n');

    return [
      `New order - ${this.storeName}`,
      `Order ID: ${orderId}`,
      '',
      'Items:',
      orderLines,
      '',
      'Bill summary:',
      `Subtotal: ${this.formatMessagePrice(this.subtotal())}`,
      `Delivery: ${this.deliveryFee() === 0 ? 'Free' : this.formatMessagePrice(this.deliveryFee())}`,
      `Total: ${this.formatMessagePrice(this.total())}`,
      '',
      'Customer details:',
      `Name: ${this.customer.name || '-'}`,
      `Phone: ${this.customer.phone || '-'}`,
      `Address: ${this.customer.address || '-'}`,
      '',
      'Payment:',
      `Method: ${isUpi ? 'UPI' : 'Cash on delivery'}`,
      isUpi ? `UPI ID: ${this.upiId}` : `Amount to collect: ${this.formatMessagePrice(this.total())}`,
      isUpi
        ? 'Payment status: Paid. Screenshot attached for verification.'
        : 'Payment status: COD. Please confirm product availability and delivery.',
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

    await this.saveOrder();
    this.checkoutStep.set('success');
    this.sheetsStatus.set(
      this.paymentMethod() === 'UPI'
        ? 'Order saved. Send payment screenshot on WhatsApp for verification.'
        : 'COD order saved. Send order on WhatsApp for owner confirmation.',
    );
  }

  async saveOrder() {
    if (!this.supabase) {
      this.sheetsStatus.set(
        'Order details are ready. Add Supabase settings to save orders.',
      );
      return;
    }

    const paymentMethod = this.paymentMethod() === 'Cash on delivery' ? 'COD' : 'UPI';
    const orderId = this.createOrderId();
    this.currentOrderId.set(orderId);

    try {
      const { error } = await this.supabase.from('orders').insert({
        id: orderId,
        customer_name: this.customer.name,
        phone: this.customer.phone,
        address: this.customer.address,
        items: this.orderItemsText(),
        subtotal: this.subtotal(),
        delivery_fee: this.deliveryFee(),
        total: this.total(),
        payment_method: paymentMethod,
        status: 'Pending',
      });

      if (error) {
        throw error;
      }

      await this.reduceSupabaseStock();
      this.sheetsStatus.set('Order saved.');
    } catch {
      this.sheetsStatus.set('Could not save order in Supabase. Please confirm on WhatsApp.');
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
    this.currentOrderId.set('');
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
    if (!this.supabase) {
      this.adminStatus.set('Supabase URL/key is missing.');
      return;
    }

    try {
      const { error } = await this.supabase.from('products').upsert(this.productToRow(product));

      if (error) {
        throw error;
      }

      this.adminStatus.set(`Saved ${product.name}. Refreshing data...`);
      await this.loadAdminData();
      await this.loadProductsFromSupabase();
    } catch {
      this.adminStatus.set('Could not save product.');
    }
  }

  async deleteAdminProduct(product: Product) {
    const confirmed = window.confirm(`Delete ${product.name}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    if (!this.supabase) {
      this.adminProducts.update((products) => products.filter((item) => item.id !== product.id));
      this.adminStatus.set(`Removed ${product.name} from this admin view.`);
      return;
    }

    try {
      const { error } = await this.supabase.from('products').delete().eq('id', product.id);

      if (error) {
        throw error;
      }

      this.adminStatus.set(`Deleted ${product.name}. Refreshing data...`);
      await this.loadAdminData();
      await this.loadProductsFromSupabase();
    } catch {
      this.adminStatus.set('Could not delete product.');
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

  async uploadProductImage(product: Product, event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.adminStatus.set('Please choose an image file.');
      return;
    }

    if (file.size > 2_000_000) {
      this.adminStatus.set('Image is too large. Please upload an image below 2 MB.');
      return;
    }

    try {
      if (!this.supabase) {
        this.adminStatus.set('Supabase URL/key is missing.');
        return;
      }

      this.adminStatus.set(`Uploading image for ${product.name}...`);
      const dataUrl = await this.readFileAsDataUrl(file);
      product.image = dataUrl;
      await this.ensureSupabaseProductExists(product);

      const extension = file.name.split('.').pop() || 'jpg';
      const filePath = `products/${product.id}-${Date.now()}.${extension}`;
      const { error: uploadError } = await this.supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = this.supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filePath);
      product.image = data.publicUrl;
      await this.saveAdminProduct(product);
      this.adminStatus.set('Image uploaded and saved.');
    } catch {
      this.adminStatus.set('Could not upload image.');
    }
  }

  readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });
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

    if (!this.supabase) {
      this.adminStatus.set('Supabase URL/key is missing.');
      return;
    }

    try {
      const { error } = await this.supabase.from('orders').update({ status }).eq('id', order.orderId);

      if (error) {
        throw error;
      }

      this.adminStatus.set(`Order ${order.orderId} marked ${status}.`);
    } catch {
      this.adminStatus.set('Could not update order status.');
    }
  }

  createSupabaseClient() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return null;
    }

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  mapProductRow(row: ProductRow): Product {
    return {
      id: Number(row.id),
      name: row.name,
      category: row.category || 'Accessories',
      price: Number(row.price || 0),
      image: row.image_url || '',
      sizes: Array.isArray(row.sizes)
        ? row.sizes
        : String(row.sizes || 'Free')
            .split(',')
            .map((size) => size.trim())
            .filter(Boolean),
      stock: Number(row.stock || 0),
      active: row.active,
    };
  }

  mapOrderRow(row: OrderRow): AdminOrder {
    return {
      orderId: row.id,
      createdAt: row.created_at,
      customerName: row.customer_name,
      phone: row.phone,
      address: row.address,
      items: row.items,
      total: Number(row.total || 0),
      paymentMethod: row.payment_method,
      paymentStatus: row.status,
      adminVerification: row.status,
      fulfillmentStatus: row.status,
    };
  }

  productToRow(product: Product) {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      price: Number(product.price || 0),
      image_url: product.image || null,
      sizes: product.sizes,
      stock: Number(product.stock || 0),
      active: Boolean(product.active),
    };
  }

  orderItemsText() {
    return this.cart()
      .map(
        (item) =>
          `${item.name} | Size: ${item.size} | Qty: ${item.qty} | Rs ${item.price * item.qty}`,
      )
      .join('\n');
  }

  async reduceSupabaseStock() {
    if (!this.supabase) {
      return;
    }

    const supabase = this.supabase;

    await Promise.all(
      this.cart().map((item) =>
        supabase
          .from('products')
          .update({ stock: Math.max(0, Number(item.stock || 0) - Number(item.qty || 1)) })
          .eq('id', item.id),
      ),
    );

    await this.loadProductsFromSupabase();
  }

  async ensureSupabaseProductExists(product: Product) {
    if (!this.supabase) {
      return;
    }

    const { error } = await this.supabase.from('products').upsert(this.productToRow(product));

    if (error) {
      throw error;
    }
  }

  createOrderId() {
    const date = new Date();
    const stamp = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
      '-',
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0'),
    ].join('');

    return `ORD-${stamp}`;
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  }

  formatMessagePrice(price: number) {
    return `Rs ${new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(price)}`;
  }
}
