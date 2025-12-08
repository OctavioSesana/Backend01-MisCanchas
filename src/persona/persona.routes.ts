import { Router } from "express";
import { findAll, findOne, add, update, remove, getReporteUsuario } from "./persona.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";
import { get } from "http";

export const personaRouter = Router();


personaRouter.post("/", add);
personaRouter.get("/", findAll);
personaRouter.get('/:id/reporte', getReporteUsuario);
personaRouter.get("/:email", findOne);
personaRouter.put("/:email", authenticateJWT, update);
personaRouter.delete("/:id", authenticateJWT, remove);