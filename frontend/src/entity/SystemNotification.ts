export interface SystemNotification {
    notificationId: number;
    recipientUsername: string;
    senderUsername?: string | null;
    senderDisplayName?: string | null;
    notificationType: string;
    title: string;
    content: string;
    relatedType?: string | null;
    relatedId?: number | null;
    isRead: boolean;
    createdTime: Date | string;
}
