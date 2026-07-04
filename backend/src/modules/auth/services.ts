import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../infrastructure/database';
import { env } from '../../config/env';
import { BadRequestError, ConflictError, UnauthorizedError } from '../../shared/errors';
import logger from '../../logger';

export class AuthService {
  /**
   * Registers a new user (Doctor, Admin, or Patient account for client dashboard).
   */
  public static async register(data: {
    name: string;
    phoneNumber: string;
    email?: string;
    password: string;
    role?: string;
  }) {
    // Check if phone number already registered
    const existing = await prisma.user.findUnique({
      where: { phoneNumber: data.phoneNumber },
    });

    if (existing) {
      throw new ConflictError('A user with this phone number already exists.');
    }

    if (data.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingEmail) {
        throw new ConflictError('A user with this email address already exists.');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        phoneNumber: data.phoneNumber,
        email: data.email || null,
        passwordHash,
        role: data.role || 'PATIENT',
      },
    });

    logger.info(`User registered successfully: ${user.id} | Role: ${user.role}`);
    
    // Return user without passwordHash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Authenticates user and generates JWT.
   */
  public static async login(phoneNumber: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid phone number or password.');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError('Invalid phone number or password.');
    }

    // Sign JWT Token
    const token = jwt.sign(
      { id: user.id, role: user.role, phoneNumber: user.phoneNumber },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info(`User logged in successfully: ${user.id} | Role: ${user.role}`);

    const { passwordHash: _, ...userWithoutPassword } = user;
    return { token, user: userWithoutPassword };
  }
}
export default AuthService;
