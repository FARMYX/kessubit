import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { C } from '../src/lib/theme';
import { radius, space, tracking, type as typeScale, weight } from '../src/lib/design';
import { useResponsive } from '../src/lib/responsive';
import { useAuth } from '../src/context/AuthContext';
import { Btn, Card, Field, Screen } from '../src/components/UI';

const msg = (e: any) => {
  const code = e?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Correo o contraseña incorrectos.';
  if (code.includes('email-already-in-use')) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (code.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('invalid-email')) return 'El correo no es válido.';
  if (code.includes('network')) return 'Sin conexión. Revisa tu internet e inténtalo otra vez.';
  return 'No se pudo completar la acción. Revisa tu conexión e inténtalo de nuevo.';
};

export default function Login() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const reduced = useReducedMotion() ?? false;
  const { login, register, reset } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    setInfo('');
    if (!email.trim() || !pass || (mode === 'register' && !name.trim())) {
      setError('Completa todos los campos.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, pass);
      } else {
        await register(name.trim(), email, pass);
      }
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Escribe tu correo arriba para enviarte el enlace.');
      return;
    }
    try {
      await reset(email);
      setInfo('Te enviamos un correo para restablecer la contraseña.');
    } catch (e) {
      setError(msg(e));
    }
  };

  return (
    <Screen>
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          gap: space['2xl'],
          alignItems: 'stretch',
          justifyContent: 'center',
          paddingTop: isDesktop ? space['3xl'] : space.lg,
          maxWidth: isDesktop ? 880 : 460,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        {isDesktop ? (
          <Animated.View entering={reduced ? undefined : FadeInDown.duration(320)} style={{ flex: 1, justifyContent: 'center', gap: space.lg }}>
            <Image
              source={require('../assets/images/kesuubit-icon.png')}
              style={{ width: 54, height: 54, borderRadius: 18 }}
              contentFit="cover"
              accessibilityLabel="KESUUBIT"
            />
            <Text
              style={{
                color: C.ink,
                fontSize: 38,
                lineHeight: 42,
                fontWeight: weight.black,
                letterSpacing: tracking.tight,
              }}
            >
              KESUUBIT
            </Text>
            <Text style={{ color: C.inkSoft, fontSize: typeScale.bodyLg, lineHeight: 23, maxWidth: 360 }}>
              Instrumentos y accesorios con actitud de banda. Guarda tus favoritos, sigue tus pedidos y
              escucha el chime de KESUUBIT.
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Pill label="Bocchi the Rock!" color={C.pink} />
              <Pill label="K-On!" color={C.blue} />
              <Pill label="Oruro, Bolivia" color={C.green} />
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={reduced ? undefined : FadeInDown.duration(280)} style={{ flex: isDesktop ? 1 : undefined }}>
          <Card style={{ gap: space.md, padding: isDesktop ? space['2xl'] : space.lg }}>
            {!isDesktop ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 2 }}>
                <Image
                  source={require('../assets/images/kesuubit-icon.png')}
                  style={{ width: 38, height: 38, borderRadius: 12 }}
                  contentFit="cover"
                  accessibilityLabel="KESUUBIT"
                />
                <View>
                  <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: 17 }}>KESUUBIT</Text>
                  <Text style={{ color: C.muted, fontSize: 11 }}>Instrumentos de banda</Text>
                </View>
              </View>
            ) : null}

            <View>
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.h3 }}>
                {mode === 'login' ? 'Hola de nuevo' : 'Crea tu cuenta'}
              </Text>
              <Text style={{ color: C.muted, fontSize: typeScale.small }}>
                {mode === 'login' ? 'Entra para continuar con tu banda.' : 'Tarda menos de un minuto.'}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                padding: 3,
                borderRadius: radius.md,
                backgroundColor: C.bgAlt,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              {(['login', 'register'] as const).map((key) => {
                const active = mode === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setMode(key);
                      setError('');
                      setInfo('');
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: radius.sm,
                        backgroundColor: active ? C.card : pressed ? C.bgAlt : 'transparent',
                        alignItems: 'center',
                      },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? C.ink : C.muted,
                        fontWeight: weight.bold,
                        fontSize: typeScale.small,
                      }}
                    >
                      {key === 'login' ? 'Entrar' : 'Crear cuenta'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mode === 'register' ? (
              <Field label="Nombre" value={name} onChangeText={setName} autoComplete="name" />
            ) : null}
            <Field
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Field
              label="Contraseña"
              value={pass}
              onChangeText={setPass}
              secureTextEntry
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onSubmitEditing={submit}
            />

            {error ? (
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                <Ionicons name="alert-circle" size={16} color={C.red} />
                <Text style={{ flex: 1, color: C.red, fontSize: typeScale.small, lineHeight: 18 }}>{error}</Text>
              </View>
            ) : null}
            {info ? (
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                <Ionicons name="checkmark-circle" size={16} color={C.green} />
                <Text style={{ flex: 1, color: C.green, fontSize: typeScale.small, lineHeight: 18 }}>{info}</Text>
              </View>
            ) : null}

            <Btn
              title={busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              onPress={submit}
              loading={busy}
              icon={mode === 'login' ? 'log-in-outline' : 'person-add-outline'}
            />

            {mode === 'login' ? (
              <Pressable onPress={forgot} hitSlop={6} accessibilityRole="button">
                <Text style={{ color: C.muted, textAlign: 'center', fontSize: typeScale.small, fontWeight: weight.semibold }}>
                  Olvidé mi contraseña
                </Text>
              </Pressable>
            ) : null}

            <View style={{ height: 1, backgroundColor: C.border }} />

            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityRole="button"
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, { cursor: 'pointer' } as any]}
            >
              <Text style={{ color: C.pink, textAlign: 'center', fontSize: typeScale.small, fontWeight: weight.bold }}>
                Seguir mirando sin cuenta
              </Text>
            </Pressable>
          </Card>
        </Animated.View>
      </View>
    </Screen>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: color,
        backgroundColor: C.card,
      }}
    >
      <Text style={{ color, fontSize: 10.5, fontWeight: weight.black, letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}
