import { db } from "@/lib/db";
import { ok, fail, parseBody, handler } from "@/lib/api";
import { requireTrainer } from "@/lib/auth";
import { merchantAccountParams, merchantStatus, stripe } from "@/lib/stripe";
import { requireEnv } from "@/lib/env";
import { connectOnboardingSchema } from "@truerep/shared";

/** Alta del entrenador en Stripe (onboarding alojado por Stripe). Crea su
 * cuenta conectada la primera vez y devuelve un enlace de alta de un solo uso.
 * También sirve para continuar un alta a medias: los enlaces caducan en minutos
 * y Stripe manda al refresh_url, que vuelve a pedir uno aquí.
 *
 * Si ya tenía cuenta solo para pagar la cuota de efectivo, se le añade la parte
 * de cobro: es la misma cuenta y la cuota sigue igual. */
export const POST = handler(async (req: Request) => {
  const trainer = await requireTrainer();
  const { country } = await parseBody(req, connectOnboardingSchema);
  const billingUrl = `${requireEnv("NEXT_PUBLIC_APP_URL")}/billing`;

  try {
    let accountId = trainer.stripe_account_id;
    if (!accountId) {
      if (!country) return fail("Elige tu país", 400);
      const account = await stripe().v2.core.accounts.create({
        contact_email: trainer.email,
        display_name: trainer.username,
        metadata: { truerep_user_id: trainer.id },
        ...merchantAccountParams(country),
      });
      // Solo si nadie se adelantó (doble clic): nunca pisar una cuenta ya guardada.
      const saved = await db.user.updateMany({
        where: { id: trainer.id, stripe_account_id: null },
        data: { stripe_account_id: account.id },
      });
      accountId = saved.count
        ? account.id
        : (await db.user.findUniqueOrThrow({ where: { id: trainer.id } })).stripe_account_id!;
    } else if ((await merchantStatus(accountId)) === "none") {
      if (!country) return fail("Elige tu país", 400);
      await stripe().v2.core.accounts.update(accountId, merchantAccountParams(country));
    }

    const link = await stripe().v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["merchant"],
          refresh_url: `${billingUrl}?refresh=1`,
          return_url: billingUrl,
        },
      },
    });
    return ok({ url: link.url });
  } catch (e) {
    console.error("Stripe onboarding error:", e);
    return fail("No se ha podido abrir el alta en Stripe. Inténtalo de nuevo.", 502);
  }
});
