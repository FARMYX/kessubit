import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
const s = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => ({ k, v }));

type SeedProduct = {
  id: string;
  name: string;
  brand: string;
  category: string;
  fandom: string;
  price: number;
  previousPrice?: number;
  stock: number;
  featured?: boolean;
  description: string;
  specs: { k: string; v: string }[];
  image?: string;
};

// Precios y stock son de ejemplo: edítalos desde el panel admin.
export const SEED: SeedProduct[] = [
  { id: 'strat-mcart', name: 'Guitarra eléctrica estilo Stratocaster negra', brand: 'MC-Art', category: 'Guitarras', fandom: 'bocchi', price: 1200, previousPrice: 1450, stock: 6, featured: true,
    description: 'Guitarra de 3 single coils y puente tremolo, ideal para empezar a tocar como Bocchi.',
    specs: s({ Pastillas: '3 single coil', Controles: 'Volumen + 2 tonos, selector de 5 posiciones', Puente: 'Tremolo', Acabado: 'Negro brillante, golpeador blanco' }), image: 'strat-mcart' },
  { id: 'lp-cherry', name: 'Guitarra estilo Les Paul Cherry Sunburst', brand: 'Genérica', category: 'Guitarras', fandom: 'bocchi', price: 1800, previousPrice: 2150, stock: 3,
    description: 'Cuerpo con tapa flameada en degradado cereza y dos humbuckers.',
    specs: s({ Pastillas: '2 humbucker', Controles: '2 volumen + 2 tono', Acabado: 'Cherry sunburst' }), image: 'lp-cherry' },
  { id: 'lp-custom', name: 'Gibson Les Paul Custom negra', brand: 'Gibson', category: 'Guitarras', fandom: 'both', price: 12500, stock: 1, featured: true,
    description: 'Clásica Les Paul Custom con herrajes dorados y diapasón de ébano.',
    specs: s({ Pastillas: '2 humbucker', Herrajes: 'Dorados', Acabado: 'Ebony con binding' }), image: 'lp-custom' },
  { id: 'bajo-negro', name: 'Bajo eléctrico 4 cuerdas negro', brand: 'Genérica', category: 'Bajos', fandom: 'bocchi', price: 1500, stock: 4,
    description: 'Bajo de 4 cuerdas con dos pastillas, cómodo para principiantes.',
    specs: s({ Cuerdas: '4', Pastillas: '2', Acabado: 'Negro brillante' }), image: 'bajo-negro' },
  { id: 'bateria', name: 'Batería compacta Yamaha amarilla', brand: 'Yamaha', category: 'Baterías', fandom: 'kon', price: 5200, previousPrice: 5900, stock: 2, featured: true,
    description: 'Kit compacto y portátil, perfecto para ensayos en espacios pequeños (¡Ritsu aprobaría!).',
    specs: s({ Formato: 'Compacto', Acabado: 'Amarillo', Incluye: 'Hardware y platillos' }), image: 'bateria' },
  { id: 'baquetas', name: 'Baquetas Vic Firth American Classic Extreme', brand: 'Vic Firth', category: 'Accesorios', fandom: 'kon', price: 95, stock: 30,
    description: 'Baquetas de madera con punta de madera.',
    specs: s({ Material: 'Hickory', Punta: 'Madera' }), image: 'baquetas' },
  { id: 'kon-88', name: 'ESI K.ON controlador MIDI 88 teclas', brand: 'ESI', category: 'Teclados', fandom: 'kon', price: 3900, previousPrice: 4400, stock: 2,
    description: 'Controlador MIDI de 88 teclas con faders, perillas y pads. El nombre ya lo dice todo.',
    specs: s({ Teclas: '88', Controles: 'Faders, perillas y pads', Conexión: 'MIDI / USB' }), image: 'kon-88' },
  { id: 'keytar', name: 'Keytar Korg blanco', brand: 'Korg', category: 'Teclados', fandom: 'kon', price: 2100, previousPrice: 2450, stock: 2,
    description: 'Teclado de hombro para tocar de pie y moverte por el escenario.',
    specs: s({ Tipo: 'Keytar', Color: 'Blanco' }), image: 'keytar' },
  { id: 'amp-ermik', name: 'Amplificador Ermik AGL-20 para guitarra', brand: 'Ermik', category: 'Amplificadores', fandom: 'bocchi', price: 450, previousPrice: 560, stock: 8,
    description: 'Combo de práctica con overdrive, salida de audífonos y entrada auxiliar. Incluye cable.',
    specs: s({ Potencia: '20 W', Controles: 'Gain, Bass, Treble, Volume', Extras: 'Overdrive, Phones, Aux in' }), image: 'amp-ermik' },
  { id: 'amp-bajo', name: 'Amplificador para bajo Fender Rumble', brand: 'Fender', category: 'Amplificadores', fandom: 'bocchi', price: 2400, stock: 3,
    description: 'Combo de bajo de la serie Rumble con rejilla plateada.',
    specs: s({ Serie: 'Rumble', Uso: 'Bajo eléctrico' }), image: 'amp-bajo' },
  { id: 'cuerdas-guitarra', name: 'Cuerdas guitarra eléctrica E130 Custom Light', brand: 'E130', category: 'Accesorios', fandom: 'bocchi', price: 45, stock: 40,
    description: 'Juego de 6 cuerdas para guitarra eléctrica.', specs: s({ Calibre: '.010–.046', Tipo: 'Custom Light' }), image: 'cuerdas-guitarra' },
  { id: 'cuerdas-bajo', name: 'Cuerdas bajo eléctrico níquel', brand: 'Generic', category: 'Accesorios', fandom: 'bocchi', price: 80, stock: 25,
    description: 'Juego de 4 cuerdas para bajo.', specs: s({ Calibre: '.040 .060 .075 .095', Material: 'Acero niquelado', Núcleo: 'Roundcore taperwound' }), image: 'cuerdas-bajo' },
  { id: 'pack-puas-bocchi', name: 'Pack 5 púas Bocchi + latita + 50 stickers', brand: 'Merch', category: 'Accesorios', fandom: 'bocchi', price: 70, previousPrice: 95, stock: 20, featured: true,
    description: 'Cinco púas nacaradas con Bocchi, latita metálica y 50 stickers de regalo.', specs: s({ Púas: '5', Extras: 'Latita + 50 stickers' }), image: 'pack-puas-bocchi' },
  { id: 'pua-btr', name: 'Púa negra y dorada BTR!', brand: 'Merch', category: 'Accesorios', fandom: 'bocchi', price: 15, stock: 50,
    description: 'Púa triangular negra con ilustración dorada.', specs: s({ Forma: 'Triangular redondeada', Diseño: 'Dorado sobre negro' }), image: 'pua-btr' },
  { id: 'puas-kessoku', name: 'Púas Kessoku Band (juego de colores)', brand: 'Merch', category: 'Accesorios', fandom: 'bocchi', price: 25, stock: 35,
    description: 'Púas translúcidas con las integrantes de Kessoku Band.', specs: s({ Colores: 'Rosa, rojo, naranja, celeste' }), image: 'puas-kessoku' },
  { id: 'pua-morada', name: 'Púa morada edición especial', brand: 'Merch', category: 'Accesorios', fandom: 'bocchi', price: 18, stock: 30,
    description: 'Púa morada mate con diseño grabado en blanco.', specs: s({ Acabado: 'Mate', Color: 'Morado' }), image: 'pua-morada' },
];

