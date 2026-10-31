import { Prisma } from "@prisma/client";
import prisma from "@database";
//segue o padrao do UserRepository
export const createPlanta = async (data: Prisma.PlantaCreateInput) => {
  return await prisma.planta.create({
    data,
  });
};

export const findAllPlantas = async (
  filtros: Prisma.PlantaWhereInput = {},
  ordem?: "preco" | "nome"
) => {
  const orderBy: Prisma.PlantaOrderByWithRelationInput[] =
    ordem === "preco"
      ? [{ preco: "asc" }, { id: "asc" }]
      : ordem === "nome"
        ? [{ nome: "asc" }, { id: "asc" }]
        : [{ id: "asc" }];

  return await prisma.planta.findMany({
    where: filtros,
    orderBy,
  });
};

export const findPlantasEsgotadas = async () => {
  return await prisma.planta.findMany({
    where: { estoque: 0 },
    orderBy: { id: "asc" },
  });
};

export const findPlantaById = async (id: number) => {
  return await prisma.planta.findUnique({
    where: { id },
  });
};

export const updatePlanta = async (
  id: number,
  data: Prisma.PlantaUpdateInput
) => {
  return await prisma.planta.update({
    where: { id },
    data,
  });
};

export const deletePlanta = async (id: number) => {
  return await prisma.planta.delete({
    where: { id },
  });
};

export const venderPlanta = async (id: number, quantidade: number) => {
  return await prisma.$transaction(async (transaction) => {
    const resultado = await transaction.planta.updateMany({
      where: {
        id,
        estoque: {
          gte: quantidade,
        },
      },
      data: {
        estoque: {
          decrement: quantidade,
        },
      },
    });

    if (resultado.count === 0) {
      return null;
    }

    return await transaction.planta.findUnique({
      where: { id },
    });
  });
};

export const findEstoquePlantas = async () => {
  return await prisma.planta.findMany({
    select: {
      preco: true,
      estoque: true,
    },
  });
};