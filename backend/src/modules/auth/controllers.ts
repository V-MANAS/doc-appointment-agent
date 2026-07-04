import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import AuthService from './services';
import logger from '../../logger';

// Zod schemas for input validation
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters long'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['PATIENT', 'DOCTOR', 'ADMIN']).default('PATIENT'),
});

const loginSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters long'),
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const user = await AuthService.register({
        ...validatedData,
        email: validatedData.email || undefined,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const data = await AuthService.login(validatedData.phoneNumber, validatedData.password);

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        ...data,
      });
    } catch (error) {
      next(error);
    }
  }
}
export default AuthController;