const x = (id: string, name: string, brand: string, category: string, fandom: string, price: number, stock: number, description: string, specs: Record<string, string>) =>
  ({ id, name, brand, category, fandom, price, stock, description, specs: s(specs) });

// Sin foto: se muestran con una imagen de relleno hasta que subas la foto desde el panel admin.
export const EXTRA = [
  x('guitarra-acustica', 'Guitarra acústica dreadnought', 'Genérica', 'Guitarras', 'bocchi', 650, 5, 'Guitarra acústica de cuerpo grande, sonido potente para tocar en casa o en la calle.', { Tipo: 'Dreadnought', Cuerdas: '6 de acero' }),
  x('guitarra-electroacustica', 'Guitarra electroacústica con ecualizador', 'Genérica', 'Guitarras', 'both', 1400, 3, 'Se toca sin amplificar o conectada a un amplificador.', { Tipo: 'Electroacústica', Cuerdas: '6 de acero', Extras: 'Ecualizador integrado' }),
  x('guitarra-clasica', 'Guitarra clásica de nailon', 'Genérica', 'Guitarras', 'kon', 520, 6, 'Ideal para empezar a aprender; cuerdas suaves para los dedos.', { Tipo: 'Clásica', Cuerdas: 'Nailon' }),
  x('ukulele-soprano', 'Ukulele soprano', 'Genérica', 'Guitarras', 'kon', 220, 8, 'Pequeño, liviano y fácil de llevar a todas partes.', { Tipo: 'Soprano', Cuerdas: '4' }),
  x('bajo-5-cuerdas', 'Bajo eléctrico de 5 cuerdas', 'Genérica', 'Bajos', 'both', 2200, 2, 'Una cuerda grave extra para más rango.', { Cuerdas: '5', Pastillas: '2' }),
  x('caja-14', 'Caja de batería 14"', 'Genérica', 'Baterías', 'kon', 480, 4, 'Caja metálica con buena respuesta y ataque.', { Diámetro: '14 pulgadas', Material: 'Metal' }),
  x('hihat-14', 'Platillos hi-hat 14"', 'Genérica', 'Baterías', 'kon', 650, 3, 'Par de platillos para el ritmo base.', { Diámetro: '14 pulgadas', Uso: 'Hi-hat' }),
  x('pedal-bombo', 'Pedal de bombo', 'Genérica', 'Baterías', 'kon', 350, 5, 'Pedal de cadena con ajuste de tensión.', { Tipo: 'Simple' }),
  x('banquillo-bateria', 'Banquillo de batería', 'Genérica', 'Baterías', 'kon', 220, 6, 'Asiento acolchado con altura regulable.', { Altura: 'Regulable' }),
  x('cajon', 'Cajón percusión', 'Genérica', 'Baterías', 'both', 380, 5, 'Percusión de madera para tocar sentado, sin necesidad de batería.', { Material: 'Madera' }),
  x('teclado-61', 'Teclado de 61 teclas', 'Genérico', 'Teclados', 'kon', 1100, 4, 'Teclado con sonidos y ritmos incluidos, perfecto para estudiar.', { Teclas: '61' }),
  x('midi-25', 'Controlador MIDI de 25 teclas', 'Genérico', 'Teclados', 'kon', 700, 4, 'Compacto, ideal para producir música en la computadora.', { Teclas: '25', Conexión: 'USB' }),
  x('piano-digital-88', 'Piano digital de 88 teclas', 'Genérico', 'Teclados', 'kon', 4800, 1, 'Teclas ponderadas para una sensación parecida al piano real.', { Teclas: '88 ponderadas' }),
  x('amp-guitarra-40', 'Amplificador de guitarra 40 W', 'Genérico', 'Amplificadores', 'bocchi', 900, 4, 'Más volumen para ensayar con banda.', { Potencia: '40 W', Uso: 'Guitarra eléctrica' }),
  x('pedal-distorsion', 'Pedal de distorsión', 'Genérico', 'Accesorios', 'bocchi', 250, 10, 'Ese sonido saturado y potente que tanto gusta a Bocchi.', { Tipo: 'Distorsión', Alimentación: 'Batería de 9 V' }),
  x('afinador-clip', 'Afinador de pinza', 'Genérico', 'Accesorios', 'both', 40, 30, 'Se coloca en la cabeza de la guitarra y afina por vibración.', { Tipo: 'Clip' }),
  x('capodastro', 'Capodastro', 'Genérico', 'Accesorios', 'bocchi', 25, 30, 'Cambia el tono de la guitarra sin cambiar los acordes.', { Uso: 'Guitarra' }),
  x('correa-guitarra', 'Correa para guitarra o bajo', 'Genérica', 'Accesorios', 'bocchi', 60, 20, 'Correa ajustable y acolchada.', { Uso: 'Guitarra / bajo' }),
  x('cable-3m', 'Cable de instrumento 3 m', 'Genérico', 'Accesorios', 'both', 45, 25, 'Cable jack a jack para guitarra o bajo.', { Largo: '3 m', Conector: 'Jack 6.3 mm' }),
  x('estuche-guitarra', 'Estuche para guitarra eléctrica', 'Genérico', 'Accesorios', 'bocchi', 180, 8, 'Funda acolchada con correas de mochila.', { Uso: 'Guitarra eléctrica' }),
  x('metronomo', 'Metrónomo digital', 'Genérico', 'Accesorios', 'kon', 70, 15, 'Para practicar siempre al ritmo.', { Tipo: 'Digital' }),
  x('microfono-dinamico', 'Micrófono dinámico', 'Genérico', 'Accesorios', 'both', 200, 10, 'Para cantar y ensayar con la banda.', { Tipo: 'Dinámico' }),
  x('soporte-guitarra', 'Soporte de piso para guitarra', 'Genérico', 'Accesorios', 'bocchi', 90, 12, 'Guarda tu guitarra de pie y segura.', { Tipo: 'Piso' }),
  x('pack-puas-12', 'Pack de 12 púas variadas', 'Genérico', 'Accesorios', 'bocchi', 20, 40, 'Varios grosores para encontrar tu favorita.', { Cantidad: '12' }),
];

