import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { connectMongo } from "./db.js";
import { apiRouter } from "./routes/api.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: config.frontendOrigin,
    methods: ["GET", "POST", "OPTIONS"]
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRouter);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`Budget assistant API on http://localhost:${config.port}`);
});

connectMongo();

export { app, server };
