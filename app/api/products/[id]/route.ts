import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Product from '@/models/Product';
import InventoryTransaction from '@/models/InventoryTransaction';
import { requireBranchAuth, requireRoles } from '@/lib/auth-helpers';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query: authQuery, error } = await requireBranchAuth();
    if (error) return error;
    
    const { id } = await params;
    const product = await Product.findOne({ _id: id, ...authQuery }).populate('category').populate('supplier');
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { user, query: authQuery, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const { id } = await params;
    const body = await req.json();
    
    // Get existing product to compare stock levels
    const existing = await Product.findOne({ _id: id, ...authQuery });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const prevStock = existing.stock;
    const newStock = body.stock !== undefined ? Number(body.stock) : prevStock;

    // Do not allow changing branch in PUT
    delete body.branch;
    
    const product = await Product.findOneAndUpdate({ _id: id, ...authQuery }, body, { new: true });
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.stock !== undefined && prevStock !== newStock) {
      await InventoryTransaction.create({
        product: product._id,
        branch: user.role === 'superadmin' ? product.branch : user.branchId,
        type: newStock > prevStock ? 'in' : 'out',
        quantity: newStock - prevStock,
        reason: 'Manual adjustment',
        user: user.id,
        prevStock,
        newStock
      });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A product with this SKU already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { query: authQuery, error } = await requireRoles(['superadmin', 'admin', 'manager']);
    if (error) return error;

    const { id } = await params;
    await Product.findOneAndUpdate({ _id: id, ...authQuery }, { isActive: false });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
