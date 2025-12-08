import { Router } from 'express';
import { EntityManager } from '@mikro-orm/mysql';
import { RequestContext } from '@mikro-orm/core';
import { Persona } from '../persona/persona.entity.js';
import { comparePassword, generateToken } from '../utils/auth.utils.js';
import { hashPassword } from '../utils/auth.utils.js';
import crypto from 'crypto';

const router = Router();

router.post('/', async (req, res) => {
  const em = RequestContext.getEntityManager() as EntityManager;
  const { email, password } = req.body;

  console.log('------------------------------------------------');
  console.log('📡 INTENTO DE LOGIN RECIBIDO');
  console.log('📧 Email:', email);
  console.log('🔑 Password recibida (plana):', password);

  try {
    // 1. BUSCAR USUARIO
    const persona = await em.findOne(Persona, { email });

    if (!persona) {
      console.warn('❌ Usuario NO encontrado en la DB');
      return res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }

    console.log('✅ Usuario encontrado:', persona.name, persona.lastname);
    console.log('💾 Hash en DB:', persona.password); // Miremos qué hay guardado

    // 2. COMPARAR PASSWORD
    const passwordValida = await comparePassword(password, persona.password);

    console.log('🤔 Resultado de la comparación:', passwordValida);

    if (!passwordValida) {
      console.warn('❌ Contraseña incorrecta (El hash no coincide)');
      return res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }

    // 3. GENERAR TOKEN
    const token = generateToken({ 
      id: persona.id, 
      email: persona.email, 
      rol: persona.rol 
    });

    console.log('✅ Login Exitoso. Token generado.');

    return res.status(200).json({
      message: 'Login exitoso',
      token: token,
      user: persona
    });

  } catch (error) {
    console.error('💥 Error CRÍTICO en login:', error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const em = RequestContext.getEntityManager() as EntityManager;
  const { email } = req.body;

  try {
    const persona = await em.findOne(Persona, { email });

    if (!persona) {
      // Por seguridad, no decimos si el email existe o no, solo decimos "Si existe, enviamos mail"
        return res.status(404).json({ message: 'No existe ningún usuario con este correo electrónico.' });    
      }

    // 1. Generar Token aleatorio
    const token = crypto.randomBytes(20).toString('hex');

    // 2. Guardarlo en la DB con expiración (1 hora)
    persona.recoverToken = token;
    persona.recoverTokenExpires = new Date(Date.now() + 3600000); // 1 hora desde ahora

    await em.flush();

    // 3. SIMULAR ENVÍO DE EMAIL 📧 (Mirar consola del backend)
    console.log('=============================================');
    console.log('📨 EMAIL SIMULADO PARA RECUPERAR CLAVE');
    console.log(`Para: ${email}`);
    console.log(`Link: http://localhost:4200/reset-password?token=${token}`);
    console.log('=============================================');

    return res.status(200).json({ message: 'Correo enviado' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

router.post('/reset-password', async (req, res) => {
  const em = RequestContext.getEntityManager() as EntityManager;
  const { token, newPassword } = req.body;

  try {
    const persona = await em.findOne(Persona, { recoverToken: token });

    if (!persona) {
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    const ahora = new Date();
    if (!persona.recoverTokenExpires || persona.recoverTokenExpires < ahora) {
      return res.status(400).json({ message: 'El enlace ha expirado.' });
    }

    // 👇 AQUÍ ESTABA EL ERROR: FALTABA HASHEAR
    // Antes tenías: persona.password = newPassword; (MAL)
    
    // AHORA (BIEN):
    const hashedPassword = await hashPassword(newPassword);
    persona.password = hashedPassword;

    // Limpiamos el token usado
    persona.recoverToken = undefined;
    persona.recoverTokenExpires = undefined;

    await em.flush();

    console.log(`✅ Contraseña restablecida (y encriptada) para: ${persona.email}`);

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
});

export const loginRouter = router;