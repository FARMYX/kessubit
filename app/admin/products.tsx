import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';
import { C, CATEGORIES, FANDOM, money } from '../../src/lib/theme';
import { radius, space, type as typeScale, weight } from '../../src/lib/design';
import { pickImage } from '../../src/lib/image';
import { seedProducts } from '../../src/lib/seed';
import { confirmAction } from '../../src/lib/confirm';
import {
  restockProducts,
  sortByRestockPriority,
  stockBadgeLabel,
  stockColor,
  stockState,
} from '../../src/lib/stock';
import { useProducts } from '../../src/context/ProductsContext';
import { useToast } from '../../src/context/ToastContext';
import { haptic } from '../../src/lib/haptics';
import { playSound } from '../../src/lib/sound';
import { offerOf } from '../../src/lib/offers';
import { useCollections } from '../../src/lib/collections';
import { Badge, Btn, Card, Chip, Empty, Field, Screen } from '../../src/components/UI';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { ProductImage } from '../../src/components/ProductImage';
import { Skeleton } from '../../src/components/Skeleton';
import type { Product } from '../../src/lib/types';

type StockFilter = 'todos' | 'reponer' | 'bajo' | 'agotado';

type Form = {
  name: string;
  brand: string;
  category: string;
  fandom: string;
  price: string;
  previousPrice: string;
  stock: string;
  lowStockThreshold: string;
  collectionId: string;
  description: string;
  imageUrl: string;
  specs: string;
  featured: boolean;
};

const blank: Form = {
  name: '',
  brand: '',
  category: 'Guitarras',
  fandom: 'bocchi',
  price: '',
  previousPrice: '',
  stock: '',
  lowStockThreshold: '',
  collectionId: '',
  description: '',
  imageUrl: '',
  specs: '',
  featured: false,
};

const toText = (product: Product) => (product.specs || []).map((spec) => `${spec.k}: ${spec.v}`).join('\n');

const parseSpecs = (text: string) =>
  text
    .split('\n')
    .map((line) => line.split(':'))
    .filter((parts) => parts.length >= 2 && parts[0].trim())
    .map((parts) => ({ k: parts[0].trim(), v: parts.slice(1).join(':').trim() }));

