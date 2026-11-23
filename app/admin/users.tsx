import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';
import { C } from '../../src/lib/theme';
import { space, type as typeScale, weight } from '../../src/lib/design';
import { formatDate } from '../../src/lib/format';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { confirmAction } from '../../src/lib/confirm';
import { haptic } from '../../src/lib/haptics';
import { Avatar, Badge, Btn, Card, Empty, Field, Screen } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { BackToStore } from '../../src/components/BackToStore';
import { Skeleton } from '../../src/components/Skeleton';
import type { Profile } from '../../src/lib/types';

export default function AdminUsers() {
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setUsers(
          snap.docs
            .map((doc) => ({ uid: doc.id, ...doc.data() } as Profile))
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((item) =>
      term ? `${item.name || ''} ${item.email || ''}`.toLowerCase().includes(term) : true
    );
  }, [users, search]);

  const admins = users.filter((item) => item.role === 'admin').length;

  const toggleRole = (item: Profile) => {
    const next = item.role === 'admin' ? 'client' : 'admin';
    confirmAction(
      next === 'admin' ? 'Hacer administrador' : 'Quitar administrador',
      next === 'admin'
        ? `${item.name || item.email} podrá gestionar productos, pedidos y usuarios.`
        : `${item.name || item.email} volverá a ser cliente.`,
      async () => {
        setBusy(item.uid);
        try {
          await updateDoc(doc(db, 'users', item.uid), { role: next });
          haptic.tap();
          toast.success(next === 'admin' ? 'Ahora es admin' : 'Ahora es cliente', item.email);
        } catch {
          haptic.error();
          toast.error('No se pudo cambiar el rol', 'Revisa tu conexión y permisos.');
        } finally {
          setBusy(null);
        }
      },
      next === 'admin' ? 'Hacer admin' : 'Quitar admin'
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title="Usuarios"
        eyebrow={`${users.length} registrados · ${admins} admin${admins === 1 ? '' : 's'}`}
        subtitle="Gestiona quién puede administrar la tienda."
        right={<BackToStore />}
      />

      <Field
        placeholder="Buscar por nombre o correo"
        value={search}
        onChangeText={setSearch}
        containerStyle={{ marginBottom: space.sm }}
      />

      {loading ? (
        <View style={{ gap: space.sm }}>
          {[0, 1, 2].map((index) => (
            <Card key={index} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <Skeleton width={42} height={42} borderRadius={21} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="46%" height={12} />
                <Skeleton width="64%" height={10} />
              </View>
            </Card>
          ))}
        </View>
      ) : !visible.length ? (
        <Empty
          icon="people-outline"
          title="Sin usuarios"
          text={users.length ? 'Nadie coincide con esa búsqueda.' : 'Todavía no hay cuentas registradas.'}
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {visible.map((item) => {
            const self = item.uid === user?.uid;
            return (
              <Card key={item.uid} style={{ padding: space.md }}>
                <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                  <Avatar uri={item.photo} name={item.name} size={44} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <Text numberOfLines={1} style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                        {item.name || 'Sin nombre'}
                      </Text>
                      <Badge
                        label={item.role === 'admin' ? 'Admin' : 'Cliente'}
                        color={item.role === 'admin' ? C.purple : C.blue}
                        soft
                      />
                      {self ? <Badge label="Tú" color={C.green} soft /> : null}
                    </View>
                    <Text numberOfLines={1} style={{ color: C.muted, fontSize: typeScale.caption }}>
                      {item.email}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                      {item.favorites?.length || 0} favorito(s)
                      {item.createdAt ? ` · desde ${formatDate(item.createdAt)}` : ''}
                      {item.pushToken ? ' · push listo' : ''}
                    </Text>
                  </View>

                  {self ? (
                    <Ionicons name="shield-checkmark" size={19} color={C.green} />
                  ) : (
                    <Btn
                      title={item.role === 'admin' ? 'Quitar' : 'Hacer admin'}
                      kind={item.role === 'admin' ? 'dangerSoft' : 'ghost'}
                      compact
                      onPress={() => toggleRole(item)}
                      loading={busy === item.uid}
                    />
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
