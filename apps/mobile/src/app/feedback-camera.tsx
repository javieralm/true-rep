import { useState } from "react";
import { ScrollView, Text, TextInput, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { colors, spacing, radius } from "@/constants/colors";

interface UploadParams {
  upload_url: string;
  public_id: string;
  timestamp: number;
  signature: string;
  api_key: string;
}

type Status = "idle" | "uploading" | "awaiting_review" | "analyzing" | "done";

export default function FeedbackCameraScreen() {
  const [exerciseName, setExerciseName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  async function pickAndAnalyze() {
    if (!exerciseName.trim()) return Alert.alert("Enter the exercise name first");

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 30,
    });
    if (picked.canceled || !picked.assets[0]) return;

    try {
      setStatus("uploading");
      const params = await api<UploadParams>("/video-feedback/upload-url", { method: "POST" });

      const form = new FormData();
      form.append("file", {
        uri: picked.assets[0].uri,
        type: "video/mp4",
        name: "form-check.mp4",
      } as unknown as Blob);
      form.append("public_id", params.public_id);
      form.append("timestamp", String(params.timestamp));
      form.append("signature", params.signature);
      form.append("api_key", params.api_key);

      const uploadRes = await fetch(params.upload_url, { method: "POST", body: form });
      const uploaded = (await uploadRes.json()) as { secure_url?: string };
      if (!uploaded.secure_url) throw new Error("Video upload failed");

      const job = await api<{ feedback_id: string }>("/video-feedback/analyze", {
        method: "POST",
        body: JSON.stringify({ video_url: uploaded.secure_url, exercise_name: exerciseName }),
      });

      // Un trainer tiene que aprobar el análisis antes de que corra (gate
      // manual, ver TODOS.md) — puede tardar horas, no segundos. Un solo
      // sondeo cubre ambas esperas: si sigue "awaiting_review" al agotar los
      // intentos, el usuario revisa más tarde en su historial en vez de
      // bloquear la pantalla; una vez aprobado ("pending"), sí esperamos el
      // análisis real y solo ahí un timeout es un error.
      setStatus("awaiting_review");
      let phase: "awaiting_review" | "analyzing" = "awaiting_review";
      for (let i = 0; i < 23; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const result = await api<{ status: string; feedback_text: string | null }>(
          `/video-feedback/${job.feedback_id}/status`
        );
        if (result.status === "completed") {
          setFeedback(result.feedback_text);
          setStatus("done");
          return;
        }
        if (result.status === "failed") throw new Error("Analysis failed — try another video");
        if (result.status === "pending" && phase === "awaiting_review") {
          phase = "analyzing";
          setStatus("analyzing");
        }
      }
      if (phase === "analyzing") throw new Error("Analysis timed out — check your history later");
    } catch (e) {
      setStatus("idle");
      Alert.alert("Error", e instanceof Error ? e.message : "Something went wrong");
    }
  }

  const buttonTitle =
    status === "uploading"
      ? "Uploading…"
      : status === "awaiting_review"
        ? "Waiting for trainer…"
        : status === "analyzing"
          ? "Analyzing…"
          : "Pick Video & Analyze";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Text style={styles.title}>AI Form Feedback</Text>
      <Text style={styles.hint}>
        Upload a short video (≤30s) of your exercise. Your trainer reviews it before the AI
        analysis runs, so this can take a bit — check back later if it&apos;s not ready right away.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Exercise name (e.g. Push-ups)"
        value={exerciseName}
        onChangeText={setExerciseName}
      />
      <Button
        title={buttonTitle}
        disabled={status === "uploading" || status === "awaiting_review" || status === "analyzing"}
        onPress={pickAndAnalyze}
      />
      {status === "awaiting_review" && (
        <Text style={styles.hint}>
          Your trainer hasn&apos;t reviewed this yet. Feel free to close this screen — you&apos;ll
          find the result in your history once it&apos;s ready.
        </Text>
      )}
      {feedback && (
        <Card>
          <Text style={styles.feedbackTitle}>💡 Feedback</Text>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  hint: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, fontSize: 16 },
  feedbackTitle: { fontSize: 16, fontWeight: "600", color: colors.textPrimary, marginBottom: spacing.sm },
  feedbackText: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
});
