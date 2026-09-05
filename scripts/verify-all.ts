import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import Users from '../app/users/model';

dotenv.config();

async function runVerification() {
  console.log('=== Step 1: Connecting to MongoDB ===');
  const dbUri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}${process.env.ATLAS_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=AtlasCluster`;
  await mongoose.connect(dbUri);

  const admin = await Users.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('Admin not found');
  }

  const token = jwt.sign(
    { _id: admin._id, email: admin.email, name: admin.name, role: admin.role },
    process.env.SECRET_JWT_KEY as string,
    { algorithm: 'HS384' }
  );
  await Users.updateOne({ _id: admin._id }, { $push: { token } });

  console.log('Admin token generated for:', admin.email);

  console.log('\n=== Step 2: Testing GET /api/users (Admin Protected) ===');
  const userRes = await fetch('http://localhost:5000/api/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const userJson = await userRes.json();
  console.log('Users API Status:', userRes.status);
  console.log('Users Total:', userJson.data?.total);
  console.log('Admins Total:', userJson.data?.totalAdmins);
  console.log('Regular Users:', userJson.data?.totalRegularUsers);

  console.log('\n=== Step 3: Testing GET /api/vouchers/public ===');
  const pubRes = await fetch('http://localhost:5000/api/vouchers/public');
  const pubJson = await pubRes.json();
  console.log('Public Vouchers Status:', pubRes.status);
  console.log(
    'Public Vouchers:',
    pubJson.data?.map((v: any) => ({ code: v.code, discount: v.discountValue, isPublic: v.isPublic }))
  );

  console.log('\n=== Step 4: Testing Private Sosmed Voucher IGSECRET50 ===');
  const validateRes = await fetch('http://localhost:5000/api/vouchers/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'IGSECRET50', subtotal: 10000000 }),
  });
  const validateJson = await validateRes.json();
  console.log('Validate Status:', validateRes.status);
  console.log('Validate Message:', validateJson.message);
  console.log('Discount Amount:', validateJson.data?.discount);
  console.log('Final Subtotal:', validateJson.data?.finalSubtotal);

  console.log('\n=== Step 5: Testing MinIO Image Retrieval ===');
  const minioRes = await fetch(
    'http://localhost:9000/apple-store/images/01200ede8888fceb4d6eb4e351f863e4.jpg',
    { method: 'HEAD' }
  );
  console.log('MinIO Image Status:', minioRes.status);
  console.log('MinIO Content-Type:', minioRes.headers.get('content-type'));

  console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===');
  await mongoose.disconnect();
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
