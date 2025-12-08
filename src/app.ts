import express from "express";
import cors from "cors";
import "reflect-metadata";
import { RequestContext } from "@mikro-orm/core";
import { orm, syncSchema } from "./shared/db/orm.js";
import 'dotenv/config';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authenticateJWT } from './middleware/auth.middleware.js'; // Asegurate de la extensión .js si usas ESM
import { hashPassword, comparePassword, generateToken } from './utils/auth.utils.js';

// Rutas
import { personaRouter } from "./persona/persona.routes.js";
import { canchaRouter } from "./cancha/canchaRoutes.js";
import { empleadoRouter } from "./empleado/empleado.routes.js";
import { articuloRouter } from "./articulo/articulo.routes.js";
import { reservaRouter } from "./reserva/reserva.routes.js";
import { ReservaArticuloRouter } from "./reserva_articulo/ReservaArticulo.routes.js";
import { loginRouter } from "./login/login.routes.js";

const app = express();

// -------------------------------------------------
// 🛡️ 1. SEGURIDAD BÁSICA (Helmet & Rate Limit)
// -------------------------------------------------
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Demasiadas peticiones, intentá de nuevo en 15 minutos.',
  standardHeaders: true, 
  legacyHeaders: false, 
});

app.use(limiter);

// -------------------------------------------------
// 🌐 2. CORS (Quién puede entrar)
// -------------------------------------------------
const ALLOWED_ORIGINS = [
  "http://localhost:4200",                // Angular local
  "https://mis-canchas-front.netlify.app",// Tu front en prod
  "https://mis-canchas.com",              // Dominio futuro
  "https://www.mis-canchas.com",
];

app.use(cors({
  origin: ALLOWED_ORIGINS, // ✅ Ahora sí usa la lista que definiste arriba
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Pre-flight requests para todos los métodos
app.options("*", cors());

// -------------------------------------------------
// ⚙️ 3. CONFIGURACIÓN GLOBAL
// -------------------------------------------------
app.use(express.json());

// MikroORM Context (Para que el EM funcione en cada request)
app.use((req, res, next) => {
  RequestContext.create(orm.em, next);
});

// -------------------------------------------------
// 🛣️ 4. RUTAS
// -------------------------------------------------

// Ruta Health Check (Para ver si el server vive)
app.get("/", (req, res) => {
  res.send({ message: "API MisCanchas funcionando 🚀" });
});

// A. Rutas PÚBLICAS (No necesitan token)
app.use("/api/login", loginRouter); 

// B. Rutas PRIVADAS (Necesitan token)
// Podés poner el middleware ruta por ruta, o globalmente para todas las de abajo:

//app.use(authenticateJWT); // <--- 🔒 DESCOMENTÁ ESTO PARA PROTEGER TODO LO DE ABAJO

app.use("/api/persona", personaRouter);
app.use("/api/cancha", canchaRouter); 
// Si querés proteger SOLO canchas, hacés: app.use("/api/cancha", authenticateJWT, canchaRouter);
app.use("/api/empleado", empleadoRouter);
app.use("/api/articulo", articuloRouter);
app.use("/api/reserva", reservaRouter);
app.use("/api/reserva_articulo", ReservaArticuloRouter);


// -------------------------------------------------
// ❌ 5. MANEJO DE ERRORES (404)
// -------------------------------------------------
// Esto SIEMPRE va al final de las rutas
app.use((req, res) => {
  res.status(404).send({ message: "Recurso no encontrado (404)" });
});

// -------------------------------------------------
// 🚀 6. INICIO DEL SERVIDOR
// -------------------------------------------------
const startServer = async () => {
  // Sync de esquema (Solo si hace falta)
  if (process.env.SYNC_SCHEMA === "true") {
    await syncSchema();
    console.log('Schema sincronizado ✅');
  }

  const port = process.env.PORT || 3000;
  
  app.listen(port, () => {
    console.log(`Server is running on port ${port} ⚽`);
  });
};

startServer().catch(err => {
  console.error('Error al iniciar el servidor:', err);
});