import React, {useEffect, useMemo, useRef, useState} from "react";
import "../../home/Home.css";
import {useOutletContext} from "react-router";
import {useNavigate} from "react-router-dom";
import {PsychKnowledgeRoot} from "../PsychKnowledgeRootPage";
import {PsychKnowledgeController} from "../../../controller/PsychKnowledgeController";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {ResponseState} from "../../../common/response/ResponseState";
import {PsychKnowledgeDTO} from "../../../entity/DTO/PsychKnowledgeDTO";
import {ReviewStatus} from "../../../entity/enums/ReviewStatus";
import {Loading} from "../../../common/view/display/Loading";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Dialog, DialogRef} from "../../../common/view/container/Dialog";
import {Button} from "../../../common/view/controller/Button";

type ViewMode = "list" | "card";

type StatusOption = {
    value: ReviewStatus | "all" | "draft";
    label: string;
};

type TimeOption = {
    value: "all" | "week" | "month" | "quarter";
    label: string;
};

type CategoryOption = {
    value: string;
    label: string;
    className: string;
};

const STATUS_OPTIONS: StatusOption[] = [
    {value: "all", label: "全部状态"},
    {value: "draft", label: "草稿"},
    {value: ReviewStatus.PENDING, label: "待审核"},
    {value: ReviewStatus.PASSED, label: "已发布"},
    {value: ReviewStatus.BANNED, label: "已驳回"},
    {value: ReviewStatus.REVOKED, label: "已撤回"},
];

const TIME_OPTIONS: TimeOption[] = [
    {value: "all", label: "全部时间"},
    {value: "week", label: "本周"},
    {value: "month", label: "本月"},
    {value: "quarter", label: "本季度"},
];

const CATEGORY_OPTIONS: CategoryOption[] = [
    {value: "all", label: "全部分类", className: "category-all"},
    {value: "pressure", label: "压力管理", className: "category-stress"},
    {value: "emotion", label: "情绪调节", className: "category-emotion"},
    {value: "relationship", label: "人际关系", className: "category-relationship"},
    {value: "study", label: "学习心理", className: "category-study"},
    {value: "growth", label: "成长发展", className: "category-growth"},
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
    pressure: ["压力", "焦虑", "紧张"],
    emotion: ["情绪", "抑郁", "心情", "情感"],
    relationship: ["人际", "关系", "沟通", "同学", "朋友"],
    study: ["学习", "考试", "成绩", "专注", "拖延"],
    growth: ["成长", "发展", "规划", "自我", "青春期"],
};

const resolveCategoryKey = (item: PsychKnowledgeDTO) => {
    const cleaned = item.category?.trim().toLowerCase();
    if (cleaned === "stress") {
        return "pressure";
    }
    if (cleaned && CATEGORY_OPTIONS.some((option) => option.value === cleaned)) {
        return cleaned;
    }
    const haystack = `${item.title} ${item.content}`.toLowerCase();
    for (const [key, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some((keyword) => haystack.includes(keyword))) {
            return key;
        }
    }
    return "growth";
};

const resolveStatusLabel = (status?: ReviewStatus | string | null, publishStatus?: string | null) => {
    if (publishStatus === "draft") {
        return "草稿";
    }
    if (!status) {
        return "未知";
    }
    const statusMap = new Map<ReviewStatus, string>([
        [ReviewStatus.PENDING, "待审核"],
        [ReviewStatus.PASSED, "已发布"],
        [ReviewStatus.BANNED, "已驳回"],
        [ReviewStatus.REVOKED, "已撤回"],
    ]);
    return statusMap.get(status as ReviewStatus) ?? ReviewStatus.ChineseName.get(String(status)) ?? String(status);
};

