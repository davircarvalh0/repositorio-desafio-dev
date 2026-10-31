import express from "express";
import * as UserController from "@controllers/UserController";

const routes = express.Router();

routes.get("/", (req, res) => {
  res.status(200).json({ message: "API do treinamento de CRUD do CITi 🚀" });
});

// CRUD de usuários
routes.post("/users", UserController.createUser);
routes.get("/users", UserController.readAllUsers);
routes.get("/users/:id", UserController.readUserById);
routes.patch("/users/:id", UserController.updateUser);
routes.delete("/users/:id", UserController.deleteUser);

export default routes;
