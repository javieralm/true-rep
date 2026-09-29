# Auditoría móvil — seguimiento de ejecución

Documento vivo. Se actualiza a medida que cada punto se ejecuta.
Informe completo de origen: auditoría de arquitectura Expo/RN del 2026-09-28.

**Fase en curso:** Fase 3 — Navegación → ✅ **completada**
**Fuera de plan:** dos bugs reportados por el usuario → ✅ corregidos
**Siguiente:** Fase 4 — Limpieza (riesgo bajo)
**Última actualización:** 2026-09-28

Leyenda: ⬜ pendiente · 🟡 en curso · ✅ hecho · ⏸️ bloqueado · ⏭️ diferido · 🟠 parcial

---

## Checklist Fase 0

| # | Punto | Estado | Ficheros |
|---|---|---|---|
| A1 | `Crypto.randomUUID()` en vez del global inexistente | ✅ hecho | `workout-session.tsx`, `package.json` |
| A2 | Clave Clerk de producción fuera del repo | ✅ hecho | `eas.json`, `.env.example` |
| A3 | Icono de app + adaptive icon | 🟠 parcial | `app.json`, `assets/` (splash diferido) |
| B11 | Contraste WCAG AA | ✅ hecho | `colors.ts` + 11 consumidores |
| B13 | ESLint + script `lint` | 🟠 parcial | `eslint.config.js`, `package.json` (Jest diferido) |

---

## Checks: antes y después

| Check | Base | Fase 0 | Fase 1 | Fase 2 | Fase 3 |
|---|---|---|---|---|---|
| `pnpm -r type-check` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `pnpm -r test` | ✅ 69 | ✅ 69 | ✅ 77 | ✅ 87 | ✅ 96 → **109** con los dos bugs (73 backend + 36 móvil) |
| mobile lint | n/a | ✅ 0 err | ✅ 0 err | ✅ 0 err | ✅ 0 err, 5 avisos |
| mobile test | n/a | n/a | ✅ 8 | ✅ 18 | ✅ 27 → **36** |
| `pnpm -r lint` | ❌ | ❌ | ❌ | ❌ | ❌ — **misma causa preexistente**, ver D-1 |

Línea base tomada sobre `main` @ `e7a7122`, árbol limpio. Nada ha empeorado en
ninguna fase; el único rojo es el mismo con el que se empezó y su causa está en
el backend.

---

## Discrepancias entre el audit y el código real

Verificadas antes de tocar nada. Las cinco afirmaciones de Fase 0 se confirmaron
en el código; estas dos matizaciones sí cambiaron el plan.

### D-1 · `pnpm -r lint` no "salta el móvil en silencio": falla antes de llegar

El audit decía que pasaba en verde saltándose el móvil. **Era falso.** El comando
aborta en `apps/backend`, que ejecuta `next lint` — deprecado en Next 15 y sin
ninguna configuración de ESLint en el workspace (`eslint` aparece 0 veces en el
lockfile original). Abre un prompt interactivo, no encuentra stdin y sale con 1.

**Consecuencia:** añadir ESLint al móvil **no** pone `pnpm -r lint` en verde, y no
lo ha puesto. Sigue rojo por el backend. Arreglarlo está fuera de Fase 0. Ver la
sección de deuda nueva.

### D-2 · B11 no eran "dos líneas": era toda la paleta de primer plano

El audit estimó B11 como dos líneas. Al calcular los ratios reales, el fallo era
más amplio. Medido antes de cambiar nada:

