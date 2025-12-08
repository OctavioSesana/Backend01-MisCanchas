import { Request, Response } from "express";
import { Persona } from "./persona.entity.js";
import { Reserva } from "../reserva/reserva.entity.js";
import { orm } from "../shared/db/orm.js";
import { personaSchema, updatePersonaSchema } from "./persona.schema.js"; // 👈 Tu nuevo árbitro
import { hashPassword, generateToken } from "../utils/auth.utils.js"; // 👈 Seguridad

// 1. GET ALL
async function findAll(req: Request, res: Response) {
  try {
    const em = orm.em.fork(); // Usamos un fork para aislar la petición
    const personas = await em.find(Persona, {});
    
    res.status(200).json({ message: "Found all personas", data: personas });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// 2. GET ONE (By Email)
async function findOne(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const email = req.params.email;
    
    const persona = await em.findOne(Persona, { email });

    if (!persona) {
      return res.status(404).json({ message: "Persona no encontrada" });
    }

    res.status(200).json({ message: "Found persona", data: persona });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// 3. ADD (Register) - ACÁ ESTÁ LA MAGIA 🛡️
async function add(req: Request, res: Response) {
  try {
    const em = orm.em.fork();

    // A. VALIDACIÓN CON ZOD
    const validation = personaSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: "Datos inválidos",
        errors: validation.error.format()
      });
    }

    const data = validation.data;

    // B. VERIFICAR DUPLICADOS
    const existe = await em.findOne(Persona, { email: data.email });
    if (existe) {
      return res.status(409).json({ message: "El email ya está registrado" });
    }

    // C. HASHEAR PASSWORD
    const hashedPassword = await hashPassword(data.password);

    // D. LÓGICA DE ROLES
    let rolAsignado = 'cliente';
    
    if (data.codigoAdmin) {
      const claveMaestra = process.env.ADMIN_REGISTRATION_KEY;
      if (claveMaestra && data.codigoAdmin === claveMaestra) {
        rolAsignado = 'admin';
        console.log('✅ SE ASIGNÓ ROL: ADMIN');
      } else {
        console.warn('⛔ Intento de admin fallido');
        return res.status(403).json({ message: 'Clave de validación incorrecta' });
      }
    }

    // E. CREAR LA ENTIDAD
    const nuevaPersona = em.create(Persona, {
      name: data.name,
      lastname: data.lastname,
      dni: Number(data.dni),
      email: data.email,
      phone: data.phone ?? "",
      password: hashedPassword,
      rol: rolAsignado
    });
    
    await em.persistAndFlush(nuevaPersona);

    // ============================================================
    // 👇 FALTABA ESTO: GENERAR EL TOKEN (AUTO-LOGIN)
    // ============================================================
    const token = generateToken({ 
      id: nuevaPersona.id, 
      email: nuevaPersona.email, 
      rol: nuevaPersona.rol 
    });

    // 👇 Y ENVIARLO ACÁ
    res.status(201).json({ 
      message: "Usuario creado exitosamente", 
      data: nuevaPersona,
      token: token  // <--- ¡LA LLAVE MAESTRA! 🔑
    });

  } catch (error: any) {
    console.error("❌ ERROR AL REGISTRAR:", error.message);
    res.status(500).json({ message: "Error interno del servidor" });
  }
}

