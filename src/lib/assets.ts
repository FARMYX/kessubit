import type { Product } from './types';
const A: Record<string, any> = {
  'amp-ermik': require('../../assets/products/amp-ermik.jpg'),
  'amp-bajo': require('../../assets/products/amp-bajo.jpg'),
  'cuerdas-bajo': require('../../assets/products/cuerdas-bajo.jpg'),
  'baquetas': require('../../assets/products/baquetas.jpg'),
  'bateria': require('../../assets/products/bateria.jpg'),
  'lp-cherry': require('../../assets/products/lp-cherry.jpg'),
  'cuerdas-guitarra': require('../../assets/products/cuerdas-guitarra.jpg'),
  'strat-mcart': require('../../assets/products/strat-mcart.jpg'),
  'lp-custom': require('../../assets/products/lp-custom.jpg'),
  'bajo-negro': require('../../assets/products/bajo-negro.jpg'),
  'pack-puas-bocchi': require('../../assets/products/pack-puas-bocchi.jpg'),
  'pua-btr': require('../../assets/products/pua-btr.jpg'),
  'puas-kessoku': require('../../assets/products/puas-kessoku.jpg'),
  'pua-morada': require('../../assets/products/pua-morada.webp'),
  'keytar': require('../../assets/products/keytar.jpg'),
  'kon-88': require('../../assets/products/kon-88.jpg'),
};
const PH = require('../../assets/products/placeholder.png');
export const imgSource = (p: Partial<Product>) =>
  p.imageUrl ? { uri: p.imageUrl } : (p.image && A[p.image]) || PH;
