import { Luminosidade } from "@prisma/client";
import { Request, Response } from "express";
import * as PlantaRepository from "@repositories/PlantaRepository";

const validarDados = (
  dados: Record<string, unknown>,
  parcial: boolean
): string | null => {
  const camposObrigatorios = [
    "nome",
    "especie",
    "preco",
    "estoque",
    "luminosidade",
    "petFriendly",
    "regaACadaDias",
  ];

  if (!parcial) {
    for (const campo of camposObrigatorios) {
      if (dados[campo] === undefined) {
        return `O campo ${campo} é obrigatório.`;
      }
    }
  }

  const {
    nome,
    especie,
    preco,
    estoque,
    luminosidade,
    petFriendly,
    regaACadaDias,
  } = dados;

  if (
    nome !== undefined &&
    (typeof nome !== "string" || nome.trim() === "")
  ) {
    return "nome deve ser um texto não vazio.";
  }

  if (
    especie !== undefined &&
    (typeof especie !== "string" || especie.trim() === "")
  ) {
    return "especie deve ser um texto não vazio.";
  }

  if (
    preco !== undefined &&
    (typeof preco !== "number" || !Number.isInteger(preco) || preco <= 0)
  ) {
    return "preco deve ser um inteiro maior que zero, em centavos.";
  }

  if (
    estoque !== undefined &&
    (typeof estoque !== "number" ||
      !Number.isInteger(estoque) ||
      estoque < 0)
  ) {
    return "estoque deve ser um inteiro maior ou igual a zero.";
  }

  if (
    luminosidade !== undefined &&
    !Object.values(Luminosidade).includes(luminosidade as Luminosidade)
  ) {
    return "luminosidade deve ser SOMBRA, MEIA_SOMBRA ou SOL_PLENO.";
  }

  if (petFriendly !== undefined && typeof petFriendly !== "boolean") {
    return "petFriendly deve ser um booleano.";
  }

  if (
    regaACadaDias !== undefined &&
    (typeof regaACadaDias !== "number" ||
      !Number.isInteger(regaACadaDias) ||
      regaACadaDias < 1)
  ) {
    return "regaACadaDias deve ser um inteiro maior ou igual a 1.";
  }

  return null;
};

const corpoValido = (corpo: unknown): corpo is Record<string, unknown> => {
  return typeof corpo === "object" && corpo !== null && !Array.isArray(corpo);
};

const idValido = (id: number): boolean => {
  return Number.isInteger(id) && id > 0;
};

export const createPlanta = async (req: Request, res: Response) => {
  try {
    if (!corpoValido(req.body)) {
      return res.status(400).json({
        message: "Envie um objeto JSON com os dados da planta.",
      });
    }

    const erro = validarDados(req.body, false);

    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const {
      nome,
      especie,
      preco,
      estoque,
      luminosidade,
      petFriendly,
      regaACadaDias,
    } = req.body;

    const planta = await PlantaRepository.createPlanta({
      nome: nome as string,
      especie: especie as string,
      preco: preco as number,
      estoque: estoque as number,
      luminosidade: luminosidade as Luminosidade,
      petFriendly: petFriendly as boolean,
      regaACadaDias: regaACadaDias as number,
    });

    return res.status(201).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao criar planta." });
  }
};

export const readAllPlantas = async (req: Request, res: Response) => {
  try {
    const { luminosidade, petFriendly } = req.query;

    if (
      luminosidade !== undefined &&
      (typeof luminosidade !== "string" ||
        !Object.values(Luminosidade).includes(
          luminosidade as Luminosidade
        ))
    ) {
      return res.status(400).json({
        message: "luminosidade deve ser SOMBRA, MEIA_SOMBRA ou SOL_PLENO.",
      });
    }

    if (
      petFriendly !== undefined &&
      petFriendly !== "true" &&
      petFriendly !== "false"
    ) {
      return res.status(400).json({
        message: "petFriendly deve ser true ou false.",
      });
    }

    const plantas = await PlantaRepository.findAllPlantas({
      luminosidade: luminosidade as Luminosidade | undefined,
      petFriendly:
        petFriendly === undefined ? undefined : petFriendly === "true",
    });

    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas." });
  }
};

export const readPlantaById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!idValido(id)) {
      return res.status(400).json({
        message: "O id deve ser um inteiro maior que zero.",
      });
    }

    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    return res.status(200).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar planta." });
  }
};

export const updatePlanta = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!idValido(id)) {
      return res.status(400).json({
        message: "O id deve ser um inteiro maior que zero.",
      });
    }

    if (!corpoValido(req.body)) {
      return res.status(400).json({
        message: "Envie um objeto JSON com os dados da planta.",
      });
    }

    const erro = validarDados(req.body, true);

    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    const {
      nome,
      especie,
      preco,
      estoque,
      luminosidade,
      petFriendly,
      regaACadaDias,
    } = req.body;

    const plantaAtualizada = await PlantaRepository.updatePlanta(id, {
      nome: nome as string | undefined,
      especie: especie as string | undefined,
      preco: preco as number | undefined,
      estoque: estoque as number | undefined,
      luminosidade: luminosidade as Luminosidade | undefined,
      petFriendly: petFriendly as boolean | undefined,
      regaACadaDias: regaACadaDias as number | undefined,
    });

    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar planta." });
  }
};

export const deletePlanta = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!idValido(id)) {
      return res.status(400).json({
        message: "O id deve ser um inteiro maior que zero.",
      });
    }

    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    await PlantaRepository.deletePlanta(id);

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao deletar planta." });
  }
};

export const venderPlanta = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!idValido(id)) {
      return res.status(400).json({
        message: "O id deve ser um inteiro maior que zero.",
      });
    }

    if (!corpoValido(req.body)) {
      return res.status(400).json({
        message: "Envie um objeto JSON com a quantidade da venda.",
      });
    }

    const { quantidade } = req.body;

    if (
      typeof quantidade !== "number" ||
      !Number.isInteger(quantidade) ||
      quantidade <= 0
    ) {
      return res.status(400).json({
        message: "quantidade deve ser um inteiro maior que zero.",
      });
    }

    const planta = await PlantaRepository.findPlantaById(id);

    if (!planta) {
      return res.status(404).json({
        message: "Planta não encontrada.",
      });
    }

    if (planta.estoque < quantidade) {
      return res.status(400).json({
        message: `Estoque insuficiente. Temos somente ${planta.estoque} vasos disponíveis.`,
      });
    }

    const plantaAtualizada = await PlantaRepository.venderPlanta(
      id,
      quantidade
    );

    if (!plantaAtualizada) {
      return res.status(400).json({
        message: "Não foi possível concluir a venda: o estoque disponível mudou. Consulte a planta novamente.",
      });
    }

    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao realizar venda.",
    });
  }
};