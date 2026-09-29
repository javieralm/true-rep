import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      {/* Registrarse en la web es para entrenadores: sigue con la solicitud. */}
      <SignUp fallbackRedirectUrl="/onboarding" signInFallbackRedirectUrl="/onboarding" />
    </div>
  );
}