| Combinación | Antes | Después | AA |
|---|---|---|---|
| Texto sobre `primary #FF6B35` (botón, badge paywall, chip activo) | 2,83:1 (blanco) | **6,14:1** (`onFill`) | ✅ |
| `primary` como texto sobre blanco (stats, precio, rank, meta…) | 2,83:1 | **5,18:1** (`primaryText`) | ✅ |
| `primary` como texto sobre `#FFF3ED` (chip de sensación activo) | 2,60:1 | **4,76:1** | ✅ |
| `textMuted #999999` sobre blanco (15 usos) | 2,85:1 | **4,54:1** (`#767676`) | ✅ |
| Badge `BEGINNER #27AE60` | 2,87:1 (blanco) | **6,06:1** (`onFill`) | ✅ |
| Badge `INTERMEDIATE #F39C12` | 2,19:1 (blanco) | **7,93:1** (`onFill`) | ✅ |
| Badge `ADVANCED #E74C3C` | 3,82:1 (blanco) | **4,56:1** (`onFill`) | ✅ |
| `tabBarActiveTintColor` (indicador de pestaña activa) | 2,83:1 | **5,18:1** | ✅ |

`textSecondary #666666` ya daba 5,74:1 y no se ha tocado.

**Enfoque elegido:** no se ha cambiado ni un color de marca. `primary` sigue siendo
exactamente `#FF6B35` y se usa igual que antes como relleno, borde y barra. Lo que
se ha hecho es separar los tres papeles del color en tokens distintos.

---

## Lo que se cambió, punto por punto

### A1 · `crypto.randomUUID()` no existe en Hermes ✅

`apps/mobile/src/app/workout-session.tsx:52` — `crypto.randomUUID()` → `Crypto.randomUUID()`
con `import * as Crypto from "expo-crypto"`.

Dependencia añadida: `expo-crypto@~57.0.3`, vía `npx expo install` para que la
versión la fije el SDK. Ya estaba resuelta en el store como dependencia transitiva
de `expo-auth-session`, así que no descargó nada nuevo: solo la hace explícita,
que es lo que exige usarla directamente.

**Verificación:** ninguna. `tsc` no detecta este fallo — `crypto` está en los tipos
del DOM, por eso el bug pasó la comprobación de tipos. La confirmación real es
abrir una rutina en dispositivo, marcar un ejercicio y pulsar *Terminar
entrenamiento*. Antes: alerta de error y el workout no se guarda. **Eso sigue sin
comprobarse en hardware.**

### A2 · Clave Clerk de test en producción ✅

`apps/mobile/eas.json` — el perfil `production` pierde la `pk_test_` incrustada y
gana `"environment": "production"`, que hace que EAS inyecte las variables del
entorno de producción. `EXPO_PUBLIC_API_URL` se queda inline: no es secreto y
tenerlo visible en el repo es útil.

`development` y `preview` se dejan como estaban: la `pk_test_` **es correcta** ahí,
son distribución interna contra la instancia de desarrollo.

> **⚠️ Acción pendiente tuya, una sola vez, antes de la próxima build de producción:**
> ```
> eas env:create --environment production \
>   --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_...
> ```
> Sin esa variable la clave llega vacía y Clerk falla al arrancar. Es a propósito:
> preferible a que la app de la store autentique contra la instancia de test.

Queda documentado también en `apps/mobile/.env.example`, que es donde alguien va a
buscarlo.

### A3 · Sin icono ni splash 🟠 parcial

**Hecho — icono.** `apps/mobile/assets/icon.png` y `adaptive-icon.png`, ambos
1024×1024 RGBA, declarados en `app.json` (`icon` y `android.adaptiveIcon` con
`backgroundColor: "#FF6B35"`).

Generados con un script sin dependencias (solo `zlib` de Node) porque `sharp` no es
resoluble desde este workspace. Verificado tras generar:

- `icon.png` — 100% opaco, sin canal alfa efectivo. Correcto para iOS, que rechaza
  transparencia y redondea las esquinas él mismo.
- `adaptive-icon.png` — la marca ocupa `x[348-684] y[374-653]` de 1024. La zona
  segura de Android (66% central) es `[174-850]`, así que ninguna máscara la
  recorta.

