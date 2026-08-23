import mongoose, { Schema, Document } from 'mongoose';
import { ROLES, Role } from '../config/permissions';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Never store or return the plaintext password. `select: false` keeps the
    // hash out of every query result unless a caller explicitly asks for it,
    // so it cannot leak through a stray `res.json(user)`.
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, default: 'nurse' },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
