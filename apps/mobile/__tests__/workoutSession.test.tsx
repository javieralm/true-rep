import React from "react";
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import WorkoutSessionScreen from "@/app/workout/[routineId]";
import { useWorkoutStore } from "@/state/workoutStore";
import { api } from "@/lib/api";
import type { Routine } from "@truerep/shared";

const mockDismissAll = jest.fn();
const mockBack = jest.fn();
const mockAddListener = jest.fn(() => () => {});

jest.mock("expo-router", () => ({
  useRouter: () => ({ dismissAll: mockDismissAll, back: mockBack }),
  useNavigation: () => ({ addListener: mockAddListener, dispatch: jest.fn(), setOptions: jest.fn() }),
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "11111111-2222-4333-8444-555555555555" }));
jest.mock("@/lib/api", () => ({ api: jest.fn() }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));

const mockApi = api as jest.MockedFunction<typeof api>;

/** La pantalla también pide el historial (GET /workouts) para comparar: el
 * mock contesta con historial vacío y deja el guardado en manos del test. */
function mockBackend(log: () => Promise<unknown>) {
  mockApi.mockImplementation(((path: string) =>
    path === "/workouts/log" ? log() : Promise.resolve([])) as typeof api);
}
const logCalls = () => mockApi.mock.calls.filter(([path]) => path === "/workouts/log");

const routine: Routine = {
  id: "r1",
  trainer_id: "t1",
  title: "Empuje A",
  description: "",
  difficulty: "BEGINNER",
  duration_minutes: 20,
  exercises: [
    { id: "e1", name: "Flexiones", reps: "10" },
    { id: "e2", name: "Fondos", reps: "8" },
  ],
  preview_video_url: null,
  is_published: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <WorkoutSessionScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  useWorkoutStore.getState().reset();
});

// El cleanup automático no espera al render asíncrono de RNTL 14 y los tests
// se pisaban entre sí: el árbol del anterior seguía montado.
afterEach(async () => {
  await cleanup();
});

describe("sesión de entrenamiento · camino feliz", () => {
  it("marcar dos ejercicios, terminar, y volver al inicio con el store limpio", async () => {
    mockBackend(() =>
      Promise.resolve({
        workout: { id: "w1" },
        xp_earned: 50,
        user: { streak: 3 },
        unlocked_achievements: [],
      })
    );

    useWorkoutStore.getState().start(routine);
    const { getByText, getByLabelText } = await renderScreen();

    await fireEvent.press(getByLabelText("Marcar Flexiones como hecho"));
    await fireEvent.press(getByLabelText("Marcar Fondos como hecho"));
    expect(useWorkoutStore.getState().completed).toHaveLength(2);

    await fireEvent.press(getByText("Terminar y revisar"));
    await fireEvent.press(getByText("Guardar entrenamiento"));

    await waitFor(() => expect(logCalls()).toHaveLength(1));

    // El payload que llega al backend
    const [, init] = logCalls()[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.routine_id).toBe("r1");
    expect(body.exercises_completed).toHaveLength(2);
    expect(body.idempotency_key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(body.duration_minutes).toBeGreaterThanOrEqual(1);

    // Guardar limpia el store: es lo que hace que salir no pida confirmación
    // y que volver a entrar no reanude una sesión ya registrada.
    await waitFor(() => expect(useWorkoutStore.getState().activeRoutine).toBeNull());
    expect(useWorkoutStore.getState().completed).toEqual([]);

    // Y se sale al inicio, no al detalle de la rutina recién hecha
    await fireEvent.press(await waitFor(() => getByText("Volver al inicio")));
    expect(mockDismissAll).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe("sesión de entrenamiento · casos que protegen los datos", () => {
  it("sin series hechas no se puede guardar, y se dice por qué sin un diálogo", async () => {
    mockBackend(() => Promise.resolve({}));
    useWorkoutStore.getState().start(routine);
    const { getByText } = await renderScreen();

    await fireEvent.press(getByText("Terminar y revisar"));
    await fireEvent.press(getByText("Guardar entrenamiento"));

    expect(getByText("Marca al menos una serie para guardar")).toBeTruthy();
    expect(logCalls()).toHaveLength(0);
    expect(useWorkoutStore.getState().activeRoutine).not.toBeNull();
  });

  it("solo se envían las series marcadas, no las pendientes", async () => {
    mockBackend(() => Promise.resolve({ xp_earned: 10, user: { streak: 1 }, unlocked_achievements: [] }));
    useWorkoutStore.getState().start({
      ...routine,
      exercises: [{ id: "e1", name: "Flexiones", sets: 3, reps: "10" }],
    });
    const { getByText, getByLabelText } = await renderScreen();

    await fireEvent.press(getByLabelText("Serie 1 hecha"));
    await fireEvent.press(getByText("Terminar y revisar"));
    await fireEvent.press(getByText("Guardar entrenamiento"));

    await waitFor(() => expect(logCalls()).toHaveLength(1));
    const body = JSON.parse((logCalls()[0][1] as RequestInit).body as string);
    expect(body.exercises_completed).toEqual([
      expect.objectContaining({ exercise_id: "e1", reps_done: 10, sets: [{ reps: 10 }] }),
    ]);
  });

  it("si el guardado falla, lo marcado sigue ahí para reintentar", async () => {
    mockBackend(() => Promise.reject(new Error("No hay conexión con el servidor")));

    useWorkoutStore.getState().start(routine);
    const { getByText, getByLabelText } = await renderScreen();
    await fireEvent.press(getByLabelText("Marcar Flexiones como hecho"));

    await fireEvent.press(getByText("Terminar y revisar"));
    await fireEvent.press(getByText("Guardar entrenamiento"));

    await waitFor(() => expect(logCalls()).toHaveLength(1));
    // El error se ve en línea, junto al botón para reintentar
    await waitFor(() => expect(getByText("No hay conexión con el servidor")).toBeTruthy());
    expect(useWorkoutStore.getState().completed).toHaveLength(1);
    expect(useWorkoutStore.getState().activeRoutine?.id).toBe("r1");
  });

  it("registra un interceptor de salida para poder confirmar antes de descartar", async () => {
    mockBackend(() => Promise.resolve({}));
    useWorkoutStore.getState().start(routine);
    await renderScreen();

    expect(mockAddListener).toHaveBeenCalledWith("beforeRemove", expect.any(Function));
  });

  it("sin rutina activa ofrece salir en vez de romperse", async () => {
    mockBackend(() => Promise.resolve({}));
    const { getByText } = await renderScreen();

    expect(getByText("No hay ningún entrenamiento en curso.")).toBeTruthy();
  });
});
