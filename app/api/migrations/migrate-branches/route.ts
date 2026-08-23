import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Branch from '@/models/Branch';
import User from '@/models/User';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Supplier from '@/models/Supplier';
import Customer from '@/models/Customer';
import Sale from '@/models/Sale';
import Settings from '@/models/Settings';
import Notification from '@/models/Notification';

export async function GET() {
  try {
    await dbConnect();
    
    // 1. Create a default branch if none exist
    let mainBranch = await Branch.findOne({ name: 'Main Branch' });
    if (!mainBranch) {
      mainBranch = await Branch.create({ name: 'Main Branch', address: 'Phnom Penh', phone: '+855 23 000 000' });
    }

    const branchId = mainBranch._id;

    // 2. Assign everything without a branch to this branch
    const updates = [
      User.updateMany({ branch: { $exists: false } }, { $set: { branch: branchId } }),
      Product.updateMany({ branch: { $exists: false } }, { $set: { branch: branchId } }),
      Category.updateMany({ branch: { $exists: false } }, { $set: { branch: branchId } }),
      Supplier.updateMany({ branch: { $exists: false } }, { $set: { branch: branchId } }),
      Customer.updateMany({ branch: { $exists: false } }, { $set: { branch: branchId } }),
      Sale.updateMany({ branch: { $exists: false } }, { $set: { branch: branchId } }),
      Settings.updateMany({ branch: { $exists: false } }, { $set: { branch: branchId } }),
      Notification.updateMany({ branch: { $exists: false } }, { $set: { branch: branchId } }),
    ];

    await Promise.all(updates);

    return NextResponse.json({ success: true, message: 'Migration completed. All existing records assigned to Main Branch.', branchId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
