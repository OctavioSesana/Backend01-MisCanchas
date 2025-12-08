// src/utils/auth.utils.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
// OJO: Esto debería venir de process.env.JWT_SECRET, pero para probar usá esto:
const SECRET_KEY = process.env.JWT_SECRET || 'mi_secreto_super_seguro_shhh'; 

// 1. Función para encriptar contraseña (se usa al Registrar usuario)
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// 2. Función para comparar contraseña (se usa al Loguear)
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

// 3. Función para generar el Token (el carnet)
export const generateToken = (payload: object): string => {
  // El token expira en 1 hora (1h)
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h' });
};

// 4. Función para validar el Token (lo usa el middleware)
export const verifyJwt = (token: string) => {
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch (error) {
    return null;
  }
};