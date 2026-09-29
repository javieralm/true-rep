// Los dobles de navegación de abajo son marcadores de una línea, no
// componentes: ponerles displayName es ruido sin lector.
/* eslint-disable react/display-name */
import React from "react";
import { render } from "@testing-library/react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useAccess } from "@/hooks/useAccess";
import { useBilling } from "@/hooks/useBilling";

import TabsLayout from "@/app/(tabs)/_layout";
import AuthLayout from "@/app/(auth)/_layout";

// Los layouts solo deciden A DÓNDE ir. Se sustituyen los navegadores por
// marcadores para poder afirmar sobre la decisión y no sobre React Navigation:
// eso es lo que hace que estos tests sobrevivan a mover las rutas de sitio,
// que es exactamente para lo que están.
jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  const Redirect = ({ href }: { href: string }) => React.createElement(Text, null, `REDIRECT:${href}`);
  const Tabs = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(Text, null, "TABS", children);
  Tabs.Screen = () => null;
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(Text, null, "STACK", children);
  Stack.Screen = () => null;
  return { Redirect, Tabs, Stack };
});

jest.mock("@clerk/clerk-expo", () => ({ useAuth: jest.fn() }));
jest.mock("@/lib/push", () => ({ registerForPushNotifications: jest.fn() }));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@/hooks/useAccess", () => ({ useAccess: jest.fn() }));
jest.mock("@/hooks/useBilling", () => ({ ...jest.requireActual("@/hooks/useBilling"), useBilling: jest.fn() }));

const mockUseAuth = useAuth as unknown as jest.Mock;
const mockUseAccess = useAccess as unknown as jest.Mock;
const mockUseBilling = useBilling as unknown as jest.Mock;
const mutation = () => ({ mutate: jest.fn(), isPending: false, variables: undefined, error: null });
const access = (state: string) => ({
  isLoading: false,
  isFetching: false,
  error: null,
  data: { state, is_trainer: false, trainer: { username: "Marta", avatar_url: null }, billing: "CASH", paid_until: null },
  refetch: jest.fn(),
});

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAccess.mockReset().mockReturnValue(access("active"));
  mockUseBilling.mockReset().mockReturnValue({ billing: { data: undefined }, checkout: mutation(), portal: mutation() });
});

describe("guarda de (tabs)", () => {
  it("con sesión muestra las pestañas", async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });

    const { getByText } = await render(<TabsLayout />);

    expect(getByText("TABS")).toBeTruthy();
  });

  it("sin invitación no monta las pestañas y explica qué falta", async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true, signOut: jest.fn() });
    mockUseAccess.mockReturnValue(access("no_invitation"));

    const { getByText, queryByText } = await render(<TabsLayout />);

    expect(getByText("Necesitas una invitación")).toBeTruthy();
    expect(queryByText("TABS")).toBeNull();
  });

  it("con el acceso pausado por el entrenador lo dice con su nombre", async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true, signOut: jest.fn() });
    mockUseAccess.mockReturnValue(access("paused"));

    const { getByText } = await render(<TabsLayout />);

    expect(getByText(/Marta ha pausado tu acceso/)).toBeTruthy();
  });

  it("pago pendiente por Stripe: ofrece los precios de su entrenador", async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true, signOut: jest.fn() });
    const pending = access("payment_required");
    mockUseAccess.mockReturnValue({ ...pending, data: { ...pending.data, billing: "STRIPE" } });
    const checkout = mutation();
    mockUseBilling.mockReturnValue({
      billing: {
        data: {
          can_subscribe: true,
          prices: [{ interval: "QUARTER", amount: 45000, currency: "dkk" }],
          subscription: null,
        },
      },
      checkout,
      portal: mutation(),
    });

    const { getByText } = await render(<TabsLayout />);

    const button = getByText(/^Pagar .*450,00.* cada 3 meses$/);
    expect(button).toBeTruthy();
  });

  it("sin sesión redirige al login y no monta las pestañas", async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: true });

    const { getByText, queryByText } = await render(<TabsLayout />);

    expect(getByText("REDIRECT:/(auth)/login")).toBeTruthy();
    expect(queryByText("TABS")).toBeNull();
  });
});

describe("guarda de (auth)", () => {
  it("sin sesión muestra el stack de login", async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: false, isLoaded: true });

    const { getByText } = await render(<AuthLayout />);

    expect(getByText("STACK")).toBeTruthy();
  });

  it("con sesión redirige a las pestañas", async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true, isLoaded: true });

    const { getByText } = await render(<AuthLayout />);

    expect(getByText("REDIRECT:/")).toBeTruthy();
  });
});
