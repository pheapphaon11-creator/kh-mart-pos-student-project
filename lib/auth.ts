import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { authConfig } from '@/lib/auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('[AUTH] Authorize called with email:', credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Missing credentials');
          return null;
        }

        try {
          console.log('[AUTH] Connecting to DB...');
          await dbConnect();
          console.log('[AUTH] DB connected. Finding user...');
          
          // Bootstrap default superadmin if the database is entirely empty
          const userCount = await User.countDocuments();
          if (userCount === 0) {
            console.log('[AUTH] DB is empty! Creating default superadmin...');
            await User.create({
              name: 'Super Admin',
              email: 'superadmin@khmart.com',
              password: 'password123',
              role: 'superadmin',
              isActive: true,
            });
          }

          const user = await User.findOne({ email: credentials.email, isActive: true });
          
          if (!user) {
            console.log('[AUTH] User not found or inactive');
            return null;
          }

          console.log('[AUTH] User found, comparing password...');
          const isValid = await user.comparePassword(credentials.password as string);
          
          if (!isValid) {
            console.log('[AUTH] Invalid password');
            return null;
          }

          console.log('[AUTH] Password valid. Returning user object.');

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branch?.toString(),
        };
        } catch (error) {
          console.error('[AUTH] ERROR in authorize:', error);
          return null;
        }
      },
    }),
  ],
  debug: true,
});
