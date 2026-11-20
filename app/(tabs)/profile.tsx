import React, { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../../src/lib/design';
import { formatDate } from '../../src/lib/format';
import { useAuth } from '../../src/context/AuthContext';
import { useProducts } from '../../src/context/ProductsContext';
import { useNotifications } from '../../src/context/NotificationsContext';
import { useToast } from '../../src/context/ToastContext';
import { useSoundEnabled, playSound } from '../../src/lib/sound';
import { notify } from '../../src/lib/notify';
import { haptic } from '../../src/lib/haptics';
import { confirmAction } from '../../src/lib/confirm';
import { pickImage } from '../../src/lib/image';
import { Avatar, Badge, Btn, Card, Divider, Empty, Field, ProductCard, Screen, useGrid } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { NotificationBell } from '../../src/components/NotificationBell';

export default function Profile() {
  const router = useRouter();
  const { itemW } = useGrid();
  const { user, profile, isAdmin, logout, updatePhoto, updateName } = useAuth();
  const { products } = useProducts();
  const { unread, permission, enablePush } = useNotifications();
  const { on: soundOn, toggle: toggleSound } = useSoundEnabled();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile?.name || '');
  const [busy, setBusy] = useState<'photo' | 'name' | 'push' | null>(null);

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="Perfil" subtitle="Tu cuenta, tus favoritos y tus preferencias." />
        <Empty
          icon="person-circle-outline"
          title="Entra a tu banda"
          text="Inicia sesión para guardar favoritos, ver tus pedidos y recibir avisos con el chime de KESUUBIT."
          action={{ label: 'Iniciar sesión', onPress: () => router.push('/login') }}
        />
      </Screen>
    );
  }

  const favorites = products.filter((product) => profile?.favorites?.includes(product.id));

  const changePhoto = async () => {
    setBusy('photo');
    try {
      const uri = await pickImage(200, true);
      if (uri) {
        await updatePhoto(uri);
        haptic.tap();
        toast.success('Foto actualizada');
      }
    } catch (e: any) {
      toast.error(
        'No se pudo cambiar la foto',
        e?.message === 'permiso' ? 'Permite el acceso a tus fotos.' : 'Revisa tu conexión e inténtalo otra vez.'
      );
    } finally {
      setBusy(null);
    }
  };

  const saveName = async () => {
    if (!draft.trim()) {
      toast.error('Escribe tu nombre');
      return;
    }
    setBusy('name');
    try {
      await updateName(draft);
      setEditing(false);
      haptic.tap();
      toast.success('Nombre actualizado');
    } catch {
      toast.error('No se pudo guardar', 'Revisa tu conexión.');
    } finally {
      setBusy(null);
    }
  };

  const activatePush = async () => {
    setBusy('push');
    const result = await enablePush();
    setBusy(null);
    if (result.granted) {
      haptic.success();
      toast.success('Avisos activados', 'Te avisaremos de cada pedido.');
    } else {
      haptic.warning();
      toast.error('No se activaron', 'Habilítalos desde los ajustes del sistema.');
    }
  };

  const testNotification = async () => {
    playSound('chime');
    haptic.light();
    await notify('KESUUBIT', 'Así suena un aviso de tu banda.', { data: { url: '/notifications' } });
    toast.info('Aviso de prueba', soundOn ? 'Con el chime de KESUUBIT.' : 'El sonido está desactivado.');
  };

  const signOut = () => {
    confirmAction('Cerrar sesión', 'Tus favoritos y pedidos quedan guardados en tu cuenta.', async () => {
      await logout();
      haptic.light();
      router.replace('/');
    }, 'Cerrar sesión');
  };

  return (
    <Screen>
      <ScreenHeader title="Perfil" subtitle="Tu cuenta, tus favoritos y tus preferencias." />

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg, flexWrap: 'wrap' }}>
          <Pressable
            onPress={changePhoto}
            accessibilityRole="button"
            accessibilityLabel="Cambiar foto de perfil"
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, { cursor: 'pointer' } as any]}
          >
            <Avatar uri={profile?.photo} name={profile?.name} size={82} />
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                backgroundColor: C.pink,
                borderRadius: 15,
                padding: 6,
                borderWidth: 2,
                borderColor: C.card,
              }}
            >
              <Ionicons name={busy === 'photo' ? 'hourglass' : 'camera'} size={14} color="#fff" />
            </View>
          </Pressable>

          <View style={{ flex: 1, minWidth: 180, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.h3 }}>
                {profile?.name || 'Músico'}
              </Text>
              {isAdmin ? <Badge label="Admin" color={C.purple} soft /> : null}
            </View>
            <Text style={{ color: C.muted, fontSize: typeScale.body }}>{user.email}</Text>
            {profile?.createdAt ? (
              <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                En KESUUBIT desde {formatDate(profile.createdAt)}
              </Text>
            ) : null}
          </View>
        </View>

        <Divider />

        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
          <View style={statBox}>
            <Text style={statValue}>{favorites.length}</Text>
            <Text style={statLabel}>Favoritos</Text>
          </View>
          <View style={statBox}>
            <Text style={statValue}>{unread}</Text>
            <Text style={statLabel}>Avisos sin leer</Text>
          </View>
          <View style={statBox}>
            <Text style={[statValue, { color: permission ? C.green : C.muted }]}>
              {permission ? 'Sí' : 'No'}
            </Text>
            <Text style={statLabel}>Avisos del sistema</Text>
          </View>
        </View>
      </Card>

      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Card style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Ionicons name="person-outline" size={18} color={C.pink} />
            <Text style={{ flex: 1, color: C.ink, fontWeight: weight.bold, fontSize: typeScale.bodyLg }}>
              Cuenta
            </Text>
            {!editing ? (
              <Pressable
                onPress={() => {
                  setDraft(profile?.name || '');
                  setEditing(true);
                }}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={{ color: C.pink, fontWeight: weight.bold, fontSize: typeScale.small }}>Editar</Text>
              </Pressable>
            ) : null}
          </View>

          {editing ? (
            <>
              <Field label="Nombre" value={draft} onChangeText={setDraft} containerStyle={{ marginBottom: space.sm }} />
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Btn title="Guardar" onPress={saveName} loading={busy === 'name'} compact />
                <Btn title="Cancelar" kind="ghost" onPress={() => setEditing(false)} compact />
              </View>
            </>
          ) : (
            <View style={{ gap: 2 }}>
              <Text style={{ color: C.ink, fontSize: typeScale.body }}>{profile?.name}</Text>
              <Text style={{ color: C.muted, fontSize: typeScale.small }}>{user.email}</Text>
            </View>
          )}

          <Btn title="Cambiar foto de perfil" kind="ghost" compact icon="image-outline" onPress={changePhoto} />
        </Card>

        <Card style={{ gap: 0 }}>
          <View style={{ paddingBottom: space.sm }}>
            <NotificationBell showLabel />
          </View>
          <Divider />

          <View style={row}>
            <Ionicons name="volume-high-outline" size={19} color={C.inkSoft} />
            <View style={{ flex: 1 }}>
              <Text style={rowTitle}>Sonidos de la app</Text>
              <Text style={rowSub}>Chime, pop y confirmación de KESUUBIT.</Text>
            </View>
            <Switch
              value={soundOn}
              onValueChange={toggleSound}
              trackColor={{ false: C.borderStrong, true: C.pinkSoft }}
              thumbColor={soundOn ? C.pink : '#fff'}
              accessibilityLabel="Sonidos de la app"
            />
          </View>

          <Divider />

          <View style={row}>
            <Ionicons
              name={permission ? 'notifications' : 'notifications-off-outline'}
              size={19}
              color={permission ? C.green : C.inkSoft}
            />
            <View style={{ flex: 1 }}>
              <Text style={rowTitle}>Avisos del sistema</Text>
              <Text style={rowSub}>
                {permission ? 'Activos con sonido personalizado.' : 'Actívalos para no perderte nada.'}
              </Text>
            </View>
            {permission ? (
              <Btn title="Probar" kind="ghost" compact onPress={testNotification} />
            ) : (
              <Btn title="Activar" compact onPress={activatePush} loading={busy === 'push'} />
            )}
          </View>

          {isAdmin ? (
            <>
              <Divider />
              <Pressable
                onPress={() => router.push('/admin')}
                accessibilityRole="button"
                style={({ pressed }) => [row, { backgroundColor: pressed ? C.bgAlt : 'transparent' }, { cursor: 'pointer' } as any]}
              >
                <Ionicons name="settings-outline" size={19} color={C.purple} />
                <View style={{ flex: 1 }}>
                  <Text style={rowTitle}>Panel de administración</Text>
                  <Text style={rowSub}>Productos, pedidos, usuarios y ajustes de la tienda.</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={C.muted} />
              </Pressable>
            </>
          ) : null}
        </Card>

        <Btn title="Cerrar sesión" kind="ghost" icon="log-out-outline" onPress={signOut} />
      </View>

      <View style={{ marginTop: space['2xl'] }}>
        <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.h3, letterSpacing: -0.4 }}>
          Tus favoritos
        </Text>
        <Text style={{ color: C.muted, fontSize: typeScale.small, marginBottom: space.md }}>
          Toca el corazón en cualquier producto para guardarlo aquí.
        </Text>

        {favorites.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {favorites.map((product, index) => (
              <ProductCard
                key={product.id}
                p={product}
                i={index}
                w={itemW}
                onPress={() => router.push(`/product/${product.id}`)}
              />
            ))}
          </View>
        ) : (
          <Card>
            <Empty
              icon="heart-outline"
              title="Aún no tienes favoritos"
              text="Guarda los instrumentos que te gustan para encontrarlos rápido."
              action={{ label: 'Ver catálogo', onPress: () => router.push('/') }}
            />
          </Card>
        )}
      </View>
    </Screen>
  );
}

const statBox = {
  flex: 1,
  minWidth: 96,
  paddingVertical: space.sm,
  paddingHorizontal: space.md,
  borderRadius: radius.md,
  backgroundColor: C.surfaceAlt,
  borderWidth: 1,
  borderColor: C.border,
  gap: 1,
};

const statValue = {
  color: C.ink,
  fontWeight: weight.black,
  fontSize: typeScale.h3,
};

const statLabel = {
  color: C.muted,
  fontSize: typeScale.caption,
  fontWeight: weight.semibold,
};

const row = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: space.md,
  paddingVertical: space.md,
};

const rowTitle = {
  color: C.ink,
  fontWeight: weight.semibold as any,
  fontSize: typeScale.body,
};

const rowSub = {
  color: C.muted,
  fontSize: typeScale.caption,
  lineHeight: 16,
};