> **⚠️ Es un placeholder deliberado.** Un check blanco sobre el naranja de marca.
> Se ve intencionado y desbloquea `eas build`, pero hay que sustituirlo por un
> asset diseñado antes de enviar a la store. El script está en el scratchpad de la
> sesión; si hace falta regenerarlo, se rehace en un minuto.

**Diferido — splash.** El método moderno del SDK 57 es el config plugin
`expo-splash-screen`, y ese paquete **no está en el lockfile ni lo trae `expo`**:
sería una dependencia nativa nueva. Sin configurar nada, Expo muestra un splash
blanco liso, que no es motivo de rechazo en ninguna store. Dado el límite de "sin
dependencias salvo las estrictamente necesarias", se difiere.

### B11 · Contraste por debajo de AA ✅

`apps/mobile/src/constants/colors.ts` gana dos tokens y corrige uno:

```ts
primary:     "#FF6B35"  // sin tocar — solo RELLENO (fondo, borde, barra)
primaryText: "#C2410C"  // NUEVO — el naranja cuando es TEXTO sobre fondo claro
onFill:      "#1A1A1A"  // NUEVO — el texto que va ENCIMA de un relleno de color
textMuted:   "#767676"  // antes #999999
```

Once ficheros actualizados para usar el token que les toca. Ratios en la tabla D-2.
Cero cambios de comportamiento; solo colores de primer plano.

**Cambio visual que notarás:** los botones primarios y los badges de dificultad
pasan de etiqueta blanca a etiqueta casi negra. Es el precio de conservar el naranja
de marca intacto.

### B13 · ESLint 🟠 parcial

**Hecho — ESLint.** `eslint@^9.39.5` + `eslint-config-expo@~57.0.2` instalados por
`npx expo lint` (la vía oficial, que fija versiones compatibles con el SDK),
`apps/mobile/eslint.config.js` en formato flat, y script `"lint": "eslint ."`.

La instalación exigió añadir `unrs-resolver: true` a `allowBuilds` en
`pnpm-workspace.yaml` — su postinstall estaba bloqueado y hacía salir a pnpm con 1.
Mismo tratamiento que ya reciben `esbuild`, `sharp` y `prisma` en ese fichero.

ESLint encontró **2 errores y 3 avisos** en código preexistente:

- ✅ **Corregidos los 2 errores.** `react/display-name` en la factoría `icon()` de
  `(tabs)/_layout.tsx`, y un apóstrofo sin escapar en `feedback-camera.tsx:102`
  (el propio fichero ya usaba `&apos;` tres líneas más abajo). Ambos mecánicos, sin
  cambio de comportamiento. **Fuera del plan original:** los arreglé porque un
  linter que nace en rojo no lo mira nadie, y así no se distingue lo que rompas
  mañana de lo que ya estaba roto. Si prefieres el commit estrictamente limpio,
  son dos reversiones triviales.
- ⬜ **Dejados los 3 avisos.** `@typescript-eslint/array-type` en `progress.tsx`
  (`Array<T>` en vez de `T[]`, líneas 11, 50 y 52). Son estilo puro, no bloquean el
  gate, y tocarlos sería refactor cosmético.

**Diferido — Jest.** Jest configurado con cero ficheros de test **falla** por
defecto ("no tests found"), así que dejaría `pnpm -r test` peor que ahora. La
Fase 1 abre escribiendo los tests 1 y 2 (`workoutStore` y la clave de idempotencia);
la configuración entra ahí, con tests reales que ejecutar.

---

## Hallazgos nuevos durante la ejecución

### N-1 · `success` y `danger` como texto ✅ corregido (inicio de Fase 2)

Se aprobó como "`colors.success` en dos sitios". Al ir a tocarlo resultó ser algo
mayor: `danger` tenía el mismo defecto en tres sitios, **dos de ellos mensajes de
error** — justo el texto que más falta hace poder leer. Se incluyó por ser el
mismo defecto y el mismo arreglo.

