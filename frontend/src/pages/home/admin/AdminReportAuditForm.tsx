import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useOutletContext} from "react-router";
import {useNavigate, useSearchParams} from "react-router-dom";
import {Homepage} from "../HomepageForm";
import {PostController} from "../../../controller/PostController";
import {PsychKnowledgeController} from "../../../controller/PsychKnowledgeController";
import {PostDTO} from "../../../entity/PostDTO";
import {PsychKnowledgeDTO} from "../../../entity/DTO/PsychKnowledgeDTO";
import {PostReport} from "../../../entity/PostReport";
import {PsychKnowledgeReport} from "../../../entity/PsychKnowledgeReport";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Loading} from "../../../common/view/display/Loading";
import {UserRole} from "../../../entity/enums/UserRole";
import "./AdminReportAuditForm.css";

type ReportKind = "POST" | "KNOWLEDGE";
type AuditStatus = "PENDING" | "PASSED" | "REJECTED";

interface ReportItem {
    key: string;
    reportId: number;
    reportCode: string;
    kind: ReportKind;
    kindLabel: string;
    reasonType: string;
    reason: string;
    reporter: string;
    reportTime: Date | null;
    status: AuditStatus;
    handledAt?: Date;
    contentId: number;
    contentCode: string;
    title: string;
    preview: string;
    author: string;
    authorId: string;
    publishTime: Date | null;
    reportCount: number;
    views?: number;
    likes?: number;
}

