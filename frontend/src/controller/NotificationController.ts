import {Controller} from "./Controller";
import {SystemNotification} from "../entity/SystemNotification";

export interface NotificationUnreadCount {
    count: number;
}

export interface NotificationMarkReadRequest {
    notificationId: number;
}

export interface NotificationAdminAnnounceRequest {
    title: string;
    content: string;
    targetRole: "ALL" | "STUDENT" | "TEACHER" | "COUNSELOR" | "ADMIN" | "SCHOOL_ADMIN" | "SYSTEM_ADMIN" | "PLATFORM_ADMIN";
}

export interface NotificationAdminAnnounceResult {
    sentCount: number;
}

export class NotificationController extends Controller {
    listMine = this._get<{unreadOnly?: boolean}, SystemNotification[]>("api/notification/mine");
    unreadCount = this._get<null, NotificationUnreadCount>("api/notification/unread_count");
    markRead = this._post<NotificationMarkReadRequest, any>("api/notification/mark_read");
    markAllRead = this._post<null, {updated: number}>("api/notification/mark_all_read");
    adminAnnounce = this._post<NotificationAdminAnnounceRequest, NotificationAdminAnnounceResult>("api/notification/admin/announce");
}
