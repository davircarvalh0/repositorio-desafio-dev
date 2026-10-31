import express from "express";
import * as UserController from "@controllers/UserController";
import * as PlantaController from "@controllers/PlantaController";

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

//CRUD das plantas
routes.post("/plantas", PlantaController.createPlanta);
routes.get("/plantas", PlantaController.readAllPlantas);
routes.get("/plantas/:id", PlantaController.readPlantaById);
routes.patch("/plantas/:id", PlantaController.updatePlanta);
routes.delete("/plantas/:id", PlantaController.deletePlanta);

export default routes;
