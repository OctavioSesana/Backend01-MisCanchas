// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/auth.utils.js';

// Extendemos la interface de Request para poder guardar el usuario ahí
export interface AuthRequest extends Request {
  user?: any; 
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // El formato suele ser "Bearer eyJhbGciOiJIUzI1..."
    const token = authHeader.split(' ')[1]; 

    const userPayload = verifyJwt(token);

    if (userPayload) {
      req.user = userPayload; // Guardamos la info del usuario en el request
      next(); // ¡Pase, maestro!
    } else {
      return res.status(403).json({ message: 'Token inválido o expirado' }); // Token trucho
    }
  } else {
    return res.status(401).json({ message: 'Necesitás estar logueado para ver esto' }); // No trajo carnet
  }
};