import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import OrderModel, { Order } from '../app/orders/model';
import InvoiceModel from '../app/invoices/model';
import ProductModel from '../app/products/model';
import UserModel from '../app/users/model';
import DeliveryAddressModel from '../app/deliveryAddress/model';

dotenv.config();

const indonesianAddresses = [
  {
    name: 'Rumah Jakarta',
    provinsi: 'DKI JAKARTA',
    kabupaten: 'KOTA JAKARTA SELATAN',
    kecamatan: 'KEBAYORAN BARU',
    kelurahan: 'SENAYAN',
    detail: 'Jl. Jenderal Sudirman No. 52-53, Kawasan SCBD Tower A Lt. 12',
  },
  {
    name: 'Kantor Mega Kuningan',
    provinsi: 'DKI JAKARTA',
    kabupaten: 'KOTA JAKARTA SELATAN',
    kecamatan: 'SETIABUDI',
    kelurahan: 'KUNINGAN TIMUR',
    detail: 'Menara Cyber 2 Lt. 18, Jl. HR Rasuna Said Blok X-5 Kav. 13',
  },
  {
    name: 'Rumah Bandung',
    provinsi: 'JAWA BARAT',
    kabupaten: 'KOTA BANDUNG',
    kecamatan: 'COBLONG',
    kelurahan: 'DAGO',
    detail: 'Jl. Ir. H. Juanda No. 128, Perumahan Dago Asri Blok C-15',
  },
  {
    name: 'Apartemen Surabaya',
    provinsi: 'JAWA TIMUR',
    kabupaten: 'KOTA SURABAYA',
    kecamatan: 'GUBENG',
    kelurahan: 'AIRLANGGA',
    detail: 'Grand Dharmahusada Lagoon Tower B Unit 2108, Jl. Raya Dharmahusada',
  },
  {
    name: 'Villa Bali',
    provinsi: 'BALI',
    kabupaten: 'KABUPATEN BADUNG',
    kecamatan: 'KUTA UTARA',
    kelurahan: 'CANGGU',
    detail: 'Jl. Pantai Batu Bolong No. 45B, Canggu Eco Residence',
  },
];

const paymentMethods = [
  'bca_va',
  'mandiri_va',
  'bni_va',
  'bri_va',
  'gopay',
  'qris',
  'credit_card',
];

export function buildRandomOrder(
  user: any,
  allProducts: any[],
  address: any,
  date: Date,
  forceStatus?: { payment?: string; delivery?: string }
) {
  // Pick 1-3 distinct products
  const numItems = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
  const selectedProducts = shuffled.slice(0, numItems);

  const orderItems = selectedProducts.map((p) => {
    const qty = Math.floor(Math.random() * 2) + 1; // 1 or 2
    return {
      _id: p._id,
      name: p.name,
      price: p.price,
      quantity: qty,
    };
  });

  const subtotal = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.11); // 11% PPN
  const shipping = subtotal > 15000000 ? 0 : 50000;
  const hasDiscount = Math.random() > 0.6;
  const discount = hasDiscount ? (subtotal > 20000000 ? 1000000 : 500000) : 0;
  const total = subtotal + tax + shipping - discount;

  const now = new Date('2026-09-06T01:50:00.000Z');
  const daysDiff = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);

  let status_payment = forceStatus?.payment;
  if (!status_payment) {
    if (daysDiff > 5) {
      status_payment = Math.random() < 0.88 ? 'completed' : 'cancelled';
    } else {
      const rand = Math.random();
      if (rand < 0.70) status_payment = 'completed';
      else if (rand < 0.90) status_payment = 'pending';
      else status_payment = 'cancelled';
    }
  }

  let status_delivery = forceStatus?.delivery;
  if (!status_delivery) {
    if (status_payment === 'completed') {
      if (daysDiff > 3) status_delivery = 'delivered';
      else if (daysDiff > 1) status_delivery = 'process';
      else status_delivery = 'pending';
    } else if (status_payment === 'cancelled') {
      status_delivery = 'cancelled';
    } else {
      status_delivery = 'pending';
    }
  }

  const payment_method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
  const token = `TRX-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const orderId = new Types.ObjectId();

  const orderDoc = {
    _id: orderId,
    user: user._id,
    order_items: orderItems,
    delivery_address: {
      provinsi: address.provinsi,
      kabupaten: address.kabupaten,
      name: user.name || address.name,
      kecamatan: address.kecamatan,
      kelurahan: address.kelurahan,
      detail: address.detail,
    },
    total,
    tax,
    shipping,
    discount,
    status_payment,
    status_delivery,
    payment_method,
    token,
    url_redirect: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${token}`,
    createdAt: date,
    updatedAt: date,
  };

  const invoiceDoc = {
    _id: new Types.ObjectId(),
    order: orderId,
    user: user._id,
    delivery_address: orderDoc.delivery_address,
    quantity: orderItems.reduce((acc, i) => acc + i.quantity, 0),
    total,
    tax,
    shipping,
    discount,
    status_payment,
    status_delivery,
    payment_method,
    createdAt: date,
    updatedAt: date,
  };

  return { orderDoc, invoiceDoc };
}

