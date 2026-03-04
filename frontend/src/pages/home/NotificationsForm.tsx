import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useOutletContext} from "react-router";
import {useNavigate} from "react-router-dom";
import {Homepage} from "./HomepageForm";
import {
    NotificationAdminAnnounceRequest,
    NotificationController
} from "../../controller/NotificationController";
import {SystemNotification} from "../../entity/SystemNotification";
import {ReturnObject} from "../../common/response/ReturnObject";
import {UserRole} from "../../entity/enums/UserRole";
import {useNotificationCenter} from "../../context/NotificationCenterContext";
import "./NotificationsForm.css";

const TYPE_META: Record<string, {label: string; icon: string; className: string}> = {
    APPOINTMENT_NEW: {label: "预约提醒", icon: "fa-solid fa-calendar-plus", className: "is-appointment"},
    APPOINTMENT_RESULT: {label: "预约结果", icon: "fa-solid fa-calendar-check", className: "is-appointment"},
    CONSULTATION: {label: "咨询消息", icon: "fa-solid fa-comments", className: "is-consultation"},
    REPORT_RESULT: {label: "举报结果", icon: "fa-solid fa-flag-checkered", className: "is-report"},
    REPLY: {label: "回复提醒", icon: "fa-solid fa-reply", className: "is-reply"},
    LIKE: {label: "点赞提醒", icon: "fa-solid fa-heart", className: "is-like"},
    ANNOUNCEMENT: {label: "系统公告", icon: "fa-solid fa-bullhorn", className: "is-announcement"},
    REVIEW_RESULT: {label: "审核结果", icon: "fa-solid fa-list-check", className: "is-review"},
    SYSTEM: {label: "系统通知", icon: "fa-solid fa-bell", className: "is-system"}
};

const toDate = (value: unknown): Date | null => {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (Array.isArray(value)) {
        const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value as number[];
        if (!year || !month || !day) {
            return null;
        }
        const milli = Math.floor((Number(nano) || 0) / 1_000_000);
        const resolved = new Date(year, month - 1, day, hour, minute, second, milli);
        return Number.isNaN(resolved.getTime()) ? null : resolved;
    }
    const resolved = new Date(String(value));
    return Number.isNaN(resolved.getTime()) ? null : resolved;
};

const formatDateTime = (value: unknown): string => {
    const date = toDate(value);
    if (!date) {
        return "--";
    }
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, "0");
    const d = `${date.getDate()}`.padStart(2, "0");
    const h = `${date.getHours()}`.padStart(2, "0");
    const mm = `${date.getMinutes()}`.padStart(2, "0");
    const s = `${date.getSeconds()}`.padStart(2, "0");
    return `${y}-${m}-${d} ${h}:${mm}:${s}`;
};

const getTypeMeta = (type: string | undefined) => {
    if (!type) {
        return TYPE_META.SYSTEM;
    }
    return TYPE_META[type] ?? TYPE_META.SYSTEM;
};

const TARGET_OPTIONS: Array<{value: NotificationAdminAnnounceRequest["targetRole"]; label: string}> = [
    {value: "ALL", label: "全体用户"},
    {value: "STUDENT", label: "学生"},
    {value: "COUNSELOR", label: "咨询师"},
    {value: "SCHOOL_ADMIN", label: "学校管理员"},
    {value: "PLATFORM_ADMIN", label: "平台管理员"}
];

