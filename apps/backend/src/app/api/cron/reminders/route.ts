import { db } from "@/lib/db";
import { ok, fail, handler } from "@/lib/api";
import { sendPushNotifications, localHour, isSameLocalDay, type PushMessage } from "@/lib/expo-push";
import { programPosition } from "@/lib/programs";

const STREAK_WARNING_HOUR = 19; // por la tarde, cuando aún hay tiempo de entrenar

/**
 * Cron horario (Vercel): recordatorio diario a la hora elegida por el usuario
 * y aviso de racha en riesgo. Idempotente vía last_reminder_sent_at.
 */
export const GET = handler(async (req: Request) => {
  // Fail closed: sin secret configurado, nadie puede disparar envíos
  if (!process.env.CRON_SECRET) return fail("CRON_SECRET not configured", 500);
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return fail("Unauthorized", 401);
  }

  const now = new Date();
  const users = await db.user.findMany({
    where: {
      reminder_enabled: true,
      // Clientes con el acceso activado por su entrenador. (Antes miraba el
      // plan antiguo de TrueRep, que ya no tiene nadie: no salía ningún aviso.)
      client_of: { some: { status: "ACTIVE" } },
      push_tokens: { some: { is_active: true } },
    },
    include: { push_tokens: { where: { is_active: true }, select: { token: true } } },
  });

  // Workouts de las últimas 48h de estos usuarios, para saber quién ya entrenó hoy
  const userIds = users.map((u) => u.id);
  const recentWorkouts = await db.workout.findMany({
    where: { user_id: { in: userIds }, completed_at: { gte: new Date(now.getTime() - 48 * 3600_000) } },
    select: { user_id: true, completed_at: true },
  });

  // Mensajes programados: programa activo de cada usuario + sus items MESSAGE
  const assignments = await db.programAssignment.findMany({
    where: { user_id: { in: userIds }, is_active: true, program: { deleted_at: null } },
    select: { user_id: true, start_date: true, program_id: true },
  });
  const assignByUser = new Map(assignments.map((a) => [a.user_id, a]));
  const messageItems = await db.programItem.findMany({
    where: { type: "MESSAGE", program_id: { in: assignments.map((a) => a.program_id) } },
    select: { program_id: true, week: true, day: true, data: true },
  });

  const messages: PushMessage[] = [];
  const notified: string[] = [];

  const yesterday = new Date(now.getTime() - 24 * 3600_000);

  for (const user of users) {
    const hour = localHour(user.timezone, now);
    const workedOutToday = recentWorkouts.some(
      (w) => w.user_id === user.id && isSameLocalDay(w.completed_at, user.timezone, now)
    );
    if (workedOutToday) continue;

    // Racha en riesgo: el último workout fue AYER (racha aún viva) y hoy no ha entrenado.
    // Se evalúa aparte del recordatorio diario — el daily de la mañana no debe suprimirlo.
    const streakAtRisk =
      hour === STREAK_WARNING_HOUR &&
      user.streak > 0 &&
      user.streak_last_workout_date &&
      isSameLocalDay(user.streak_last_workout_date, user.timezone, yesterday);

    const alreadyNotifiedToday =
      user.last_reminder_sent_at && isSameLocalDay(user.last_reminder_sent_at, user.timezone, now);

    let msg: Omit<PushMessage, "to"> | null = null;
    if (streakAtRisk) {
      msg = {
        title: `Tu racha de ${user.streak} días está en riesgo 🔥`,
        body: "Un workout hoy y la mantienes viva. ¡Vamos!",
        data: { type: "streak_warning" },
      };
    } else if (hour === user.reminder_hour && !alreadyNotifiedToday) {
      // ponytail: el mensaje programado se entrega piggyback en el recordatorio diario
      // (1/día, a reminder_hour, solo si no entrenó). Cron dedicado si se necesita más control.
      const a = assignByUser.get(user.id);
      const pos = a ? programPosition(a.start_date, now) : null;
      const scheduled =
        pos && pos.week > 0
          ? messageItems.find(
              (m) => m.program_id === a!.program_id && m.week === pos.week && m.day === pos.day
            )
          : null;
      const sd = scheduled?.data as { title?: string; body?: string } | null;

      msg =
        sd && (sd.title || sd.body)
          ? {
              title: sd.title || "Mensaje de tu coach",
              body: sd.body || "",
              data: { type: "scheduled_message" },
            }
          : {
              title: "¿Listo para entrenar? 💪",
              body: `${user.username}, tu próximo workout te espera.`,
              data: { type: "daily_reminder" },
            };
    }

    if (msg) {
      for (const t of user.push_tokens) messages.push({ to: t.token, ...msg });
      notified.push(user.id);
    }
  }

  const invalidTokens = await sendPushNotifications(messages);

  await Promise.all([
    notified.length
      ? db.user.updateMany({ where: { id: { in: notified } }, data: { last_reminder_sent_at: now } })
      : Promise.resolve(),
    invalidTokens.length
      ? db.pushToken.updateMany({ where: { token: { in: invalidTokens } }, data: { is_active: false } })
      : Promise.resolve(),
  ]);

  return ok({ notified: notified.length, sent: messages.length, deactivated_tokens: invalidTokens.length });
});
