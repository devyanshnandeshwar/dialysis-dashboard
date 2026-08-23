import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { ROLES, Role } from '../config/permissions';

dotenv.config();

const DISPLAY_NAMES: Record<Role, string> = {
  admin: 'Demo Admin',
  doctor: 'Demo Doctor',
  nurse: 'Demo Nurse',
  user: 'Demo Viewer',
};

/**
 * Creates one demo account per role so each permission level can actually be
 * signed into and compared. Unlike `seed.ts` this is non-destructive: it
 * upserts into the users collection and leaves patients and sessions alone.
 *
 *   npm run seed:user
 *
 * Accounts are <role>@<domain>, where the domain comes from DEMO_USER_EMAIL,
 * and they all share DEMO_USER_PASSWORD.
 */
export const seedUsers = async () => {
  const password = process.env.DEMO_USER_PASSWORD ?? '';

  if (!password) {
    throw new Error('DEMO_USER_PASSWORD must be set before seeding users');
  }

  if (password.length < 12) {
    throw new Error('DEMO_USER_PASSWORD must be at least 12 characters');
  }

  const configuredEmail = (process.env.DEMO_USER_EMAIL ?? '').toLowerCase().trim();
  const domain = configuredEmail.includes('@')
    ? configuredEmail.split('@')[1]
    : 'example.com';

  // Hash once: bcrypt at cost 12 is deliberately slow, and every demo account
  // shares the same password anyway.
  const passwordHash = await bcrypt.hash(password, 12);

  const created: { email: string; role: Role }[] = [];

  for (const role of ROLES) {
    const email = `${role}@${domain}`;

    await User.findOneAndUpdate(
      { email },
      { email, passwordHash, name: DISPLAY_NAMES[role], role },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    created.push({ email, role });
  }

  console.log('Demo accounts ready (all share DEMO_USER_PASSWORD):');
  for (const { email, role } of created) {
    console.log(`  ${role.padEnd(6)}  ${email}`);
  }
};

if (require.main === module) {
  (async () => {
    await mongoose.connect(process.env.MONGO_URI as string);
    await seedUsers();
    await mongoose.disconnect();
  })().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
