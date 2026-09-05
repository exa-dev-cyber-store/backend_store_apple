import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import UserModel from '../app/users/model';
import CartModel from '../app/cart/model';
import ProductModel from '../app/products/model';
import OrderModel from '../app/orders/model';
import InvoiceModel from '../app/invoices/model';
import CategoryModel from '../app/categories/model';
import DeliveryAddressModel from '../app/deliveryAddress/model';
import { seedAppleProducts } from './seed-apple-products';
import { seedHistoricalOrders } from './auto-generate-orders';

dotenv.config();

async function resetAndSeedAll() {
  console.log('======================================================');
  console.log('       CYBER APPLE STORE - RESET & MASTER SEEDER      ');
  console.log('======================================================\n');

  const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
  console.log(`Connecting to MongoDB (${process.env.DB_NAME})...`);
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.\n');

  // Step 1: Ensure Essential Users & Admins
  console.log('--- Step 1: Checking & Ensuring Essential Accounts ---');
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);
  const userPasswordHash = await bcrypt.hash('user123', salt);

  // Admin Account 1: admin@cyber.store
  let admin = await UserModel.findOne({ email: 'admin@cyber.store' });
  if (!admin) {
    admin = await UserModel.create({
      name: 'Cyber Store Admin',
      email: 'admin@cyber.store',
      password: adminPasswordHash,
      role: 'admin',
    });
    console.log('  + Created admin: admin@cyber.store / admin123');
  } else {
    admin.role = 'admin';
    if (!admin.password) admin.password = adminPasswordHash;
    await admin.save();
    console.log('  * Preserved admin: admin@cyber.store');
  }

  // Admin Account 2: bloodsuker18@gmail.com
  let rootAdmin = await UserModel.findOne({ email: 'bloodsuker18@gmail.com' });
  if (rootAdmin) {
    rootAdmin.role = 'admin';
    await rootAdmin.save();
    console.log('  * Preserved admin: bloodsuker18@gmail.com');
  }

  // Demo User Account: ekasyafrinonazhifan@gmail.com
  let demoUser = await UserModel.findOne({ email: 'ekasyafrinonazhifan@gmail.com' });
  if (!demoUser) {
    demoUser = await UserModel.create({
      name: 'Eka Syafrino Nazhifan',
      email: 'ekasyafrinonazhifan@gmail.com',
      password: userPasswordHash,
      role: 'user',
    });
    console.log('  + Created user: ekasyafrinonazhifan@gmail.com / user123');
  } else {
    if (!demoUser.password) {
      demoUser.password = userPasswordHash;
      await demoUser.save();
    }
    console.log('  * Preserved user: ekasyafrinonazhifan@gmail.com');
  }

  // Step 2: Ensure Sample Delivery Addresses exist for demoUser
  const existingAddresses = await DeliveryAddressModel.find({ user: demoUser._id });
  if (existingAddresses.length === 0) {
    await DeliveryAddressModel.create([
      {
        name: 'Rumah Utama Eka',
        provinsi: 'DKI JAKARTA',
        kabupaten: 'KOTA JAKARTA SELATAN',
        kecamatan: 'KEBAYORAN BARU',
        kelurahan: 'SENAYAN',
        detail: 'Jl. Jenderal Sudirman No. 52-53, SCBD Residence Tower A Lt. 12',
        user: demoUser._id,
      },
      {
        name: 'Kantor Cyber',
        provinsi: 'DKI JAKARTA',
        kabupaten: 'KOTA JAKARTA SELATAN',
        kecamatan: 'SETIABUDI',
        kelurahan: 'KUNINGAN TIMUR',
        detail: 'Menara Cyber 2 Lt. 18, Jl. HR Rasuna Said Blok X-5',
        user: demoUser._id,
      },
    ]);
    console.log('  + Created 2 delivery addresses for demo user.');
  }

  // Step 3: Clear Carts
  console.log('\n--- Step 2: Resetting Active Carts ---');
  await CartModel.deleteMany({});
  console.log('  * Active carts cleared.');

  // Step 4: Seed Authentic Apple Products
  console.log('\n--- Step 3: Seeding Authentic Apple Products ---');
  await seedAppleProducts();

  // Step 5: Seed Historical Orders & Invoices across 2026
  console.log('\n--- Step 4: Seeding Historical & Daily Orders ---');
  await seedHistoricalOrders();

  // Step 6: Final Verification & Statistics
  console.log('\n======================================================');
  console.log('                 FINAL DATA SUMMARY                   ');
  console.log('======================================================');
  const catCount = await CategoryModel.countDocuments();
  const prodCount = await ProductModel.countDocuments();
  const userCount = await UserModel.countDocuments();
  const orderCount = await OrderModel.countDocuments();
  const invoiceCount = await InvoiceModel.countDocuments();
  const completedOrders = await OrderModel.countDocuments({ status_payment: 'completed' });
  const pendingOrders = await OrderModel.countDocuments({ status_payment: 'pending' });
  const cancelledOrders = await OrderModel.countDocuments({ status_payment: 'cancelled' });

  console.log(`Categories   : ${catCount} categories`);
  console.log(`Products     : ${prodCount} authentic Apple products`);
  console.log(`Users        : ${userCount} registered users`);
  console.log(`Total Orders : ${orderCount} orders`);
  console.log(`  - Completed: ${completedOrders}`);
  console.log(`  - Pending  : ${pendingOrders}`);
  console.log(`  - Cancelled: ${cancelledOrders}`);
  console.log(`Invoices     : ${invoiceCount} invoices`);
  console.log('======================================================\n');

  await mongoose.disconnect();
  console.log('Database connection closed. Seeding finished successfully!');
}

resetAndSeedAll().catch((err) => {
  console.error('Fatal error during reset and seed:', err);
  process.exit(1);
});