const toDate = (value: any): Date | null => {
    if (!value) {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const fmtDate = (date: Date | null) => date ? `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}` : "--";
const fmtTime = (date: Date | null) => date ? `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}:${`${date.getSeconds()}`.padStart(2, "0")}` : "--";
const fmtDateTime = (date: Date | null) => date ? `${fmtDate(date)} ${fmtTime(date)}` : "--";

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const code = (id: number) => `#RP${String(id).padStart(11, "0")}`;

const reasonType = (reportType: string | undefined, reason: string) => {
    const normalizedType = (reportType || "").trim();
    if (["内容违规", "广告推广", "人身攻击", "隐私泄露", "其他"].includes(normalizedType)) {
        return normalizedType;
    }
    const t = (reason || "").toLowerCase();
    if (t.includes("广告") || t.includes("推广") || t.includes("引流")) return "广告推广";
    if (t.includes("攻击") || t.includes("辱骂") || t.includes("人身")) return "人身攻击";
    if (t.includes("隐私") || t.includes("手机号") || t.includes("身份证")) return "隐私泄露";
    if (t.includes("违规") || t.includes("违法") || t.includes("低俗") || t.includes("不良")) return "内容违规";
    return "其他";
};

const reasonClass = (name: string) => {
    if (name === "内容违规") return "is-red";
    if (name === "广告推广") return "is-blue";
    if (name === "人身攻击") return "is-yellow";
    if (name === "隐私泄露") return "is-green";
    return "is-orange";
};

const statusMeta = (status: AuditStatus) => {
    if (status === "PASSED") return {label: "已通过", className: "admin-report__status--passed"};
    if (status === "REJECTED") return {label: "已驳回", className: "admin-report__status--rejected"};
    return {label: "待审核", className: "admin-report__status--pending"};
};

export const AdminReportAuditForm: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const postController = useMemo(() => new PostController(), []);
    const knowledgeController = useMemo(() => new PsychKnowledgeController(), []);
    const adminUsername = context.user?.username ?? "";

    const [pending, setPending] = useState<ReportItem[]>([]);
    const [processed, setProcessed] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [reasonFilter, setReasonFilter] = useState("ALL");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [keywordInput, setKeywordInput] = useState("");
    const [keyword, setKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [active, setActive] = useState<ReportItem | null>(null);
    const [auditNote, setAuditNote] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const pageSize = 10;
    const focusPostIdRaw = Number(searchParams.get("focusPostId"));
    const focusKnowledgeIdRaw = Number(searchParams.get("focusKnowledgeId"));
    const focusPostId = Number.isNaN(focusPostIdRaw) ? 0 : focusPostIdRaw;
    const focusKnowledgeId = Number.isNaN(focusKnowledgeIdRaw) ? 0 : focusKnowledgeIdRaw;
    const isPlatformAdmin = UserRole.isPlatformAdminRole(context.user?.role);

    useEffect(() => {
        if (!isPlatformAdmin) {
            navigate("/home/main", {replace: true});
        }
    }, [isPlatformAdmin, navigate]);

    const load = useCallback(async () => {
        if (!isPlatformAdmin) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const [postRes, knowledgeRes] = await Promise.all([postController.getAllReportedPost(null), knowledgeController.reported(null)]);
            const posts = postRes.status === ReturnObject.Status.SUCCESS ? ((postRes.data ?? []) as PostDTO[]) : [];
            const knowledges = knowledgeRes.status === ReturnObject.Status.SUCCESS ? ((knowledgeRes.data ?? []) as PsychKnowledgeDTO[]) : [];

            const postItems = await Promise.all(posts.map(async (post) => {
                const reports = await postController.getAllReports({postId: post.postId});
                if (reports.status !== ReturnObject.Status.SUCCESS) return [] as ReportItem[];
                const list = (reports.data ?? []) as PostReport[];
                const author = post.isAnonymous ? "匿名用户" : (post.displayName || post.username || "未知用户");
                return list.map((r) => ({
                    key: `POST-${r.reportId}`,
                    reportId: r.reportId,
                    reportCode: code(r.reportId),
                    kind: "POST",
                    kindLabel: "倾诉帖",
                    reasonType: reasonType(r.reportType, r.reportReason || ""),
                    reason: r.reportReason || "未填写举报原因",
                    reporter: r.reporterUsername || "未知用户",
                    reportTime: toDate(r.reportTime),
                    status: "PENDING",
                    contentId: post.postId,
                    contentCode: `POST${String(post.postId).padStart(6, "0")}`,
                    title: post.title || "未命名倾诉帖",
                    preview: post.content || "暂无内容",
                    author,
                    authorId: post.username || "匿名",
                    publishTime: toDate(post.publishTime),
                    reportCount: list.length,
                    likes: post.likeCount || 0
                } as ReportItem));
            }));

            const knowledgeItems = await Promise.all(knowledges.map(async (k) => {
                const reports = await knowledgeController.listReport({knowledgeId: k.knowledgeId});
                if (reports.status !== ReturnObject.Status.SUCCESS) return [] as ReportItem[];
                const list = (reports.data ?? []) as PsychKnowledgeReport[];
                const author = k.teacherPublisherDisplayName || k.teacherPublisherUsername || "未知作者";
                return list.map((r) => ({
                    key: `KNOWLEDGE-${r.reportId}`,
                    reportId: r.reportId,
                    reportCode: code(r.reportId),
                    kind: "KNOWLEDGE",
                    kindLabel: "科普文章",
                    reasonType: reasonType(r.reportType, r.reportReason || ""),
                    reason: r.reportReason || "未填写举报原因",
                    reporter: r.reporterUsername || "未知用户",
                    reportTime: toDate(r.reportTime),
                    status: "PENDING",
                    contentId: k.knowledgeId,
                    contentCode: `CONT${String(k.knowledgeId).padStart(8, "0")}`,
                    title: k.title || "未命名科普文章",
                    preview: (k.summary || k.content || "暂无内容").trim(),
                    author,
                    authorId: k.teacherPublisherUsername || "未知",
                    publishTime: toDate(k.publishTime),
                    reportCount: list.length,
                    views: k.viewCount || 0
                } as ReportItem));
            }));

            const all = [...postItems.flat(), ...knowledgeItems.flat()].sort((a, b) => (b.reportTime?.getTime() ?? 0) - (a.reportTime?.getTime() ?? 0));
            setPending(all);
            if (postRes.status !== ReturnObject.Status.SUCCESS && knowledgeRes.status !== ReturnObject.Status.SUCCESS) {
                setError(postRes.message || knowledgeRes.message || "获取举报数据失败");
            }
        } catch (e) {
            setPending([]);
            setError(e instanceof Error ? e.message : "获取举报数据失败");
        } finally {
            setLoading(false);
        }
    }, [isPlatformAdmin, knowledgeController, postController]);

    useEffect(() => {
        if (!isPlatformAdmin) {
            return;
        }
        load();
    }, [isPlatformAdmin, load]);

    const all = useMemo(() => {
        const map = new Map<string, ReportItem>();
        pending.forEach((item) => map.set(item.key, item));
        processed.forEach((item) => map.set(item.key, item));
        return Array.from(map.values()).sort((a, b) => {
            const at = a.handledAt?.getTime() ?? a.reportTime?.getTime() ?? 0;
            const bt = b.handledAt?.getTime() ?? b.reportTime?.getTime() ?? 0;
            return bt - at;
        });
    }, [pending, processed]);

    const reasonOptions = useMemo(() => {
        const set = new Set<string>(["内容违规", "广告推广", "人身攻击", "隐私泄露", "其他"]);
        all.forEach((item) => set.add(item.reasonType));
        return Array.from(set);
    }, [all]);

    const filtered = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        return all.filter((item) => {
            if (typeFilter !== "ALL" && item.kind !== typeFilter) return false;
            if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
            if (reasonFilter !== "ALL" && item.reasonType !== reasonFilter) return false;
            if (dateFrom && item.reportTime && item.reportTime.getTime() < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
            if (dateTo && item.reportTime && item.reportTime.getTime() > new Date(`${dateTo}T23:59:59`).getTime()) return false;
            if (!q) return true;
            const text = `${item.reportCode} ${item.title} ${item.author} ${item.authorId} ${item.reporter} ${item.contentCode}`.toLowerCase();
            return text.includes(q);
        });
    }, [all, typeFilter, statusFilter, reasonFilter, dateFrom, dateTo, keyword]);

    useEffect(() => {
        setPage(1);
    }, [typeFilter, statusFilter, reasonFilter, dateFrom, dateTo, keyword]);

    useEffect(() => {
        if (focusPostId > 0) {
            setTypeFilter("POST");
            setKeyword(String(focusPostId));
            setStatusFilter("ALL");
            setReasonFilter("ALL");
            setDateFrom("");
            setDateTo("");
        } else if (focusKnowledgeId > 0) {
            setTypeFilter("KNOWLEDGE");
            setKeyword(String(focusKnowledgeId));
            setStatusFilter("ALL");
            setReasonFilter("ALL");
            setDateFrom("");
            setDateTo("");
        }
    }, [focusKnowledgeId, focusPostId]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const from = (safePage - 1) * pageSize;
    const to = from + pageSize;
    const rows = filtered.slice(from, to);
    const pageNumbers = useMemo(() => {
        const left = Math.max(1, safePage - 2);
        const right = Math.min(totalPages, left + 4);
        const start = Math.max(1, right - 4);
        const res: number[] = [];
        for (let i = start; i <= right; i += 1) res.push(i);
        return res;
    }, [safePage, totalPages]);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const pendingCount = all.filter((item) => item.status === "PENDING").length;
    const yesterdayPending = all.filter((item) => item.status === "PENDING" && item.reportTime && sameDay(item.reportTime, yesterday)).length;
    const pendingDelta = pendingCount - yesterdayPending;
    const handledToday = all.filter((item) => item.status !== "PENDING" && item.handledAt && sameDay(item.handledAt, today)).length;
    const processedRate = all.length === 0 ? 0 : Math.round((all.filter((item) => item.status !== "PENDING").length / all.length) * 100);
    const month = now.getMonth();
    const year = now.getFullYear();
    const last = new Date(year, month - 1, 1);
    const thisMonth = all.filter((item) => item.reportTime && item.reportTime.getMonth() === month && item.reportTime.getFullYear() === year).length;
    const lastMonth = all.filter((item) => item.reportTime && item.reportTime.getMonth() === last.getMonth() && item.reportTime.getFullYear() === last.getFullYear()).length;
    const monthTrend = lastMonth <= 0 ? (thisMonth > 0 ? 100 : 0) : Number((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1));

    useEffect(() => {
        if (!active) {
            document.body.style.overflow = "";
            return;
        }
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setActive(null);
                setAuditNote("");
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [active]);

    useEffect(() => {
        if (focusPostId <= 0 && focusKnowledgeId <= 0) {
            return;
        }
        const target = all.find((item) => (
            (focusPostId > 0 && item.kind === "POST" && item.contentId === focusPostId)
            || (focusKnowledgeId > 0 && item.kind === "KNOWLEDGE" && item.contentId === focusKnowledgeId)
        ));
        if (!target) {
            return;
        }
        setActive(target);
        const timer = window.setTimeout(() => {
            const elementId = focusPostId > 0 ? `admin-report-post-${focusPostId}` : `admin-report-knowledge-${focusKnowledgeId}`;
            const element = document.getElementById(elementId);
            element?.scrollIntoView({behavior: "smooth", block: "center"});
        }, 120);
        return () => window.clearTimeout(timer);
    }, [all, focusKnowledgeId, focusPostId]);

    const markProcessed = (item: ReportItem, status: AuditStatus) => {
        const done = {...item, status, handledAt: new Date()};
        setProcessed((prev) => [done, ...prev.filter((p) => p.key !== item.key)]);
        setPending((prev) => prev.filter((p) => p.key !== item.key));
    };

    const approve = async (item: ReportItem, confirm = true) => {
        if (confirm && !window.confirm(`确定要通过举报 ${item.reportCode} 吗？`)) return;
        const key = `${item.key}-approve`;
        setActionLoading(key);
        try {
            const res = item.kind === "POST"
                ? await postController.deletePost({postId: item.contentId})
                : await knowledgeController.adminBan({knowledgeId: item.contentId, adminReviewerUsername: adminUsername});
            if (res.status === ReturnObject.Status.SUCCESS) {
                markProcessed(item, "PASSED");
                if (active?.key === item.key) {
                    setActive(null);
                    setAuditNote("");
                }
                await load();
            } else {
                alert(res.message || "通过举报失败");
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : "通过举报失败");
        } finally {
            setActionLoading(null);
        }
    };

    const reject = async (item: ReportItem, confirm = true) => {
        if (confirm && !window.confirm(`确定要驳回举报 ${item.reportCode} 吗？`)) return;
        const key = `${item.key}-reject`;
        setActionLoading(key);
        try {
            const res = item.kind === "POST"
                ? await postController.deleteReport({reportId: item.reportId})
                : await knowledgeController.adminReportDelete({reportId: item.reportId});
            if (res.status === ReturnObject.Status.SUCCESS) {
                markProcessed(item, "REJECTED");
                if (active?.key === item.key) {
                    setActive(null);
                    setAuditNote("");
                }
                await load();
            } else {
                alert(res.message || "驳回举报失败");
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : "驳回举报失败");
        } finally {
            setActionLoading(null);
        }
    };

    if (!isPlatformAdmin) {
        return null;
    }

    if (loading && all.length === 0) {
        return <Loading type="dots" text="加载举报数据中..." color="#2196f3" size="large" fullScreen/>;
    }

    // UI
    return (
        <div className="admin-report">
            <div className="admin-report__header">
                <h2>举报审核</h2>
                <p>审核用户举报的倾诉帖与科普文章内容，维护平台内容健康</p>
            </div>

            <div className="admin-report__stats">
                <div className="admin-report__stat-card">
                    <div>
                        <p>待审核举报</p>
                        <h3>{pendingCount}</h3>
                        <small className={pendingDelta >= 0 ? "is-up" : "is-down"}>
                            <i className={`fa-solid ${pendingDelta >= 0 ? "fa-arrow-up" : "fa-arrow-down"}`}/>
                            {`${pendingDelta >= 0 ? "+" : ""}${pendingDelta}`} 条 较昨日
                        </small>
                    </div>
                    <span className="admin-report__stat-icon is-warning"><i className="fa-solid fa-hourglass-half"/></span>
                </div>
                <div className="admin-report__stat-card">
                    <div>
                        <p>今日处理举报</p>
                        <h3>{handledToday}</h3>
                        <small className="is-success"><span>完成率</span><strong>{processedRate}%</strong></small>
                    </div>
                    <span className="admin-report__stat-icon is-success"><i className="fa-solid fa-circle-check"/></span>
                </div>
                <div className="admin-report__stat-card">
                    <div>
                        <p>本月举报总数</p>
                        <h3>{thisMonth}</h3>
                        <small className={monthTrend <= 0 ? "is-success" : "is-up"}>
                            <i className={`fa-solid ${monthTrend <= 0 ? "fa-arrow-down" : "fa-arrow-up"}`}/>
                            {`${monthTrend >= 0 ? "+" : ""}${monthTrend}`}% 较上月
                        </small>
                    </div>
                    <span className="admin-report__stat-icon is-admin"><i className="fa-solid fa-flag"/></span>
                </div>
            </div>

            <div className="admin-report__filter-card">
                <div className="admin-report__filter-left">
                    <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                        <option value="ALL">全部内容类型</option>
                        <option value="POST">倾诉帖</option>
                        <option value="KNOWLEDGE">科普文章</option>
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option value="ALL">全部审核状态</option>
                        <option value="PENDING">待审核</option>
                        <option value="PASSED">已通过</option>
                        <option value="REJECTED">已驳回</option>
                    </select>
                    <select value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value)}>
                        <option value="ALL">全部举报类型</option>
                        {reasonOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <div className="admin-report__date-range">
                        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)}/>
                        <span>至</span>
                        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)}/>
                    </div>
                </div>
                <div className="admin-report__filter-right">
                    <div className="admin-report__search">
                        <i className="fa-solid fa-search"/>
                        <input
                            value={keywordInput}
                            onChange={(event) => setKeywordInput(event.target.value)}
                            onKeyDown={(event) => event.key === "Enter" && setKeyword(keywordInput.trim())}
                            placeholder="搜索举报编号/内容标题/用户ID"
                        />
                    </div>
                    <button type="button" className="admin-report__btn admin-report__btn--primary" onClick={() => setKeyword(keywordInput.trim())}>
                        <i className="fa-solid fa-search"/> 搜索
                    </button>
                </div>
            </div>

            <div className="admin-report__table-card">
                {error && <div className="admin-report__error">加载异常：{error}</div>}
                <div className="admin-report__table-wrap">
                    <table className="admin-report__table">
                        <thead>
                        <tr>
                            <th>举报编号</th>
                            <th>举报类型</th>
                            <th>被举报内容</th>
                            <th>举报用户</th>
                            <th>举报时间</th>
                            <th>审核状态</th>
                            <th>操作</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={7} className="admin-report__empty">暂无符合条件的举报记录</td></tr>
                        ) : rows.map((item) => {
                            const status = statusMeta(item.status);
                            const approving = actionLoading === `${item.key}-approve`;
                            const rejecting = actionLoading === `${item.key}-reject`;
                            const canAudit = item.status === "PENDING";
                            return (
                                <tr
                                    key={item.key}
                                    id={item.kind === "POST" ? `admin-report-post-${item.contentId}` : `admin-report-knowledge-${item.contentId}`}
                                    className={
                                        (focusPostId > 0 && item.kind === "POST" && item.contentId === focusPostId)
                                        || (focusKnowledgeId > 0 && item.kind === "KNOWLEDGE" && item.contentId === focusKnowledgeId)
                                            ? "is-focused"
                                            : ""
                                    }
                                >
                                    <td className="id-cell">{item.reportCode}</td>
                                    <td>
                                        <div className="admin-report__badges">
                                            <span className={`admin-report__badge ${item.kind === "POST" ? "is-post" : "is-knowledge"}`}>{item.kindLabel}</span>
                                            <span className={`admin-report__badge ${reasonClass(item.reasonType)}`}>{item.reasonType}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button type="button" className="admin-report__content-link" onClick={() => {
                                            setActive(item);
                                            setAuditNote("");
                                        }}>{item.title}</button>
                                        <div className="meta">作者：{item.author} (ID:{item.authorId})</div>
                                    </td>
                                    <td><div className="user-name">{item.reporter}</div><div className="meta">举报人账号</div></td>
                                    <td><div className="admin-report__time-cell"><span>{fmtDate(item.reportTime)}</span><small>{fmtTime(item.reportTime)}</small></div></td>
                                    <td><span className={`admin-report__status ${status.className}`}>{status.label}</span></td>
                                    <td>
                                        <div className="admin-report__actions">
                                            <button type="button" className="is-view" onClick={() => {
                                                setActive(item);
                                                setAuditNote("");
                                            }}><i className="fa-solid fa-eye"/> 查看</button>
                                            <button type="button" className={canAudit ? "is-approve" : "is-disabled"} disabled={!canAudit || approving || rejecting} onClick={() => approve(item)}>
                                                <i className="fa-solid fa-check"/> {approving ? "处理中" : "通过"}
                                            </button>
                                            <button type="button" className={canAudit ? "is-reject" : "is-disabled"} disabled={!canAudit || approving || rejecting} onClick={() => reject(item)}>
                                                <i className="fa-solid fa-times"/> {rejecting ? "处理中" : "驳回"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
                <div className="admin-report__pagination">
                    <div>显示 <strong>{filtered.length === 0 ? 0 : from + 1}</strong> 到 <strong>{Math.min(to, filtered.length)}</strong> 条，共 <strong>{filtered.length}</strong> 条记录</div>
                    <div className="admin-report__pagination-controls">
                        <button type="button" disabled={safePage <= 1} onClick={() => setPage(Math.max(1, safePage - 1))}><i className="fa-solid fa-chevron-left"/> 上一页</button>
                        {pageNumbers.map((number) => (
                            <button key={number} type="button" className={number === safePage ? "is-active" : ""} onClick={() => setPage(number)}>{number}</button>
                        ))}
                        <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}>下一页 <i className="fa-solid fa-chevron-right"/></button>
                    </div>
                </div>
            </div>

            {active && (
                <div className="admin-report__modal" onClick={() => {
                    setActive(null);
                    setAuditNote("");
                }}>
                    <div className="admin-report__modal-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-report__modal-header">
                            <h3>举报详情 {active.reportCode}</h3>
                            <button type="button" onClick={() => {
                                setActive(null);
                                setAuditNote("");
                            }}><i className="fa-solid fa-xmark"/></button>
                        </div>
                        <div className="admin-report__modal-body">
                            <div className="admin-report__detail-grid">
                                <section className="admin-report__detail-card">
                                    <h4><i className="fa-solid fa-flag"/> 举报基本信息</h4>
                                    <div className="row"><span>举报编号</span><strong>{active.reportCode}</strong></div>
                                    <div className="row">
                                        <span>举报类型</span>
                                        <div className="admin-report__badges">
                                            <span className={`admin-report__badge ${active.kind === "POST" ? "is-post" : "is-knowledge"}`}>{active.kindLabel}</span>
                                            <span className={`admin-report__badge ${reasonClass(active.reasonType)}`}>{active.reasonType}</span>
                                        </div>
                                    </div>
                                    <div className="row"><span>举报用户</span><strong>{active.reporter}</strong></div>
                                    <div className="row"><span>举报时间</span><strong>{fmtDateTime(active.reportTime)}</strong></div>
                                    <div className="row"><span>举报原因</span><strong>{active.reasonType}</strong></div>
                                    <div className="row"><span>审核状态</span><span className={`admin-report__status ${statusMeta(active.status).className}`}>{statusMeta(active.status).label}</span></div>
                                </section>
                                <section className="admin-report__detail-card">
                                    <h4><i className="fa-solid fa-file-lines"/> 被举报内容信息</h4>
                                    <div className="row"><span>内容作者</span><strong>{active.author}</strong></div>
                                    <div className="row"><span>作者账号</span><strong>{active.authorId}</strong></div>
                                    <div className="row"><span>内容类型</span><strong>{active.kindLabel}</strong></div>
                                    <div className="row"><span>发布时间</span><strong>{fmtDateTime(active.publishTime)}</strong></div>
                                    <div className="row"><span>内容ID</span><strong>{active.contentCode}</strong></div>
                                    <div className="row"><span>累计举报</span><strong>{active.reportCount}</strong></div>
                                    <div className="row metrics"><span>数据统计</span><strong><span><i className="fa-solid fa-eye"/> {active.views ?? 0}</span><span><i className="fa-solid fa-thumbs-up"/> {active.likes ?? 0}</span></strong></div>
                                </section>
                            </div>
                            <section className="admin-report__block">
                                <h4><i className="fa-solid fa-comment-dots"/> 举报描述</h4>
                                <div className="admin-report__block-content">{active.reason}</div>
                            </section>
                            <section className="admin-report__block">
                                <h4><i className="fa-solid fa-eye"/> 被举报内容预览</h4>
                                <div className="admin-report__preview">
                                    <div className="admin-report__preview-head">
                                        <h5>{active.title}</h5>
                                        <p>发布于 {fmtDateTime(active.publishTime)} | {active.author} 发布</p>
                                    </div>
                                    <div className="admin-report__preview-body">
                                        <p>{active.preview || "暂无内容"}</p>
                                        <div className="admin-report__preview-meta">
                                            <span><i className="fa-solid fa-eye"/> {active.views ?? 0}<i className="fa-solid fa-thumbs-up"/> {active.likes ?? 0}</span>
                                            <span>举报数：{active.reportCount}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                            <section className="admin-report__block">
                                <h4><i className="fa-solid fa-gavel"/> 审核操作</h4>
                                <div className="admin-report__audit-area">
                                    <label htmlFor="admin-report-note">审核意见（可选）</label>
                                    <textarea id="admin-report-note" value={auditNote} onChange={(event) => setAuditNote(event.target.value)} placeholder="请输入审核意见，将记录在审核日志中..."/>
                                    <div className="admin-report__modal-actions">
                                        <button type="button" className="admin-report__btn admin-report__btn--success" disabled={active.status !== "PENDING" || actionLoading !== null} onClick={() => approve(active, false)}>
                                            <i className="fa-solid fa-check-circle"/> 通过举报
                                        </button>
                                        <button type="button" className="admin-report__btn admin-report__btn--danger" disabled={active.status !== "PENDING" || actionLoading !== null} onClick={() => reject(active, false)}>
                                            <i className="fa-solid fa-times-circle"/> 驳回举报
                                        </button>
                                        <button type="button" className="admin-report__btn admin-report__btn--outline" onClick={() => {
                                            setActive(null);
                                            setAuditNote("");
                                        }}>
                                            <i className="fa-solid fa-xmark"/> 取消
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
