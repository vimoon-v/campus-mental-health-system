import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useOutletContext} from "react-router";
import {useSearchParams} from "react-router-dom";
import {Homepage} from "../HomepageForm";
import {UserRole} from "../../../entity/enums/UserRole";
import {AppointmentController, FindAppointmentRequest} from "../../../controller/AppointmentController";
import {AppointmentDTO} from "../../../entity/AppointmentDTO";
import {AppointmentType} from "../../../entity/enums/AppointmentType";
import {AppointmentStatus} from "../../../entity/enums/AppointmentStatus";
import {
    ConsultationController,
    ConsultationMessageDTO,
    ConsultationSessionDTO
} from "../../../controller/ConsultationController";
import {AIAssistantController} from "../../../controller/AIAssistantController";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {API_BASE_URL} from "../../../utils/api/api_config";
import {getUserAvatar} from "../../../utils/avatar";
import defaultAvatar from "../../../assets/avatar/default-avatar.png";
import "./ConsultationForm.css";

const buildConsultationWsUrl = () => {
    const base = API_BASE_URL;
    if (base.startsWith("https://")) {
        return `${base.replace(/^https:\/\//, "wss://").replace(/\/$/, "")}/ws/consultation`;
    }
    if (base.startsWith("http://")) {
        return `${base.replace(/^http:\/\//, "ws://").replace(/\/$/, "")}/ws/consultation`;
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws/consultation`;
};

const formatDateTime = (value: string | Date | null | undefined) => {
    if (!value) {
        return "--";
    }
    const resolved = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(resolved.getTime())) {
        return String(value);
    }
    return resolved.toLocaleString("zh-CN");
};

const isNowWithinRange = (startTime: string | Date | null | undefined, endTime: string | Date | null | undefined) => {
    if (!startTime || !endTime) {
        return false;
    }
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime instanceof Date ? endTime : new Date(endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return false;
    }
    const now = Date.now();
    return now >= start.getTime() && now <= end.getTime();
};

const messageCompare = (left: ConsultationMessageDTO, right: ConsultationMessageDTO) => {
    const leftTime = new Date(left.sentTime).getTime();
    const rightTime = new Date(right.sentTime).getTime();
    if (leftTime !== rightTime) {
        return leftTime - rightTime;
    }
    return (left.messageId ?? 0) - (right.messageId ?? 0);
};

const AI_ASSISTANT_SESSION_ID = -1;

interface AIAssistantChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    sentTime: string;
}

const createAssistantConversationId = () => `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const createAssistantMessageId = () => `ai_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const ConsultationForm: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const [searchParams] = useSearchParams();
    const appointmentController = useMemo(() => new AppointmentController(), []);
    const consultationController = useMemo(() => new ConsultationController(), []);
    const aiAssistantController = useMemo(() => new AIAssistantController(), []);

    const user = context.user;
    const username = user?.username ?? "";
    const role = Number(user?.role);
    const isTeacher = role === UserRole.TEACHER;
    const isStudent = role === UserRole.STUDENT;
    const canUseConsultation = isTeacher || isStudent;

    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [sessions, setSessions] = useState<ConsultationSessionDTO[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ConsultationMessageDTO[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [closingSession, setClosingSession] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [aiStreaming, setAiStreaming] = useState(false);
    const [aiMessages, setAiMessages] = useState<AIAssistantChatMessage[]>([
        {
            id: createAssistantMessageId(),
            role: "assistant",
            content: "你好，我是AI心理助手。你可以和我聊聊压力、情绪、睡眠或人际困扰。",
            sentTime: new Date().toISOString()
        }
    ]);
    const [aiRagSources, setAiRagSources] = useState<string[]>([]);
    const [aiCrisisNotice, setAiCrisisNotice] = useState("");
    const [aiCrisisHotlines, setAiCrisisHotlines] = useState<string[]>([]);
    const [aiProviderUsed, setAiProviderUsed] = useState<boolean | null>(null);

    const activeSessionIdRef = useRef<number | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const autoOpenDoneRef = useRef(false);
    const autoSelectSessionDoneRef = useRef(false);
    const aiConversationIdRef = useRef<string>(createAssistantConversationId());
    const aiAbortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        activeSessionIdRef.current = activeSessionId;
    }, [activeSessionId]);

    const appendMessage = useCallback((nextMessage: ConsultationMessageDTO) => {
        setMessages((prev) => {
            if (prev.some((item) => item.messageId === nextMessage.messageId)) {
                return prev;
            }
            return [...prev, nextMessage].sort(messageCompare);
        });
    }, []);

    const loadSessions = useCallback(async () => {
        if (!username || !canUseConsultation) {
            setSessions([]);
            return;
        }
        try {
            const result = await consultationController.listMine(null);
            if (result.status === ReturnObject.Status.SUCCESS) {
                setSessions((result.data ?? []) as ConsultationSessionDTO[]);
                return;
            }
            setErrorMessage(result.message ?? "会话列表加载失败");
        } catch (error) {
            setErrorMessage("会话列表加载失败");
        }
    }, [consultationController, username, canUseConsultation]);

    const loadEligibleAppointments = useCallback(async () => {
        if (!username || !canUseConsultation) {
            setAppointments([]);
            return;
        }
        const request: FindAppointmentRequest = {
            by: isTeacher ? "teacherUsername" : "studentUsername",
            username
        };
        try {
            const result = await appointmentController.findById(request);
            if (result.status !== ReturnObject.Status.SUCCESS) {
                setErrorMessage(result.message ?? "预约数据加载失败");
                return;
            }
            const list = (result.data ?? []) as AppointmentDTO[];
            const filtered = list.filter((item) => {
                const appointmentType = item.appointmentType;
                const status = item.status;
                return appointmentType === AppointmentType.ONLINE
                    && (status === AppointmentStatus.ACCEPTED || status === AppointmentStatus.IN_PROGRESS)
                    && isNowWithinRange(item.startTime, item.endTime);
            });
            filtered.sort((left, right) => {
                const leftTime = new Date(left.startTime).getTime();
                const rightTime = new Date(right.startTime).getTime();
                return rightTime - leftTime;
            });
            setAppointments(filtered);
        } catch (error) {
            setErrorMessage("预约数据加载失败");
        }
    }, [appointmentController, username, canUseConsultation, isTeacher]);

    const loadMessages = useCallback(async (sessionId: number) => {
        if (!sessionId || !username) {
            setMessages([]);
            return;
        }
        try {
            const result = await consultationController.listMessages({sessionId});
            if (result.status !== ReturnObject.Status.SUCCESS) {
                setErrorMessage(result.message ?? "消息加载失败");
                setMessages([]);
                return;
            }
            const list = ((result.data ?? []) as ConsultationMessageDTO[]).sort(messageCompare);
            setMessages(list);
            await consultationController.markRead({sessionId});
            await loadSessions();
        } catch (error) {
            setErrorMessage("消息加载失败");
            setMessages([]);
        }
    }, [consultationController, loadSessions, username]);

    const openSessionByAppointment = useCallback(async (appointmentId: number) => {
        if (!appointmentId) {
            return;
        }
        try {
            const result = await consultationController.openSession({appointmentId});
            if (result.status !== ReturnObject.Status.SUCCESS || !result.data) {
                setErrorMessage(result.message ?? "创建会话失败");
                return;
            }
            const openedSession = result.data as ConsultationSessionDTO;
            setActiveSessionId(openedSession.sessionId);
            await loadSessions();
            await loadMessages(openedSession.sessionId);
        } catch (error) {
            setErrorMessage("创建会话失败");
        }
    }, [consultationController, loadMessages, loadSessions]);

    useEffect(() => {
        if (!canUseConsultation || !username) {
            return;
        }
        setLoading(true);
        setErrorMessage("");
        Promise.all([loadEligibleAppointments(), loadSessions()])
            .finally(() => setLoading(false));
    }, [canUseConsultation, username, loadEligibleAppointments, loadSessions]);

    useEffect(() => {
        if (!sessions.length) {
            setActiveSessionId((prev) => (prev === AI_ASSISTANT_SESSION_ID ? prev : null));
            setMessages([]);
            return;
        }
        setActiveSessionId((prev) => {
            if (prev === AI_ASSISTANT_SESSION_ID) {
                return prev;
            }
            if (prev && sessions.some((session) => session.sessionId === prev)) {
                return prev;
            }
            return sessions[0].sessionId;
        });
    }, [sessions]);

    useEffect(() => {
        if (!activeSessionId) {
            setMessages([]);
            return;
        }
        if (activeSessionId === AI_ASSISTANT_SESSION_ID) {
            return;
        }
        loadMessages(activeSessionId);
    }, [activeSessionId, loadMessages]);

    useEffect(() => {
        return () => {
            if (aiAbortControllerRef.current) {
                aiAbortControllerRef.current.abort();
            }
        };
    }, []);

    useEffect(() => {
        if (activeSessionId !== AI_ASSISTANT_SESSION_ID && aiAbortControllerRef.current) {
            aiAbortControllerRef.current.abort();
        }
    }, [activeSessionId]);

    useEffect(() => {
        const appointmentIdRaw = Number(searchParams.get("appointmentId"));
        const appointmentId = Number.isNaN(appointmentIdRaw) ? 0 : appointmentIdRaw;
        if (autoOpenDoneRef.current || appointmentId <= 0 || appointments.length === 0) {
            return;
        }
        const matched = appointments.find((item) => item.appointmentId === appointmentId);
        if (!matched) {
            autoOpenDoneRef.current = true;
            return;
        }
        autoOpenDoneRef.current = true;
        openSessionByAppointment(appointmentId);
    }, [appointments, openSessionByAppointment, searchParams]);

    useEffect(() => {
        const sessionIdRaw = Number(searchParams.get("sessionId"));
        const sessionId = Number.isNaN(sessionIdRaw) ? 0 : sessionIdRaw;
        if (autoSelectSessionDoneRef.current || sessionId <= 0 || sessions.length === 0) {
            return;
        }
        const matched = sessions.find((item) => item.sessionId === sessionId);
        autoSelectSessionDoneRef.current = true;
        if (!matched) {
            return;
        }
        setActiveSessionId(sessionId);
    }, [sessions, searchParams]);

    useEffect(() => {
        if (!username || !canUseConsultation) {
            return;
        }
        const wsUrl = buildConsultationWsUrl();
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        const heartbeat = window.setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send("ping");
            }
        }, 25000);

        socket.onmessage = (event) => {
            if (!event.data) {
                return;
            }
            try {
                const payload = JSON.parse(event.data);
                if (payload?.event !== "consultation_message" || !payload?.message) {
                    return;
                }
                const incoming = payload.message as ConsultationMessageDTO;
                if (!incoming?.sessionId) {
                    return;
                }
                if (incoming.sessionId === activeSessionIdRef.current) {
                    appendMessage(incoming);
                    if (incoming.receiverUsername === username) {
                        consultationController.markRead({sessionId: incoming.sessionId})
                            .then(() => loadSessions())
                            .catch(() => undefined);
                    } else {
                        loadSessions().catch(() => undefined);
                    }
                } else if (incoming.receiverUsername === username) {
                    loadSessions().catch(() => undefined);
                }
            } catch (error) {
                console.warn("consultation ws parse failed", error);
            }
        };

        socket.onerror = () => {
            setErrorMessage("实时连接异常，已自动降级为手动刷新");
        };

        return () => {
            window.clearInterval(heartbeat);
            if (wsRef.current === socket) {
                wsRef.current = null;
            }
            socket.close();
        };
    }, [appendMessage, canUseConsultation, consultationController, loadSessions, username]);

    const sessionByAppointmentId = useMemo(() => {
        const map = new Map<number, ConsultationSessionDTO>();
        sessions.forEach((session) => {
            if (session.appointmentId) {
                map.set(session.appointmentId, session);
            }
        });
        return map;
    }, [sessions]);

    const activeSession = useMemo(
        () => sessions.find((session) => session.sessionId === activeSessionId) ?? null,
        [sessions, activeSessionId]
    );
    const isAiAssistantActive = activeSessionId === AI_ASSISTANT_SESSION_ID;
    const isActiveSessionClosed = (activeSession?.status ?? "").toUpperCase() === "CLOSED";

    const handleSendMessage = async () => {
        if (!activeSessionId || activeSessionId <= 0 || sending || isActiveSessionClosed) {
            return;
        }
        const content = inputValue.trim();
        if (!content) {
            return;
        }
        setSending(true);
        try {
            const result = await consultationController.sendMessage({sessionId: activeSessionId, content});
            if (result.status !== ReturnObject.Status.SUCCESS || !result.data) {
                setErrorMessage(result.message ?? "消息发送失败");
                return;
            }
            const sent = result.data as ConsultationMessageDTO;
            appendMessage(sent);
            setInputValue("");
            await loadSessions();
        } catch (error) {
            setErrorMessage("消息发送失败");
        } finally {
            setSending(false);
        }
    };

    const handleSendAiMessage = async () => {
        if (!isAiAssistantActive || aiStreaming) {
            return;
        }
        const content = inputValue.trim();
        if (!content) {
            return;
        }

        setErrorMessage("");
        setAiCrisisNotice("");
        setAiCrisisHotlines([]);
        setAiRagSources([]);
        setAiProviderUsed(null);

        const userMessageId = createAssistantMessageId();
        const assistantMessageId = createAssistantMessageId();
        const now = new Date().toISOString();
        setAiMessages((prev) => [
            ...prev,
            {id: userMessageId, role: "user", content, sentTime: now},
            {id: assistantMessageId, role: "assistant", content: "", sentTime: now}
        ]);
        setInputValue("");

        const abortController = new AbortController();
        aiAbortControllerRef.current = abortController;
        setAiStreaming(true);

        try {
            await aiAssistantController.streamChat(
                {
                    message: content,
                    conversationId: aiConversationIdRef.current
                },
                {
                    signal: abortController.signal,
                    onEvent: (event, data) => {
                        if (event === "meta") {
                            const conversationId = typeof data?.conversationId === "string" ? data.conversationId.trim() : "";
                            if (conversationId) {
                                aiConversationIdRef.current = conversationId;
                            }
                            const sources = Array.isArray(data?.ragSources) ? data.ragSources : [];
                            setAiRagSources(sources);
                            if (typeof data?.providerUsed === "boolean") {
                                setAiProviderUsed(data.providerUsed);
                            }
                            return;
                        }
                        if (event === "delta") {
                            const chunk = typeof data?.content === "string" ? data.content : "";
                            if (!chunk) {
                                return;
                            }
                            setAiMessages((prev) =>
                                prev.map((item) =>
                                    item.id === assistantMessageId
                                        ? {...item, content: item.content + chunk}
                                        : item
                                )
                            );
                            return;
                        }
                        if (event === "crisis") {
                            const notice = typeof data?.message === "string"
                                ? data.message
                                : "检测到高风险情绪，请优先联系线下帮助。";
                            setAiCrisisNotice(notice);
                            setAiCrisisHotlines(Array.isArray(data?.hotlines) ? data.hotlines : []);
                            return;
                        }
                        if (event === "error") {
                            const message = typeof data?.message === "string" ? data.message : "AI消息发送失败";
                            setErrorMessage(message);
                            return;
                        }
                        if (event === "done") {
                            const finalContent = typeof data?.content === "string" ? data.content : "";
                            if (typeof data?.providerUsed === "boolean") {
                                setAiProviderUsed(data.providerUsed);
                            }
                            if (!finalContent) {
                                return;
                            }
                            setAiMessages((prev) =>
                                prev.map((item) =>
                                    item.id === assistantMessageId
                                        ? {...item, content: finalContent}
                                        : item
                                )
                            );
                        }
                    }
                }
            );
        } catch (error) {
            if ((error as Error)?.name !== "AbortError") {
                setErrorMessage((error as Error)?.message ?? "AI消息发送失败");
            }
        } finally {
            aiAbortControllerRef.current = null;
            setAiStreaming(false);
        }
    };

    const stopAiStreaming = () => {
        if (aiAbortControllerRef.current) {
            aiAbortControllerRef.current.abort();
        }
    };

    const clearAiConversation = async () => {
        if (aiStreaming) {
            return;
        }
        try {
            await aiAssistantController.clearMemory({conversationId: aiConversationIdRef.current});
        } catch (_error) {
            // keep local reset even when request fails
        }
        aiConversationIdRef.current = createAssistantConversationId();
        setAiMessages([
            {
                id: createAssistantMessageId(),
                role: "assistant",
                content: "对话记忆已清空。我们可以从你当前最困扰的问题继续聊。",
                sentTime: new Date().toISOString()
            }
        ]);
        setAiRagSources([]);
        setAiCrisisNotice("");
        setAiCrisisHotlines([]);
        setAiProviderUsed(null);
        setInputValue("");
    };

    const handleSendCurrentMessage = () => {
        if (isAiAssistantActive) {
            void handleSendAiMessage();
            return;
        }
        void handleSendMessage();
    };

    const handleCloseSession = async () => {
        if (!activeSession || closingSession) {
            return;
        }
        const confirmed = window.confirm("确认结束本次咨询？结束后双方将无法继续发送消息。");
        if (!confirmed) {
            return;
        }
        setClosingSession(true);
        try {
            const result = await consultationController.closeSession({sessionId: activeSession.sessionId});
            if (result.status !== ReturnObject.Status.SUCCESS) {
                setErrorMessage(result.message ?? "结束咨询失败");
                return;
            }
            setInputValue("");
            await loadSessions();
            await loadMessages(activeSession.sessionId);
        } catch (error) {
            setErrorMessage("结束咨询失败");
        } finally {
            setClosingSession(false);
        }
    };

    if (!canUseConsultation) {
        return (
            <div className="consultation-page consultation-page--empty">
                <h2>在线咨询（文字）</h2>
                <p>当前角色暂不支持使用在线咨询模块。</p>
            </div>
        );
    }

    return (
        <div className="consultation-page">
            <section className="consultation-header">
                <div>
                    <h1>在线心理咨询</h1>
                    <p>当前仅支持文字实时聊天。请选择已通过且到达时间的线上预约进入会话。</p>
                </div>
                <button
                    type="button"
                    className="consultation-refresh-btn"
                    onClick={() => {
                        setLoading(true);
                        Promise.all([loadEligibleAppointments(), loadSessions()]).finally(() => setLoading(false));
                    }}
                    disabled={loading}
                >
                    <i className="fa-solid fa-rotate-right"/>
                    {loading ? "刷新中..." : "刷新"}
                </button>
            </section>

            {errorMessage ? <div className="consultation-error">{errorMessage}</div> : null}

            <section className="consultation-layout">
                <aside className="consultation-sidebar">
                    <div className="consultation-card">
                        <h3>可进入咨询的预约（当前时段）</h3>
                        <div className="consultation-appointment-list">
                            {appointments.length === 0 ? (
                                <div className="consultation-empty">暂无可用的线上预约</div>
                            ) : appointments.map((item) => {
                                const existingSession = sessionByAppointmentId.get(item.appointmentId);
                                const counterpart = isTeacher
                                    ? (item.studentName || item.studentUsername)
                                    : (item.teacherName || item.teacherUsername);
                                return (
                                    <button
                                        key={item.appointmentId}
                                        type="button"
                                        className={`consultation-appointment-item${existingSession?.sessionId === activeSessionId ? " is-active" : ""}`}
                                        onClick={() => openSessionByAppointment(item.appointmentId)}
                                    >
                                        <div className="head">
                                            <span>预约 #{item.appointmentId}</span>
                                            <span className="status">{AppointmentStatus.ChineseName.get(item.status) ?? item.status}</span>
                                        </div>
                                        <div className="body">
                                            <div>{isTeacher ? "学生" : "咨询师"}：{counterpart}</div>
                                            <div>{formatDateTime(item.startTime)}</div>
                                        </div>
                                        <div className="foot">
                                            {existingSession ? "继续聊天" : "创建会话"}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="consultation-card">
                        <h3>我的会话</h3>
                        <div className="consultation-session-list">
                            <button
                                type="button"
                                className={`consultation-session-item consultation-session-item--assistant${isAiAssistantActive ? " is-active" : ""}`}
                                onClick={() => setActiveSessionId(AI_ASSISTANT_SESSION_ID)}
                            >
                                <div className="head">
                                    <span><i className="fa-solid fa-robot"/> AI心理助手</span>
                                    <span>{aiStreaming ? "回复中..." : "24小时陪伴"}</span>
                                </div>
                                <div className="body">
                                    {aiMessages.length > 0
                                        ? (aiMessages[aiMessages.length - 1].content || "开始和 AI 心理助手对话").slice(0, 42)
                                        : "智能陪伴对话 · 危机干预提示 · 校园心理知识库增强"}
                                </div>
                            </button>
                            {sessions.length === 0 ? (
                                <div className="consultation-empty">暂无会话</div>
                            ) : sessions.map((session) => (
                                <button
                                    key={session.sessionId}
                                    type="button"
                                    className={`consultation-session-item${activeSessionId === session.sessionId ? " is-active" : ""}`}
                                    onClick={() => setActiveSessionId(session.sessionId)}
                                >
                                    <div className="head">
                                        <span>{session.otherDisplayName || session.otherUsername}</span>
                                        <span>{formatDateTime(session.lastMessageTime)}</span>
                                    </div>
                                    <div className="body">
                                        {session.lastMessage?.trim() ? session.lastMessage : "暂无消息"}
                                    </div>
                                    {session.unreadCount > 0 ? (
                                        <span className="unread">{session.unreadCount > 99 ? "99+" : session.unreadCount}</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                <div className="consultation-chat">
                    {isAiAssistantActive ? (
                        <>
                            <div className="consultation-chat-header consultation-chat-header--assistant">
                                <div className="title">
                                    <div className="consultation-ai-avatar">
                                        <i className="fa-solid fa-robot"/>
                                    </div>
                                    <div>
                                        <h3>AI心理助手</h3>
                                        <p>24小时智能陪伴 · 支持连续多轮对话 · 可结合心理知识库</p>
                                    </div>
                                </div>
                                <div className="consultation-chat-header-actions">
                                    <span className="session-status is-open">{aiStreaming ? "回复中" : "在线"}</span>
                                    <span
                                        className={`session-status ${
                                            aiProviderUsed === true
                                                ? "is-open"
                                                : aiProviderUsed === false
                                                    ? "is-fallback"
                                                    : "is-pending"
                                        }`}
                                    >
                                        {aiProviderUsed === true
                                            ? "大模型"
                                            : aiProviderUsed === false
                                                ? "兜底模式"
                                                : "待响应"}
                                    </span>
                                    {aiStreaming ? (
                                        <button
                                            type="button"
                                            className="consultation-end-btn"
                                            onClick={stopAiStreaming}
                                        >
                                            <i className="fa-solid fa-hand"/>
                                            停止生成
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="consultation-end-btn consultation-end-btn--ghost"
                                            onClick={clearAiConversation}
                                        >
                                            <i className="fa-solid fa-trash-can"/>
                                            清空记忆
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="consultation-message-list">
                                {aiMessages.length === 0 ? (
                                    <div className="consultation-empty">暂无消息，发送第一条消息开始对话。</div>
                                ) : aiMessages.map((message) => {
                                    const mine = message.role === "user";
                                    return (
                                        <div key={message.id} className={`consultation-message-item${mine ? " is-mine" : ""}`}>
                                            <div className="bubble">{message.content || (aiStreaming ? "..." : "")}</div>
                                            <div className="meta">
                                                <span>{mine ? "我" : "AI心理助手"}</span>
                                                <span>{formatDateTime(message.sentTime)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {aiCrisisNotice ? (
                                <div className="consultation-crisis-tip">
                                    <strong>危机干预提示：</strong>{aiCrisisNotice}
                                    {aiCrisisHotlines.length > 0 ? (
                                        <ul>
                                            {aiCrisisHotlines.map((hotline) => (
                                                <li key={hotline}>{hotline}</li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            ) : null}

                            {aiRagSources.length > 0 ? (
                                <div className="consultation-rag-source">
                                    <span>知识库参考：</span>
                                    {aiRagSources.map((item) => (
                                        <span key={item} className="consultation-rag-chip">{item}</span>
                                    ))}
                                </div>
                            ) : null}

                            <div className="consultation-input-box">
                                <textarea
                                    value={inputValue}
                                    onChange={(event) => setInputValue(event.target.value)}
                                    placeholder="输入你现在想聊的内容，按 Enter 发送，Shift+Enter 换行"
                                    maxLength={2000}
                                    disabled={aiStreaming}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault();
                                            handleSendCurrentMessage();
                                        }
                                    }}
                                />
                                <div className="actions">
                                    <span>{inputValue.length}/2000</span>
                                    <button
                                        type="button"
                                        onClick={handleSendCurrentMessage}
                                        disabled={aiStreaming}
                                    >
                                        <i className="fa-solid fa-paper-plane"/>
                                        {aiStreaming ? "生成中..." : "发送"}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : activeSession ? (
                        <>
                            <div className="consultation-chat-header">
                                <div className="title">
                                    <img
                                        src={activeSession.otherAvatar?.trim()
                                            ? activeSession.otherAvatar
                                            : getUserAvatar(activeSession.otherUsername, defaultAvatar)}
                                        alt={activeSession.otherDisplayName || activeSession.otherUsername}
                                    />
                                    <div>
                                        <h3>{activeSession.otherDisplayName || activeSession.otherUsername}</h3>
                                        <p>会话 #{activeSession.sessionId} · 预约 #{activeSession.appointmentId}</p>
                                    </div>
                                </div>
                                <div className="consultation-chat-header-actions">
                                    <span className={`session-status ${isActiveSessionClosed ? "is-closed" : "is-open"}`}>
                                        {isActiveSessionClosed ? "已结束" : "进行中"}
                                    </span>
                                    {!isActiveSessionClosed ? (
                                        <button
                                            type="button"
                                            className="consultation-end-btn"
                                            onClick={handleCloseSession}
                                            disabled={closingSession}
                                        >
                                            <i className="fa-solid fa-circle-stop"/>
                                            {closingSession ? "结束中..." : "结束咨询"}
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <div className="consultation-message-list">
                                {messages.length === 0 ? (
                                    <div className="consultation-empty">暂无消息，发送第一条消息开始咨询。</div>
                                ) : messages.map((message) => {
                                    const mine = message.senderUsername === username;
                                    return (
                                        <div key={message.messageId} className={`consultation-message-item${mine ? " is-mine" : ""}`}>
                                            <div className="bubble">{message.content}</div>
                                            <div className="meta">
                                                <span>{mine ? "我" : (message.senderDisplayName || message.senderUsername)}</span>
                                                <span>{formatDateTime(message.sentTime)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {isActiveSessionClosed ? (
                                <div className="consultation-closed-tip">
                                    当前会话已结束，聊天记录已保存。如需继续咨询，请重新发起并通过线上预约。
                                </div>
                            ) : null}

                            <div className="consultation-input-box">
                                <textarea
                                    value={inputValue}
                                    onChange={(event) => setInputValue(event.target.value)}
                                    placeholder={isActiveSessionClosed
                                        ? "会话已结束，不能继续发送消息"
                                        : "输入咨询内容，按 Enter 发送，Shift+Enter 换行"}
                                    maxLength={2000}
                                    disabled={isActiveSessionClosed}
                                    onKeyDown={(event) => {
                                        if (isActiveSessionClosed) {
                                            return;
                                        }
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault();
                                            handleSendCurrentMessage();
                                        }
                                    }}
                                />
                                <div className="actions">
                                    <span>{inputValue.length}/2000</span>
                                    <button
                                        type="button"
                                        onClick={handleSendCurrentMessage}
                                        disabled={sending || isActiveSessionClosed}
                                    >
                                        <i className="fa-solid fa-paper-plane"/>
                                        {sending ? "发送中..." : "发送"}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="consultation-empty consultation-empty--chat">
                            请选择左侧预约创建会话，或选择已有会话开始咨询聊天。
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
