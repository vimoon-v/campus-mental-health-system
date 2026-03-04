import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useOutletContext} from "react-router";
import {useNavigate} from "react-router-dom";
import {Homepage} from "../HomepageForm";
import {PsychKnowledgeController} from "../../../controller/PsychKnowledgeController";
import {PsychKnowledgeDTO} from "../../../entity/DTO/PsychKnowledgeDTO";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Loading} from "../../../common/view/display/Loading";
import {ReviewStatus} from "../../../entity/enums/ReviewStatus";
import {UserRole} from "../../../entity/enums/UserRole";
import "./AdminKnowledgeManageForm.css";

const CATEGORY_CN_MAP: Record<string, string> = {
    emotion: "情绪管理",
    pressure: "压力应对",
    relationship: "人际关系",
    growth: "自我成长",
    study: "学习心理",
    sleep: "睡眠健康",
    anxiety: "焦虑缓解",
    stress: "压力管理",
    adaptation: "适应发展",
    depression: "抑郁情绪",
    career: "生涯规划"
};

const resolveCategoryLabel = (category?: string) => {
    const raw = (category || "").trim();
    if (!raw) {
        return "未分类";
    }
    const normalized = raw.toLowerCase();
    return CATEGORY_CN_MAP[normalized] ?? raw;
};

