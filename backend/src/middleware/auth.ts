import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';
import logger from '../logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    phoneNumber: string;
  };
}

export const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Access token is missing or invalid. Please supply Bearer token.'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      role: decoded.role,
      phoneNumber: decoded.phoneNumber,
    };
    next();
  } catch (error) {
    logger.error('JWT verification error:', error);
    next(new UnauthorizedError('Authentication failed. Invalid or expired token.'));
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return next(new UnauthorizedError('User authentication context not found.'));
    }

    if (!roles.includes(user.role)) {
      logger.warn(`Access denied to user [${user.id}] with role [${user.role}]. Required roles: ${roles.join(', ')}`);
      return next(new ForbiddenError('You do not have permission to access this resource.'));
    }

    next();
  };
};
