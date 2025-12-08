import { Router } from "express";
import {
  sanitizedReservaInput,
  findAll,
  findOne,
  add,
  update,
  remove,
  findByCanchaFecha,
  getDashboardStats
} from "./reserva.controler.js";

export const reservaRouter = Router();

reservaRouter.get("/", findAll);
reservaRouter.get("/cancha/:idCancha/fecha/:fecha", findByCanchaFecha);
reservaRouter.get("/:mail_cliente", findOne);
reservaRouter.get("/dashboard/stats", getDashboardStats);
reservaRouter.post("/", sanitizedReservaInput, add);
reservaRouter.put("/:mail_cliente", sanitizedReservaInput, update);
reservaRouter.patch("/:mail_cliente", sanitizedReservaInput, update);
reservaRouter.delete("/:id", remove);
// reservaRouter.post("/", sanitizedReservaInput, createReservaConPago);

