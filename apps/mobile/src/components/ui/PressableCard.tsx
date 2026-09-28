import { Pressable, type PressableProps, type ViewStyle, type StyleProp } from "react-native";
import { Card } from "@/components/ui/Card";

interface Props extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
  cardStyle?: StyleProp<ViewStyle>;
}

/** Tarjeta pulsable con respuesta inmediata al tacto. Una Pressable desnuda
 * alrededor de una Card no da ninguna señal de que algo se ha pulsado: el
 * feedback tiene que ocurrir al APOYAR el dedo, no al soltar, o la interfaz
 * se siente muerta.
 *
 * ponytail: el feedback es un cambio de estilo instantáneo, no un muelle —
 * react-native-reanimated no está instalado y no vale la pena traerlo solo
 * para esto. Si algún día hay gestos de verdad (arrastrar, deslizar para
 * descartar), ahí sí hace falta Animated/Reanimated con velocidad. */
export function PressableCard({ children, cardStyle, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => (pressed ? { transform: [{ scale: 0.98 }], opacity: 0.9 } : null)}
      {...rest}
    >
      <Card style={cardStyle}>{children}</Card>
    </Pressable>
  );
}
