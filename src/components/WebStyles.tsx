import { useEffect } from 'react';
import { Platform } from 'react-native';
import { WEB_CSS } from '../lib/webStyles';

const STYLE_ID = 'kessoku-web-styles';

/**
 * Injects the global web stylesheet once. Needed because `app/+html.tsx` only
 * runs during static rendering and this project ships as a single-page app.
 */
export function WebStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = WEB_CSS;
    document.head.appendChild(style);
  }, []);

  return null;
}
