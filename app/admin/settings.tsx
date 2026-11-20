import React, { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { C, FANDOM_PALETTE, money } from '../../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../../src/lib/design';
import { useStoreConfig } from '../../src/context/StoreConfigContext';
import { useToast } from '../../src/context/ToastContext';
import { useNotifications } from '../../src/context/NotificationsContext';
import { notify } from '../../src/lib/notify';
import { playSound } from '../../src/lib/sound';
import { haptic } from '../../src/lib/haptics';
import { db } from '../../src/lib/firebase';
import { pickImage } from '../../src/lib/image';
import { confirmAction } from '../../src/lib/confirm';
import { useProducts } from '../../src/context/ProductsContext';
import {
  createCollection,
  removeCollection,
  updateCollection,
  useCollections,
} from '../../src/lib/collections';
import {
  createFandom,
  removeFandom,
  updateFandom,
  useFandoms,
} from '../../src/lib/fandoms';
import { SEED_OFFERS, seedOfferPrices } from '../../src/lib/seed';
import { Btn, Card, Field, Screen } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import type { Collection, FandomTag, StoreConfig } from '../../src/lib/types';

type Form = Omit<StoreConfig, 'lat' | 'lng' | 'shippingCost' | 'freeShippingThreshold'> & {
  lat: string;
  lng: string;
  shippingCost: string;
  freeShippingThreshold: string;
};

const toForm = (config: StoreConfig): Form => ({
  ...config,
  lat: String(config.lat),
  lng: String(config.lng),
  shippingCost: String(config.shippingCost),
  freeShippingThreshold: String(config.freeShippingThreshold),
});

export default function AdminSettings() {
  const { config, save } = useStoreConfig();
  const { permission, enablePush } = useNotifications();
  const { products } = useProducts();
  const { collections } = useCollections();
  const { fandoms } = useFandoms();
  const toast = useToast();
  const [form, setForm] = useState<Form>(toForm(config));
  const [busy, setBusy] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [error, setError] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [collectionBusy, setCollectionBusy] = useState(false);
  const [fandomName, setFandomName] = useState('');
  const [fandomShort, setFandomShort] = useState('');
  const [fandomColor, setFandomColor] = useState<string>(C.pink);
  const [editingFandom, setEditingFandom] = useState<string | null>(null);
  const [fandomBusy, setFandomBusy] = useState(false);
  const [offersBusy, setOffersBusy] = useState(false);

  useEffect(() => {
    // Keep the local draft in sync when the remote config changes (another admin edited it).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(toForm(config));
  }, [config]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const saveAll = async () => {
    setError('');
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    const shippingCost = Number(form.shippingCost);
    const freeShippingThreshold = Number(form.freeShippingThreshold);

    if (!form.name.trim() || !form.address.trim()) {
      setError('El nombre y la dirección de la tienda son obligatorios.');
      return;
    }
    if ([lat, lng, shippingCost, freeShippingThreshold].some((value) => Number.isNaN(value))) {
      setError('Revisa los números: coordenadas, envío y umbral deben ser válidos.');
      return;
    }

    setBusy(true);
    try {
      await save({
        ...form,
        name: form.name.trim(),
        address: form.address.trim(),
        hours: form.hours.trim(),
        phone: form.phone.trim(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim(),
        announcement: form.announcement.trim(),
        paymentHolder: (form.paymentHolder || '').trim(),
        paymentInstructions: (form.paymentInstructions || '').trim(),
        lat,
        lng,
        shippingCost,
        freeShippingThreshold,
      });
      haptic.success();
      toast.success('Ajustes guardados', 'La tienda ya muestra estos datos.');
    } catch {
      haptic.error();
      setError('No se pudo guardar. Revisa tu conexión y permisos de admin.');
    } finally {
      setBusy(false);
    }
  };

  const resetCollectionDraft = () => {
    setCollectionName('');
    setCollectionDescription('');
    setEditingCollection(null);
  };

  const saveCollection = async () => {
    if (!collectionName.trim()) {
      toast.error('Falta el nombre', 'Escribe un nombre para la colección.');
      return;
    }
    setCollectionBusy(true);
    try {
      if (editingCollection) {
        await updateCollection(editingCollection, {
          name: collectionName.trim(),
          description: collectionDescription.trim(),
        });
        toast.success('Colección actualizada', collectionName.trim());
      } else {
        await createCollection({
          name: collectionName.trim(),
          description: collectionDescription.trim(),
        });
        playSound('offer');
        toast.success('Colección creada', collectionName.trim());
      }
      resetCollectionDraft();
      haptic.success();
    } catch {
      toast.error('No se pudo guardar', 'Revisa tus permisos de administrador.');
      haptic.error();
    } finally {
      setCollectionBusy(false);
    }
  };

  const startEditCollection = (item: Collection) => {
    setEditingCollection(item.id);
    setCollectionName(item.name);
    setCollectionDescription(item.description || '');
  };

  const toggleCollection = async (item: Collection) => {
    try {
      await updateCollection(item.id, { active: item.active === false });
      haptic.tap();
    } catch {
      toast.error('No se pudo actualizar', 'Revisa tus permisos de administrador.');
    }
  };

  const deleteCollection = (item: Collection) => {
    const usedBy = products.filter((product) => product.collectionId === item.id).length;
    if (usedBy > 0) {
      toast.error(
        'Colección en uso',
        `${usedBy} producto${usedBy === 1 ? '' : 's'} la usan. Quítala de esos productos primero.`
      );
      return;
    }
    confirmAction(`Borrar "${item.name}"`, 'La colección desaparecerá del catálogo.', async () => {
      try {
        await removeCollection(item.id);
        if (editingCollection === item.id) resetCollectionDraft();
        haptic.warning();
        toast.info('Colección borrada', item.name);
      } catch {
        toast.error('No se pudo borrar', 'Revisa tus permisos de administrador.');
      }
    }, 'Borrar');
  };

  const resetFandomDraft = () => {
    setFandomName('');
    setFandomShort('');
    setFandomColor(C.pink);
    setEditingFandom(null);
  };

  const saveFandom = async () => {
    if (!fandomName.trim()) {
      toast.error('Falta el nombre', 'Escribe un nombre para la etiqueta.');
      return;
    }
    setFandomBusy(true);
    try {
      const patch = {
        name: fandomName.trim(),
        short: fandomShort.trim(),
        color: fandomColor,
      };
      if (editingFandom) {
        await updateFandom(editingFandom, patch);
        toast.success('Etiqueta actualizada', patch.name);
      } else {
        await createFandom(patch);
        playSound('offer');
        toast.success('Etiqueta creada', patch.name);
      }
      resetFandomDraft();
      haptic.success();
    } catch {
      toast.error('No se pudo guardar', 'Revisa tus permisos de administrador.');
      haptic.error();
    } finally {
      setFandomBusy(false);
    }
  };

  const startEditFandom = (item: FandomTag) => {
    setEditingFandom(item.id);
    setFandomName(item.name);
    setFandomShort(item.short || '');
    setFandomColor(item.color || C.pink);
  };

  const toggleFandom = async (item: FandomTag) => {
    try {
      await updateFandom(item.id, { active: item.active === false });
      haptic.tap();
    } catch {
      toast.error('No se pudo actualizar', 'Revisa tus permisos de administrador.');
    }
  };

  const deleteFandom = (item: FandomTag) => {
    const usedBy = products.filter((product) => product.fandom === item.id).length;
    if (usedBy > 0) {
      toast.error(
        'Etiqueta en uso',
        `${usedBy} producto${usedBy === 1 ? '' : 's'} la usan. Cámbiala en esos productos primero.`
      );
      return;
    }
    confirmAction(`Borrar "${item.name}"`, 'La etiqueta desaparecerá del catálogo.', async () => {
      try {
        // El catálogo local puede ir desactualizado: se confirma contra Firestore.
        const live = await getDocs(query(collection(db, 'products'), where('fandom', '==', item.id)));
        if (!live.empty) {
          toast.error(
            'Etiqueta en uso',
            `${live.size} producto${live.size === 1 ? '' : 's'} la usan. Cámbiala primero.`
          );
          return;
        }
        await removeFandom(item.id);
        if (editingFandom === item.id) resetFandomDraft();
        haptic.warning();
        toast.info('Etiqueta borrada', item.name);
      } catch {
        toast.error('No se pudo borrar', 'Revisa tus permisos de administrador.');
      }
    }, 'Borrar');
  };

  const activateOffers = () => {
    confirmAction(
      'Activar ofertas de ejemplo',
      `Se aplicarán ${SEED_OFFERS.length} bajadas de precio del catálogo demo. No se tocarán productos que ya tengan precio anterior.`,
      async () => {
        setOffersBusy(true);
        try {
          const count = await seedOfferPrices();
          haptic.success();
          if (count) {
            playSound('offer');
            toast.success(
              'Ofertas activadas',
              `${count} producto${count === 1 ? '' : 's'} muestran ahora su bajada en el catálogo.`
            );
          } else {
            toast.info(
              'Sin cambios',
              'Los productos de ejemplo ya tenían precio anterior o cambiaron de precio.'
            );
          }
        } catch {
          haptic.error();
          toast.error('No se pudieron activar', 'Revisa que tu usuario sea admin y las reglas estén publicadas.');
        } finally {
          setOffersBusy(false);
        }
      },
      'Activar'
    );
  };

  const pickQr = async () => {
    setError('');
    setUploadingQr(true);
    try {
      const image = await pickImage(720, true);
      if (image) {
        set('qrImage', image);
        haptic.success();
        toast.info('QR cargado', 'Pulsa “Guardar cambios” para publicarlo en el checkout.');
      }
    } catch {
      haptic.error();
      setError('No se pudo abrir la galería. Revisa los permisos de fotos.');
    } finally {
      setUploadingQr(false);
    }
  };

  const testSound = () => {
    playSound('chime');
    haptic.light();
    toast.info('Chime de KESUUBIT', 'Este es el sonido de los avisos de pedidos.');
  };

  const testNotification = async () => {
    if (!permission) {
      const result = await enablePush();
      if (!result.granted) {
        toast.error('Activa los avisos', 'Permite las notificaciones del sistema primero.');
        return;
      }
    }
    playSound('chime');
    await notify('KESUUBIT · Admin', 'Aviso de prueba del panel de administración.', {
      data: { url: '/notifications' },
    });
    toast.success('Aviso enviado', 'Revisa la bandeja del sistema.');
  };

  return (
    <Screen>
      <ScreenHeader
        title="Ajustes"
        eyebrow="Tienda"
        subtitle="Estos datos alimentan el catálogo, el checkout, el local y los avisos."
        right={<Btn title="Guardar" compact icon="checkmark" onPress={saveAll} loading={busy} />}
      />

      <View style={{ gap: space.md }}>
        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="storefront-outline" title="Información de la tienda" />
          <Field label="Nombre" value={form.name} onChangeText={(value) => set('name', value)} />
          <Field label="Dirección" value={form.address} onChangeText={(value) => set('address', value)} />
          <Field label="Horario" value={form.hours} onChangeText={(value) => set('hours', value)} />
        </Card>

        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="library-outline" title="Colecciones" />
          <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
            Crea temáticas nuevas para ampliar tu catálogo. Luego asígnalas desde Productos. Una
            colección con productos no se puede borrar hasta vaciarla.
          </Text>

          {collections.map((item) => {
            const usedBy = products.filter((product) => product.collectionId === item.id).length;
            return (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  padding: space.md,
                  borderRadius: radius.md,
                  backgroundColor: C.surfaceAlt,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: item.color || C.purple,
                    flexShrink: 0,
                  }}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                    {usedBy} producto{usedBy === 1 ? '' : 's'} · {item.active === false ? 'Oculta' : 'Visible'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => startEditCollection(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar colección ${item.name}`}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={17} color={C.inkSoft} />
                </Pressable>
                <Pressable
                  onPress={() => toggleCollection(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.active === false ? `Mostrar ${item.name}` : `Ocultar ${item.name}`}
                  hitSlop={8}
                >
                  <Ionicons
                    name={item.active === false ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={C.inkSoft}
                  />
                </Pressable>
                <Pressable
                  onPress={() => deleteCollection(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Borrar colección ${item.name}`}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={17} color={C.red} />
                </Pressable>
              </View>
            );
          })}

          <Field
            label={editingCollection ? 'Nombre de la colección' : 'Nueva colección'}
            value={collectionName}
            onChangeText={setCollectionName}
            placeholder="Ej. Rock, Metal, Lo-fi…"
          />
          <Field
            label="Descripción (opcional)"
            value={collectionDescription}
            onChangeText={setCollectionDescription}
            placeholder="Una línea para presentarla"
            containerStyle={{ marginBottom: 0 }}
          />
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Btn
              title={editingCollection ? 'Guardar colección' : 'Añadir colección'}
              icon={editingCollection ? 'checkmark' : 'add'}
              compact
              onPress={saveCollection}
              loading={collectionBusy}
            />
            {editingCollection ? (
              <Btn title="Cancelar" kind="ghost" compact onPress={resetCollectionDraft} />
            ) : null}
          </View>
        </Card>

        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="pricetags-outline" title="Etiquetas de fandom" />
          <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
            Renombra las etiquetas clásicas o crea otras nuevas. Las ocultas dejan de aparecer como
            filtro, pero siguen identificando a los productos que ya las usan. Una etiqueta con
            productos no se puede borrar.
          </Text>

          {fandoms.map((item) => {
            const usedBy = products.filter((product) => product.fandom === item.id).length;
            return (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  padding: space.md,
                  borderRadius: radius.md,
                  backgroundColor: C.surfaceAlt,
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: item.color || C.pink,
                    flexShrink: 0,
                  }}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                    {item.name}
                    {item.short ? ` · ${item.short}` : ''}
                  </Text>
                  <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                    {usedBy} producto{usedBy === 1 ? '' : 's'} · {item.active === false ? 'Oculta' : 'Visible'}
                  </Text>
                </View>
                <Pressable
                  onPress={() => startEditFandom(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar etiqueta ${item.name}`}
                  hitSlop={8}
                >
                  <Ionicons name="create-outline" size={17} color={C.inkSoft} />
                </Pressable>
                <Pressable
                  onPress={() => toggleFandom(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.active === false ? `Mostrar ${item.name}` : `Ocultar ${item.name}`}
                  hitSlop={8}
                >
                  <Ionicons
                    name={item.active === false ? 'eye-off-outline' : 'eye-outline'}
                    size={17}
                    color={C.inkSoft}
                  />
                </Pressable>
                <Pressable
                  onPress={() => deleteFandom(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Borrar etiqueta ${item.name}`}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={17} color={C.red} />
                </Pressable>
              </View>
            );
          })}

          <Field
            label={editingFandom ? 'Nombre de la etiqueta' : 'Nueva etiqueta'}
            value={fandomName}
            onChangeText={setFandomName}
            placeholder="Ej. Rock, Metal, Jazz…"
          />
          <Field
            label="Etiqueta corta (opcional)"
            value={fandomShort}
            onChangeText={setFandomShort}
            placeholder="Texto breve para el badge"
            containerStyle={{ marginBottom: 0 }}
          />
          <Text style={{ color: C.inkSoft, fontSize: typeScale.small, fontWeight: weight.semibold }}>
            Color
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {FANDOM_PALETTE.map((tone) => {
              const selected = fandomColor === tone.color;
              return (
                <Pressable
                  key={tone.color}
                  onPress={() => setFandomColor(tone.color)}
                  accessibilityRole="button"
                  accessibilityLabel={`Color ${tone.label}`}
                  accessibilityState={{ selected }}
                  hitSlop={6}
                  style={({ pressed }) => [
                    {
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: tone.color,
                      borderWidth: 2,
                      borderColor: selected ? C.ink : C.card,
                      opacity: pressed ? 0.8 : 1,
                    },
                    { cursor: 'pointer' } as any,
                  ]}
                />
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Btn
              title={editingFandom ? 'Guardar etiqueta' : 'Añadir etiqueta'}
              icon={editingFandom ? 'checkmark' : 'add'}
              compact
              onPress={saveFandom}
              loading={fandomBusy}
            />
            {editingFandom ? (
              <Btn title="Cancelar" kind="ghost" compact onPress={resetFandomDraft} />
            ) : null}
          </View>
        </Card>

        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="pricetag-outline" title="Ofertas de ejemplo" />
          <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
            El catálogo demo trae {SEED_OFFERS.length} bajadas de precio. Actívalas para que el precio
            tachado y el porcentaje se vean en las tarjetas. No se modifican ofertas que ya hayas
            configurado a mano.
          </Text>
          <Btn
            title="Activar ofertas de ejemplo"
            icon="pricetag"
            kind="soft"
            compact
            onPress={activateOffers}
            loading={offersBusy}
          />
        </Card>

        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="call-outline" title="Contacto" />
          <Field
            label="Teléfono"
            value={form.phone}
            onChangeText={(value) => set('phone', value)}
            keyboardType="phone-pad"
            placeholder="+591 …"
          />
          <Field
            label="WhatsApp"
            value={form.whatsapp}
            onChangeText={(value) => set('whatsapp', value)}
            keyboardType="phone-pad"
            placeholder="5917…"
          />
          <Field
            label="Correo"
            value={form.email}
            onChangeText={(value) => set('email', value)}
            autoCapitalize="none"
            keyboardType="email-address"
            containerStyle={{ marginBottom: 0 }}
          />
        </Card>

        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="bicycle-outline" title="Entrega y envío" />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Field
              label="Costo de envío (Bs)"
              value={form.shippingCost}
              onChangeText={(value) => set('shippingCost', value)}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
            <Field
              label="Envío gratis desde (Bs)"
              value={form.freeShippingThreshold}
              onChangeText={(value) => set('freeShippingThreshold', value)}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>

          <Text style={{ color: C.muted, fontSize: typeScale.small }}>
            Envío actual: {money(Number(form.shippingCost) || 0)} · gratis desde{' '}
            {money(Number(form.freeShippingThreshold) || 0)}.
          </Text>

          <Toggle
            icon="bicycle-outline"
            title="Envío a domicilio"
            subtitle="Permite elegir entrega con costo en el checkout."
            value={form.deliveryEnabled}
            onChange={(value) => set('deliveryEnabled', value)}
          />
          <Toggle
            icon="storefront-outline"
            title="Retiro en tienda"
            subtitle="El cliente recoge el pedido en la dirección de la tienda."
            value={form.pickupEnabled}
            onChange={(value) => set('pickupEnabled', value)}
          />
        </Card>

        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="qr-code-outline" title="Pagos y QR" />
          <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
            Sube la foto del QR de tu banca móvil. Si no hay imagen, la opción QR se oculta en el
            checkout y solo quedan transferencia, efectivo y tarjeta.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              gap: space.md,
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: C.surfaceAlt,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View
              style={{
                width: 128,
                height: 128,
                borderRadius: radius.md,
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: C.border,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {form.qrImage ? (
                <Image
                  source={{ uri: form.qrImage }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="contain"
                  accessibilityLabel="QR de pago de la tienda"
                />
              ) : (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Ionicons name="qr-code-outline" size={30} color={C.muted} />
                  <Text style={{ color: C.muted, fontSize: typeScale.caption }}>Sin QR</Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1, minWidth: 170, gap: space.sm }}>
              <Btn
                title={form.qrImage ? 'Cambiar imagen' : 'Subir imagen del QR'}
                kind="soft"
                compact
                icon="image-outline"
                onPress={pickQr}
                loading={uploadingQr}
              />
              {form.qrImage ? (
                <Pressable
                  onPress={() => {
                    set('qrImage', '');
                    haptic.warning();
                    toast.info('QR quitado', 'Guarda los cambios para ocultarlo en el checkout.');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Quitar imagen del QR"
                  style={({ pressed }) => [
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      alignSelf: 'flex-start',
                      paddingVertical: 4,
                      opacity: pressed ? 0.7 : 1,
                    },
                    { cursor: 'pointer' } as any,
                  ]}
                >
                  <Ionicons name="trash-outline" size={14} color={C.red} />
                  <Text style={{ color: C.red, fontSize: typeScale.small, fontWeight: weight.semibold }}>
                    Quitar QR
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <Field
            label="Titular de la cuenta"
            value={form.paymentHolder || ''}
            onChangeText={(value) => set('paymentHolder', value)}
            placeholder="Nombre del titular"
          />
          <Field
            label="Instrucciones de pago"
            value={form.paymentInstructions || ''}
            onChangeText={(value) => set('paymentInstructions', value)}
            multiline
            placeholder="Ej. Escanea el QR desde tu banca móvil y guarda la captura."
            containerStyle={{ marginBottom: 0 }}
          />
        </Card>

        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="map-outline" title="Ubicación" />
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Field
              label="Latitud"
              value={form.lat}
              onChangeText={(value) => set('lat', value)}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
            <Field
              label="Longitud"
              value={form.lng}
              onChangeText={(value) => set('lng', value)}
              keyboardType="numeric"
              containerStyle={{ flex: 1 }}
            />
          </View>
          <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
            Se usan en el mapa de la pestaña Local y en “Cómo llegar”.
          </Text>
        </Card>

        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="megaphone-outline" title="Anuncio" />
          <Field
            label="Texto que aparece sobre el catálogo"
            value={form.announcement}
            onChangeText={(value) => set('announcement', value)}
            multiline
            placeholder="Envío gratis en pedidos desde Bs 500…"
            containerStyle={{ marginBottom: 0 }}
          />
        </Card>

        <Card style={{ gap: space.sm }}>
          <SectionTitle icon="notifications-outline" title="Avisos y sonido" />
          <Text style={{ color: C.muted, fontSize: typeScale.small, lineHeight: 18 }}>
            Los pedidos nuevos y los cambios de estado usan el chime original de KESUUBIT. En Android
            necesita un development build para sonar con el canal personalizado.
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Btn title="Probar sonido" kind="ghost" compact icon="volume-high" onPress={testSound} />
            <Btn
              title={permission ? 'Probar aviso' : 'Activar y probar'}
              kind="soft"
              compact
              icon="notifications"
              onPress={testNotification}
            />
          </View>
        </Card>

        {error ? (
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
            <Ionicons name="alert-circle" size={16} color={C.red} />
            <Text style={{ flex: 1, color: C.red, fontSize: typeScale.small, lineHeight: 18 }}>{error}</Text>
          </View>
        ) : null}

        <Btn title="Guardar cambios" icon="checkmark" onPress={saveAll} loading={busy} />
        <Text style={{ color: C.muted, fontSize: typeScale.caption, textAlign: 'center' }}>
          Los cambios se guardan en Firestore y se aplican en tiempo real.
        </Text>
      </View>
    </Screen>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 }}>
      <Ionicons name={icon} size={17} color={C.pink} />
      <Text style={{ color: C.ink, fontWeight: weight.black, fontSize: typeScale.title }}>{title}</Text>
    </View>
  );
}

function Toggle({
  icon,
  title,
  subtitle,
  value,
  onChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: C.surfaceAlt,
        borderWidth: 1,
        borderColor: C.border,
      }}
    >
      <Ionicons name={icon} size={18} color={value ? C.pink : C.muted} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.ink, fontWeight: weight.semibold, fontSize: typeScale.body }}>{title}</Text>
        <Text style={{ color: C.muted, fontSize: typeScale.caption, lineHeight: 16 }}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.borderStrong, true: C.pinkSoft }}
        thumbColor={value ? C.pink : '#fff'}
        accessibilityLabel={title}
      />
    </View>
  );
}