export const NotificationsForm: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const navigate = useNavigate();
    const notificationController = useMemo(() => new NotificationController(), []);
    const {unreadCount, refreshUnread, lastMessageAt} = useNotificationCenter();
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [markingId, setMarkingId] = useState<number | null>(null);
    const [markAllLoading, setMarkAllLoading] = useState(false);
    const [announceLoading, setAnnounceLoading] = useState(false);
    const [announceResult, setAnnounceResult] = useState<string | null>(null);
    const [announceForm, setAnnounceForm] = useState<NotificationAdminAnnounceRequest>({
        title: "",
        content: "",
        targetRole: "ALL"
    });
    const [reloadTick, setReloadTick] = useState(0);

    const currentRole = UserRole.normalize(context.user?.role) ?? UserRole.UNKNOWN;
    const canAnnounce = UserRole.isAdminRole(currentRole);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const listRes = await notificationController.listMine({unreadOnly});

            if (listRes.status === ReturnObject.Status.SUCCESS) {
                setNotifications((listRes.data ?? []) as SystemNotification[]);
            } else {
                setNotifications([]);
                setError(listRes.message || "获取通知列表失败");
            }
            void refreshUnread();
        } catch (e) {
            setNotifications([]);
            setError(e instanceof Error ? e.message : "加载通知失败");
        } finally {
            setLoading(false);
        }
    }, [notificationController, unreadOnly, refreshUnread]);

    useEffect(() => {
        void load();
    }, [load, reloadTick, lastMessageAt]);

    const resolveDetailPath = (item: SystemNotification): string => {
        const relatedType = (item.relatedType ?? "").toUpperCase();
        const relatedId = item.relatedId ?? null;

        if (relatedType === "POST" || relatedType === "POST_REPORT") {
            if (UserRole.isAdminRole(currentRole) && relatedType === "POST_REPORT") {
                return relatedId ? `/home/admin/reports?focusPostId=${relatedId}` : "/home/admin/reports";
            }
            return relatedId ? `/home/community/browse?focusPostId=${relatedId}` : "/home/community/browse";
        }

        if (relatedType === "APPOINTMENT") {
            return relatedId ? `/home/appointment?focusAppointmentId=${relatedId}` : "/home/appointment";
        }

        if (relatedType === "CONSULTATION") {
            return relatedId ? `/home/consultation?sessionId=${relatedId}` : "/home/consultation";
        }

        if (relatedType === "KNOWLEDGE_REPORT") {
            if (UserRole.isAdminRole(currentRole)) {
                return relatedId ? `/home/admin/reports?focusKnowledgeId=${relatedId}` : "/home/admin/reports";
            }
            return relatedId ? `/psych_knowledge/browse?focusKnowledgeId=${relatedId}` : "/psych_knowledge/browse";
        }

        if (relatedType === "KNOWLEDGE") {
            if (UserRole.isAdminRole(currentRole)) {
                return relatedId ? `/home/admin/knowledge?focusKnowledgeId=${relatedId}` : "/home/admin/knowledge";
            }
            if (currentRole === UserRole.TEACHER) {
                return relatedId ? `/psych_knowledge/mine/teacher?focusKnowledgeId=${relatedId}` : "/psych_knowledge/mine/teacher";
            }
            return relatedId ? `/psych_knowledge/browse?focusKnowledgeId=${relatedId}` : "/psych_knowledge/browse";
        }

        if (item.notificationType === "REVIEW_RESULT") {
            if (currentRole === UserRole.TEACHER) {
                return "/psych_knowledge/mine/teacher";
            }
            if (UserRole.isAdminRole(currentRole)) {
                return "/home/admin/knowledge";
            }
            return "/psych_knowledge/browse";
        }

        return "/home/main";
    };

    const openDetail = async (item: SystemNotification) => {
        if (!item.isRead) {
            await markRead(item.notificationId);
        }
        navigate(resolveDetailPath(item));
    };

    const markRead = async (notificationId: number) => {
        const target = notifications.find((item) => item.notificationId === notificationId);
        if (!target || target.isRead) {
            return;
        }
        setMarkingId(notificationId);
        try {
            const res = await notificationController.markRead({notificationId});
            if (res.status !== ReturnObject.Status.SUCCESS) {
                alert(res.message || "标记已读失败");
                return;
            }
            setNotifications((prev) => {
                if (unreadOnly) {
                    return prev.filter((item) => item.notificationId !== notificationId);
                }
                return prev.map((item) => (
                    item.notificationId === notificationId ? {...item, isRead: true} : item
                ));
            });
            void refreshUnread();
        } catch (e) {
            alert(e instanceof Error ? e.message : "标记已读失败");
        } finally {
            setMarkingId(null);
        }
    };

    const markAllRead = async () => {
        if (unreadCount <= 0 || markAllLoading) {
            return;
        }
        setMarkAllLoading(true);
        try {
            const res = await notificationController.markAllRead(null);
            if (res.status !== ReturnObject.Status.SUCCESS) {
                alert(res.message || "全部已读失败");
                return;
            }
            setNotifications((prev) => (
                unreadOnly ? [] : prev.map((item) => ({...item, isRead: true}))
            ));
            void refreshUnread();
        } catch (e) {
            alert(e instanceof Error ? e.message : "全部已读失败");
        } finally {
            setMarkAllLoading(false);
        }
    };

    const handleAnnounceSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canAnnounce) {
            return;
        }
        const title = announceForm.title.trim();
        const content = announceForm.content.trim();
        if (!title) {
            alert("公告标题不能为空");
            return;
        }
        if (!content) {
            alert("公告内容不能为空");
            return;
        }
        setAnnounceLoading(true);
        setAnnounceResult(null);
        try {
            const res = await notificationController.adminAnnounce({
                ...announceForm,
                title,
                content
            });
            if (res.status !== ReturnObject.Status.SUCCESS) {
                setAnnounceResult(res.message || "公告发送失败");
                return;
            }
            const sentCount = Number(res.data?.sentCount ?? 0);
            setAnnounceResult(`公告发送成功，共发送 ${sentCount} 条通知`);
            setAnnounceForm({title: "", content: "", targetRole: "ALL"});
            setReloadTick((prev) => prev + 1);
            void refreshUnread();
        } catch (e) {
            setAnnounceResult(e instanceof Error ? e.message : "公告发送失败");
        } finally {
            setAnnounceLoading(false);
        }
    };

    return (
        <div className="notifications-page">
            <section className="notifications-card">
                <div className="notifications-card__header">
                    <div>
                        <h2>通知中心</h2>
                        <p>查看预约、举报、回复、审核与系统公告提醒</p>
                    </div>
                    <div className="notifications-card__header-actions">
                        <span className="notifications-unread">
                            未读 {unreadCount}
                        </span>
                        <button
                            type="button"
                            className="notifications-btn notifications-btn--outline"
                            onClick={() => setReloadTick((prev) => prev + 1)}
                        >
                            <i className="fa-solid fa-rotate-right"/> 刷新
                        </button>
                        <button
                            type="button"
                            className="notifications-btn notifications-btn--primary"
                            disabled={markAllLoading || unreadCount <= 0}
                            onClick={markAllRead}
                        >
                            <i className="fa-solid fa-envelope-open"/> {markAllLoading ? "处理中..." : "全部标为已读"}
                        </button>
                    </div>
                </div>

                <div className="notifications-tabs">
                    <button
                        type="button"
                        className={`notifications-tab ${!unreadOnly ? "is-active" : ""}`}
                        onClick={() => setUnreadOnly(false)}
                    >
                        全部通知
                    </button>
                    <button
                        type="button"
                        className={`notifications-tab ${unreadOnly ? "is-active" : ""}`}
                        onClick={() => setUnreadOnly(true)}
                    >
                        仅看未读
                    </button>
                </div>

                {loading ? (
                    <div className="notifications-empty">加载通知中...</div>
                ) : error ? (
                    <div className="notifications-error">加载失败：{error}</div>
                ) : notifications.length === 0 ? (
                    <div className="notifications-empty">当前没有通知</div>
                ) : (
                    <div className="notifications-list">
                        {notifications.map((item) => {
                            const meta = getTypeMeta(item.notificationType);
                            return (
                                <article key={item.notificationId} className={`notification-item ${item.isRead ? "is-read" : "is-unread"}`}>
                                    <div className={`notification-item__type ${meta.className}`}>
                                        <i className={meta.icon}/>
                                    </div>
                                    <div className="notification-item__body">
                                        <div className="notification-item__head">
                                            <span className={`notification-item__tag ${meta.className}`}>{meta.label}</span>
                                            <span className="notification-item__time">{formatDateTime(item.createdTime)}</span>
                                        </div>
                                        <h3>{item.title || "系统通知"}</h3>
                                        <p>{item.content || "你有一条新的通知"}</p>
                                        <div className="notification-item__meta">
                                            {(item.senderDisplayName || item.senderUsername)
                                                ? <span>发送者：{item.senderDisplayName || item.senderUsername}</span>
                                                : <span>发送者：系统</span>}
                                            {item.relatedType ? <span>业务：{item.relatedType}</span> : null}
                                            {item.relatedId ? <span>ID：{item.relatedId}</span> : null}
                                        </div>
                                    </div>
                                    <div className="notification-item__action">
                                        <button
                                            type="button"
                                            className="notifications-btn notifications-btn--outline notifications-btn--small"
                                            onClick={() => openDetail(item)}
                                        >
                                            查看详情
                                        </button>
                                        {item.isRead ? (
                                            <span className="notification-item__read-text">已读</span>
                                        ) : (
                                            <button
                                                type="button"
                                                className="notifications-btn notifications-btn--tiny notifications-btn--small"
                                                onClick={() => markRead(item.notificationId)}
                                                disabled={markingId === item.notificationId}
                                            >
                                                {markingId === item.notificationId ? "处理中..." : "标为已读"}
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

                {canAnnounce && (
                <section className="notifications-card">
                    <div className="notifications-card__header">
                        <div>
                            <h2>发布系统公告</h2>
                            <p>管理员可向全体或指定角色发送公告通知</p>
                        </div>
                    </div>
                    <form className="announce-form" onSubmit={handleAnnounceSubmit}>
                        <div className="announce-form__row">
                            <label htmlFor="notice-target">通知对象</label>
                            <select
                                id="notice-target"
                                value={announceForm.targetRole}
                                onChange={(event) => setAnnounceForm((prev) => ({
                                    ...prev,
                                    targetRole: event.target.value as NotificationAdminAnnounceRequest["targetRole"]
                                }))}
                            >
                                {TARGET_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="announce-form__row">
                            <label htmlFor="notice-title">公告标题</label>
                            <input
                                id="notice-title"
                                value={announceForm.title}
                                maxLength={120}
                                onChange={(event) => setAnnounceForm((prev) => ({...prev, title: event.target.value}))}
                                placeholder="请输入公告标题"
                            />
                        </div>
                        <div className="announce-form__row">
                            <label htmlFor="notice-content">公告内容</label>
                            <textarea
                                id="notice-content"
                                value={announceForm.content}
                                rows={5}
                                onChange={(event) => setAnnounceForm((prev) => ({...prev, content: event.target.value}))}
                                placeholder="请输入公告内容"
                            />
                        </div>
                        <div className="announce-form__actions">
                            <button
                                type="button"
                                className="notifications-btn notifications-btn--outline"
                                onClick={() => setAnnounceForm({title: "", content: "", targetRole: "ALL"})}
                                disabled={announceLoading}
                            >
                                重置
                            </button>
                            <button
                                type="submit"
                                className="notifications-btn notifications-btn--primary"
                                disabled={announceLoading}
                            >
                                <i className="fa-solid fa-paper-plane"/> {announceLoading ? "发送中..." : "发布公告"}
                            </button>
                        </div>
                        {announceResult && (
                            <div className="announce-form__result">{announceResult}</div>
                        )}
                    </form>
                </section>
            )}
        </div>
    );
};
