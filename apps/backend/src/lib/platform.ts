import type { Prisma, PrismaClient } from "@prisma/client";
import { commissionTiersSchema } from "@truerep/shared";
import { DEFAULT_TIERS, type CommissionTier } from "@/lib/commission";

type Db = PrismaClient | Prisma.TransactionClient;

/** Ajustes de cobro de TrueRep (fila única). Si faltara la fila (base sin la
 * migración de la fase C sembrada), se crea con los valores por defecto. */
export async function platformSettings(db: Db) {
  const row = await db.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, commission_tiers: DEFAULT_TIERS },
  });
  // El Json de la base se valida al leerlo: si alguien lo tocara a mano mal,
  // mejor los tramos por defecto que una comisión imposible.
  const tiers = commissionTiersSchema.safeParse(row.commission_tiers);
  return { ...row, commission_tiers: (tiers.success ? tiers.data : DEFAULT_TIERS) as CommissionTier[] };
}