export const AdminKnowledgeManageForm: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const navigate = useNavigate();
    const psychKnowledgeController = useMemo(() => new PsychKnowledgeController(), []);
    const [pendingArticles, setPendingArticles] = useState<PsychKnowledgeDTO[]>([]);
    const [reviewedArticles, setReviewedArticles] = useState<PsychKnowledgeDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    const [keyword, setKeyword] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [authorFilter, setAuthorFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("latest");

    const username = context.user?.username ?? "";
    const isPlatformAdmin = UserRole.isPlatformAdminRole(context.user?.role);

    useEffect(() => {
        if (!isPlatformAdmin) {
            navigate("/home/main", {replace: true});
        }
    }, [isPlatformAdmin, navigate]);

    const loadArticles = useCallback(async () => {
        if (!isPlatformAdmin) {
            return;
        }
        setLoading(true);
        setErrorMessage(null);
        try {
            const [pendingResult, reviewedResult] = await Promise.all([
                psychKnowledgeController.pending(null),
                username
                    ? psychKnowledgeController.adminReviewed({adminReviewerUsername: username})
                    : Promise.resolve({status: ReturnObject.Status.SUCCESS, data: []} as any)
            ]);

            if (pendingResult.status === ReturnObject.Status.SUCCESS) {
                setPendingArticles((pendingResult.data ?? []) as PsychKnowledgeDTO[]);
            } else {
                setPendingArticles([]);
            }

            if (reviewedResult.status === ReturnObject.Status.SUCCESS) {
                setReviewedArticles((reviewedResult.data ?? []) as PsychKnowledgeDTO[]);
            } else {
                setReviewedArticles([]);
            }

            if (pendingResult.status !== ReturnObject.Status.SUCCESS && reviewedResult.status !== ReturnObject.Status.SUCCESS) {
                setErrorMessage(pendingResult.message || reviewedResult.message || "加载科普内容失败");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "加载科普内容失败";
            setErrorMessage(message);
            setPendingArticles([]);
            setReviewedArticles([]);
        } finally {
            setLoading(false);
        }
    }, [isPlatformAdmin, psychKnowledgeController, username]);

    useEffect(() => {
        if (!isPlatformAdmin) {
            return;
        }
        loadArticles();
    }, [isPlatformAdmin, loadArticles]);

    const allArticles = useMemo(() => {
        const articleMap = new Map<number, PsychKnowledgeDTO>();
        pendingArticles.forEach((item) => articleMap.set(item.knowledgeId, item));
        reviewedArticles.forEach((item) => articleMap.set(item.knowledgeId, item));
        return Array.from(articleMap.values());
    }, [pendingArticles, reviewedArticles]);

    const categoryOptions = useMemo(() => {
        const set = new Set<string>();
        allArticles.forEach((item) => {
            const category = (item.category || "").trim();
            if (category) {
                set.add(category);
            }
        });
        return ["ALL", ...Array.from(set)];
    }, [allArticles]);

    const authorOptions = useMemo(() => {
        const set = new Set<string>();
        allArticles.forEach((item) => {
            const author = (item.teacherPublisherDisplayName || item.teacherPublisherUsername || "未知作者").trim();
            if (author) {
                set.add(author);
            }
        });
        return ["ALL", ...Array.from(set)];
    }, [allArticles]);

    const filteredArticles = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        let list = [...allArticles];

        if (normalizedKeyword) {
            list = list.filter((item) => {
                const target = `${item.title || ""} ${item.teacherPublisherDisplayName || ""} ${item.teacherPublisherUsername || ""}`.toLowerCase();
                return target.includes(normalizedKeyword);
            });
        }
        if (categoryFilter !== "ALL") {
            list = list.filter((item) => (item.category || "") === categoryFilter);
        }
        if (statusFilter !== "ALL") {
            list = list.filter((item) => (item.reviewStatus || "") === statusFilter);
        }
        if (authorFilter !== "ALL") {
            list = list.filter((item) => {
                const author = item.teacherPublisherDisplayName || item.teacherPublisherUsername || "未知作者";
                return author === authorFilter;
            });
        }

        if (sortBy === "latest") {
            list.sort((a, b) => {
                const aTime = a.publishTime ? new Date(a.publishTime as any).getTime() : 0;
                const bTime = b.publishTime ? new Date(b.publishTime as any).getTime() : 0;
                return bTime - aTime;
            });
        } else if (sortBy === "views") {
            list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
        } else {
            list.sort((a, b) => a.knowledgeId - b.knowledgeId);
        }

        return list;
    }, [allArticles, keyword, categoryFilter, statusFilter, authorFilter, sortBy]);

    const resolveStatus = (status?: ReviewStatus | string) => {
        if (status === ReviewStatus.PASSED) {
            return {label: "已发布", className: "admin-knowledge__status--passed"};
        }
        if (status === ReviewStatus.BANNED) {
            return {label: "已驳回", className: "admin-knowledge__status--banned"};
        }
        if (status === ReviewStatus.REVOKED) {
            return {label: "已下架", className: "admin-knowledge__status--revoked"};
        }
        return {label: "待审核", className: "admin-knowledge__status--pending"};
    };

    const formatDate = (value?: Date | string) => {
        if (!value) {
            return "--";
        }
        const date = new Date(value as any);
        if (Number.isNaN(date.getTime())) {
            return "--";
        }
        return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
    };

    const resolveSummary = (item: PsychKnowledgeDTO) => {
        const summary = item.summary?.trim();
        if (summary) {
            return summary;
        }
        const content = item.content || "";
        return content.length > 88 ? `${content.slice(0, 88)}...` : content || "暂无摘要";
    };

    const handleApprove = async (knowledgeId: number) => {
        if (!username) {
            return;
        }
        setActionLoadingId(knowledgeId);
        try {
            const result = await psychKnowledgeController.adminPass({
                knowledgeId,
                adminReviewerUsername: username
            });
            if (result.status === ReturnObject.Status.SUCCESS) {
                await loadArticles();
            } else {
                alert(result.message || "审核通过失败");
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : "审核通过失败");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleReject = async (knowledgeId: number) => {
        if (!username) {
            return;
        }
        setActionLoadingId(knowledgeId);
        try {
            const result = await psychKnowledgeController.adminBan({
                knowledgeId,
                adminReviewerUsername: username
            });
            if (result.status === ReturnObject.Status.SUCCESS) {
                await loadArticles();
            } else {
                alert(result.message || "驳回失败");
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : "驳回失败");
        } finally {
            setActionLoadingId(null);
        }
    };

    if (!isPlatformAdmin) {
        return null;
    }

    return (
        <div className="admin-knowledge">
            <div className="admin-knowledge__header">
                <div>
                    <h2>科普内容管理</h2>
                    <p>审核并管理心理科普文章内容</p>
                </div>
            </div>

            <div className="admin-knowledge__toolbar">
                <div className="admin-knowledge__left-actions">
                    <button type="button" className="admin-knowledge__btn admin-knowledge__btn--primary">
                        <i className="fa-solid fa-plus"/> 发布新文章
                    </button>
                    <button type="button" className="admin-knowledge__btn admin-knowledge__btn--ghost">
                        <i className="fa-solid fa-upload"/> 批量导入
                    </button>
                </div>
                <div className="admin-knowledge__search">
                    <i className="fa-solid fa-search"/>
                    <input
                        placeholder="搜索文章标题/作者"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                    />
                </div>
            </div>

            <div className="admin-knowledge__filters">
                <div className="admin-knowledge__filter-group">
                    <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                        <option value="ALL">全部分类</option>
                        {categoryOptions.filter((item) => item !== "ALL").map((item) => (
                            <option key={item} value={item}>{resolveCategoryLabel(item)}</option>
                        ))}
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option value="ALL">全部状态</option>
                        <option value={ReviewStatus.PENDING}>待审核</option>
                        <option value={ReviewStatus.PASSED}>已发布</option>
                        <option value={ReviewStatus.BANNED}>已驳回</option>
                        <option value={ReviewStatus.REVOKED}>已下架</option>
                    </select>
                    <select value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)}>
                        <option value="ALL">全部作者</option>
                        {authorOptions.filter((item) => item !== "ALL").map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </div>
                <div className="admin-knowledge__filter-actions">
                    <button type="button" className="admin-knowledge__btn admin-knowledge__btn--ghost">
                        <i className="fa-solid fa-filter"/> 筛选
                    </button>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                        <option value="latest">按时间排序</option>
                        <option value="views">按阅读量排序</option>
                        <option value="id">按ID排序</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="admin-knowledge__loading">
                    <Loading type="dots" text="加载科普内容中..." color="#2196f3" size="large"/>
                </div>
            ) : errorMessage ? (
                <div className="admin-knowledge__empty">加载失败：{errorMessage}</div>
            ) : filteredArticles.length === 0 ? (
                <div className="admin-knowledge__empty">暂无符合条件的科普文章</div>
            ) : (
                <div className="admin-knowledge__grid">
                    {filteredArticles.map((item) => {
                        const status = resolveStatus(item.reviewStatus);
                        const author = item.teacherPublisherDisplayName || item.teacherPublisherUsername || "未知作者";
                        const actionBusy = actionLoadingId === item.knowledgeId;
                        return (
                            <article key={item.knowledgeId} className="admin-knowledge__card">
                                <div className="admin-knowledge__cover">
                                    {item.coverImage ? (
                                        <img src={item.coverImage} alt="科普封面"/>
                                    ) : (
                                        <div className="admin-knowledge__cover-placeholder">
                                            <i className="fa-solid fa-book-open"/>
                                        </div>
                                    )}
                                    <span className={`admin-knowledge__status ${status.className}`}>
                                        {status.label}
                                    </span>
                                </div>

                                <div className="admin-knowledge__content">
                                    <div className="admin-knowledge__meta">
                                        <span className="admin-knowledge__category">{resolveCategoryLabel(item.category)}</span>
                                        <span>{formatDate(item.publishTime as any)}</span>
                                    </div>
                                    <h3>{item.title || "未命名文章"}</h3>
                                    <p>{resolveSummary(item)}</p>
                                    <div className="admin-knowledge__author-row">
                                        <div className="admin-knowledge__author">
                                            <span className="admin-knowledge__avatar">{author.slice(0, 1)}</span>
                                            <span>{author}</span>
                                        </div>
                                        <div className="admin-knowledge__metrics">
                                            <span><i className="fa-solid fa-eye"/> {item.viewCount || 0}</span>
                                            <span><i className="fa-solid fa-comment"/> --</span>
                                        </div>
                                    </div>
                                    <div className="admin-knowledge__actions">
                                        <button
                                            type="button"
                                            className="admin-knowledge__action admin-knowledge__action--view"
                                            onClick={() => navigate(`/psych_knowledge/detail/${item.knowledgeId}`, {
                                                state: {from: "/home/admin/knowledge"}
                                            })}
                                        >
                                            <i className="fa-solid fa-eye"/> 查看
                                        </button>
                                        {item.reviewStatus === ReviewStatus.PENDING ? (
                                            <>
                                                <button
                                                    type="button"
                                                    className="admin-knowledge__action admin-knowledge__action--approve"
                                                    disabled={actionBusy}
                                                    onClick={() => handleApprove(item.knowledgeId)}
                                                >
                                                    <i className="fa-solid fa-check"/> 审核通过
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-knowledge__action admin-knowledge__action--reject"
                                                    disabled={actionBusy}
                                                    onClick={() => handleReject(item.knowledgeId)}
                                                >
                                                    <i className="fa-solid fa-times"/> 驳回
                                                </button>
                                            </>
                                        ) : item.reviewStatus === ReviewStatus.PASSED ? (
                                            <button
                                                type="button"
                                                className="admin-knowledge__action admin-knowledge__action--reject"
                                                disabled={actionBusy}
                                                onClick={() => handleReject(item.knowledgeId)}
                                            >
                                                <i className="fa-solid fa-arrow-down"/> 下架
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="admin-knowledge__action admin-knowledge__action--approve"
                                                disabled={actionBusy}
                                                onClick={() => handleApprove(item.knowledgeId)}
                                            >
                                                <i className="fa-solid fa-rotate-right"/> 重新通过
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
