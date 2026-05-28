export interface INotificationProvider {
  sendPushNotification(tokens: string[], title: string, body: string, data?: any): Promise<void>;
}
