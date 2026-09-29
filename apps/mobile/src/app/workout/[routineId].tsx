import { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { useQueryClient } from "@tanstack/react-query";
import { toPayload, useWorkoutStore } from "@/state/workoutStore";
import { useWorkoutHistory } from "@/hooks/useWorkoutHistory";
import { api } from "@/lib/api";
import {
  exerciseContext,
  formatSet,
  formatTrend,
  isRecord,
  pctChange,
  setWarning,
  tonnage,
  formatKg,
} from "@/lib/exerciseHistory";
import { animateNextLayout } from "@/lib/motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ExerciseLogCard } from "@/components/workout/ExerciseLogCard";
import { colors, radius, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";
import type { CompletedSet, LogWorkoutResponse, Workout } from "@truerep/shared";

/** Cuántos workouts se miran para sacar récord, media y últimas 3 sesiones. */
const HISTORY_LIMIT = 30;

function elapsedMinutes(startedAt: number | null): number {
  return startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : 1;
}

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const { activeRoutine, startedAt, completed, reset } = useWorkoutStore();
  const { data: history } = useWorkoutHistory(HISTORY_LIMIT);
  // Entrenando se marca serie a serie; al terminar se revisa el resumen y se
  // guarda. Son dos fases de la misma pantalla y no dos rutas: comparten la
  // sesión y el interceptor de salida.
  const [phase, setPhase] = useState<"training" | "review">("training");
  const [open, setOpen] = useState<string | null>(() => activeRoutine?.exercises[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [result, setResult] = useState<LogWorkoutResponse | null>(null);
  // Misma key en cada reintento del mismo intento de guardado (error de red,
  // doble-tap) — solo cambia si el usuario empieza una rutina distinta.
  // Sin esto, un reintento genera un workout duplicado en vez de deduplicar.
  //
  // Crypto.randomUUID() de expo-crypto, no el global crypto.randomUUID():
  // Hermes no implementa WebCrypto y ni React Native ni el winter runtime de
  // Expo instalan ese global, así que `crypto` es undefined en el dispositivo.
  const idempotencyKeyRef = useRef<{ routineId: string; key: string } | null>(null);

  const workouts: Workout[] = useMemo(() => (Array.isArray(history) ? history : []), [history]);
  const contexts = useMemo(
    () => new Map((activeRoutine?.exercises ?? []).map((ex) => [ex.id, exerciseContext(workouts, ex.id)])),
    [workouts, activeRoutine]
  );

  // Siempre hay una salida (el modal es a pantalla completa y sin gesto de
  // cierre). Sin nada registrado, "Cancelar" sale sin preguntar: quien ha
  // entrado por error no tiene que terminar ni revisar nada. Con series
  // registradas, beforeRemove pide confirmación.
  useEffect(() => {
    navigation.setOptions({
      title: phase === "review" && !result ? "Resumen" : "Entrenamiento",
      headerLeft: result
        ? () => null
        : () => (
            <Pressable
              onPress={() => {
                const empty = useWorkoutStore.getState().completed.length === 0;
                router.back();
                if (empty) useWorkoutStore.getState().reset();
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar entrenamiento"
              hitSlop={8}
              style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.headerButtonText}>Cancelar</Text>
            </Pressable>
          ),
    });
  }, [navigation, router, phase, result]);

  // Salir con series marcadas exige confirmar. beforeRemove cubre de una vez la
  // flecha de la cabecera, el botón atrás de Android y cualquier navegación que
  // saque esta pantalla de la pila; el gesto de arrastre ya está desactivado en
  // las opciones de la ruta.
  //
  // El estado se lee con getState() y no de las props del render: al descartar,
  // dispatch() corre en el mismo tick con el listener aún enganchado y vuelve a
  // entrar aquí. Con una condición capturada en el closure seguiría valiendo
  // "hay trabajo sin guardar" y el Alert se repetiría en bucle; leyendo el store
  // vivo, reset() ya lo ha vaciado y la reentrada sale por el return de arriba.
  //
  // Guardar también pasa por aquí y también sale solo: onFinish llama a reset()
  // antes de pintar la pantalla de resumen.
  //
  // Es el único diálogo modal del flujo, y a propósito: descartar la sesión es
  // destructivo e irreversible. Los avisos sobre valores raros no bloquean.
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (e) => {
        const session = useWorkoutStore.getState();
        if (!session.activeRoutine || session.completed.length === 0) return;

        e.preventDefault();
        Alert.alert("¿Cancelar el entrenamiento?", "Se perderán las series que has registrado.", [
          { text: "Seguir entrenando", style: "cancel" },
          {
            text: "Cancelar entrenamiento",
            style: "destructive",
            onPress: () => {
              session.reset();
              navigation.dispatch(e.data.action);
            },
          },
        ]);
      }),
    [navigation]
  );

  if (result) {
    // dismissAll y no back(): back() devolvía al detalle de la rutina que
    // acabas de terminar, todavía dentro del modal. dismissAll vuelve a la
    // primera pantalla de la pila, es decir a las pestañas.
    return <CompletionScreen result={result} onDone={() => router.dismissAll()} />;
  }

  if (!activeRoutine) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.loading}>No hay ningún entrenamiento en curso.</Text>
        <Button title="Volver a las rutinas" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  const exercises = activeRoutine.exercises;
  const payload = toPayload(completed);
  const doneSets = payload.flatMap((e) => e.sets ?? []);
  const isFinished = (id: string) => {
    const entry = completed.find((c) => c.exercise_id === id);
    return !!entry && entry.sets.every((s) => s.done);
  };

  async function onSave() {
    if (!activeRoutine || payload.length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (idempotencyKeyRef.current?.routineId !== activeRoutine.id) {
        idempotencyKeyRef.current = { routineId: activeRoutine.id, key: Crypto.randomUUID() };
      }
      const res = await api<LogWorkoutResponse>("/workouts/log", {
        method: "POST",
        body: JSON.stringify({
          routine_id: activeRoutine.id,
          duration_minutes: elapsedMinutes(startedAt),
          exercises_completed: payload,
          idempotency_key: idempotencyKeyRef.current.key,
        }),
      });
      // Un workout nuevo afecta a me, schedule, stats e historial — invalida todo
      qc.invalidateQueries();
      reset();
      setResult(res);
    } catch (e) {
      // En línea y no en un Alert: lo registrado sigue ahí y basta con volver a pulsar.
      setSaveError(e instanceof Error ? e.message : "No hemos podido guardar el entrenamiento");
    } finally {
      setSaving(false);
    }
  }

  function openNextAfter(id: string) {
    const from = exercises.findIndex((ex) => ex.id === id);
    const next = [...exercises.slice(from + 1), ...exercises.slice(0, from)].find(
      (ex) => ex.id !== id && !isFinished(ex.id)
    );
    animateNextLayout();
    setOpen(next?.id ?? null);
  }

  const doneExercises = exercises.filter((ex) => payload.some((p) => p.exercise_id === ex.id)).length;

  if (phase === "training") {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* keyboardShouldPersistTaps="handled": con el teclado abierto, el primer
            toque en un check o un chip solo cerraba el teclado y se perdía. */}
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>{activeRoutine.title}</Text>
            <Text style={styles.subtitle}>
              {doneExercises} de {exercises.length} ejercicios · {doneSets.length}{" "}
              {doneSets.length === 1 ? "serie" : "series"}
            </Text>
          </View>
          <Text style={styles.hint}>Marca cada serie al terminarla. Ya viene con lo de la última vez.</Text>
          {exercises.map((ex) => (
            <ExerciseLogCard
              key={ex.id}
              exercise={ex}
              entry={completed.find((c) => c.exercise_id === ex.id)}
              context={contexts.get(ex.id)!}
              mode="training"
              expanded={open === ex.id}
              onToggleExpanded={() => setOpen(open === ex.id ? null : ex.id)}
              onCompleted={() => openNextAfter(ex.id)}
            />
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            title="Terminar y revisar"
            onPress={() => {
              setOpen(null);
              setPhase("review");
            }}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Resumen post-sesión ────────────────────────────────────────────────
  const previous = workouts.find((w) => w.routine_id === activeRoutine.id);
  const prevSets: CompletedSet[] = previous?.exercises_completed.flatMap((e) => e.sets ?? []) ?? [];
  const reps = doneSets.reduce((sum, s) => sum + s.reps, 0);
  const tons = tonnage(doneSets);
  const vsPrev = (now: number, before: number) => {
    const pct = prevSets.length ? pctChange(now, before) : null;
    return pct == null ? " " : `${formatTrend(pct)} vs anterior`;
  };
  const stats = [
    ...(tons > 0 ? [{ label: "Tonelaje", value: `${formatKg(tons)} kg`, sub: vsPrev(tons, tonnage(prevSets)) }] : []),
    { label: "Series", value: String(doneSets.length), sub: `${doneExercises} de ${exercises.length} ejerc.` },
    { label: "Reps", value: String(reps), sub: vsPrev(reps, prevSets.reduce((sum, s) => sum + s.reps, 0)) },
  ];
  const records = payload.flatMap((e) => {
    const ctx = contexts.get(e.exercise_id);
    const top = (e.sets ?? []).filter((s) => isRecord(s, ctx?.best ?? null));
    const name = exercises.find((ex) => ex.id === e.exercise_id)?.name ?? "";
    return top.length ? [`${name} · ${formatSet(top[0])}`] : [];
  });
  const toReview = exercises.filter((ex) => {
    const entry = completed.find((c) => c.exercise_id === ex.id);
    const last = contexts.get(ex.id)?.sessions[0]?.sets;
    return entry?.sets.some((s, i) => s.done && setWarning(s, last?.[i] ?? last?.[last.length - 1]));
  }).length;
  const missing = exercises.length - doneExercises;
  const minutes = elapsedMinutes(startedAt);

  const status = saveError
    ? saveError
    : payload.length === 0
      ? "Marca al menos una serie para guardar"
      : toReview
        ? `${toReview} ${toReview === 1 ? "ejercicio para revisar" : "ejercicios para revisar"} · puedes guardar igual`
        : missing
          ? `${missing} ${missing === 1 ? "ejercicio sin marcar no contará" : "ejercicios sin marcar no contarán"}`
          : "Todo registrado";

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.display}>Sesión completada</Text>
          <Text style={styles.subtitle}>
            {activeRoutine.title} · {minutes} min
          </Text>
        </View>

        <Card style={styles.stats} accessibilityLabel="Totales de la sesión">
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
                {s.value}
              </Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </View>
          ))}
        </Card>

        {records.length > 0 && (
          <View style={styles.records}>
            <Text style={styles.recordsTitle}>
              {records.length === 1 ? "Nuevo récord" : `${records.length} récords nuevos`}
            </Text>
            {records.map((r) => (
              <Text key={r} style={styles.recordItem}>
                {r}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.sectionLabel}>
          Lo que has hecho{previous ? " · comparado con la última vez" : ""}
        </Text>
        {exercises.map((ex) => (
          <ExerciseLogCard
            key={ex.id}
            exercise={ex}
            entry={completed.find((c) => c.exercise_id === ex.id)}
            context={contexts.get(ex.id)!}
            mode="review"
            expanded={open === ex.id}
            onToggleExpanded={() => setOpen(open === ex.id ? null : ex.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.status, saveError && { color: colors.dangerText }]}
        >
          {status}
        </Text>
        <Button
          title={saving ? "Guardando…" : "Guardar entrenamiento"}
          onPress={onSave}
          disabled={saving || payload.length === 0}
        />
        <Pressable
          onPress={() => {
            setOpen(null);
            setPhase("training");
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.secondaryText}>Seguir entrenando</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Pico emocional del flujo: reemplaza el Alert.alert de sistema por una
 * pantalla que celebra XP/racha/logros antes de volver al inicio. */
function CompletionScreen({ result, onDone }: { result: LogWorkoutResponse; onDone: () => void }) {
  return (
    <View style={styles.completionContainer}>
      <Text style={styles.completionTitle}>Entrenamiento guardado</Text>
      <View style={styles.completionStatsRow}>
        <View style={styles.completionStat}>
          <Text style={styles.completionStatValue}>+{result.xp_earned}</Text>
          <Text style={styles.completionStatLabel}>XP</Text>
        </View>
        <View style={styles.completionStat}>
          <Text style={styles.completionStatValue}>{result.user.streak}</Text>
          <Text style={styles.completionStatLabel}>
            {result.user.streak === 1 ? "día de racha" : "días de racha"}
          </Text>
        </View>
      </View>
      {result.unlocked_achievements.length > 0 && (
        <Card style={styles.achievementsCard}>
          <Text style={styles.achievementsTitle}>Logros desbloqueados</Text>
          {result.unlocked_achievements.map((name) => (
            <Text key={name} style={styles.achievementItem}>
              {name}
            </Text>
          ))}
        </Card>
      )}
      <Button title="Volver al inicio" onPress={onDone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  loading: { ...typo.body, textAlign: "center", color: colors.textMuted },
  header: { gap: spacing.xs },
  display: { ...typo.display, color: colors.textPrimary },
  title: { ...typo.title, color: colors.textPrimary },
  subtitle: { ...typo.meta, color: colors.textSecondary },
  hint: { ...typo.meta, color: colors.textMuted },
  sectionLabel: { ...typo.meta, color: colors.textSecondary, marginTop: spacing.sm },
  stats: { flexDirection: "row", gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  statLabel: { ...typo.label, fontWeight: "400", color: colors.textSecondary },
  statValue: { ...typo.stat, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  statSub: { ...typo.label, fontWeight: "400", color: colors.textSecondary },
  records: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 2,
  },
  recordsTitle: { ...typo.label, color: colors.onFill },
  recordItem: { ...typo.cardTitle, color: colors.onFill },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  status: { ...typo.meta, color: colors.textSecondary, textAlign: "center" },
  headerButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.xs },
  headerButtonText: { ...typo.body, fontWeight: "600", color: colors.primaryText },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  secondaryText: { ...typo.cardTitle, color: colors.primaryText },
  completionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  completionTitle: {
    ...typo.display,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
  },
  completionStatsRow: { flexDirection: "row", gap: spacing.xl },
  completionStat: { alignItems: "center", gap: spacing.xs },
  completionStatValue: { fontSize: 28, lineHeight: 30, letterSpacing: -0.7, fontWeight: "800", color: colors.primaryText },
  completionStatLabel: { ...typo.meta, color: colors.textSecondary },
  achievementsCard: { width: "100%", gap: spacing.xs },
  achievementsTitle: { ...typo.cardTitle, fontSize: 14, color: colors.textPrimary },
  achievementItem: { fontSize: 14, color: colors.textPrimary },
});
