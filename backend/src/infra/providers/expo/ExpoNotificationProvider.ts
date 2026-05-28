import { INotificationProvider } from '../../../core/providers/INotificationProvider';

export class ExpoNotificationProvider implements INotificationProvider {
  async sendPushNotification(tokens: string[], title: string, body: string, data?: any): Promise<void> {
    const cleanTokens = tokens.filter(t => t && t.startsWith('ExponentPushToken'));

    if (cleanTokens.length === 0) {
      console.log('[Push Notification] No active Expo push tokens found to send.');
      return;
    }

    const messages = cleanTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      const resData = await response.json();
      console.log(`[Push Notification] Sent successfully to ${cleanTokens.length} devices:`, resData);
    } catch (err) {
      console.error('[Push Notification] Failed to send push:', err);
    }
  }
}
