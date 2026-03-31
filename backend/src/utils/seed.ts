import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Store from '../models/Store';
import Product from '../models/Product';
import Inventory from '../models/Inventory';
import Customer from '../models/Customer';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pos_system';

const stores = [
  {
    name: 'Mumbai Flagship',
    code: 'MUM-01',
    type: 'physical',
    address: { street: '123 MG Road', city: 'Mumbai', state: 'Maharashtra', country: 'IN', postalCode: '400001' },
    contact: { phone: '+91 9800000001', email: 'mumbai@retailos.com' },
    taxRate: 18,
    currency: 'INR',
  },
  {
    name: 'Pune Store',
    code: 'PUN-01',
    type: 'physical',
    address: { street: '45 FC Road', city: 'Pune', state: 'Maharashtra', country: 'IN', postalCode: '411004' },
    contact: { phone: '+91 9800000002', email: 'pune@retailos.com' },
    taxRate: 18,
    currency: 'INR',
  },
  {
    name: 'Central Warehouse',
    code: 'WH-CENTRAL',
    type: 'warehouse',
    address: { street: 'MIDC Industrial Area', city: 'Pune', state: 'Maharashtra', country: 'IN', postalCode: '411018' },
    contact: { phone: '+91 9800000003', email: 'warehouse@retailos.com' },
    taxRate: 18,
    currency: 'INR',
  },
];

