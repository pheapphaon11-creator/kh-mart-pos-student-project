import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import InventoryTransaction from '@/models/InventoryTransaction';
import Product from '@/models/Product';
import User from '@/models/User';
import Branch from '@/models/Branch';
import { requireBranchAuth, requireRoles } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { user, query: authQuery, error } = await requireBranchAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = { ...authQuery };

    if (type) {
      query.type = type;
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

    // If search is provided, we search matched products first
    if (search) {
      const matchedProducts = await Product.find({
        isActive: true,
        ...authQuery,
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { nameKh: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { barcode: { $regex: search, $options: 'i' } },
        ]
      }).select('_id');

      const productIds = matchedProducts.map(p => p._id);
      query.$or = [
        { product: { $in: productIds } },
        { reason: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await InventoryTransaction.countDocuments(query);
    const transactions = await InventoryTransaction.find(query)
      .populate({
        path: 'product',
        select: 'name nameKh sku barcode unit priceUsd costUsd image'
      })
      .populate('user', 'name')
      .populate('branch', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      transactions,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { user, query: authQuery, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const body = await req.json();
    const { productId, type, quantity, reason } = body;

    if (!productId || !type || quantity === undefined || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['in', 'out', 'adjustment'].includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || (type !== 'adjustment' && qty <= 0)) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }

    // Find the product
    const product = await Product.findOne({ _id: productId, ...authQuery });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const prevStock = product.stock;
    let newStock = prevStock;

    if (type === 'in') {
      newStock += qty;
    } else if (type === 'out') {
      newStock -= qty;
      if (newStock < 0) {
        return NextResponse.json({ error: `Insufficient stock. Current stock is ${prevStock}` }, { status: 400 });
      }
    } else if (type === 'adjustment') {
      newStock = qty;
      if (newStock < 0) {
        return NextResponse.json({ error: 'Target stock cannot be negative' }, { status: 400 });
      }
    }

    // Update product stock
    product.stock = newStock;
    await product.save();

    // Log the transaction
    const transaction = await InventoryTransaction.create({
      product: product._id,
      branch: user.role === 'superadmin' ? product.branch : user.branchId,
      type,
      quantity: type === 'adjustment' ? (newStock - prevStock) : (type === 'in' ? qty : -qty),
      reason,
      user: user.id,
      prevStock,
      newStock
    });

    return NextResponse.json({
      success: true,
      transaction,
      product: {
        _id: product._id,
        name: product.name,
        stock: product.stock
      }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
