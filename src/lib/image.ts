import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Abre la galería, recorta/reduce la imagen y devuelve un data URL JPEG liviano
// (se guarda directo en Firestore, sin necesidad de Firebase Storage).
export async function pickImage(width: number, square: boolean): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('permiso');
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsEditing: square, aspect: square ? [1, 1] : undefined, quality: 1,
  });
  if (res.canceled) return null;
  const ctx = ImageManipulator.manipulate(res.assets[0].uri);
  ctx.resize({ width });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${out.base64}`;
}
