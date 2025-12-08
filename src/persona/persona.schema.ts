// src/persona/persona.schema.ts
import { z } from 'zod';

export const personaSchema = z.object({
  // CAMBIAMOS A INGLÉS (Como tu Entity)
  name: z.string().min(2, "El nombre es muy corto"),
  lastname: z.string().min(2, "El apellido es muy corto"),
  
  // Tu entity dice que DNI es number, así que Zod debe esperar un number
  dni: z.number({ error: "El DNI debe ser un número" }), 

  phone: z.string().min(10, "El teléfono debe tener código de área"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  
  // Este campo es solo para validación, no va a la DB
  codigoAdmin: z.string().optional() 
});

export const updatePersonaSchema = personaSchema.partial();