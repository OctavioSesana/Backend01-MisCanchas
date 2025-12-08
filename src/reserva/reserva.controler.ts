import { Request, Response, NextFunction } from "express";
import { Reserva } from "./reserva.entity.js";
import { orm } from "../shared/db/orm.js";
import { Articulo } from "../articulo/articulo.entity.js";
import { ReservaArticulo } from "../reserva_articulo/ReservaArticulo.entity.js";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { Persona } from "../persona/persona.entity.js";
import { Cancha } from "../cancha/cancha.entity.js";

const client = new MercadoPagoConfig({ accessToken: 
  'APP_USR-8588958575311945-071115-2b4e98e627c531a28461d875e1b52b9f-156701486' });

const em = orm.em;

function sanitizedReservaInput(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.body.sanitizedInput = {
    fechaReserva: req.body.fechaReserva,
    horaInicio: req.body.horaInicio,
    horaFin: req.body.horaFin,
    totalReserva: req.body.totalReserva,
    mail_cliente: req.body.mail_cliente,
    idCancha: req.body.idCancha,
    idEmpleado: req.body.idEmpleado,
    idArticulo: req.body.idArticulo,
  };
  //more checks here

  Object.keys(req.body.sanitizedInput).forEach((key) => {
    if (req.body.sanitizedInput[key] === undefined) {
      delete req.body.sanitizedInput[key];
    }
  });
  next();
}

async function findByCanchaFecha(req: Request, res: Response) {
  try {
    const { idCancha, fecha } = req.params;

    // Validamos que lleguen los datos
    if (!idCancha || !fecha) {
      return res.status(400).json({ message: "Faltan parámetros idCancha o fecha" });
    }

    // Buscamos en la base de datos
    // MikroORM buscará todas las reservas que coincidan con la cancha y la fecha
    const reservasEncontradas = await em.find(Reserva, {
      idCancha: Number(idCancha), // Convertimos a número por seguridad
      fechaReserva: fecha          // Debe coincidir con el formato string de la DB
    });

    // Devolvemos el array (aunque esté vacío, status 200)
    return res.status(200).json(reservasEncontradas);

  } catch (error) {
    console.error("Error buscando reservas por fecha:", error);
    return res.status(500).json({ message: "Error interno del servidor" });
  }
}

async function findAll(req: Request, res: Response) {
  try {
    const reservas = await em.find(Reserva, {});
    res.status(200).json({ message: "found all reservas", data: reservas });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}


async function findOne(req: Request, res: Response) {
  try {
    const mail_cliente = req.params.mail_cliente;
    const reservas = await em.find(Reserva, 
      { mail_cliente }, 
      { populate: ['idCancha'] } 
    );
    
    res.status(200).json({ message: "found reservas", data: reservas });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function getDashboardStats(req: Request, res: Response) {
  try {
    const hoy = new Date();
    // Formato YYYY-MM-DD para comparar con tu DB (ajustalo si guardas diferente)
    const fechaHoy = hoy.toISOString().split('T')[0]; 
    
    // 1. Reservas de Hoy (Contar)
    const reservasHoy = await em.count(Reserva, { fechaReserva: fechaHoy });

    // 2. Total Usuarios (Contar todos los que tengan rol 'cliente')
    const totalUsuarios = await em.count(Persona, { rol: 'cliente' });

    // 3. Canchas Activas (Contar las que tienen estado 'disponible')
    // Asumo que tu entidad Cancha tiene un campo 'estado'
    const canchasActivas = await em.count(Cancha, { estado: 'disponible' });

    // 4. Recaudación Mensual (Suma del totalReserva de este mes)
    // Esto es más complejo con MikroORM puro, a veces conviene SQL directo.
    // Haremos una versión simple trayendo las reservas del mes y sumando en JS (si son pocas)
    // O usando QueryBuilder (mejor rendimiento).
    
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

    const reservasDelMes = await em.find(Reserva, {
      fechaReserva: { $gte: primerDiaMes, $lte: ultimoDiaMes }
    });

    const recaudacionMes = reservasDelMes.reduce((total, r) => total + Number(r.totalReserva), 0);

    // Respuesta Final
    res.status(200).json({
      reservasHoy,
      totalUsuarios,
      canchasActivas,
      recaudacionMes
    });

  } catch (error: any) {
    console.error("Error en reportes:", error);
    res.status(500).json({ message: error.message });
  }
}

async function add(req: Request, res: Response) {
  try {
    console.log('REQ BODY BACKEND:', req.body);
    const reserva = em.create(Reserva, req.body.sanitizedInput);
    await em.flush();

    // Configuración de MercadoPago
    // ✅ 2️⃣ Crear preferencia MercadoPago

    
    const preference = new Preference(client);

    const body = {
      items: [
      {
        id: "reserva-" + reserva.id,
        title: "Reserva de cancha",
        quantity: 1,
        unit_price: reserva.totalReserva * 0.5, // Solo paga el 50%
      },
      ],
      back_urls: {
      success: 'https://www.tusitio.com/pago-exitoso',
      failure: 'https://www.tusitio.com/pago-fallido',
      pending: 'https://www.tusitio.com/pago-pendiente',
      },
      auto_return: 'approved',
    };

    const result = await preference.create({ body });

    // ✅ 3️⃣ Responder con reserva y link
    res.status(201).json({
      message: "reserva created",
      data: reserva,
      init_point: result.init_point,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function update(req: Request, res: Response) {
  try {
    const mail_cliente = req.params.mail_cliente;
    const reservaToUpdate = await em.findOneOrFail(Reserva, { mail_cliente });
    em.assign(reservaToUpdate, req.body.sanitizedInput);
    await em.flush();
    res.status(200).json({ message: "reserva updated", data: reservaToUpdate });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = Number.parseInt(req.params.id);

    // 1️⃣ Buscar la reserva
    const reserva = await em.findOneOrFail(Reserva, id);

    // 2️⃣ Buscar registros en ReservaArticulo relacionados con esta reserva
    const reservaArticulos = await em.find(ReservaArticulo, { idReserva: id });

    // 3️⃣ Para cada registro, actualizar estado de articuloClass y eliminar ReservaArticulo
    for (const ra of reservaArticulos) {
      // Buscar el artículo y traer la relación articuloClass
      const articulo = await em.findOne(Articulo, ra.idArticulo);

      if (articulo) {
        articulo.estado = "Disponible";
        await em.persistAndFlush(articulo);
      }

      // Borrar la relación ReservaArticulo
      await em.removeAndFlush(ra);
    }

    // 4️⃣ Finalmente, eliminar la reserva
    await em.removeAndFlush(reserva);

    res.status(200).json({ message: "Reserva eliminada y artículos liberados" });
  } catch (error: any) {
    console.error("Error al eliminar reserva:", error);
    res.status(500).json({ message: error.message });
  }
}



export { sanitizedReservaInput, findAll, findOne, add, update, remove, findByCanchaFecha, getDashboardStats };