// Agrega solo los productos que aún no existen (no pisa tus ediciones).
export async function seedProducts() {
  const existing = new Set((await getDocs(collection(db, 'products'))).docs.map((d) => d.id));
  const b = writeBatch(db);
  let n = 0;
  [...SEED, ...EXTRA].forEach(({ id, ...rest }) => { if (!existing.has(id)) { b.set(doc(db, 'products', id), rest); n++; } });
  if (n) await b.commit();
  return n;
}

/** Bajadas de precio del catálogo demo; se reutilizan en Ajustes. */
export const SEED_OFFERS = SEED.flatMap(({ id, previousPrice }) =>
  typeof previousPrice === 'number' ? [{ id, previousPrice }] : []
);

/**
 * Aplica las ofertas de ejemplo a los productos que ya existen en Firestore.
 * No toca productos con `previousPrice` propio ni los que cambiaron de precio.
 */
export async function seedOfferPrices() {
  const snapshot = await getDocs(collection(db, 'products'));
  const b = writeBatch(db);
  let n = 0;
  snapshot.docs.forEach((document) => {
    const offer = SEED_OFFERS.find((item) => item.id === document.id);
    if (!offer) return;
    const data = document.data();
    const price = Number(data.price);
    if (data.previousPrice != null) return;
    if (!(price > 0) || !(offer.previousPrice > price)) return;
    b.update(doc(db, 'products', document.id), { previousPrice: offer.previousPrice });
    n++;
  });
  if (n) await b.commit();
  return n;
}
