import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(
  userId: number,
  name?: string,
  isAdmin?: boolean
): string {
  return jwt.sign({ userId, name, isAdmin }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(
  token: string
): { userId: number; name?: string; isAdmin?: boolean } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: number;
      name?: string;
      isAdmin?: boolean;
    };
  } catch {
    return null;
  }
}