| Combinación | Antes | Después | Dónde |
|---|---|---|---|
| `success` sobre `#f0fdf4` | 2,01:1 | **4,80:1** (`successText #15803D`) | ejercicio hecho |
| `success` sobre blanco | 2,10:1 | **5,01:1** | delta de peso al alza |
| `danger` sobre blanco | 3,82:1 | **6,47:1** (`dangerText #B91C1C`) | errores de login y de rutinas, delta a la baja |

`success` y `danger` se quedan sin tocar donde son relleno o borde. La familia de
tokens de texto queda coherente: los tres son el tono 700 de su color
(`#C2410C` naranja · `#15803D` verde · `#B91C1C` rojo).

### N-2 · Borde del botón `outline`: 2,83:1 ⬜ pendiente

`Button.tsx:41`, `borderColor: colors.primary`. Los elementos de interfaz no
textuales piden 3:1 (WCAG 1.4.11) y se queda justo por debajo. La etiqueta de dentro
ya pasa AA tras B11, así que el botón es legible; lo marginal es el borde. Cambiarlo
a `primaryText` lo resolvería, pero oscurece el contorno de todos los botones
secundarios: es una decisión visual, no un arreglo obvio.

---

## Deuda nueva detectada (no se toca)

- **`apps/backend` no tiene ESLint.** `next lint` está deprecado y abre un prompt
  interactivo que rompe `pnpm -r lint` en cualquier entorno no interactivo, CI
  incluido. Es el único motivo de que el lint del monorepo esté rojo. Migración a
  ESLint CLI (`npx @next/codemod@canary next-lint-to-eslint-cli .`) pendiente.
  Fuera del alcance de Fase 0, que era solo móvil.
- **`@clerk/clerk-expo@2.19.31` está deprecado.** El aviso salta en cada `pnpm
  install`. Migración a `@clerk/expo` (Core 3) ya anotada en el informe original.

---

## Fase 1 — Parar la pérdida de datos ✅

| # | Punto | Estado | Ficheros |
|---|---|---|---|
| 6a | Jest + tests de `workoutStore` | ✅ hecho | `jest.config.js`, `__tests__/workoutStore.test.ts`, `tsconfig.json`, `package.json` |
| 6b | Test del payload y la clave de idempotencia | ⏭️ diferido — depende de D6 | — |
| 7 | **A4** — sesión no descartable + confirmación al salir | ✅ hecho | `_layout.tsx`, `workout-session.tsx`, `workoutStore.ts` |
| 8 | **A5** — una sola guarda que espere a `isLoaded` | ✅ hecho | `_layout.tsx`, `(tabs)/_layout.tsx`, `(auth)/_layout.tsx` |
| 9 | **B1** — `dismissAll()` al completar | ✅ hecho | `workout-session.tsx` |

### 6a · Jest y los tests del store ✅

`jest-expo@^57.0.5` + `jest@^30.5.2` + `@types/jest@^30.0.0`, `jest.config.js` con
el preset `jest-expo`, script `"test": "jest"`, y `__tests__/` a la altura del
workspace, igual que hace el backend.

**Ocho tests sobre `workoutStore`**, escritos antes del cambio del paso 7: el de
reanudación falló primero (7 verdes, 1 rojo) y pasó al implementarlo.

Hizo falta añadir `"types": ["jest"]` a `tsconfig.json`: con TypeScript 6 y el
`moduleResolution: "bundler"` de `expo/tsconfig.base`, los `@types` no se
auto-incluyen y `describe`/`expect` no resolvían. `@jest/globals` no era
alternativa: pnpm estricto no lo expone, es transitiva de `jest`.

### 6b · Test del payload ⏭️ diferido

Incoherencia del plan que conviene dejar escrita: este test se describió como
"unit sobre el hook `useLogWorkout` **extraído en D6**", y D6 es Fase 4. La lógica
sigue dentro de `onFinish`, así que no es testeable sin esa extracción.

