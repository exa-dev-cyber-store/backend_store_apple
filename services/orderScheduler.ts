import { Types } from 'mongoose';
import OrderModel from '../app/orders/model';
import InvoiceModel from '../app/invoices/model';
import ProductModel from '../app/products/model';
import UserModel from '../app/users/model';
import DeliveryAddressModel from '../app/deliveryAddress/model';
import { buildRandomOrder } from '../scripts/auto-generate-orders';

export async function generateSingleRandomOrder(customDate?: Date) {
  const users = await UserModel.find({ role: 'user' }).lean();
  const allUsers = users.length > 0 ? users : await UserModel.find({}).lean();
  const products = await ProductModel.find({}).lean();
  const addresses = await DeliveryAddressModel.find({}).lean();

  if (allUsers.length === 0 || products.length === 0) {
    throw new Error('Cannot generate order: No users or products found in database.');
  }

  const user = allUsers[Math.floor(Math.random() * allUsers.length)];
  const fallbackAddress = {
    name: user.name || 'Pelanggan Apple',
    provinsi: 'DKI JAKARTA',
    kabupaten: 'KOTA JAKARTA SELATAN',
    kecamatan: 'KEBAYORAN BARU',
    kelurahan: 'SENAYAN',
    detail: 'Jl. Jenderal Sudirman No. 52-53, SCBD Suites',
  };

  const address = addresses.length > 0
    ? addresses[Math.floor(Math.random() * addresses.length)]
    : fallbackAddress;

  const date = customDate || new Date();
  const { orderDoc, invoiceDoc } = buildRandomOrder(user, products, address, date);

  const createdOrder = await OrderModel.create(orderDoc);
  const createdInvoice = await InvoiceModel.create(invoiceDoc);

  return { order: createdOrder, invoice: createdInvoice };
}

let schedulerTimer: NodeJS.Timeout | null = null;

export function startDailyOrderScheduler() {
  console.log('[Daily Order Scheduler] Initializing daily order generator service...');

  // Quick initial check after 10 seconds: ensure today has at least 1 order
  setTimeout(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const countToday = await OrderModel.countDocuments({
        createdAt: { $gte: todayStart },
      });

      if (countToday === 0) {
        console.log('[Daily Order Scheduler] No order found for today. Generating daily order...');
        const result = await generateSingleRandomOrder();
        console.log(`[Daily Order Scheduler] Daily order created successfully: ${result.order._id} (${result.order.payment_method})`);
      } else {
        console.log(`[Daily Order Scheduler] Today already has ${countToday} orders. Standing by.`);
      }
    } catch (err) {
      console.warn('[Daily Order Scheduler] Initialization check warning:', err);
    }
  }, 10000);

  // Interval check every 6 hours: if fewer than 2 orders today, generate an order
  const INTERVAL_MS = 6 * 60 * 60 * 1000;
  schedulerTimer = setInterval(async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const countToday = await OrderModel.countDocuments({
        createdAt: { $gte: todayStart },
      });

      if (countToday < 5) {
        console.log('[Daily Order Scheduler] Generating automated daily order...');
        const result = await generateSingleRandomOrder();
        console.log(`[Daily Order Scheduler] Generated order: ${result.order._id} - Total: Rp ${result.order.total?.toLocaleString('id-ID')}`);
      }
    } catch (err) {
      console.error('[Daily Order Scheduler] Error during periodic execution:', err);
    }
  }, INTERVAL_MS);
}
