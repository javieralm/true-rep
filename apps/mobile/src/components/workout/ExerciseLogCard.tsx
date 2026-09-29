import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Exercise } from "@truerep/shared";
import { initialSets, type SessionExercise, useWorkoutStore } from "@/state/workoutStore";
import {
  amount,
  type ExerciseContext,
  formatSet,
  formatSets,
  formatShortDate,
  formatTrend,
  isRecord,
  load,
  pctChange,
  setWarning,
} from "@/lib/exerciseHistory";
import { animateNextLayout } from "@/lib/motion";
import { colors, radius, spacing } from "@/constants/colors";
import { type as typo } from "@/constants/typography";

interface Props {
  exercise: Exercise;
  entry: SessionExercise | undefined;
  context: ExerciseContext;
  /** training: se marca serie a serie mientras se entrena.
   *  review: lo hecho se lee de un vistazo y se corrige al abrir la tarjeta. */
  mode: "training" | "review";
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Se acaba de marcar la última serie pendiente. */
  onCompleted?: () => void;
}

const FELT = [
  { value: "easy", label: "Fácil" },
  { value: "medium", label: "Normal" },
  { value: "hard", label: "Difícil" },
] as const;

export function ExerciseLogCard({ exercise, entry, context, mode, expanded, onToggleExpanded, onCompleted }: Props) {
  const store = useWorkoutStore();
  const timed = exercise.measure === "seconds";
  const last = context.sessions[0]?.sets;
  // Antes de tocar nada, lo que se ve es la última vez (o lo prescrito): así
  // el caso normal, "he hecho lo mismo", es solo marcar.
  const sets: SessionExercise["sets"] = entry?.sets ?? (last?.length ? last : initialSets(exercise));
  const doneSets = sets.filter((s) => s.done && amount(s) > 0);
  const allDone = sets.length > 0 && sets.every((s) => s.done);
  const status = allDone ? "done" : sets.some((s) => s.done) ? "partial" : "none";

  // Crea la entrada con la precarga la primera vez que se toca el ejercicio.
  function ensure() {
    if (!entry) store.toggleExercise(exercise.id, undefined, last);
  }

  function toggleSet(i: number) {
    ensure();
    const willComplete = !sets[i].done && sets.filter((s) => !s.done).length === 1;
    animateNextLayout();
    store.setSetDone(exercise.id, i, !sets[i].done);
    if (willComplete) onCompleted?.();
  }

  function toggleAll() {
    ensure();
    animateNextLayout();
    store.setAllSetsDone(exercise.id, !allDone);
    if (!allDone) onCompleted?.();
  }

  const warnings = sets
    .map((s, i) => (s.done ? setWarning(s, last?.[i] ?? last?.[last.length - 1]) : null))
    .map((w, i) => (w ? `Serie ${i + 1}: ${w}.` : null))
    .filter((w): w is string => !!w);

  const prescription = [
    exercise.sets ? `${exercise.sets} series` : null,
    exercise.reps ? `${exercise.reps}${timed ? " s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" × ");
  const summary =
    doneSets.length > 0
      ? formatSets(doneSets)
      : mode === "review"
        ? "No lo marcaste en la sesión"
        : prescription || "Sin prescripción";

  const meta = context.best
    ? [
        `Récord ${formatSet(context.best)}`,
        context.average ? `media ${formatSet(context.average)}` : null,
        context.trendPct != null ? `${formatTrend(context.trendPct)} en ${context.sessions.length} sesiones` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Primera vez que lo registras";

  const delta = last && doneSets.length > 0 ? pctChange(load(doneSets), load(last)) : null;
  const trailing =
    mode === "review" && doneSets.length > 0 ? (warnings.length ? "Revisar" : formatTrend(delta)) : null;

  return (
    <View style={[styles.card, allDone && styles.cardDone]}>
      <View style={styles.header}>
        <Pressable
          onPress={toggleAll}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allDone ? true : status === "partial" ? "mixed" : false }}
          accessibilityLabel={`Marcar ${exercise.name} como hecho`}
          hitSlop={4}
          style={({ pressed }) => [styles.checkHit, pressed && styles.pressed]}
        >
          <CheckCircle status={status} />
        </Pressable>
        <Pressable
          onPress={() => {
            animateNextLayout();
            onToggleExpanded();
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityHint={expanded ? "Cierra el ejercicio" : "Abre el ejercicio para registrar las series"}
          style={({ pressed }) => [styles.headerText, pressed && styles.pressedSoft]}
        >
          <View style={styles.titleRow}>
            <Text style={styles.name}>{exercise.name}</Text>
            {trailing ? (
              <Text style={[styles.trailing, warnings.length > 0 && { color: colors.warningText }]}>{trailing}</Text>
            ) : (
              <Ionicons
                name={expanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            )}
          </View>
          {!expanded && (
            <Text style={[styles.summary, doneSets.length === 0 && { color: colors.textSecondary }]}>{summary}</Text>
          )}
          <Text style={styles.meta}>{meta}</Text>
        </Pressable>
      </View>

      {expanded && (
        <View style={styles.body}>
          {context.sessions.length > 0 && (
            <View style={styles.copyRow}>
              <Text style={styles.copyLabel}>Copiar de</Text>
              {context.sessions.map((s) => (
                <Pressable
                  key={s.date}
                  onPress={() => {
                    ensure();
                    store.replaceSets(exercise.id, s.sets);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Copiar las series del ${formatShortDate(s.date)}`}
                  style={({ pressed }) => [styles.copyChip, pressed && styles.pressed]}
                >
                  <Text style={styles.copyChipText}>{formatShortDate(s.date)}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.checkHit} />
            <Text style={[styles.colLabel, styles.setLabel]}>Serie</Text>
            <Text style={[styles.colLabel, styles.field]}>{timed ? "Seg" : "Reps"}</Text>
            <Text style={[styles.colLabel, styles.field]}>Kg</Text>
          </View>

          {sets.map((s, i) => {
            const prev = last?.[i];
            const warn = s.done ? setWarning(s, prev ?? last?.[last.length - 1]) : null;
            return (
              <View key={i} style={styles.row}>
                <Pressable
                  onPress={() => toggleSet(i)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !!s.done }}
                  accessibilityLabel={`Serie ${i + 1} hecha`}
                  style={({ pressed }) => [styles.checkHit, pressed && styles.pressed]}
                >
                  <CheckCircle status={s.done ? "done" : "none"} small />
                </Pressable>
                <View style={styles.setLabel}>
                  <View style={styles.setTitleRow}>
                    <Text style={styles.setNumber}>{i + 1}</Text>
                    {s.done && isRecord(s, context.best) && (
                      <Text style={styles.recordBadge}>Récord</Text>
                    )}
                  </View>
                  {prev && <Text style={styles.prev}>Antes {formatSet(prev)}</Text>}
                </View>
                <NumberField
                  value={timed ? s.seconds : s.reps}
                  onChange={(v) => {
                    ensure();
                    if (timed) store.setSetSeconds(exercise.id, i, v ?? 0);
                    else store.setSetReps(exercise.id, i, v ?? 0);
                  }}
                  label={`${timed ? "Segundos" : "Reps"} de la serie ${i + 1} de ${exercise.name}`}
                  warn={!!warn && amount(s) !== (prev ? amount(prev) : amount(s))}
                />
                <NumberField
                  value={s.weight_kg}
                  decimal
                  onChange={(v) => {
                    ensure();
                    store.setSetWeight(exercise.id, i, v);
                  }}
                  label={`Kilos de lastre de la serie ${i + 1} de ${exercise.name}`}
                  warn={!!warn && (s.weight_kg ?? 0) !== (prev?.weight_kg ?? 0)}
                />
              </View>
            );
          })}

          {warnings.length > 0 && (
            <View accessibilityLiveRegion="polite" style={styles.warnings}>
              {warnings.map((w) => (
                <View key={w} style={styles.warningRow}>
                  <View style={styles.warningDot} />
                  <Text style={styles.warningText}>{w}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            onPress={() => {
              ensure();
              animateNextLayout();
              store.addSet(exercise.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Añadir una serie a ${exercise.name}`}
            style={({ pressed }) => [styles.addSet, pressed && styles.pressed]}
          >
            <Ionicons name="add" size={18} color={colors.primaryText} />
            <Text style={styles.addSetText}>Añadir serie</Text>
          </Pressable>

          <View style={styles.feltRow} accessibilityRole="radiogroup" accessibilityLabel="Cómo te ha costado">
            {FELT.map((f) => {
              const selected = entry?.felt_like === f.value;
              return (
                <Pressable
                  key={f.value}
                  onPress={() => {
                    ensure();
                    store.setFeltLike(exercise.id, f.value);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.feltChip, selected && styles.feltChipActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.feltChipText, selected && styles.feltChipTextActive]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function CheckCircle({ status, small }: { status: "done" | "partial" | "none"; small?: boolean }) {
  const size = small ? 26 : 28;
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        status === "done" && styles.circleDone,
        status === "partial" && styles.circlePartial,
      ]}
    >
      {status === "done" && <Ionicons name="checkmark" size={small ? 16 : 18} color={colors.onFill} />}
    </View>
  );
}

/** Campo numérico que no pelea con el teclado: guarda el texto mientras se
 * escribe ("17," a medias) y solo se sincroniza con el valor del store cuando
 * no tiene el foco, p. ej. al copiar otra sesión. */
function NumberField({
  value,
  onChange,
  decimal,
  label,
  warn,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  decimal?: boolean;
  label: string;
  warn: boolean;
}) {
  const show = (v: number | undefined) => (v == null || (decimal && v === 0) ? "" : String(v).replace(".", ","));
  const [text, setText] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(show(value));
    // show es estable en la práctica (solo depende de decimal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={() => {
        focused.current = false;
        setText(show(value));
      }}
      onChangeText={(t) => {
        setText(t);
        const n = decimal ? parseFloat(t.replace(",", ".")) : parseInt(t, 10);
        onChange(Number.isFinite(n) && n >= 0 ? n : undefined);
      }}
      keyboardType={decimal ? "decimal-pad" : "number-pad"}
      placeholder="—"
      placeholderTextColor={colors.textMuted}
      selectTextOnFocus
      accessibilityLabel={label}
      style={[styles.field, styles.input, warn && styles.inputWarn]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
  },
  cardDone: { borderColor: colors.success, backgroundColor: "#f0fdf4" },
  header: { flexDirection: "row", alignItems: "flex-start" },
  checkHit: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, minHeight: 44, paddingTop: spacing.sm, paddingBottom: spacing.xs, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { ...typo.cardTitle, color: colors.textPrimary, flex: 1 },
  trailing: { ...typo.meta, fontWeight: "600", color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  summary: { ...typo.body, fontWeight: "500", color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  meta: { ...typo.label, fontWeight: "400", color: colors.textSecondary },
  body: { gap: spacing.sm, paddingTop: spacing.sm, paddingLeft: spacing.sm },
  copyRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap" },
  copyLabel: { ...typo.label, fontWeight: "400", color: colors.textSecondary, marginRight: spacing.xs },
  copyChip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  copyChipText: { ...typo.meta, fontWeight: "600", color: colors.textPrimary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginLeft: -spacing.sm },
  colLabel: { ...typo.label, fontWeight: "400", color: colors.textSecondary, textAlign: "center" },
  setLabel: { flex: 1, minWidth: 0, textAlign: "left" },
  setTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  setNumber: { ...typo.body, fontWeight: "600", color: colors.textPrimary },
  recordBadge: {
    ...typo.label,
    color: colors.onFill,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    overflow: "hidden",
  },
  prev: { ...typo.label, fontWeight: "400", color: colors.textSecondary },
  field: { width: 64 },
  input: {
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    textAlign: "center",
    ...typo.cardTitle,
    color: colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  inputWarn: { borderColor: colors.warning, borderWidth: 1.5, backgroundColor: "#FFF8EC" },
  warnings: { gap: spacing.xs },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  warningDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning, marginTop: 6 },
  warningText: { ...typo.meta, color: colors.warningText, flex: 1 },
  addSet: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "flex-start" },
  addSetText: { ...typo.meta, fontWeight: "600", color: colors.primaryText },
  feltRow: { flexDirection: "row", gap: spacing.xs },
  feltChip: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  feltChipActive: { borderColor: colors.primary, backgroundColor: "#FFF3ED" },
  feltChipText: { ...typo.meta, color: colors.textSecondary },
  feltChipTextActive: { color: colors.primaryText, fontWeight: "700" },
  circle: {
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  circleDone: { backgroundColor: colors.success, borderColor: colors.success },
  circlePartial: { borderColor: colors.primary, borderWidth: 3 },
  // Respuesta al apoyar el dedo (DESIGN.md): se hunde un poco, como algo físico.
  pressed: { transform: [{ scale: 0.94 }], opacity: 0.85 },
  pressedSoft: { opacity: 0.7 },
});