No bloquea nada: ningún paso de Fase 1 toca el payload ni la clave (A1 ya cerró
eso en Fase 0). Se hace cuando se haga D6. Hacer la extracción ahora habría sido
meter Fase 4 dentro de Fase 1.

### 7 · A4 — la sesión deja de ser descartable ✅

**Ruta** (`_layout.tsx`): `presentation: "fullScreenModal"` en vez de `"modal"` —
deja de apilarse como una tarjeta encima de la de `routine-detail` — y
`gestureEnabled: false`.

**Confirmación** (`workout-session.tsx`): listener `beforeRemove` vía
`useNavigation()`. Cubre de una vez la flecha de la cabecera, el botón atrás de
Android y cualquier navegación que saque la pantalla de la pila.

> `usePreventRemove`, que es la API recomendada en React Navigation 7, **no se
> puede usar aquí**: `expo-router` no la reexporta y `@react-navigation/native`
> no está enlazado en el workspace del móvil (pnpm estricto, sin dependencias
> fantasma). `beforeRemove` es el mecanismo que esa API envuelve y sigue
> soportado.

**Detalle que estuvo a punto de ser un bug:** al pulsar "Salir y descartar",
`navigation.dispatch()` corre en el mismo tick con el listener todavía enganchado
y vuelve a entrar en él. Con la condición capturada en el closure seguiría
valiendo "hay trabajo sin guardar" y el Alert se repetiría en bucle. El listener
lee `useWorkoutStore.getState()` en vivo, así que tras `reset()` la reentrada sale
por el `return` temprano. Guardar pasa por el mismo camino y también sale solo,
porque `onFinish` ya llama a `reset()` antes de pintar el resumen.

**Store** (`workoutStore.ts`): `start()` reanuda en vez de reiniciar cuando la
rutina que se abre es la que ya está en curso y tiene series marcadas. Es el
cierre real del agujero: aunque alguien reintroduzca una vía de salida, volver a
entrar ya no vacía `completed`. Con nada marcado sí reinicia el cronómetro, que es
lo que espera quien empieza de cero.

### 8 · A5 — una sola guarda de arranque ✅

`_layout.tsx` gana un `RootNavigator` que no monta el `<Stack>` hasta que Clerk
responde `isLoaded`. Mientras tanto pinta una vista del color del splash.

Con eso, `(tabs)/_layout.tsx` y `(auth)/_layout.tsx` se simplifican: sus `Redirect`
ya solo deciden **a dónde** ir, nunca **si se sabe**. Cierra las dos cosas que
pasaban en cada arranque en frío: el parpadeo del login para un usuario con sesión
válida, y el `GET /users/me` sin token que devolvía 401 y se reintentaba tres veces.

Efecto secundario bueno: `AuthTokenBridge` registra el getter del token antes de
que el `Stack` exista siquiera, así que la carrera del singleton de `lib/api.ts`
deja de depender del orden de efectos entre hermanos. La deuda D3 sigue anotada,
pero ya no es una carrera real.

### 9 · B1 — volver al inicio al completar ✅

`onDone` pasa de `router.back()` a `router.dismissAll()`. Antes aterrizabas en el
detalle de la rutina que acababas de terminar, todavía dentro del modal.

---

## Fase 2 — Fiabilidad ✅

| # | Punto | Estado | Ficheros |
|---|---|---|---|
| 10 | **B3** — `api()` robusto (test 3 primero) | ✅ | `lib/api.ts`, `__tests__/api.test.ts` |
| 11 | **B5** — `useSchedule` deja de tragar errores | ✅ | `useSchedule.ts`, `(tabs)/index.tsx` |
| 12 | **B4** — estados de error en las pantallas de detalle | ✅ | `ErrorState.tsx`, `routine-detail.tsx`, `challenge-detail.tsx` |
| 13 | **B2** — Stripe y refresco al volver a la app | ✅ | `useSubscription.ts`, `_layout.tsx` |
| 14 | **B6** — teclado | ✅ | `workout-session.tsx`, `(auth)/login.tsx` |
| 15 | **B14** — pull-to-refresh | ✅ | `useRefresh.ts` + 5 pantallas |

