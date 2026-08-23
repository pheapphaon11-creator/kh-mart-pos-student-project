import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import InventoryTransaction from '@/models/InventoryTransaction';
import { requireBranchAuth, requireRoles } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const lowStock = searchParams.get('lowStock') === 'true';

    const { query: authQuery, error } = await requireBranchAuth();
    if (error) return error;

    const query: any = { isActive: true, ...authQuery };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { nameKh: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (lowStock) query.$expr = { $lte: ['$stock', '$minStock'] };

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category', 'name nameKh icon color')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({ products, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { user: sessionUser, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const body = await req.json();
    
    if (sessionUser.role !== 'superadmin') {
      body.branch = sessionUser.branchId;
    }

    const product = await Product.create(body);
    
    if (product && product.stock > 0) {
      await InventoryTransaction.create({
        product: product._id,
        branch: sessionUser.role === 'superadmin' ? product.branch : sessionUser.branchId,
        type: 'in',
        quantity: product.stock,
        reason: 'Initial stock',
        user: sessionUser.id,
        prevStock: 0,
        newStock: product.stock
      });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A product with this SKU already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
