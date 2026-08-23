import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Category from '@/models/Category';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Supplier from '@/models/Supplier';
import Settings from '@/models/Settings';
import { requireRoles } from '@/lib/auth-helpers';

// Simple in-memory rate limiter for the seed route (5 minutes)
const RATE_LIMIT_WINDOW = 5 * 60 * 1000;
let lastSeedTime = 0;

export async function GET(req: Request) {
  try {
    const now = Date.now();
    if (now - lastSeedTime < RATE_LIMIT_WINDOW) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait 5 minutes before seeding again.' },
        { status: 429 }
      );
    }
    
    await dbConnect();
    
    // Only superadmins can trigger the database seed
    const { error } = await requireRoles(['superadmin']);
    if (error) return error;

    // Update the rate limit timestamp only if auth succeeds
    lastSeedTime = now;

    // Create default settings
    const existingSettings = await Settings.findOne();
    if (!existingSettings) {
      await Settings.create({
        storeName: 'KH Mart',
        storeNameKh: 'ខេ អេស ម៉ាត',
        address: 'No. 123, Street 271, Phnom Penh, Cambodia',
        phone: '+855 23 000 000',
        taxRate: 10,
        exchangeRate: 4100,
      });
    }

    // We are no longer creating demo accounts here.

    // Create categories
    const existingCats = await Category.countDocuments();
    let categories: any[] = [];
    if (existingCats === 0) {
      categories = await Category.insertMany([
        { name: 'Beverages', nameKh: 'ភេសជ្ជៈ', icon: '🥤', color: '#3b82f6' },
        { name: 'Snacks', nameKh: 'អាហារចំណី', icon: '🍿', color: '#f59e0b' },
        { name: 'Dairy', nameKh: 'ផលិតផលទឹកដោះ', icon: '🥛', color: '#10b981' },
        { name: 'Bakery', nameKh: 'នំបុ័ង', icon: '🍞', color: '#f97316' },
        { name: 'Meat', nameKh: 'សាច់', icon: '🥩', color: '#ef4444' },
        { name: 'Vegetables', nameKh: 'បន្លែ', icon: '🥦', color: '#22c55e' },
        { name: 'Household', nameKh: 'គ្រឿងប្រើប្រាស់', icon: '🧴', color: '#8b5cf6' },
        { name: 'Electronics', nameKh: 'អេឡិចត្រូនិច', icon: '📱', color: '#6366f1' },
      ]);
    } else {
      categories = await Category.find();
    }

    // Create supplier
    const existingSup = await Supplier.findOne({ name: 'Camco Trading' });
    let supplier: any;
    if (!existingSup) {
      supplier = await Supplier.create({
        name: 'Camco Trading',
        contactPerson: 'Sok Dara',
        phone: '+855 12 345 678',
        email: 'camco@example.com',
        address: 'Phnom Penh',
        company: 'Camco Co., Ltd',
      });
    } else {
      supplier = existingSup;
    }

    // Create products
    const existingProducts = await Product.countDocuments();
    if (existingProducts === 0 && categories.length > 0) {
      const bevCat = categories.find((c: any) => c.name === 'Beverages') || categories[0];
      const snackCat = categories.find((c: any) => c.name === 'Snacks') || categories[1];
      const dairyCat = categories.find((c: any) => c.name === 'Dairy') || categories[2];
      const vegCat = categories.find((c: any) => c.name === 'Vegetables') || categories[5];

      await Product.insertMany([
        { name: 'Angkor Beer 330ml', nameKh: 'បៀរអង្គរ ៣៣០ ml', sku: 'BEV-001', barcode: '8850006300013', category: bevCat._id, priceUsd: 1.25, costUsd: 0.85, stock: 200, minStock: 50, unit: 'can', supplier: supplier._id },
        { name: 'Coca-Cola 330ml', nameKh: 'កូកា-កូឡា ៣៣០ ml', sku: 'BEV-002', barcode: '5449000000996', category: bevCat._id, priceUsd: 0.75, costUsd: 0.50, stock: 150, minStock: 30, unit: 'can', supplier: supplier._id },
        { name: 'Tiger Beer 330ml', nameKh: 'បៀរធីហ្គ័រ ៣៣០ ml', sku: 'BEV-003', category: bevCat._id, priceUsd: 1.50, costUsd: 1.00, stock: 100, minStock: 20, unit: 'can' },
        { name: 'Pepsi 1.5L', nameKh: 'ប៉ិបស៊ី ១.៥ L', sku: 'BEV-004', category: bevCat._id, priceUsd: 1.00, costUsd: 0.65, stock: 80, minStock: 20, unit: 'bottle' },
        { name: 'Pringles Original 165g', nameKh: 'ប្រីងហ្គហ្ស ១៦៥ g', sku: 'SNK-001', category: snackCat._id, priceUsd: 3.50, costUsd: 2.50, stock: 60, minStock: 10, unit: 'tube' },
        { name: 'Oreo Cookies 137g', nameKh: 'ខូគី អូរ៉េអូ ១៣៧ g', sku: 'SNK-002', category: snackCat._id, priceUsd: 2.00, costUsd: 1.30, stock: 80, minStock: 10, unit: 'pack' },
        { name: 'Fresh Milk 1L', nameKh: 'ទឹកដោះគោស្រស់ ១ L', sku: 'DAI-001', category: dairyCat._id, priceUsd: 1.80, costUsd: 1.20, stock: 40, minStock: 10, unit: 'carton' },
        { name: 'Yogurt Strawberry 150g', nameKh: 'យ៉ាអ៊ូតស្ត្របឺរ ១៥០ g', sku: 'DAI-002', category: dairyCat._id, priceUsd: 0.90, costUsd: 0.60, stock: 50, minStock: 10, unit: 'cup' },
        { name: 'Tomatoes 1kg', nameKh: 'ប៉េងប៉ោះ ១ kg', sku: 'VEG-001', category: vegCat._id, priceUsd: 1.20, costUsd: 0.80, stock: 30, minStock: 5, unit: 'kg' },
        { name: 'Cucumber 500g', nameKh: 'ត្រសក់ ៥០០ g', sku: 'VEG-002', category: vegCat._id, priceUsd: 0.60, costUsd: 0.35, stock: 4, minStock: 5, unit: 'piece' },
      ]);
    }

    // Create customers
    const existingCust = await Customer.countDocuments();
    if (existingCust === 0) {
      await Customer.insertMany([
        { name: 'Sok Dara', phone: '012345678', email: 'sokdara@email.com', address: 'Phnom Penh', loyaltyPoints: 150, totalSpentUsd: 85.50, visitCount: 12 },
        { name: 'Chan Sophea', phone: '096123456', address: 'Siem Reap', loyaltyPoints: 80, totalSpentUsd: 42.00, visitCount: 6 },
        { name: 'Kosal Mony', phone: '017987654', address: 'Battambang', loyaltyPoints: 200, totalSpentUsd: 120.00, visitCount: 20 },
        { name: 'Srey Neang', phone: '085654321', email: 'sreyn@email.com', address: 'Phnom Penh', loyaltyPoints: 50, totalSpentUsd: 28.00, visitCount: 4 },
      ]);
    }

    return NextResponse.json({ success: true, message: 'Database seeded successfully!' });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