### 10 · B3 — `api()` robusto ✅

Diez tests escritos primero (`__tests__/api.test.ts`). Cuatro cambios:

- **`ApiError` con el código HTTP.** Sin él, quien llama no puede distinguir "no
  tienes plan" (402) de "no hay red". `status: 0` = la petición no llegó a hablar
  con el servidor. Es lo que hace posible B5.
- **Cuerpo no-JSON.** Una 500 del hosting devuelve HTML; parsearlo a ciegas le
  ponía al usuario *"JSON Parse error: Unexpected token <"*. Ahora se intenta y
  se cae a un mensaje legible.
- **`res.ok`**, que antes no se miraba.
- **Timeout de 15 s** con `AbortSignal.timeout`. Verificado que existe: lo instala
  el winter runtime de Expo (`installAbortSignalPatch`), a diferencia de
  `crypto.randomUUID` (A1). Se capturan `TimeoutError` **y** `AbortError` porque
  el fetch de React Native rechaza con el segundo aunque el estándar diga el
  primero.
- **`data: null` deja de ser un error.** `GET /me/schedule` responde `ok(null)`
  cuando no hay programa: es válido. Ahora manda `status`, y quien pueda recibir
  null lo declara en la llamada (`api<DaySchedule | null>`).

### 11 · B5 — `useSchedule` ✅

El `catch {}` vacío pasa a capturar **solo el 402** (el plan no incluye
programas). Red, timeout y 500 se propagan. El dashboard muestra un aviso de una
línea y sigue enseñando el recomendado debajo: antes, un fallo de red se
presentaba como "no tienes programa asignado".

### 12 · B4 — estados de error ✅

`components/ui/ErrorState.tsx`: mensaje + botón de reintentar. `routine-detail` y
`challenge-detail` separan `isLoading` de `error`; antes los dos pintaban
"Cargando…" y un fallo se quedaba girando para siempre.

### 13 · B2 — Stripe ✅

> **Corrección al informe original.** Recomendé `openAuthSessionAsync`. Al mirar
> el backend, el `success_url` del checkout apunta a una URL web
> (`${appUrl}/checkout/success`), no al esquema de la app, así que ese método
> nunca detectaría la vuelta: espera un redirect al esquema. Lo correcto aquí es
> **`openBrowserAsync`**, que resuelve cuando el usuario cierra el navegador
> en-app — que es justo el momento en que tiene sentido releer el plan.

Además, `focusManager` + `AppState` en el layout raíz: React Query solo entiende
de foco de ventana, que en React Native no existe, así que no refrescaba nunca al
volver a la app. Cubre el caso de que el webhook de Stripe llegue un instante
después de que el usuario cierre el navegador.

### 14 · B6 — teclado ✅

`keyboardShouldPersistTaps="handled"` en la sesión: con el teclado abierto, el
primer toque en un chip de sensación solo lo cerraba y se perdía. Más
`KeyboardAvoidingView` en la sesión (campos de peso de los últimos ejercicios) y
en el login (el campo del código, con el contenido centrado vertical).

### 15 · B14 — pull-to-refresh ✅

`hooks/useRefresh.ts` reconsulta lo que la pantalla tenga activo. El plan decía
cuatro listas; se han hecho **cinco**: Perfil usa exactamente el mismo patrón y
dejarlo fuera crea una inconsistencia que habría que volver a arreglar.

---

## Fase 3 — Navegación ✅

| # | Punto | Estado |
|---|---|---|
| 16 | Tests de guardas (4) y de flujo de sesión (5) | ✅ 9 tests nuevos |
| 17 | Stacks por pestaña | ✅ |
| 18 | Detalles dentro de sus stacks | ✅ |
| 19 | `workout-session` → `workout/[routineId]` | ✅ |
| 20 | `navigate` en paywall, `replace` fuera del login, `signup.tsx` borrado | ✅ |