export default function AdminProducts() {
  const { products, loading } = useProducts();
  const { collections } = useCollections();
  const toast = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'save' | 'seed' | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');
  const [stockFilter, setStockFilter] = useState<StockFilter>('todos');

  const restock = useMemo(() => restockProducts(products), [products]);
  const stockCounts = useMemo(() => {
    let bajo = 0;
    let agotado = 0;
    products.forEach((product) => {
      const state = stockState(product.stock, product.lowStockThreshold);
      if (state === 'bajo') bajo += 1;
      if (state === 'agotado') agotado += 1;
    });
    return { bajo, agotado, reponer: bajo + agotado };
  }, [products]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = products
      .filter((product) => (category === 'Todas' ? true : product.category === category))
      .filter((product) => {
        if (stockFilter === 'todos') return true;
        if (stockFilter === 'reponer') return stockState(product.stock, product.lowStockThreshold) !== 'ok';
        return stockState(product.stock, product.lowStockThreshold) === stockFilter;
      })
      .filter((product) =>
        term ? `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(term) : true
      );
    return stockFilter === 'todos'
      ? filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'))
      : sortByRestockPriority(filtered);
  }, [products, search, category, stockFilter]);

  const startNew = () => {
    setEditId(null);
    setError('');
    setForm({ ...blank });
  };

  const startEdit = (product: Product) => {
    setEditId(product.id);
    setError('');
    setForm({
      name: product.name,
      brand: product.brand,
      category: product.category,
      fandom: product.fandom,
      price: String(product.price),
      previousPrice: product.previousPrice ? String(product.previousPrice) : '',
      stock: String(product.stock),
      lowStockThreshold: product.lowStockThreshold ? String(product.lowStockThreshold) : '',
      collectionId: product.collectionId || '',
      description: product.description,
      imageUrl: product.imageUrl || '',
      specs: toText(product),
      featured: !!product.featured,
    });
  };

  const save = async () => {
    if (!form) return;
    const price = Number(form.price);
    const stock = Number(form.stock);
    const previousPrice = form.previousPrice.trim() ? Number(form.previousPrice) : null;
    const lowStockThreshold = form.lowStockThreshold.trim() ? Number(form.lowStockThreshold) : null;
    if (!form.name.trim() || Number.isNaN(price) || Number.isNaN(stock)) {
      setError('Nombre, precio y stock válidos son obligatorios.');
      return;
    }
    if (
      (previousPrice !== null && (!Number.isFinite(previousPrice) || previousPrice < 0)) ||
      (lowStockThreshold !== null && (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0))
    ) {
      setError('El precio anterior y el umbral de stock deben ser números válidos.');
      return;
    }
    if (previousPrice !== null && previousPrice <= price) {
      setError('El precio anterior debe ser mayor al precio actual para mostrar la oferta.');
      return;
    }
    setBusy('save');
    setError('');
    const data = {
      name: form.name.trim(),
      brand: form.brand.trim() || 'Genérica',
      category: form.category,
      fandom: form.fandom,
      price,
      previousPrice,
      stock: Math.max(0, Math.floor(stock)),
      lowStockThreshold: lowStockThreshold === null ? null : Math.max(0, Math.floor(lowStockThreshold)),
      collectionId: form.collectionId || null,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim(),
      specs: parseSpecs(form.specs),
      featured: form.featured,
    };
    try {
      if (editId) {
        await setDoc(doc(db, 'products', editId), data, { merge: true });
      } else {
        await addDoc(collection(db, 'products'), data);
      }
      haptic.success();
      playSound(offerOf({ price: data.price, previousPrice: data.previousPrice }).active ? 'offer' : 'success');
      toast.success(editId ? 'Producto actualizado' : 'Producto creado', data.name);
      setForm(null);
      setEditId(null);
    } catch {
      setError('No se pudo guardar. Revisa que tu usuario sea admin y las reglas estén publicadas.');
      haptic.error();
    } finally {
      setBusy(null);
    }
  };

  const remove = (product: Product) => {
    confirmAction(`Borrar "${product.name}"`, 'Se quitará del catálogo. Los pedidos anteriores no cambian.', async () => {
      try {
        await deleteDoc(doc(db, 'products', product.id));
        haptic.warning();
        toast.info('Producto borrado', product.name);
      } catch {
        toast.error('No se pudo borrar', 'Revisa tu conexión y permisos.');
      }
    }, 'Borrar');
  };

  const seed = async () => {
    setBusy('seed');
    setError('');
    try {
      await seedProducts();
      toast.success('Catálogo demo actualizado', 'Solo se añadieron los productos que faltaban.');
    } catch {
      setError('No se pudo cargar el catálogo demo. ¿Tu usuario es admin y las reglas están publicadas?');
    } finally {
      setBusy(null);
    }
  };

  if (form) {
    return (
      <Screen>
        <ScreenHeader
          title={editId ? 'Editar producto' : 'Nuevo producto'}
          eyebrow="Catálogo"
          subtitle="Los cambios se reflejan al instante en la tienda."
          back
          onBack={() => setForm(null)}
        />

        <View style={{ gap: space.md }}>
          <Card style={{ gap: space.sm }}>
            <Text style={sectionLabel}>Foto</Text>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <ProductImage uri={form.imageUrl || undefined} height={92} width={92} radius={radius.md} />
              <View style={{ flex: 1, gap: space.sm }}>
                <Btn
                  title="Elegir de la galería"
                  kind="ghost"
                  compact
                  icon="image-outline"
                  onPress={async () => {
                    try {
                      const uri = await pickImage(600, false);
                      if (uri) setForm({ ...form, imageUrl: uri });
                    } catch {
                      setError('No se pudo cargar la foto. Revisa el permiso de fotos.');
                    }
                  }}
                />
                <Field
                  placeholder="…o pega una URL"
                  value={form.imageUrl.startsWith('data:') ? '' : form.imageUrl}
                  onChangeText={(value) => setForm({ ...form, imageUrl: value })}
                  autoCapitalize="none"
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>
            </View>
          </Card>

          <Card style={{ gap: space.sm }}>
            <Text style={sectionLabel}>Datos</Text>
            <Field label="Nombre" value={form.name} onChangeText={(value) => setForm({ ...form, name: value })} />
            <Field label="Marca" value={form.brand} onChangeText={(value) => setForm({ ...form, brand: value })} />

            <Text style={subLabel}>Categoría</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {CATEGORIES.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  on={form.category === item}
                  onPress={() => setForm({ ...form, category: item })}
                />
              ))}
            </View>

            <Text style={subLabel}>Fandom</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Object.keys(FANDOM).map((key) => (
                <Chip
                  key={key}
                  label={FANDOM[key].label}
                  color={FANDOM[key].color}
                  on={form.fandom === key}
                  onPress={() => setForm({ ...form, fandom: key })}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Field
                label="Precio (Bs)"
                keyboardType="numeric"
                value={form.price}
                onChangeText={(value) => setForm({ ...form, price: value })}
                containerStyle={{ flex: 1 }}
              />
              <Field
                label="Stock"
                keyboardType="numeric"
                value={form.stock}
                onChangeText={(value) => setForm({ ...form, stock: value })}
                containerStyle={{ flex: 1 }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: space.md }}>
              <Field
                label="Precio anterior (opcional)"
                keyboardType="numeric"
                value={form.previousPrice}
                onChangeText={(value) => setForm({ ...form, previousPrice: value })}
                containerStyle={{ flex: 1 }}
              />
              <Field
                label="Avisar stock desde"
                keyboardType="numeric"
                value={form.lowStockThreshold}
                onChangeText={(value) => setForm({ ...form, lowStockThreshold: value })}
                containerStyle={{ flex: 1 }}
              />
            </View>

            {offerOf({ price: Number(form.price), previousPrice: Number(form.previousPrice) }).active ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 8,
                  paddingHorizontal: space.md,
                  borderRadius: radius.sm,
                  backgroundColor: C.pinkWash,
                  borderWidth: 1,
                  borderColor: '#F3D2E1',
                }}
              >
                <Ionicons name="pricetag" size={15} color={C.pink} />
                <Text style={{ color: C.inkSoft, fontSize: typeScale.small, flex: 1 }}>
                  {offerOf({ price: Number(form.price), previousPrice: Number(form.previousPrice) }).note}
                </Text>
                <Text style={{ color: C.pink, fontWeight: weight.black, fontSize: typeScale.small }}>
                  {offerOf({ price: Number(form.price), previousPrice: Number(form.previousPrice) }).label}
                </Text>
              </View>
            ) : null}

            {collections.length ? (
              <>
                <Text style={subLabel}>Colección</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Chip
                    label="Sin colección"
                    on={!form.collectionId}
                    onPress={() => setForm({ ...form, collectionId: '' })}
                  />
                  {collections
                    .filter((item) => item.active !== false)
                    .map((item) => (
                      <Chip
                        key={item.id}
                        label={item.name}
                        color={item.color || C.purple}
                        on={form.collectionId === item.id}
                        onPress={() => setForm({ ...form, collectionId: item.id })}
                      />
                    ))}
                </View>
              </>
            ) : null}

            <Chip
              label="Destacado en la tienda"
              icon={form.featured ? 'star' : 'star-outline'}
              color={C.yellowDeep}
              on={form.featured}
              onPress={() => setForm({ ...form, featured: !form.featured })}
            />
          </Card>

          <Card style={{ gap: space.sm }}>
            <Text style={sectionLabel}>Contenido</Text>
            <Field
              label="Descripción"
              multiline
              value={form.description}
              onChangeText={(value) => setForm({ ...form, description: value })}
            />
            <Field
              label="Especificaciones (una por línea, formato Clave: valor)"
              multiline
              value={form.specs}
              onChangeText={(value) => setForm({ ...form, specs: value })}
              containerStyle={{ marginBottom: 0 }}
            />
          </Card>

          {error ? (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
              <Ionicons name="alert-circle" size={16} color={C.red} />
              <Text style={{ flex: 1, color: C.red, fontSize: typeScale.small, lineHeight: 18 }}>{error}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
            <Btn
              title={editId ? 'Guardar cambios' : 'Crear producto'}
              icon="checkmark"
              onPress={save}
              loading={busy === 'save'}
            />
            <Btn title="Cancelar" kind="ghost" onPress={() => setForm(null)} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Productos"
        eyebrow={`${products.length} en catálogo`}
        subtitle="Crea, edita y controla el stock de cada instrumento."
        right={<Btn title="Añadir" compact icon="add" onPress={startNew} />}
      />

      <View style={{ flexDirection: 'row', gap: space.sm, marginBottom: space.sm, flexWrap: 'wrap' }}>
        <Field
          placeholder="Buscar producto o marca"
          value={search}
          onChangeText={setSearch}
          containerStyle={{ flex: 1, minWidth: 200, marginBottom: 0 }}
        />
        <Btn
          title={busy === 'seed' ? 'Cargando…' : 'Demo'}
          kind="ghost"
          compact
          icon="cloud-download-outline"
          onPress={seed}
          loading={busy === 'seed'}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm }}>
        <Chip label="Todas" on={category === 'Todas'} onPress={() => setCategory('Todas')} />
        {CATEGORIES.map((item) => (
          <Chip key={item} label={item} on={category === item} onPress={() => setCategory(item)} />
        ))}
      </View>

      {restock.length > 0 ? (
        <Pressable
          onPress={() => setStockFilter(stockFilter === 'reponer' ? 'todos' : 'reponer')}
          accessibilityRole="button"
          accessibilityLabel={`${restock.length} productos necesitan reposición`}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              padding: space.md,
              marginBottom: space.sm,
              borderRadius: radius.md,
              backgroundColor: pressed ? C.yellowSoft : C.surfaceAlt,
              borderWidth: 1,
              borderColor: '#F0D98A',
            },
            { cursor: 'pointer' } as any,
          ]}
        >
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.yellowSoft,
            }}
          >
            <Ionicons name="alert-circle-outline" size={18} color={C.yellowDeep} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
              {restock.length} producto{restock.length === 1 ? '' : 's'} para reponer
            </Text>
            <Text style={{ color: C.muted, fontSize: typeScale.small }}>
              {stockCounts.agotado} agotado{stockCounts.agotado === 1 ? '' : 's'} ·{' '}
              {stockCounts.bajo} con últimas unidades
            </Text>
          </View>
          <Text style={{ color: C.yellowDeep, fontWeight: weight.bold, fontSize: typeScale.small }}>
            {stockFilter === 'reponer' ? 'Ver todos' : 'Ver'}
          </Text>
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm }}>
        <Chip
          label="Todo el stock"
          on={stockFilter === 'todos'}
          onPress={() => setStockFilter('todos')}
        />
        {stockCounts.reponer > 0 ? (
          <Chip
            label={`Reponer (${stockCounts.reponer})`}
            color={C.yellowDeep}
            on={stockFilter === 'reponer'}
            onPress={() => setStockFilter('reponer')}
          />
        ) : null}
        {stockCounts.bajo > 0 ? (
          <Chip
            label={`Últimas (${stockCounts.bajo})`}
            color={C.yellowDeep}
            on={stockFilter === 'bajo'}
            onPress={() => setStockFilter('bajo')}
          />
        ) : null}
        {stockCounts.agotado > 0 ? (
          <Chip
            label={`Agotados (${stockCounts.agotado})`}
            color={C.red}
            on={stockFilter === 'agotado'}
            onPress={() => setStockFilter('agotado')}
          />
        ) : null}
      </View>

      {error ? (
        <Text style={{ color: C.red, fontSize: typeScale.small, marginBottom: space.sm }}>{error}</Text>
      ) : null}

      {loading ? (
        <View style={{ gap: space.sm }}>
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <Skeleton width={56} height={56} borderRadius={radius.md} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="58%" height={12} />
                <Skeleton width="38%" height={10} />
              </View>
            </Card>
          ))}
        </View>
      ) : !visible.length ? (
        <Empty
          icon="pricetags-outline"
          title="Sin productos aquí"
          text={products.length ? 'Prueba con otra búsqueda o categoría.' : 'Añade tu primer producto o carga el catálogo demo.'}
          action={{ label: 'Añadir producto', onPress: startNew }}
        />
      ) : (
        <View style={{ gap: space.sm }}>
          {visible.map((product) => (
            <Card key={product.id} style={{ padding: space.md }}>
              <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
                <ProductImage product={product} width={58} height={58} radius={radius.md} />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text numberOfLines={1} style={{ flexShrink: 1, color: C.ink, fontWeight: weight.bold, fontSize: typeScale.body }}>
                      {product.name}
                    </Text>
                    {product.featured ? <Ionicons name="star" size={12} color={C.yellowDeep} /> : null}
                  </View>
                  <Text style={{ color: C.muted, fontSize: typeScale.caption }}>
                    {product.brand} · {product.category}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2, flexWrap: 'wrap' }}>
                    {offerOf(product).active ? (
                      <Text style={{ color: C.muted, fontSize: typeScale.small, textDecorationLine: 'line-through' }}>
                        {money(offerOf(product).previous)}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        color: offerOf(product).active ? C.pink : C.ink,
                        fontWeight: weight.black,
                        fontSize: typeScale.body,
                      }}
                    >
                      {money(product.price)}
                    </Text>
                    {offerOf(product).active ? (
                      <Badge label={offerOf(product).label} color={C.pinkBright} soft />
                    ) : null}
                    <Badge
                      label={stockBadgeLabel(product.stock, product.lowStockThreshold)}
                      color={stockColor(product.stock, product.lowStockThreshold)}
                      soft
                    />
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <IconAction icon="create-outline" label={`Editar ${product.name}`} onPress={() => startEdit(product)} />
                  <IconAction icon="trash-outline" label={`Borrar ${product.name}`} color={C.red} onPress={() => remove(product)} />
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  color = C.inkSoft,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? C.bgAlt : C.surfaceAlt,
          borderWidth: 1,
          borderColor: C.border,
        },
        { cursor: 'pointer' } as any,
      ]}
    >
      <Ionicons name={icon} size={17} color={color} />
    </Pressable>
  );
}

const sectionLabel = {
  color: C.ink,
  fontWeight: weight.black as any,
  fontSize: typeScale.title,
};

const subLabel = {
  color: C.inkSoft,
  fontSize: typeScale.small,
  fontWeight: weight.semibold as any,
  marginTop: 2,
};