const products = [
  {
    name: 'Premium Cotton T-Shirt',
    description: 'Soft 100% cotton unisex tee with reinforced stitching',
    category: 'Apparel',
    subCategory: 'Tops',
    brand: 'RetailCo',
    basePrice: 799,
    taxCategory: 'standard',
    taxRate: 5,
    variants: [
      { sku: 'TSH-WHT-S', attributes: { color: 'White', size: 'S' }, price: 799, barcode: '8901234567890' },
      { sku: 'TSH-WHT-M', attributes: { color: 'White', size: 'M' }, price: 799, barcode: '8901234567891' },
      { sku: 'TSH-WHT-L', attributes: { color: 'White', size: 'L' }, price: 799, barcode: '8901234567892' },
      { sku: 'TSH-BLK-M', attributes: { color: 'Black', size: 'M' }, price: 849, barcode: '8901234567893' },
    ],
    trackInventory: true,
    lowStockThreshold: 5,
    tags: ['cotton', 'casual', 'unisex'],
  },
  {
    name: 'Slim Fit Denim Jeans',
    description: 'Classic slim-fit denim with stretch comfort fabric',
    category: 'Apparel',
    subCategory: 'Bottoms',
    brand: 'RetailCo',
    basePrice: 1999,
    taxCategory: 'standard',
    taxRate: 12,
    variants: [
      { sku: 'JNS-BLU-30', attributes: { color: 'Blue', waist: '30' }, price: 1999, barcode: '8901234568001' },
      { sku: 'JNS-BLU-32', attributes: { color: 'Blue', waist: '32' }, price: 1999, barcode: '8901234568002' },
      { sku: 'JNS-BLK-32', attributes: { color: 'Black', waist: '32' }, price: 2199, barcode: '8901234568003' },
    ],
    trackInventory: true,
    lowStockThreshold: 3,
    tags: ['denim', 'jeans', 'slim-fit'],
  },
  {
    name: 'Leather Running Shoes',
    description: 'Lightweight breathable running shoes with memory foam insole',
    category: 'Footwear',
    subCategory: 'Sports',
    brand: 'SpeedStep',
    basePrice: 3499,
    taxCategory: 'standard',
    taxRate: 18,
    variants: [
      { sku: 'SHO-WHT-7', attributes: { color: 'White', size: '7' }, price: 3499, barcode: '8901234569001' },
      { sku: 'SHO-WHT-8', attributes: { color: 'White', size: '8' }, price: 3499, barcode: '8901234569002' },
      { sku: 'SHO-WHT-9', attributes: { color: 'White', size: '9' }, price: 3499, barcode: '8901234569003' },
      { sku: 'SHO-BLK-8', attributes: { color: 'Black', size: '8' }, price: 3799, barcode: '8901234569004' },
    ],
    trackInventory: true,
    lowStockThreshold: 4,
    tags: ['shoes', 'running', 'sports'],
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: '750ml double-wall insulated bottle, keeps cold 24h / hot 12h',
    category: 'Accessories',
    subCategory: 'Drinkware',
    basePrice: 699,
    taxCategory: 'standard',
    taxRate: 18,
    variants: [
      { sku: 'BTL-SLV-750', attributes: { color: 'Silver', volume: '750ml' }, price: 699, barcode: '8901234570001' },
      { sku: 'BTL-BLK-750', attributes: { color: 'Black', volume: '750ml' }, price: 699, barcode: '8901234570002' },
      { sku: 'BTL-RED-1L',  attributes: { color: 'Red',   volume: '1L'    }, price: 849, barcode: '8901234570003' },
    ],
    trackInventory: true,
    lowStockThreshold: 10,
    tags: ['bottle', 'hydration', 'eco'],
  },
  {
    name: 'Wireless Bluetooth Earbuds',
    description: 'True wireless stereo earbuds with 6h playback + charging case',
    category: 'Electronics',
    subCategory: 'Audio',
    brand: 'SoundWave',
    basePrice: 2499,
    taxCategory: 'standard',
    taxRate: 18,
    variants: [
      { sku: 'EBD-WHT-STD', attributes: { color: 'White' }, price: 2499, barcode: '8901234571001' },
      { sku: 'EBD-BLK-STD', attributes: { color: 'Black' }, price: 2499, barcode: '8901234571002' },
    ],
    trackInventory: true,
    lowStockThreshold: 5,
    tags: ['earbuds', 'bluetooth', 'wireless', 'audio'],
  },
  {
    name: 'Organic Green Tea (100g)',
    description: 'Premium Darjeeling first-flush green tea, loose leaf',
    category: 'Food & Beverage',
    subCategory: 'Tea',
    basePrice: 349,
    taxCategory: 'reduced',
    taxRate: 5,
    variants: [
      { sku: 'TEA-GRN-100G', attributes: { weight: '100g' }, price: 349, barcode: '8901234572001' },
      { sku: 'TEA-GRN-250G', attributes: { weight: '250g' }, price: 799, barcode: '8901234572002' },
    ],
    trackInventory: true,
    lowStockThreshold: 20,
    tags: ['tea', 'organic', 'green-tea', 'darjeeling'],
  },
  {
    name: 'Yoga Mat (6mm)',
    description: 'Non-slip TPE yoga mat with alignment lines, 183x61cm',
    category: 'Sports & Fitness',
    subCategory: 'Yoga',
    basePrice: 1299,
    taxCategory: 'standard',
    taxRate: 18,
    variants: [
      { sku: 'YGA-PRP-6MM', attributes: { color: 'Purple' }, price: 1299, barcode: '8901234573001' },
      { sku: 'YGA-BLU-6MM', attributes: { color: 'Blue'   }, price: 1299, barcode: '8901234573002' },
      { sku: 'YGA-GRN-6MM', attributes: { color: 'Green'  }, price: 1299, barcode: '8901234573003' },
    ],
    trackInventory: true,
    lowStockThreshold: 5,
    tags: ['yoga', 'fitness', 'mat', 'exercise'],
  },
  {
    name: 'Leather Wallet (Slim)',
    description: 'Genuine full-grain leather slim bifold wallet, RFID-blocking',
    category: 'Accessories',
    subCategory: 'Wallets',
    basePrice: 999,
    taxCategory: 'standard',
    taxRate: 18,
    variants: [
      { sku: 'WLT-BRN-SLIM', attributes: { color: 'Brown' }, price: 999,  barcode: '8901234574001' },
      { sku: 'WLT-BLK-SLIM', attributes: { color: 'Black' }, price: 999,  barcode: '8901234574002' },
      { sku: 'WLT-TAN-SLIM', attributes: { color: 'Tan'   }, price: 1099, barcode: '8901234574003' },
    ],
    trackInventory: true,
    lowStockThreshold: 8,
    tags: ['wallet', 'leather', 'rfid', 'slim'],
  },
];