### Corrección a la estructura propuesta en el informe

El informe proponía los cinco tabs como grupos: `(today)`, `(routines)`,
`(progress)`, `(challenges)`, `(profile)`, cada uno con su `index.tsx`.
**Eso no funciona.** La documentación de Expo Router es explícita: los grupos no
forman parte de la URL, así que los cinco `index.tsx` resolverían a `/`, y en un
enlace en frío se renderiza *"el primero por orden alfabético"*. Habría sido una
ambigüedad silenciosa que aparecería con el primer deep link.

Estructura final: **un solo grupo** (`(today)`, para que su index sea `/` sin
competencia) y **segmentos reales** para el resto.

```
src/app/
├── (auth)/           _layout · login                    (signup.tsx borrado)
├── (tabs)/           _layout  → Tabs, headerShown:false
│   ├── (today)/      _layout · index (/) · routine/[id]
│   ├── workouts/     _layout · index · [id]
│   ├── progress/     _layout · index
│   ├── challenges/   _layout · index · [id]
│   └── profile/      _layout · index
├── workout/[routineId]   fullScreenModal, sin gesto
├── paywall               modal
└── feedback-camera       modal (huérfana)
```

Árbol que Expo Router deriva de esos ficheros, verificado regenerando
`.expo/types/router.d.ts`: `/` · `/routine/[id]` · `/workouts` ·
`/workouts/[id]` · `/progress` · `/challenges` · `/challenges/[id]` · `/profile`
· `/workout/[routineId]` · `/paywall` · `/feedback-camera` · `/login`. Sin
rastro de `/routine-detail`, `/challenge-detail`, `/workout-session` ni
`/signup`.

### Lo que cambia para el usuario

- **Los detalles ya no son modales.** Rutina y reto se empujan dentro del stack
  de su pestaña: la barra de pestañas sigue visible, el gesto de vuelta es el de
  borde nativo y la cabecera dice de dónde vienes.
- **Se acabó el modal sobre modal.** La sesión ya no se apila como una tarjeta
  encima de la tarjeta del detalle.
- **Cada pestaña tiene su propia pila.** Abrir una rutina desde Hoy y desde
  Rutinas ya no comparte historial: volver atrás te devuelve a la pestaña por la
  que entraste.

El detalle de rutina vive en `components/workout/RoutineDetailScreen.tsx` y las
dos rutas (`(today)/routine/[id]` y `workouts/[id]`) son un `export { default }`
de una línea. Se descartó la sintaxis de rutas compartidas `(a,b)/` de Expo
Router porque exige que ambas ramas sean grupos, que es justo lo que provoca la
colisión en `/`.

### Los tipos de ruta hicieron de red de seguridad

`typedRoutes: true` estaba activo y `tsc` rechazó cada href nuevo mientras
`.expo/types/router.d.ts` reflejaba el árbol viejo. No hay comando de typegen en
la CLI: los tipos se regeneran arrancando el servidor de desarrollo. Tras
regenerarlos, `tsc` cazó el último resto — `<Redirect href="/(tabs)" />`, que
dejó de ser válido porque `(tabs)` ya no es una hoja; ahora apunta a `/`.

### Tres cosas que costaron en los tests

Anotadas porque volverán a aparecer al escribir más tests de componente:

1. **`render()` de RNTL 14 devuelve una Promise** (renderizado concurrente de
   React 19). Hay que `await`. Sin esperarla, `screen` responde *"render function
   has not been called"* y el objeto devuelto no trae queries.
2. **`fireEvent` también es asíncrono.** Sin `await`, el cambio de estado no se
   vacía y saltan avisos de `act()` solapado.
