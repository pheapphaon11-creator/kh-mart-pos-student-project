import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Settings from '@/models/Settings';
import Notification from '@/models/Notification';
import InventoryTransaction from '@/models/InventoryTransaction';
import { requireBranchAuth } from '@/lib/auth-helpers';

function generateInvoiceNo(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${date}-${rand}`;
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { user, query: authQuery, error } = await requireBranchAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: any = { status: 'completed', ...authQuery };
    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: 'i' } },
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .populate('cashier', 'name')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Summary for filtered period
    const summary = await Sale.aggregate([
      { $match: query },
      { $group: { _id: null, totalUsd: { $sum: '$totalUsd' }, count: { $sum: 1 } } },
    ]);

    return NextResponse.json({
      sales,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      summary: summary[0] || { totalUsd: 0, count: 0 },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { user, query: authQuery, error } = await requireBranchAuth();
    if (error) return error;

    const cashierId = user.id;

    const body = await req.json();
    const settings = await Settings.findOne(authQuery);
    const exchangeRate = settings?.exchangeRate || 4100;

    const invoiceNo = generateInvoiceNo();
    const totalKhr = Math.round(body.totalUsd * exchangeRate);

    // Deduct stock and check for low stock
    for (const item of body.items) {
      const p = await Product.findOneAndUpdate(
        { _id: item.product, ...authQuery },
        { $inc: { stock: -item.qty } }
      );
      
      if (p) {
        const newStock = p.stock - item.qty;
        
        // Log inventory transaction for POS sale
        await InventoryTransaction.create({
          product: p._id,
          branch: user.role === 'superadmin' ? p.branch : user.branchId,
          type: 'sale',
          quantity: -item.qty,
          reason: `POS Sale (${invoiceNo})`,
          user: cashierId,
          prevStock: p.stock,
          newStock: newStock
        });

        const minStock = p.minStock ?? 5;
        // If stock just dropped below or equal to minStock
        if (newStock <= minStock && p.stock > minStock) {
          const notificationData: any = {
            title: 'Low Stock Alert',
            message: `Product "${p.name}" is running low on stock. Current stock: ${newStock}.`,
            type: 'alert'
          };
          if (user.role !== 'superadmin') notificationData.branch = user.branchId;
          await Notification.create(notificationData);
        }
      }
    }

    // Update customer if present
    if (body.customer) {
      const pointsRate = settings?.pointsPerDollar ?? 1;
      const points = Math.floor(body.totalUsd * pointsRate);
      await Customer.findOneAndUpdate(
        { _id: body.customer, ...authQuery },
        { $inc: { totalSpentUsd: body.totalUsd, visitCount: 1, loyaltyPoints: points } }
      );
    }

    const saleData: any = {
      ...body,
      invoiceNo,
      totalKhr,
      exchangeRate,
      cashier: cashierId,
    };
    if (user.role !== 'superadmin') saleData.branch = user.branchId;

    const sale = await Sale.create(saleData);

    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