const customers = [
  { name: 'Priya Sharma',    phone: '9811111111', email: 'priya@example.com',    loyaltyPoints: 450, totalPurchases: 12, totalSpent: 45000 },
  { name: 'Rahul Mehta',     phone: '9822222222', email: 'rahul@example.com',    loyaltyPoints: 210, totalPurchases: 7,  totalSpent: 21000 },
  { name: 'Ananya Singh',    phone: '9833333333', email: 'ananya@example.com',   loyaltyPoints: 890, totalPurchases: 24, totalSpent: 89000 },
  { name: 'Vikram Patel',    phone: '9844444444',                                loyaltyPoints: 120, totalPurchases: 3,  totalSpent: 12000 },
  { name: 'Deepika Reddy',   phone: '9855555555', email: 'deepika@example.com',  loyaltyPoints: 670, totalPurchases: 18, totalSpent: 67000 },
];

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected');

  // Drop existing collections
  console.log('🗑️  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Store.deleteMany({}),
    Product.deleteMany({}),
    Inventory.deleteMany({}),
    Customer.deleteMany({}),
  ]);

  // --- Stores ---
  console.log('🏪 Seeding stores...');
  const createdStores = await Store.insertMany(stores);
  const mumbaiStore = createdStores[0];
  const puneStore   = createdStores[1];
  console.log(`   Created ${createdStores.length} stores`);

  // --- Users ---
  console.log('👤 Seeding users...');
  const adminUser = await User.create({
    name: 'Admin User',
    email: 'admin@retailos.com',
    password: 'password123',
    role: 'admin',
    isActive: true,
  });

  await User.create([
    {
      name: 'Inventory Manager',
      email: 'inventory@retailos.com',
      password: 'password123',
      role: 'inventory_manager',
      storeId: mumbaiStore._id,
      isActive: true,
    },
    {
      name: 'Mumbai Cashier',
      email: 'cashier.mumbai@retailos.com',
      password: 'password123',
      role: 'cashier',
      storeId: mumbaiStore._id,
      isActive: true,
    },
    {
      name: 'Pune Cashier',
      email: 'cashier.pune@retailos.com',
      password: 'password123',
      role: 'cashier',
      storeId: puneStore._id,
      isActive: true,
    },
  ]);
  console.log('   Created 4 users (admin, inventory_manager, 2x cashier)');

  // --- Products ---
  console.log('📦 Seeding products...');
  const createdProducts = await Product.insertMany(
    products.map(p => ({ ...p, createdBy: adminUser._id }))
  );
  console.log(`   Created ${createdProducts.length} products`);

  // --- Inventory (Mumbai + Pune for each product variant) ---
  console.log('📊 Seeding inventory...');
  const inventoryDocs: object[] = [];
  for (const product of createdProducts) {
    for (const variant of product.variants) {
      const baseQty = Math.floor(Math.random() * 80) + 20; // 20–100 units
      inventoryDocs.push({
        productId: product._id,
        variantSku: variant.sku,
        storeId: mumbaiStore._id,
        quantityOnHand: baseQty,
        quantityReserved: 0,
        reorderPoint: product.lowStockThreshold || 10,
        reorderQuantity: 50,
        transactions: [{
          type: 'restock',
          quantity: baseQty,
          note: 'Initial stock seed',
          performedBy: adminUser._id,
          timestamp: new Date(),
        }],
      });
      inventoryDocs.push({
        productId: product._id,
        variantSku: variant.sku,
        storeId: puneStore._id,
        quantityOnHand: Math.max(2, Math.floor(baseQty / 2)),
        quantityReserved: 0,
        reorderPoint: product.lowStockThreshold || 10,
        reorderQuantity: 30,
        transactions: [{
          type: 'restock',
          quantity: Math.max(2, Math.floor(baseQty / 2)),
          note: 'Initial stock seed',
          performedBy: adminUser._id,
          timestamp: new Date(),
        }],
      });
    }
  }
  // Set a couple to low-stock for demo purposes
  if (inventoryDocs.length > 2) {
    (inventoryDocs[0] as { quantityOnHand: number }).quantityOnHand = 3;
    (inventoryDocs[4] as { quantityOnHand: number }).quantityOnHand = 1;
  }
  await Inventory.insertMany(inventoryDocs);
  console.log(`   Created ${inventoryDocs.length} inventory records`);

  // --- Customers ---
  console.log('🧑‍🤝‍🧑 Seeding customers...');
  await Customer.insertMany(customers);
  console.log(`   Created ${customers.length} customers`);

  console.log('\n✅ Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Login credentials:');
  console.log('  Admin:             admin@retailos.com / password123');
  console.log('  Inventory Manager: inventory@retailos.com / password123');
  console.log('  Cashier (Mumbai):  cashier.mumbai@retailos.com / password123');
  console.log('  Cashier (Pune):    cashier.pune@retailos.com / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