export async function seedHistoricalOrders(): Promise<void> {
  console.log('Fetching users and products for order generation...');
  const users = await UserModel.find({}).lean();
  const products = await ProductModel.find({}).lean();
  const existingAddresses = await DeliveryAddressModel.find({}).lean();

  if (users.length === 0 || products.length === 0) {
    throw new Error('Users and products must be present before seeding orders.');
  }

  const addresses = existingAddresses.length > 0 ? existingAddresses : indonesianAddresses;

  console.log('Cleaning old orders and invoices...');
  await OrderModel.deleteMany({});
  await InvoiceModel.deleteMany({});
  console.log('Orders and invoices cleared.');

  console.log('Generating realistic monthly & daily orders for 2026...');

  const ordersToInsert: any[] = [];
  const invoicesToInsert: any[] = [];

  // Monthly order targets for 2026 (Jan - Aug)
  const monthlyPlan = [
    { month: 0, daysInMonth: 31, count: 12 }, // Jan
    { month: 1, daysInMonth: 28, count: 14 }, // Feb
    { month: 2, daysInMonth: 31, count: 18 }, // Mar
    { month: 3, daysInMonth: 30, count: 20 }, // Apr
    { month: 4, daysInMonth: 31, count: 24 }, // May
    { month: 5, daysInMonth: 30, count: 26 }, // Jun
    { month: 6, daysInMonth: 31, count: 30 }, // Jul
    { month: 7, daysInMonth: 31, count: 35 }, // Aug
  ];

  for (const p of monthlyPlan) {
    for (let i = 0; i < p.count; i++) {
      const day = Math.floor(Math.random() * p.daysInMonth) + 1;
      const hour = Math.floor(Math.random() * 14) + 8; // 08:00 - 22:00
      const minute = Math.floor(Math.random() * 60);
      const date = new Date(2026, p.month, day, hour, minute);

      const user = users[Math.floor(Math.random() * users.length)];
      const address = addresses[Math.floor(Math.random() * addresses.length)];

      const { orderDoc, invoiceDoc } = buildRandomOrder(user, products, address, date);
      ordersToInsert.push(orderDoc);
      invoicesToInsert.push(invoiceDoc);
    }
  }

  // Daily orders for September 2026 (Sept 1 to Sept 6)
  // Ensure the primary demo customer (ekasyafrinonazhifan@gmail.com) has active orders!
  const primaryCustomer = users.find((u: any) => u.email === 'ekasyafrinonazhifan@gmail.com') || users[0];

  for (let day = 1; day <= 6; day++) {
    const ordersPerDay = day === 6 ? 4 : Math.floor(Math.random() * 3) + 3; // 3-5 orders daily
    for (let j = 0; j < ordersPerDay; j++) {
      const hour = day === 6 ? Math.min(Math.floor(Math.random() * 12) + 1, 1) : Math.floor(Math.random() * 14) + 8;
      const minute = Math.floor(Math.random() * 60);
      const date = new Date(2026, 8, day, hour, minute); // Month 8 is September (0-indexed)

      // Guarantee at least 1 order per day for primaryCustomer
      const user = j === 0 ? primaryCustomer : users[Math.floor(Math.random() * users.length)];
      const address = addresses[Math.floor(Math.random() * addresses.length)];

      const { orderDoc, invoiceDoc } = buildRandomOrder(user, products, address, date);
      ordersToInsert.push(orderDoc);
      invoicesToInsert.push(invoiceDoc);
    }
  }

  // Ensure primaryCustomer also has 1 pending order and 1 completed order today
  const pendingToday = buildRandomOrder(primaryCustomer, products, addresses[0], new Date(2026, 8, 6, 0, 45), {
    payment: 'pending',
    delivery: 'pending',
  });
  ordersToInsert.push(pendingToday.orderDoc);
  invoicesToInsert.push(pendingToday.invoiceDoc);

  console.log(`Inserting ${ordersToInsert.length} orders & invoices with custom timestamps...`);

  await OrderModel.insertMany(ordersToInsert);
  await InvoiceModel.insertMany(invoicesToInsert);

  console.log(`Successfully seeded ${ordersToInsert.length} orders and invoices across 2026!`);
}

if (require.main === module) {
  const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
  mongoose.connect(dbUri).then(async () => {
    await seedHistoricalOrders();
    await mongoose.disconnect();
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