// 4. UPDATE
async function update(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const email = req.params.email;

    // 1. Buscamos al usuario actual en la DB
    const personaToUpdate = await em.findOne(Persona, { email });

    if (!personaToUpdate) {
      return res.status(404).json({ message: "Persona no encontrada" });
    }

    // 2. Validamos los datos que llegan (Zod)
    const validation = updatePersonaSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: "Datos inválidos", 
        errors: validation.error.format() 
      });
    }

    const datosNuevos = validation.data;

    // 🚨 3. LÓGICA ANTI-DOBLE-HASH (La Solución)
    if (datosNuevos.password) {
        // Si la contraseña que llega es IGUAL a la que ya tiene el usuario (el hash viejo)
        if (datosNuevos.password === personaToUpdate.password) {
            // La borramos del objeto de actualización para que MikroORM la ignore
            delete datosNuevos.password; 
            console.log('🛡️ Se detectó el mismo Hash. No se toca la contraseña.');
        } else {
            // Si es distinta, significa que el usuario escribió una NUEVA contraseña.
            // Ahí sí la hasheamos.
            console.log('🔐 Cambio de contraseña detectado. Hasheando...');
            datosNuevos.password = await hashPassword(datosNuevos.password);
        }
    }

    // 4. Actualizamos solo los campos necesarios
    em.assign(personaToUpdate, datosNuevos);
    await em.flush();

    res.status(200).json({ message: "Persona actualizada", data: personaToUpdate });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function getReporteUsuario(req: Request, res: Response) {
  try {
    const userId = Number(req.params.id);
    const em = orm.em.fork(); 

    console.log(`📊 Backend: Generando reporte para ID: ${userId}`);

    // 1. Buscar a la Persona para tener su email
    const persona = await em.findOne(Persona, { id: userId });

    if (!persona) {
      console.log('❌ Persona no encontrada');
      return res.status(404).json({ message: 'Persona no encontrada' });
    }

    // 2. Buscar Reservas por email
    // AHORA SÍ funcionará el populate porque editamos reserva.entity.ts
    const reservas = await em.find(Reserva, 
      { mail_cliente: persona.email }, 
      /* { populate: ['cancha'] } */
    );

    console.log(`✅ Reservas encontradas: ${reservas.length}`);

    if (reservas.length === 0) {
      return res.json({ 
        data: {
          totalReservas: 0, 
          diaFavorito: 'Sin actividad', 
          canchaFavorita: [] 
        }
      });
    }

    // --- CÁLCULOS ---
    
    // A. Total
    const totalReservas = reservas.length;

    // B. Día Favorito
    const diasContador = [0,0,0,0,0,0,0]; // Dom a Sab
    const nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    reservas.forEach(r => {
      // Intentar parsear la fecha (r.fechaReserva suele ser string '2024-01-01')
      const fechaStr = String(r.fechaReserva); 
      // Agregamos hora para evitar problemas de zona horaria al crear el Date
      const fecha = new Date(fechaStr.includes('T') ? fechaStr : fechaStr + 'T12:00:00');
      
      if (!isNaN(fecha.getTime())) {
         diasContador[fecha.getDay()]++;
      }
    });
    const maxDiaIndex = diasContador.indexOf(Math.max(...diasContador));
    const diaFavorito = nombresDias[maxDiaIndex];

    // C. Canchas (Usamos tipoCancha)
    const canchasMap: any = {};
    
    reservas.forEach((r: any) => {
      // Aquí accedemos a r.cancha gracias al populate
      // Usamos 'tipoCancha' que es lo que tienes en tu entidad Cancha
      const nombre = r.cancha?.tipoCancha || `Cancha #${r.idCancha}` || 'Desconocida';
      canchasMap[nombre] = (canchasMap[nombre] || 0) + 1;
    });

    const reporteCanchas = Object.keys(canchasMap).map(nombre => {
      const cantidad = canchasMap[nombre];
      const porcentaje = ((cantidad / totalReservas) * 100).toFixed(1);
      return { nombre, porcentaje: Number(porcentaje) };
    }).sort((a, b) => b.porcentaje - a.porcentaje);

    return res.json({
      data: {
        totalReservas,
        diaFavorito,
        canchaFavorita: reporteCanchas
      }
    });

  } catch (error: any) {
    // Este log saldrá en la terminal negra de VS Code
    console.error("❌ ERROR CRÍTICO EN BACKEND:", error);
    return res.status(500).json({ message: 'Error interno', error: error.message });
  }
}

// 5. REMOVE
async function remove(req: Request, res: Response) {
  try {
    const em = orm.em.fork();
    const id = Number.parseInt(req.params.id);
    
    const persona = await em.findOne(Persona, { id });
    
    if (!persona) {
      return res.status(404).json({ message: "Persona no encontrada" });
    }

    await em.removeAndFlush(persona);
    res.status(200).json({ message: "Persona eliminada" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// NOTA: Borré 'sanitizedPersonaInput' de los exports porque ya no hace falta.
// Acordate de sacarlo también de tu archivo de rutas (persona.routes.ts).
export { findAll, findOne, add, update, remove, getReporteUsuario };