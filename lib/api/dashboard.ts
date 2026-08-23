import dbConnect from '@/lib/db';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Settings from '@/models/Settings';

export async function getDashboardData(authQuery: any, period: string) {
  await dbConnect();

  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default: // today
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // Today's stats
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [todaySales, totalSales, totalCustomers, totalProducts, lowStockProducts, recentSales, topProducts, chartData, settings] = await Promise.all([
    // Today's sales
    Sale.aggregate([
      { $match: { createdAt: { $gte: todayStart }, status: 'completed', ...authQuery } },
      { $group: { _id: null, total: { $sum: '$totalUsd' }, count: { $sum: 1 } } },
    ]),
    // Period totals
    Sale.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'completed', ...authQuery } },
      { $group: { _id: null, total: { $sum: '$totalUsd' }, count: { $sum: 1 } } },
    ]),
    Customer.countDocuments({ isActive: true, ...authQuery }),
    Product.countDocuments({ isActive: true, ...authQuery }),
    Product.find({ isActive: true, ...authQuery, $expr: { $lte: ['$stock', { $ifNull: ['$minStock', 5] }] } }),
    // Recent 10 sales
    Sale.find({ status: 'completed', ...authQuery })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('cashier', 'name')
      .populate('customer', 'name'),
    // Top 5 products
    Sale.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'completed', ...authQuery } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', name: { $first: '$items.name' }, totalQty: { $sum: '$items.qty' }, totalRevenue: { $sum: '$items.subtotalUsd' } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
    ]),
    // Chart data - last 7 days
    Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          status: 'completed',
          ...authQuery
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          sales: { $sum: '$totalUsd' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Settings
    Settings.findOne(authQuery),
  ]);

  return {
    today: {
      sales: todaySales[0]?.total || 0,
      orders: todaySales[0]?.count || 0,
    },
    period: {
      sales: totalSales[0]?.total || 0,
      orders: totalSales[0]?.count || 0,
    },
    totalCustomers,
    totalProducts,
    lowStockProducts: lowStockProducts.map((p) => ({
      _id: p._id.toString(),
      name: p.name,
      stock: p.stock,
      minStock: p.minStock,
      sku: p.sku,
    })),
    recentSales: recentSales.map((s) => ({
      ...s.toObject(),
      _id: s._id.toString(),
      cashier: s.cashier ? { ...s.cashier, _id: s.cashier._id.toString() } : null,
      customer: s.customer ? { ...s.customer, _id: s.customer._id.toString() } : null,
    })),
    topProducts,
    chartData,
    exchangeRate: settings?.exchangeRate || 4100,
    storeName: settings?.storeName || '',
  };
}
