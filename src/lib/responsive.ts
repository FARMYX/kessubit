import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout } from './design';

/**
 * One place to decide how wide the app is.
 * The desktop tab bar is a 248px sidebar, so the content width is the window
 * minus that sidebar. This hook is used by the shell, grids and cards.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= layout.desktopBreakpoint;
  const isTablet = width >= 700;
  const gutter = isDesktop ? 28 : isTablet ? 20 : 16;
  const available = isDesktop ? width - layout.sidebarWidth : width;
  const contentWidth = Math.min(available, layout.maxWidth);
  const cols = contentWidth >= 980 ? 4 : contentWidth >= 720 ? 3 : 2;
  const cardWidth = (contentWidth - gutter * 2 - (cols - 1) * layout.gridGap) / cols;
  return {
    width,
    height,
    isDesktop,
    isTablet,
    gutter,
    cols,
    cardWidth,
    contentWidth,
    available,
  };
}

export function useBottomPadding() {
  const { isDesktop } = useResponsive();
  const insets = useSafeAreaInsets();
  return isDesktop ? 48 : 104 + insets.bottom;
}
