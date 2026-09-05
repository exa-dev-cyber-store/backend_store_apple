import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vouchers from '../app/vouchers/model';

dotenv.config();

const sampleVouchers = [
  {
    code: 'CYBER20',
    title: 'Diskon 20% Gadget Apple',
    discountType: 'percentage',
    discountValue: 20,
    minPurchase: 5000000,
    maxDiscount: 2000000,
    isPublic: true,
    isActive: true,
    validUntil: new Date('2027-12-31T23:59:59.000Z'),
    usageLimit: 100,
    usedCount: 0,
  },
  {
    code: 'APPLEFEST',
    title: 'Potongan Spesial Rp 500.000',
    discountType: 'fixed',
    discountValue: 500000,
    minPurchase: 10000000,
    maxDiscount: 0,
    isPublic: true,
    isActive: true,
    validUntil: new Date('2027-12-31T23:59:59.000Z'),
    usageLimit: 50,
    usedCount: 0,
  },
  {
    code: 'IGSECRET50',
    title: 'Promo Eksklusif Feed IG 50%',
    discountType: 'percentage',
    discountValue: 50,
    minPurchase: 3000000,
    maxDiscount: 1500000,
    isPublic: false, // Private sosmed exclusive!
    isActive: true,
    validUntil: new Date('2027-12-31T23:59:59.000Z'),
    usageLimit: 20,
    usedCount: 0,
  },
  {
    code: 'TIKTOKDEAL',
    title: 'Flash Deal TikTok Community Rp 750.000',
    discountType: 'fixed',
    discountValue: 750000,
    minPurchase: 8000000,
    maxDiscount: 0,
    isPublic: false, // Private sosmed exclusive!
    isActive: true,
    validUntil: new Date('2027-12-31T23:59:59.000Z'),
    usageLimit: 30,
    usedCount: 0,
  },
];

async function seed() {
  const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
  await mongoose.connect(dbUri);
  console.log('Connected to MongoDB.');

  for (const v of sampleVouchers) {
    await Vouchers.findOneAndUpdate({ code: v.code }, v, { upsert: true, new: true });
    console.log(`Seeded voucher: ${v.code} (isPublic: ${v.isPublic})`);
  }

  console.log('Voucher seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