const resolveStatusClass = (status?: ReviewStatus | string | null, publishStatus?: string | null) => {
    if (publishStatus === "draft") {
        return "status-draft";
    }
    switch (status) {
        case ReviewStatus.PASSED:
            return "status-passed";
        case ReviewStatus.BANNED:
            return "status-banned";
        case ReviewStatus.REVOKED:
            return "status-revoked";
        default:
            return "status-pending";
    }
};

const formatDateTime = (value: any) => {
    if (!value) {
        return "--";
    }
    const resolved = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(resolved.getTime())) {
        return String(value);
    }
    return resolved.toLocaleString("zh-CN");
};

const formatViews = (value: number) => {
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
    }
    return `${value}`;
};

const resolveViews = (knowledgeId: number) => {
    const base = Math.abs(knowledgeId * 137) % 2200;
    return base + 800;
};

const withinRange = (target: Date, range: TimeOption["value"]) => {
    const now = new Date();
    if (range === "week") {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return target >= start && target <= end;
    }
    if (range === "month") {
        return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
    }
    if (range === "quarter") {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const targetQuarter = Math.floor(target.getMonth() / 3);
        return target.getFullYear() === now.getFullYear() && targetQuarter === currentQuarter;
    }
    return true;
};

export const MyPsychKnowledgeTeacherForm: React.FC = () => {
    const context = useOutletContext<PsychKnowledgeRoot.OutletContext>();
    const navigate = useNavigate();
    const psychKnowledgeController = new PsychKnowledgeController();

    const listRef = useRef<ResponseHandlerRef<{teacherUsername: string}, PsychKnowledgeDTO[]>>(null);
    const [listState, setListState] = useState<ResponseState<PsychKnowledgeDTO[]>>();

    const invokeHandlerRef = useRef<ResponseHandlerRef<{knowledgeId: number}, any>>(null);
    const [invokeState, setInvokeState] = useState<ResponseState<any>>();
    const invokeConfirmDialogRef = useRef<DialogRef>(null);
    const invokeResultDialogRef = useRef<DialogRef>(null);
    const [pendingInvokeId, setPendingInvokeId] = useState<number | null>(null);
    const deleteHandlerRef = useRef<ResponseHandlerRef<{knowledgeId: number}, any>>(null);
    const [deleteState, setDeleteState] = useState<ResponseState<any>>();
    const deleteConfirmDialogRef = useRef<DialogRef>(null);
    const deleteResultDialogRef = useRef<DialogRef>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

    const [statusFilter, setStatusFilter] = useState<StatusOption["value"]>("all");
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [timeFilter, setTimeFilter] = useState<TimeOption["value"]>("all");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [currentPage, setCurrentPage] = useState(1);

    const teacherUsername = context.user?.username ?? "";

    useEffect(() => {
        if (teacherUsername) {
            listRef.current?.request({teacherUsername});
        }
    }, [teacherUsername]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, categoryFilter, timeFilter, searchKeyword]);

    const knowledgeList = listState?.returnObject?.data ?? [];

    const decoratedList = useMemo(() => (
        knowledgeList.map((item) => {
            const categoryKey = resolveCategoryKey(item);
            const categoryMeta = CATEGORY_OPTIONS.find((option) => option.value === categoryKey) ?? CATEGORY_OPTIONS[0];
            const views = typeof item.viewCount === "number" ? item.viewCount : resolveViews(item.knowledgeId);
            return {item, categoryKey, categoryMeta, views};
        })
    ), [knowledgeList]);

    const filteredList = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        return decoratedList.filter(({item, categoryKey}) => {
            if (statusFilter === "draft") {
                if (item.publishStatus !== "draft") {
                    return false;
                }
            } else if (statusFilter !== "all") {
                if (item.publishStatus === "draft" || item.reviewStatus !== statusFilter) {
                    return false;
                }
            }
            if (categoryFilter !== "all" && categoryKey !== categoryFilter) {
                return false;
            }
            if (timeFilter !== "all") {
                const publishTime = item.publishTime ? new Date(item.publishTime) : null;
                if (publishTime && !withinRange(publishTime, timeFilter)) {
                    return false;
                }
            }
            if (!keyword) {
                return true;
            }
            const haystack = [
                item.title,
                item.content,
                item.teacherPublisherDisplayName,
                item.teacherPublisherUsername,
                item.knowledgeId?.toString()
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(keyword);
        }).sort((a, b) => {
            const timeA = new Date(a.item.publishTime).getTime();
            const timeB = new Date(b.item.publishTime).getTime();
            return timeB - timeA;
        });
    }, [decoratedList, statusFilter, categoryFilter, timeFilter, searchKeyword]);

    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const pagedList = filteredList.slice((safePage - 1) * pageSize, safePage * pageSize);

    useEffect(() => {
        if (currentPage !== safePage) {
            setCurrentPage(safePage);
        }
    }, [safePage, currentPage]);

    const statusSummary = useMemo(() => {
        const summary = new Map<string, number>();
        decoratedList.forEach(({item}) => {
            const key = item.publishStatus === "draft" ? "draft" : String(item.reviewStatus);
            summary.set(key, (summary.get(key) ?? 0) + 1);
        });
        return summary;
    }, [decoratedList]);

    const statusItems = [
        {key: "draft", label: "草稿", className: "status-draft"},
        {key: ReviewStatus.PENDING, label: resolveStatusLabel(ReviewStatus.PENDING), className: resolveStatusClass(ReviewStatus.PENDING)},
        {key: ReviewStatus.PASSED, label: resolveStatusLabel(ReviewStatus.PASSED), className: resolveStatusClass(ReviewStatus.PASSED)},
        {key: ReviewStatus.BANNED, label: resolveStatusLabel(ReviewStatus.BANNED), className: resolveStatusClass(ReviewStatus.BANNED)},
        {key: ReviewStatus.REVOKED, label: resolveStatusLabel(ReviewStatus.REVOKED), className: resolveStatusClass(ReviewStatus.REVOKED)}
    ];

    const categoryStats = useMemo(() => (
        CATEGORY_OPTIONS.filter((option) => option.value !== "all").map((option) => {
            const items = decoratedList.filter((item) => item.categoryKey === option.value);
            const views = items.reduce((total, item) => total + item.views, 0);
            return {
                ...option,
                count: items.length,
                views,
            };
        })
    ), [decoratedList]);

    const maxCategoryViews = Math.max(...categoryStats.map((item) => item.views), 1);

    const errorMessage = listState?.networkError?.message
        || (listState?.returnObject?.status && listState?.returnObject?.status !== ReturnObject.Status.SUCCESS
            ? listState.returnObject.message
            : "");

    const refreshList = () => {
        if (!teacherUsername) {
            return;
        }
        listRef.current?.recover();
        listRef.current?.request({teacherUsername});
    };

    const handleInvokeRequest = (knowledgeId: number) => {
        setPendingInvokeId(knowledgeId);
        invokeConfirmDialogRef.current?.open();
    };

    const handleDeleteRequest = (knowledgeId: number) => {
        setPendingDeleteId(knowledgeId);
        deleteConfirmDialogRef.current?.open();
    };

    const invokeResultDialog = (
        <ResponseHandler<{knowledgeId: number}, any>
            ref={invokeHandlerRef}
            request={psychKnowledgeController.teacherInvoke}
            setResponseState={setInvokeState}
            idleComponent={<></>}
            loadingComponent={<Loading type="dots" text="撤回中..." color="#2196f3" size="large" fullScreen/>}
            handlingReturnObjectComponent={<Loading type="dots" text="处理撤回结果中..." color="#2196f3" size="large" fullScreen/>}
            networkErrorComponent={
                <Dialog
                    autoOpen
                    ref={invokeResultDialogRef}
                    type="modal"
                    title="网络错误"
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">详情：{invokeState?.networkError?.message}</p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button
                                type="default"
                                style={{flexGrow: 1}}
                                onClick={() => invokeResultDialogRef.current?.close()}
                            >
                                返回
                            </Button>
                        </div>
                    </div>
                </Dialog>
            }
            finishedComponent={
                <Dialog
                    autoOpen
                    ref={invokeResultDialogRef}
                    type="modal"
                    title={`撤回${ReturnObject.Status.ChineseName.get(invokeState?.returnObject?.status)}`}
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                    onClose={() => {
                        if (invokeState?.returnObject?.status === ReturnObject.Status.SUCCESS) {
                            refreshList();
                        }
                    }}
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">
                            {invokeState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "撤回成功" : invokeState?.returnObject?.message}
                        </p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button
                                type={invokeState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "primary" : "default"}
                                style={{flexGrow: 1}}
                                onClick={() => invokeResultDialogRef.current?.close()}
                            >
                                {invokeState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "确定" : "返回"}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            }
        />
    );

    const invokeConfirmDialog = (
        <Dialog
            ref={invokeConfirmDialogRef}
            type="modal"
            title="撤回文章"
            showCloseButton
            closeOnBackdropClick
            closeOnEscape
        >
            <div className="layout-flex-column">
                <p className="text-align-left">确定要撤回当前文章吗？</p>
                <br/>
                <div className="layout-flex-row justify-content-flex-end">
                    <span style={{flexGrow: 2}}></span>
                    <Button type="default" style={{flexGrow: 1}} onClick={() => invokeConfirmDialogRef.current?.close()}>
                        取消
                    </Button>
                    <span style={{flexGrow: 0.1}}></span>
                    <Button
                        type="primary"
                        style={{flexGrow: 1}}
                        onClick={() => {
                            invokeConfirmDialogRef.current?.close();
                            if (pendingInvokeId != null) {
                                invokeHandlerRef.current?.request({knowledgeId: pendingInvokeId});
                            }
                        }}
                    >
                        确定
                    </Button>
                </div>
            </div>
        </Dialog>
    );

    const deleteResultDialog = (
        <ResponseHandler<{knowledgeId: number}, any>
            ref={deleteHandlerRef}
            request={psychKnowledgeController.teacherDeleteDraft}
            setResponseState={setDeleteState}
            idleComponent={<></>}
            loadingComponent={<Loading type="dots" text="删除中..." color="#2196f3" size="large" fullScreen/>}
            handlingReturnObjectComponent={<Loading type="dots" text="处理删除结果中..." color="#2196f3" size="large" fullScreen/>}
            networkErrorComponent={
                <Dialog
                    autoOpen
                    ref={deleteResultDialogRef}
                    type="modal"
                    title="网络错误"
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">详情：{deleteState?.networkError?.message}</p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button type="default" style={{flexGrow: 1}} onClick={() => deleteResultDialogRef.current?.close()}>
                                返回
                            </Button>
                        </div>
                    </div>
                </Dialog>
            }
            finishedComponent={
                <Dialog
                    autoOpen
                    ref={deleteResultDialogRef}
                    type="modal"
                    title={`删除${ReturnObject.Status.ChineseName.get(deleteState?.returnObject?.status)}`}
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                    onClose={() => {
                        if (deleteState?.returnObject?.status === ReturnObject.Status.SUCCESS) {
                            refreshList();
                        }
                    }}
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">
                            {deleteState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "删除草稿成功" : deleteState?.returnObject?.message}
                        </p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button
                                type={deleteState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "primary" : "default"}
                                style={{flexGrow: 1}}
                                onClick={() => deleteResultDialogRef.current?.close()}
                            >
                                {deleteState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "确定" : "返回"}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            }
        />
    );

    const deleteConfirmDialog = (
        <Dialog
            ref={deleteConfirmDialogRef}
            type="modal"
            title="删除草稿"
            showCloseButton
            closeOnBackdropClick
            closeOnEscape
        >
            <div className="layout-flex-column">
                <p className="text-align-left">确定要删除该草稿吗？删除后不可恢复。</p>
                <br/>
                <div className="layout-flex-row justify-content-flex-end">
                    <span style={{flexGrow: 2}}></span>
                    <Button type="default" style={{flexGrow: 1}} onClick={() => deleteConfirmDialogRef.current?.close()}>
                        取消
                    </Button>
                    <span style={{flexGrow: 0.1}}></span>
                    <Button
                        type="primary"
                        style={{flexGrow: 1}}
                        onClick={() => {
                            deleteConfirmDialogRef.current?.close();
                            if (pendingDeleteId != null) {
                                deleteHandlerRef.current?.request({knowledgeId: pendingDeleteId});
                            }
                        }}
                    >
                        确定
                    </Button>
                </div>
            </div>
        </Dialog>
    );

    return (
        <div className="appointment-manage-page knowledge-manage-page">
            {invokeResultDialog}
            {invokeConfirmDialog}
            {deleteResultDialog}
            {deleteConfirmDialog}
            <ResponseHandler<{teacherUsername: string}, PsychKnowledgeDTO[]>
                ref={listRef}
                request={psychKnowledgeController.teacherMine}
                setResponseState={setListState}
                idleComponent={<></>}
                loadingComponent={<Loading type="dots" text="获取科普文章中..." color="#2196f3" size="large" fullScreen/>}
                handlingReturnObjectComponent={<Loading type="dots" text="处理科普结果中..." color="#2196f3" size="large" fullScreen/>}
                networkErrorComponent={<></>}
                finishedComponent={<></>}
            />

            <div className="appointment-manage-header">
                <div>
                    <h2>科普文章管理</h2>
                    <p>管理心理健康科普文章的发布、编辑和归档</p>
                </div>
                <div className="appointment-manage-actions">
                    <button className="appointment-manage-btn appointment-manage-btn--ghost" type="button">
                        <i className="fa-solid fa-download"/>导出文章
                    </button>
                    <button
                        className="appointment-manage-btn appointment-manage-btn--primary"
                        type="button"
                        onClick={() => navigate("/psych_knowledge/post")}
                    >
                        <i className="fa-solid fa-plus"/>新建文章
                    </button>
                </div>
            </div>

            <div className="appointment-manage-filter-card">
                <div className="appointment-manage-filters">
                    <div className="appointment-manage-select">
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusOption["value"])}>
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <i className="fa-solid fa-chevron-down"/>
                    </div>

                    <div className="appointment-manage-select">
                        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                            {CATEGORY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <i className="fa-solid fa-chevron-down"/>
                    </div>

                    <div className="appointment-manage-select">
                        <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as TimeOption["value"])}>
                            {TIME_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <i className="fa-solid fa-chevron-down"/>
                    </div>

                    <div className="appointment-manage-search">
                        <i className="fa-solid fa-search"/>
                        <input
                            value={searchKeyword}
                            onChange={(event) => setSearchKeyword(event.target.value)}
                            placeholder="搜索文章标题/关键词"
                        />
                    </div>
                </div>

                <div className="appointment-manage-view-toggle">
                    <button
                        type="button"
                        className={`appointment-view-btn${viewMode === "list" ? " is-active" : ""}`}
                        onClick={() => setViewMode("list")}
                    >
                        <i className="fa-solid fa-list-ul"/>列表视图
                    </button>
                    <button
                        type="button"
                        className={`appointment-view-btn${viewMode === "card" ? " is-active" : ""}`}
                        onClick={() => setViewMode("card")}
                    >
                        <i className="fa-solid fa-th-large"/>卡片视图
                    </button>
                </div>
            </div>

            {viewMode === "card" ? (
                <div className="knowledge-card-grid">
                    {pagedList.length === 0 ? (
                        <div className="appointment-manage-card appointment-manage-empty">暂无科普文章</div>
                    ) : (
                        pagedList.map(({item, categoryMeta, views}) => {
                            const authorName = item.teacherPublisherDisplayName || item.teacherPublisherUsername;
                            const summaryText = item.summary?.trim() || (item.content ? `${item.content.slice(0, 120)}${item.content.length > 120 ? "..." : ""}` : "暂无摘要");
                            const statusLabel = resolveStatusLabel(item.reviewStatus, item.publishStatus);
                            const statusClass = resolveStatusClass(item.reviewStatus, item.publishStatus);
                            const isDraft = item.publishStatus === "draft";
                            return (
                                <div className="knowledge-card" key={item.knowledgeId}>
                                    <div className="knowledge-card-cover">
                                        {item.coverImage ? (
                                            <img src={item.coverImage} alt="封面" />
                                        ) : (
                                            <div className="knowledge-card-cover-placeholder">
                                                <i className="fa-solid fa-image" />
                                            </div>
                                        )}
                                        <span className={`knowledge-status-badge ${statusClass}`}>{statusLabel}</span>
                                    </div>
                                    <div className="knowledge-card-body">
                                        <div className="knowledge-card-header">
                                            <h3>{item.title || "未命名"}</h3>
                                            <span className={`knowledge-category-badge ${categoryMeta.className}`}>{categoryMeta.label}</span>
                                        </div>
                                        <p className="knowledge-card-summary">{summaryText}</p>
                                        <div className="knowledge-card-meta">
                                            <span>作者: {authorName || "未知"}</span>
                                            <span>{isDraft ? "未发布" : formatDateTime(item.publishTime)}</span>
                                            <span>{formatViews(views)} 阅读</span>
                                        </div>
                                        <div className="knowledge-card-actions">
                                            <button
                                                type="button"
                                                className="appointment-manage-btn appointment-manage-btn--ghost"
                                                onClick={() => navigate(`/psych_knowledge/detail/${item.knowledgeId}`)}
                                            >
                                                <i className="fa-solid fa-eye"/>预览
                                            </button>
                                            <button
                                                type="button"
                                                className="appointment-manage-btn"
                                                onClick={() => navigate(`/psych_knowledge/edit/${item.knowledgeId}`)}
                                            >
                                                <i className="fa-solid fa-edit"/>编辑
                                            </button>
                                            {isDraft ? (
                                                <button
                                                    type="button"
                                                    className="appointment-manage-btn appointment-manage-btn--danger"
                                                    onClick={() => handleDeleteRequest(item.knowledgeId)}
                                                >
                                                    <i className="fa-solid fa-trash"/>删除
                                                </button>
                                            ) : item.reviewStatus !== ReviewStatus.REVOKED && (
                                                <button
                                                    type="button"
                                                    className="appointment-manage-btn appointment-manage-btn--danger"
                                                    onClick={() => handleInvokeRequest(item.knowledgeId)}
                                                >
                                                    <i className="fa-solid fa-box-archive"/>撤回
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="appointment-manage-card">
                    {errorMessage ? (
                        <div className="appointment-manage-empty">{errorMessage}</div>
                    ) : (
                        <div className="appointment-manage-table-wrapper">
                            <table className="appointment-manage-table knowledge-manage-table">
                                <thead>
                                <tr>
                                    <th>文章ID</th>
                                    <th>文章信息</th>
                                    <th>分类</th>
                                    <th>发布时间</th>
                                    <th>阅读量</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pagedList.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="appointment-manage-empty">暂无科普文章</td>
                                    </tr>
                                ) : (
                                    pagedList.map(({item, categoryMeta, views}) => {
                                        const authorName = item.teacherPublisherDisplayName || item.teacherPublisherUsername;
                                        const wordCount = item.content ? item.content.length : 0;
                                        const isDraft = item.publishStatus === "draft";
                                        return (
                                            <tr key={item.knowledgeId}>
                                                <td>#{item.knowledgeId}</td>
                                                <td>
                                                    <div className="knowledge-title">{item.title}</div>
                                                    <div className="knowledge-meta">
                                                        作者: {authorName || "未知"} | 字数: {wordCount}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`knowledge-category-badge ${categoryMeta.className}`}>
                                                        {categoryMeta.label}
                                                    </span>
                                                </td>
                                                <td>{item.publishStatus === "draft" ? "未发布" : formatDateTime(item.publishTime)}</td>
                                                <td>{formatViews(views)}</td>
                                                <td>
                                                    <span className={`knowledge-status-badge ${resolveStatusClass(item.reviewStatus, item.publishStatus)}`}>
                                                        {resolveStatusLabel(item.reviewStatus, item.publishStatus)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="appointment-actions">
                                                        <button
                                                            type="button"
                                                            className="action-btn action-btn--info"
                                                            title="预览文章"
                                                            onClick={() => navigate(`/psych_knowledge/detail/${item.knowledgeId}`)}
                                                        >
                                                            <i className="fa-solid fa-eye"/>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="action-btn action-btn--primary"
                                                            title="编辑文章"
                                                            onClick={() => navigate(`/psych_knowledge/edit/${item.knowledgeId}`)}
                                                        >
                                                            <i className="fa-solid fa-edit"/>
                                                        </button>
                                                        {isDraft ? (
                                                            <button
                                                                type="button"
                                                                className="action-btn action-btn--danger"
                                                                title="删除草稿"
                                                                onClick={() => handleDeleteRequest(item.knowledgeId)}
                                                            >
                                                                <i className="fa-solid fa-trash"/>
                                                            </button>
                                                        ) : item.reviewStatus !== ReviewStatus.REVOKED && (
                                                            <button
                                                                type="button"
                                                                className="action-btn action-btn--danger"
                                                                title="撤回文章"
                                                                onClick={() => handleInvokeRequest(item.knowledgeId)}
                                                            >
                                                                <i className="fa-solid fa-box-archive"/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="appointment-manage-pagination">
                        <p>
                            显示 <span>{filteredList.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span> -
                            <span>{Math.min(filteredList.length, safePage * pageSize)}</span> 条，
                            共 <span>{filteredList.length}</span> 条记录
                        </p>
                        <div className="appointment-pagination-actions">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={safePage === 1}
                            >
                                <i className="fa-solid fa-chevron-left"/>
                            </button>
                            {Array.from({length: totalPages}, (_, index) => index + 1).map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    className={page === safePage ? "is-active" : ""}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={safePage === totalPages}
                            >
                                <i className="fa-solid fa-chevron-right"/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="appointment-manage-stats">
                <div className="appointment-manage-card">
                    <div className="appointment-card-header">
                        <h3>文章状态分布</h3>
                        <span>共 {decoratedList.length} 篇</span>
                    </div>
                    <div className="appointment-status-list">
                        {statusItems.map((status) => {
                            const count = statusSummary.get(String(status.key)) ?? 0;
                            const percent = decoratedList.length ? Math.round((count / decoratedList.length) * 100) : 0;
                            return (
                                <div className="appointment-status-item" key={String(status.key)}>
                                    <div className="appointment-status-info">
                                        <span>{status.label}</span>
                                        <span>{count} ({percent}%)</span>
                                    </div>
                                    <div className="appointment-status-bar">
                                        <span className={status.className} style={{width: `${percent}%`}} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="appointment-manage-card">
                    <div className="appointment-card-header">
                        <h3>分类阅读量统计</h3>
                        <span>最近累计</span>
                    </div>
                    <div className="appointment-trend">
                        {categoryStats.map((item) => (
                            <div className="appointment-trend-item" key={item.value}>
                                <div className="appointment-trend-bar">
                                    <span style={{height: `${(item.views / maxCategoryViews) * 100}%`}} />
                                </div>
                                <span className="appointment-trend-label">{item.label}</span>
                                <span className="appointment-trend-value">{formatViews(item.views)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