3. **El cleanup automático no espera al render asíncrono**, así que los tests se
   pisaban: hace falta un `afterEach(async () => { await cleanup(); })`.

---

## Bugs reportados por el usuario (fuera del plan de fases) ✅

### U-1 · Dejaba empezar un entrenamiento que luego no se podía guardar ✅

**Reportado como** "no te deja terminar si no tienes Premium". **Es casi eso, pero
no del todo:** la puerta de `POST /workouts/log` es `subscription_status ===
"ACTIVE"` — vale cualquier plan, BASE o PREMIUM, no solo Premium. Importa porque
determina qué comprobar en el cliente.

`GET /routines` y `GET /routines/[id]` no tienen puerta (son el escaparate, y eso
está bien). La que faltaba era la de **empezar**: se podía entrenar entero y
perderlo todo con un 402 al pulsar "Terminar".

Arreglo en `RoutineDetailScreen`: con suscripción, el botón de siempre; sin ella,
una tarjeta que explica y lleva al paywall. Mientras `useUser` carga, el botón
sale deshabilitado — enseñar el muro de pago un instante a alguien suscrito es
peor que esperar.

La puerta del servidor **no se toca**: sigue siendo la que manda. Esto solo evita
que el usuario tire el trabajo.

### U-2 · Una rutina de 3 series se registraba como un número suelto ✅

`Exercise.sets` existía y el constructor de rutinas del trainer lo rellenaba (3
por defecto), pero la sesión móvil lo ignoraba: un campo de reps y uno de peso
por ejercicio.

**Enfoque: aditivo.** `ExerciseCompleted` gana `sets?: CompletedSet[]` y conserva
`reps_done` y `weight_kg` como agregados derivados. El motivo es el alcance: hay
**seis** consumidores de `exercises_completed` en el backend (`me/stats` ×2,
`progression.ts`, export CSV, tracking de clientes, validación del log) más las
filas ya guardadas en la columna JSON. Sustituir el modelo obligaba a tocarlos
todos y a migrar datos; añadir un campo opcional no toca ninguno.

| Campo | Qué es ahora |
|---|---|
| `sets[]` | El desglose: `{ reps, weight_kg? }` por serie |
| `reps_done` | Suma de las reps de todas las series |
| `weight_kg` | El de la **serie más pesada** — es la que tiene sentido para progresar, no la media ni la última |
| `felt_like` | Sigue siendo por ejercicio, no por serie |

Los agregados se recalculan en el store en cada cambio y no se editan a mano, así
que stats, export CSV y auto-escalado siguen leyendo lo mismo que antes sin
enterarse. Ningún fichero del backend cambió salvo el validador.

En la app: al marcar un ejercicio se precargan tantas series como prescriba la
rutina, con las reps sacadas del texto del trainer (`"10"` → 10, `"8-12"` → 8,
`"al fallo"` → 0). Cada serie tiene sus reps y su peso, se pueden quitar (nunca
la última) y **"+ Añadir serie"** cubre el caso de haber hecho más de lo pedido,
heredando reps y peso de la anterior.

**Cobertura:** 15 tests nuevos en el store (precarga, edición por serie, añadir,
quitar, y los agregados) y 4 en el validador del backend, que es frontera de
confianza.

---

## Fase 4 — Limpieza (no iniciada · riesgo bajo)

| # | Punto | Estado |
|---|---|---|
| 21 | **D6** — extraer `useLogWorkout` (desbloquea el test 6b, ver Fase 1) | ⬜ |
| 22 | **B9** selectores del store · **B10** inputs controlados · **B12** carga en progress | ⬜ |
| 23 | Tokens tipográficos en las 5 pantallas que no los usan; traducir `LeaderboardRow` | ⬜ |
| 24 | Quitar `expo-camera` y `expo-font` + el permiso `CAMERA` de `app.json` | ⬜ |
| 25 | **D3** — `api()` recibe el token por argumento en vez de por singleton | ⬜ |
