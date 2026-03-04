import {Controller} from "./Controller";

export interface ConsultationSessionDTO {
    sessionId: number;
    appointmentId: number;
    studentUsername: string;
    teacherUsername: string;
    otherUsername: string;
    otherDisplayName: string;
    otherAvatar: string | null;
    status: string;
    lastMessage: string | null;
    lastMessageTime: string | null;
    unreadCount: number;
}

export interface ConsultationMessageDTO {
    messageId: number;
    sessionId: number;
    senderUsername: string;
    senderDisplayName: string;
    senderAvatar: string | null;
    receiverUsername: string;
    content: string;
    messageType: string;
    sentTime: string;
    isRead: boolean;
}

export interface ConsultationOpenSessionRequest {
    appointmentId: number;
}

export interface ConsultationListMessagesRequest {
    sessionId: number;
}

export interface ConsultationCloseSessionRequest {
    sessionId: number;
}

export interface ConsultationSendMessageRequest {
    sessionId: number;
    content: string;
}

export interface ConsultationMarkReadRequest {
    sessionId: number;
}

export interface ConsultationMarkReadResult {
    updated: number;
}

export class ConsultationController extends Controller {
    openSession = this._post<ConsultationOpenSessionRequest, ConsultationSessionDTO>("api/consultation/session/open");
    closeSession = this._post<ConsultationCloseSessionRequest, ConsultationSessionDTO>("api/consultation/session/close");
    listMine = this._get<null, ConsultationSessionDTO[]>("api/consultation/session/list_mine");
    listMessages = this._get<ConsultationListMessagesRequest, ConsultationMessageDTO[]>("api/consultation/message/list");
    sendMessage = this._post<ConsultationSendMessageRequest, ConsultationMessageDTO>("api/consultation/message/send");
    markRead = this._post<ConsultationMarkReadRequest, ConsultationMarkReadResult>("api/consultation/message/read");
}
