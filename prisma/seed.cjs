const { PrismaClient, Luminosidade } = require("@prisma/client");

const prisma = new PrismaClient();
const prefix = (process.env.SEED_PREFIX || "").trim();

const exemplos = [
  {
    nome: "Costela-de-adão",
    especie: "Monstera deliciosa",
    preco: 8990,
    estoque: 8,
    luminosidade: Luminosidade.MEIA_SOMBRA,
    petFriendly: false,
    regaACadaDias: 7,
  },
  {
    nome: "Samambaia",
    especie: "Nephrolepis exaltata",
    preco: 3990,
    estoque: 12,
    luminosidade: Luminosidade.SOMBRA,
    petFriendly: true,
    regaACadaDias: 2,
  },
  {
    nome: "Cacto",
    especie: "Echinopsis oxygona",
    preco: 1990,
    estoque: 0,
    luminosidade: Luminosidade.SOL_PLENO,
    petFriendly: false,
    regaACadaDias: 14,
  },
];

async function main() {
  const resumo = await prisma.$transaction(async (transaction) => {
    let criadas = 0;
    let existentes = 0;

    for (const exemplo of exemplos) {
      const nome = prefix ? `${prefix} ${exemplo.nome}` : exemplo.nome;
      const planta = await transaction.planta.findFirst({
        where: { nome, especie: exemplo.especie },
      });

      if (planta) {
        existentes++;
        continue;
      }

      await transaction.planta.create({ data: { ...exemplo, nome } });
      criadas++;
    }

    return { criadas, existentes };
  });

  console.log(JSON.stringify(resumo));
}

main()
  .catch((error) => {
    console.error("Erro ao inserir plantas de exemplo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
