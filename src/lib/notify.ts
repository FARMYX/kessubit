import * as Notifications from 'expo-notifications';
import {
  AndroidAudioContentType,
  AndroidAudioUsage,
  AndroidImportance,
  AndroidNotificationVisibility,
} from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const NOTIFICATION_CHANNEL_ID = 'kessoku-orders-v1';
export const NOTIFICATION_SOUND = 'kessoku-chime.wav';

const isWeb = Platform.OS === 'web';

if (!isWeb) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let channelReady = false;

/** Android needs a channel that points at the bundled custom sound. */
export async function setupAndroidChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  channelReady = true;
  try {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Pedidos KESUUBIT',
      description: 'Pedidos nuevos y cambios de estado',
      importance: AndroidImportance.MAX,
      sound: NOTIFICATION_SOUND,
      audioAttributes: {
        usage: AndroidAudioUsage.NOTIFICATION,
        contentType: AndroidAudioContentType.SONIFICATION,
      },
      enableVibrate: true,
      vibrationPattern: [0, 90, 60, 90],
      lightColor: '#C93A72',
      showBadge: true,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    // Older devices / Expo Go can reject channel options; notifications still work.
  }
}

export async function ensurePermission(): Promise<boolean> {
  if (isWeb) {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      return (await Notification.requestPermission()) === 'granted';
    } catch {
      return false;
    }
  }
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      await setupAndroidChannel();
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    if (requested.granted) await setupAndroidChannel();
    return requested.granted;
  } catch {
    return false;
  }
}

/** Reads the current permission without prompting the user. */
export async function hasNotificationPermission(): Promise<boolean> {
  if (isWeb) {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export type NotifyOptions = {
  data?: Record<string, unknown>;
  sound?: boolean;
};

/**
 * Shows a system notification. On Android the trigger carries the channel id,
 * which is the only way to guarantee the custom chime is used.
 */
export async function notify(title: string, body: string, options: NotifyOptions = {}) {
  const { data, sound = true } = options;

  if (isWeb) {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
    if (Notification.permission !== 'granted') return false;
    try {
      const system = new Notification(title, {
        body,
        icon: '/favicon.png',
        tag: data?.orderId ? `kessoku-order-${data.orderId}` : undefined,
      });
      system.onclick = () => {
        window.focus();
        const url = typeof data?.url === 'string' ? data.url : null;
        if (url) window.location.assign(url);
        system.close();
      };
      return true;
    } catch {
      return false;
    }
  }

  try {
    await setupAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: sound ? NOTIFICATION_SOUND : false,
        data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        repeats: false,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Stores an Expo push token for future server-sent push. No backend is used
 * today; this only makes the profile ready for it.
 */
export async function registerPushToken(): Promise<string | null> {
  if (isWeb || !Device.isDevice) return null;
  try {
    await setupAndroidChannel();
    const projectId =
      (Constants.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    if (!projectId) return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data || null;
  } catch {
    // Expo Go (SDK 53+) and projects without EAS/FCM credentials land here.
    return null;
  }
}

/** Opens the right screen when the user taps a notification. */
export function subscribeToNotificationTaps(onOpen: (url: string) => void) {
  if (isWeb) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') onOpen(url);
  });
  return () => sub.remove();
}
