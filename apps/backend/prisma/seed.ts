import { PrismaClient, UserRole, UserStatus, MerchantStatus, DeviceType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Platform Admin
  const adminPasswordHash = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tapflow.app' },
    update: {},
    create: {
      email: 'admin@tapflow.app',
      passwordHash: adminPasswordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      role: UserRole.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // Demo Merchant Owner
  const ownerPasswordHash = await bcrypt.hash('Demo123!', 12);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo-merchant.com' },
    update: {},
    create: {
      email: 'owner@demo-merchant.com',
      passwordHash: ownerPasswordHash,
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.MERCHANT_OWNER,
      status: UserStatus.ACTIVE,
      emailVerified: true,
    },
  });

  // Demo Merchant
  const merchant = await prisma.merchant.upsert({
    where: { slug: 'demo-coffee-shop' },
    update: {},
    create: {
      name: 'Demo Coffee Shop',
      slug: 'demo-coffee-shop',
      email: 'owner@demo-merchant.com',
      phone: '+15551234567',
      businessType: 'individual',
      status: MerchantStatus.ACTIVE,
      onboardingCompleted: false,
      onboardingStep: 10,
      country: 'US',
      currency: 'usd',
      timezone: 'America/New_York',
      platformFeeRate: 0.01,
    },
  });

  // Associate owner with merchant
  await prisma.merchantUser.upsert({
    where: { merchantId_userId: { merchantId: merchant.id, userId: owner.id } },
    update: {},
    create: {
      merchantId: merchant.id,
      userId: owner.id,
      role: UserRole.MERCHANT_OWNER,
      isOwner: true,
    },
  });

  // Merchant Settings
  await prisma.merchantSettings.upsert({
    where: { merchantId: merchant.id },
    update: {},
    create: {
      merchantId: merchant.id,
      tipsEnabled: true,
      tipPresets: [0.15, 0.18, 0.20, 0.25],
      trackInventory: true,
      lowStockThreshold: 5,
    },
  });

  // Demo Location
  const location = await prisma.location.upsert({
    where: { stripeLocationId: 'demo-location' },
    update: {},
    create: {
      merchantId: merchant.id,
      name: 'Main Store',
      addressLine1: '123 Coffee Lane',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      timezone: 'America/New_York',
      isDefault: true,
      stripeLocationId: 'demo-location',
    },
  });

  // Demo Tax
  const tax = await prisma.tax.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      merchantId: merchant.id,
      name: 'NY Sales Tax',
      rate: 0.08875,
      isInclusive: false,
      isDefault: true,
    },
  });

  // Demo Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { id: '00000000-0000-0000-0000-000000000011' },
      update: {},
      create: { id: '00000000-0000-0000-0000-000000000011', merchantId: merchant.id, name: 'Coffee', color: '#6366f1', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { id: '00000000-0000-0000-0000-000000000012' },
      update: {},
      create: { id: '00000000-0000-0000-0000-000000000012', merchantId: merchant.id, name: 'Food', color: '#f59e0b', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { id: '00000000-0000-0000-0000-000000000013' },
      update: {},
      create: { id: '00000000-0000-0000-0000-000000000013', merchantId: merchant.id, name: 'Cold Drinks', color: '#3b82f6', sortOrder: 3 },
    }),
  ]);

  // Demo Products
  const products = [
    { id: '00000000-0000-0000-0000-000000000021', name: 'Espresso', price: 3.50, categoryId: categories[0].id, sku: 'ESP001' },
    { id: '00000000-0000-0000-0000-000000000022', name: 'Latte', price: 5.00, categoryId: categories[0].id, sku: 'LAT001' },
    { id: '00000000-0000-0000-0000-000000000023', name: 'Cappuccino', price: 4.75, categoryId: categories[0].id, sku: 'CAP001' },
    { id: '00000000-0000-0000-0000-000000000024', name: 'Cold Brew', price: 5.50, categoryId: categories[2].id, sku: 'CB001' },
    { id: '00000000-0000-0000-0000-000000000025', name: 'Croissant', price: 3.25, categoryId: categories[1].id, sku: 'CRO001' },
    { id: '00000000-0000-0000-0000-000000000026', name: 'Avocado Toast', price: 8.50, categoryId: categories[1].id, sku: 'AVO001' },
    { id: '00000000-0000-0000-0000-000000000027', name: 'Blueberry Muffin', price: 3.00, categoryId: categories[1].id, sku: 'MUF001' },
    { id: '00000000-0000-0000-0000-000000000028', name: 'Iced Matcha Latte', price: 6.00, categoryId: categories[2].id, sku: 'MAT001' },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: product.id,
        merchantId: merchant.id,
        name: product.name,
        price: product.price,
        sku: product.sku,
        categoryId: product.categoryId,
        isTaxable: true,
        trackInventory: true,
        isActive: true,
      },
    });

    // Set initial inventory (use findFirst + create to handle nullable variantId in unique constraint)
    const existingInv = await prisma.inventory.findFirst({
      where: { locationId: location.id, productId: product.id, variantId: null },
    });
    if (!existingInv) {
      await prisma.inventory.create({
        data: {
          merchantId: merchant.id,
          locationId: location.id,
          productId: product.id,
          quantity: Math.floor(Math.random() * 50) + 10,
          lowStockThreshold: 5,
        },
      });
    }
  }

  // Demo Cashier Employee
  const cashierPasswordHash = await bcrypt.hash('1234', 10);
  await prisma.employee.upsert({
    where: { id: '00000000-0000-0000-0000-000000000031' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000031',
      merchantId: merchant.id,
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'alex@demo-merchant.com',
      pin: cashierPasswordHash,
      role: UserRole.MERCHANT_CASHIER,
      isActive: true,
    },
  });

  // Demo Device
  await prisma.device.upsert({
    where: { id: '00000000-0000-0000-0000-000000000041' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000041',
      merchantId: merchant.id,
      locationId: location.id,
      name: 'iPhone 15 Pro',
      type: DeviceType.IOS_TAP_TO_PAY,
    },
  });

  console.log('✅ Seed complete!');
  console.log('');
  console.log('Demo accounts:');
  console.log('  Platform Admin: admin@tapflow.app / Admin123!');
  console.log('  Merchant Owner: owner@demo-merchant.com / Demo123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
