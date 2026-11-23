import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../lib/theme';
import { fandomMeta, useFandoms } from '../lib/fandoms';
import { radius, shadow, space, type as typeScale, weight } from '../lib/design';
import { useResponsive } from '../lib/responsive';
import { Btn, Chip } from './UI';

export type CatalogSort = 'for-you' | 'recent' | 'price-asc' | 'price-desc' | 'name';

export const SORT_LABEL: Record<CatalogSort, string> = {
  'for-you': 'Para ti (recomendados)',
  recent: 'Recién llegados',
  'price-asc': 'Precio: menor a mayor',
  'price-desc': 'Precio: mayor a menor',
  name: 'Nombre A–Z',
};

type Props = {
  visible: boolean;
  onClose: () => void;
  categories: string[];
  category: string;
  onCategory: (category: string) => void;
  fandom: string;
  onFandom: (fandom: string) => void;
  sort: CatalogSort;
  onSort: (sort: CatalogSort) => void;
  onClear: () => void;
  resultCount: number;
};

export function FilterSheet({
  visible,
  onClose,
  categories,
  category,
  onCategory,
  fandom,
  onFandom,
  sort,
  onSort,
  onClear,
  resultCount,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const { fandoms, visibleFandoms } = useFandoms();
  // Un producto antiguo puede seguir filtrándose por una etiqueta hoy oculta o borrada.
  const currentFandom =
    fandom !== 'all' && !visibleFandoms.some((item) => item.id === fandom)
      ? fandomMeta(fandoms, fandom)
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={isDesktop ? 'fade' : 'slide'}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: isDesktop ? 'center' : 'flex-end', alignItems: 'center' }}>
        <Pressable
          onPress={onClose}
          accessibilityLabel="Cerrar filtros"
          style={{ position: 'absolute', inset: 0, backgroundColor: C.overlay }}
        />

        <View
          style={[
            {
              width: isDesktop ? 520 : '100%',
              maxWidth: '100%',
              maxHeight: isDesktop ? '82%' : '88%',
              backgroundColor: C.card,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              borderBottomLeftRadius: isDesktop ? radius['2xl'] : 0,
              borderBottomRightRadius: isDesktop ? radius['2xl'] : 0,
              paddingBottom: isDesktop ? space.xl : Math.max(insets.bottom, space.lg),
              borderWidth: 1,
              borderColor: C.border,
            },
            shadow.sheet,
          ]}
        >
          {!isDesktop ? (
            <View style={{ alignItems: 'center', paddingTop: space.sm }}>
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: C.borderStrong }} />
            </View>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: space.xl,
              paddingTop: space.lg,
              paddingBottom: space.md,
            }}
          >
            <View>
              <Text style={{ color: C.ink, fontSize: typeScale.h3, fontWeight: weight.black }}>Filtros</Text>
              <Text style={{ color: C.muted, fontSize: typeScale.small }}>{resultCount} productos</Text>
            </View>
            <Pressable onPress={onClear} hitSlop={8} accessibilityRole="button">
              <Text style={{ color: C.pink, fontWeight: weight.bold, fontSize: typeScale.body }}>Limpiar</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: space.lg }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={sectionLabel}>Categoría</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Chip label="Todas" on={category === 'Todas'} onPress={() => onCategory('Todas')} />
              {categories.map((item) => (
                <Chip key={item} label={item} on={category === item} onPress={() => onCategory(item)} />
              ))}
            </View>

            <Text style={sectionLabel}>Fandom</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Chip label="Todos" on={fandom === 'all'} onPress={() => onFandom('all')} />
              {visibleFandoms.map((item) => {
                const meta = fandomMeta([item], item.id);
                return (
                  <Chip
                    key={item.id}
                    label={meta.label}
                    color={meta.color}
                    on={fandom === item.id}
                    onPress={() => onFandom(item.id)}
                  />
                );
              })}
              {currentFandom ? (
                <Chip
                  label={currentFandom.label}
                  color={currentFandom.color}
                  on
                  onPress={() => onFandom(fandom)}
                />
              ) : null}
            </View>

            <Text style={sectionLabel}>Ordenar por</Text>
            <View style={{ gap: space.sm }}>
              {(Object.keys(SORT_LABEL) as CatalogSort[]).map((key) => {
                const active = sort === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => onSort(key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: space.md,
                        paddingHorizontal: space.md,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: active ? C.pink : C.border,
                        backgroundColor: active ? C.pinkWash : pressed ? C.bgAlt : C.card,
                      },
                      { cursor: 'pointer' } as any,
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? C.pink : C.ink,
                        fontWeight: active ? weight.bold : weight.medium,
                        fontSize: typeScale.body,
                      }}
                    >
                      {SORT_LABEL[key]}
                    </Text>
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'ellipse-outline'}
                      size={19}
                      color={active ? C.pink : C.borderStrong}
                    />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm }}>
            <Btn title="Ver resultados" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const sectionLabel = {
  get color() { return C.inkSoft; },
  fontSize: typeScale.small,
  fontWeight: weight.bold,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.7,
  marginTop: space.lg,
  marginBottom: space.sm,
};
