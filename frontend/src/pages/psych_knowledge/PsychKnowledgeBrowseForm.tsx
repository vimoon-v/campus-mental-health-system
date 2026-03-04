import React, {useEffect, useMemo, useRef, useState} from "react";
import {ResponseHandler, ResponseHandlerRef} from "../../common/response/ResponseHandler";
import {PsychKnowledgeController, PsychKnowledgeReportRequest} from "../../controller/PsychKnowledgeController";
import {PsychKnowledgeDTO} from "../../entity/DTO/PsychKnowledgeDTO";
import {ResponseState} from "../../common/response/ResponseState";
import {Loading} from "../../common/view/display/Loading";
import {ReturnObject} from "../../common/response/ReturnObject";
import {useNavigate} from "react-router-dom";
import {useOutletContext} from "react-router";
import {PsychKnowledgeRoot} from "./PsychKnowledgeRootPage";
import defaultAvatar from "../../assets/avatar/default-avatar.png";
import "./PsychKnowledgeBrowse.css";

type KnowledgeCategory = {
    key: string;
    label: string;
    keywords: string[];
};

const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
    {key: "all", label: "全部", keywords: []},
    {key: "emotion", label: "情绪管理", keywords: ["情绪", "情感", "心情", "抑郁", "焦虑"]},
    {key: "pressure", label: "压力应对", keywords: ["压力", "焦虑", "紧张", "倦怠"]},
    {key: "relationship", label: "人际关系", keywords: ["人际", "沟通", "社交", "关系"]},
    {key: "growth", label: "自我成长", keywords: ["成长", "自我", "价值", "信心"]},
    {key: "study", label: "学习心理", keywords: ["学习", "考试", "专注", "记忆"]},
    {key: "sleep", label: "睡眠健康", keywords: ["睡眠", "失眠", "作息"]},
    {key: "anxiety", label: "焦虑缓解", keywords: ["焦虑", "担心", "恐惧"]},
];

const TIPS = [
    "每天花10分钟进行深呼吸练习，可以有效缓解焦虑情绪",
    "保持规律的作息，是维持心理健康的基础",
    "适当的运动能促进多巴胺分泌，提升愉悦感",
    "学会拒绝不合理的要求，建立健康的心理边界",
    "遇到心理困扰时，及时寻求专业帮助是勇敢的表现",
];

const VIDEO_CARDS = [
    {
        title: "情绪管理实操：5分钟快速平复心情的方法",
        image: "https://picsum.photos/id/1/400/260",
        duration: "10:25",
        views: "3.2k",
        date: "2025-02-20",
        url: "https://www.w3schools.com/html/mov_bbb.mp4",
    },
    {
        title: "正念冥想入门：缓解学业压力的实用技巧",
        image: "https://picsum.photos/id/2/400/260",
        duration: "15:40",
        views: "2.8k",
        date: "2025-02-18",
        url: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
    },
    {
        title: "有效沟通：改善人际关系的核心技巧",
        image: "https://picsum.photos/id/3/400/260",
        duration: "12:15",
        views: "2.5k",
        date: "2025-02-15",
        url: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4",
    },
    {
        title: "睡眠心理学：打造优质睡眠的完整指南",
        image: "https://picsum.photos/id/4/400/260",
        duration: "18:30",
        views: "2.1k",
        date: "2025-02-10",
        url: "https://samplelib.com/lib/preview/mp4/sample-15s.mp4",
    },
];

const REPORT_TYPE_OPTIONS = ["内容违规", "广告推广", "人身攻击", "隐私泄露", "其他"];

export const PsychKnowledgeBrowseForm: React.FC = () => {
    const psychKnowledgeController = new PsychKnowledgeController();
    const navigate = useNavigate();
    const context = useOutletContext<PsychKnowledgeRoot.OutletContext>();
    const publicPsychKnowledgeHandlerRef = useRef<ResponseHandlerRef<null, PsychKnowledgeDTO[]>>(null);
    const [publicPsychKnowledgeState, setPublicPsychKnowledgeState] = useState<ResponseState<PsychKnowledgeDTO[]>>();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [reportingKnowledge, setReportingKnowledge] = useState<PsychKnowledgeDTO | null>(null);
    const [reportType, setReportType] = useState("内容违规");
    const [reportReason, setReportReason] = useState("");
    const [reportError, setReportError] = useState("");
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [likeCountOverrides, setLikeCountOverrides] = useState<Record<number, number>>({});
    const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
    const [likeLoadingMap, setLikeLoadingMap] = useState<Record<number, boolean>>({});

    const normalizeCategoryKey = (rawCategory?: string | null) => {
        const cleaned = rawCategory?.trim().toLowerCase();
        if (!cleaned) {
            return null;
        }
        if (cleaned === "stress") {
            return "pressure";
        }
        return cleaned;
    };

    const resolveCategory = (item: PsychKnowledgeDTO) => {
        const haystack = `${item.title} ${item.content}`.toLowerCase();
        for (const category of KNOWLEDGE_CATEGORIES) {
            if (category.key === "all") {
                continue;
            }
            if (category.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) {
                return category.key;
            }
        }
        return "growth";
    };

    const formatDate = (value: any) => {
        if (!value) {
            return "--";
        }
        const resolved = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(resolved.getTime())) {
            return String(value);
        }
        return resolved.toLocaleDateString("zh-CN");
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

    const buildSnippet = (content: string, limit = 110) => {
        if (!content) {
            return "暂无摘要内容。";
        }
        return content.length > limit ? `${content.slice(0, limit)}...` : content;
    };

    const resolveCoverImage = (coverImage?: string | null) => {
        if (!coverImage || !coverImage.trim()) {
            return null;
        }
        return coverImage;
    };

    const resolveAvatar = (avatar?: string | null) => {
        if (!avatar || !avatar.trim()) {
            return defaultAvatar;
        }
        return avatar;
    };
    const resolveLikeCount = (knowledge: PsychKnowledgeDTO) => {
        const knowledgeId = knowledge.knowledgeId;
        if (Object.prototype.hasOwnProperty.call(likeCountOverrides, knowledgeId)) {
            return likeCountOverrides[knowledgeId];
        }
        return typeof knowledge.likeCount === "number" ? knowledge.likeCount : 0;
    };
    const isLiked = (knowledge: PsychKnowledgeDTO) => {
        const knowledgeId = knowledge.knowledgeId;
        if (Object.prototype.hasOwnProperty.call(likedMap, knowledgeId)) {
            return Boolean(likedMap[knowledgeId]);
        }
        return Boolean(knowledge.liked);
    };
    const isLikeLoading = (knowledgeId: number) => Boolean(likeLoadingMap[knowledgeId]);

    const handleOpenKnowledge = (knowledge: PsychKnowledgeDTO) => {
        if (!knowledge.knowledgeId) {
            return;
        }
        navigate(`/psych_knowledge/detail/${knowledge.knowledgeId}`);
    };

    const handleToggleLike = async (knowledgeId: number) => {
        const username = context.user?.username;
        if (!username) {
            alert("请先登录后再点赞");
            return;
        }
        if (isLikeLoading(knowledgeId)) {
            return;
        }
        setLikeLoadingMap((prev) => ({...prev, [knowledgeId]: true}));
        try {
            const response = await psychKnowledgeController.toggleLike({knowledgeId, username});
            if (response?.status === ReturnObject.Status.SUCCESS && response.data) {
                const data = response.data as { liked?: boolean; likeCount?: number };
                setLikedMap((prev) => ({...prev, [knowledgeId]: Boolean(data.liked)}));
                const nextLikeCount = data.likeCount;
                if (typeof nextLikeCount === "number") {
                    setLikeCountOverrides((prev) => ({...prev, [knowledgeId]: nextLikeCount}));
                }
                return;
            }
            alert(response?.message ?? "点赞失败");
        } catch (error) {
            alert("网络错误，请稍后重试");
        } finally {
            setLikeLoadingMap((prev) => ({...prev, [knowledgeId]: false}));
        }
    };

    const openReportDialog = (knowledge: PsychKnowledgeDTO) => {
        if (!context.user?.username) {
            alert("请先登录后再举报");
            return;
        }
        setReportingKnowledge(knowledge);
        setReportType("内容违规");
        setReportReason("");
        setReportError("");
    };

    const closeReportDialog = () => {
        if (reportSubmitting) {
            return;
        }
        setReportingKnowledge(null);
        setReportType("内容违规");
        setReportReason("");
        setReportError("");
    };

    const submitReport = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!reportingKnowledge || !context.user?.username) {
            setReportError("用户未登录，无法举报");
            return;
        }

        const trimmedReason = reportReason.trim();
        if (!trimmedReason) {
            setReportError("请输入举报理由");
            return;
        }

        const requestBody: PsychKnowledgeReportRequest = {
            knowledgeId: reportingKnowledge.knowledgeId,
            reportType,
            reportReason: trimmedReason,
        };

        try {
            setReportSubmitting(true);
            setReportError("");
            const response = await psychKnowledgeController.report(requestBody);
            if (response.status === ReturnObject.Status.SUCCESS) {
                alert("举报已提交，感谢你的反馈");
                closeReportDialog();
                return;
            }
            setReportError(response.message || "举报失败，请稍后重试");
        } catch (error) {
            setReportError(error instanceof Error ? error.message : "网络错误，请稍后重试");
        } finally {
            setReportSubmitting(false);
        }
    };

    const sortedKnowledge = useMemo(() => {
        const list = publicPsychKnowledgeState?.returnObject?.data ?? [];
        return [...list].sort((a, b) => {
            const timeA = new Date(a.publishTime).getTime();
            const timeB = new Date(b.publishTime).getTime();
            return timeB - timeA;
        });
    }, [publicPsychKnowledgeState?.returnObject?.data]);

    const decoratedKnowledge = useMemo(() => (
        sortedKnowledge.map((item) => ({
            item,
            category: (() => {
                const normalizedCategory = normalizeCategoryKey(item.category);
                if (normalizedCategory && KNOWLEDGE_CATEGORIES.some((it) => it.key === normalizedCategory)) {
                    return normalizedCategory;
                }
                return resolveCategory(item);
            })(),
            views: typeof item.viewCount === "number" ? item.viewCount : resolveViews(item.knowledgeId),
        }))
    ), [sortedKnowledge]);

    const filteredKnowledge = useMemo(() => {
        return decoratedKnowledge.filter(({item, category}) => {
            const matchesCategory = activeCategory === "all" || category === activeCategory;
            const matchesSearch = !searchQuery.trim()
                || item.title.includes(searchQuery.trim())
                || item.content.includes(searchQuery.trim());
            return matchesCategory && matchesSearch;
        });
    }, [decoratedKnowledge, activeCategory, searchQuery]);

    const pageSize = 4;
    const totalPages = Math.max(1, Math.ceil(filteredKnowledge.length / pageSize));
    const currentPageSafe = Math.min(currentPage, totalPages);
    const pagedKnowledge = filteredKnowledge.slice((currentPageSafe - 1) * pageSize, currentPageSafe * pageSize);

    const featuredKnowledge = decoratedKnowledge.slice(0, 2);
    const rankingKnowledge = useMemo(() => (
        [...decoratedKnowledge]
            .sort((a, b) => {
                if (b.views !== a.views) {
                    return b.views - a.views;
                }
                const timeA = new Date(a.item.publishTime).getTime();
                const timeB = new Date(b.item.publishTime).getTime();
                return timeB - timeA;
            })
            .slice(0, 5)
    ), [decoratedKnowledge]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeCategory]);

    const renderPagination = () => {
        if (totalPages <= 1) {
            return null;
        }
        return (
            <div className="psych-knowledge-pagination">
                <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPageSafe === 1}
                >
                    <i className="fa-solid fa-chevron-left"/>
                </button>
                {Array.from({length: totalPages}, (_, index) => index + 1).map((page) => (
                    <button
                        type="button"
                        key={`page-${page}`}
                        className={`pagination-btn${page === currentPageSafe ? " is-active" : ""}`}
                        onClick={() => setCurrentPage(page)}
                    >
                        {page}
                    </button>
                ))}
                <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPageSafe === totalPages}
                >
                    <i className="fa-solid fa-chevron-right"/>
                </button>
            </div>
        );
    };

    const statusMessage = (() => {
        if (publicPsychKnowledgeState?.networkError) {
            return `网络错误：${publicPsychKnowledgeState.networkError.message}`;
        }
        if (publicPsychKnowledgeState?.returnObject?.status && publicPsychKnowledgeState.returnObject.status !== ReturnObject.Status.SUCCESS) {
            return `获取心理科普${ReturnObject.Status.ChineseName.get(publicPsychKnowledgeState.returnObject.status)}：${publicPsychKnowledgeState.returnObject.message}`;
        }
        return "";
    })();

    return (
        <>
            <ResponseHandler<null, PsychKnowledgeDTO[]>
                ref={publicPsychKnowledgeHandlerRef}
                setResponseState={setPublicPsychKnowledgeState}
                request={psychKnowledgeController.listPublic}
                autoRequest={null}
                loadingComponent={<Loading type="dots" text="获取心理知识科普中..." color="#4361ee" size="large" fullScreen/>}
                handlingReturnObjectComponent={<Loading type="dots" text="处理获取心理知识科普结果中..." color="#4361ee" size="large" fullScreen/>}
                idleComponent={<></>}
                networkErrorComponent={<></>}
                finishedComponent={<></>}
            />

            <div className="psych-knowledge-page">
                <section className="psych-knowledge-hero">
                    <h1>心理知识科普</h1>
                    <p>了解心理健康知识，提升心理调适能力，做自己心理健康的第一责任人。</p>
                </section>

                <section className="psych-knowledge-filter card-shadow">
                    <div className="psych-knowledge-search">
                        <i className="fa-solid fa-search"/>
                        <input
                            type="text"
                            value={searchQuery}
                            placeholder="搜索心理知识关键词..."
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                    </div>

                    <div className="psych-knowledge-categories">
                        <h3>知识分类</h3>
                        <div className="psych-knowledge-category-list">
                            {KNOWLEDGE_CATEGORIES.map((category) => (
                                <button
                                    type="button"
                                    key={category.key}
                                    className={`category-btn${activeCategory === category.key ? " is-active" : ""}`}
                                    onClick={() => setActiveCategory(category.key)}
                                >
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {statusMessage ? <div className="psych-knowledge-status">{statusMessage}</div> : null}
                </section>

                <section className="psych-knowledge-featured">
                    <div className="psych-knowledge-section-head">
                        <h3>热门推荐</h3>
                    </div>
                    <div className="psych-knowledge-featured-grid">
                        {featuredKnowledge.length === 0 ? (
                            <div className="psych-knowledge-empty">暂无推荐内容</div>
                        ) : (
                            featuredKnowledge.map(({item, category, views}) => {
                                const coverImage = resolveCoverImage(item.coverImage);
                                return (
                                <article
                                    className={`psych-knowledge-featured-card card-shadow${coverImage ? " has-cover" : ""}`}
                                    key={item.knowledgeId}
                                >
                                    {coverImage ? (
                                        <div className="featured-card-cover">
                                            <img src={coverImage} alt={`${item.title}封面`} />
                                        </div>
                                    ) : null}
                                    <div className="featured-card-content">
                                        <div className="featured-card-meta">
                                            <span className="badge">{KNOWLEDGE_CATEGORIES.find((cat) => cat.key === category)?.label ?? "心理科普"}</span>
                                            <span className="views">
                                                <i className="fa-solid fa-eye"/> {formatViews(views)}
                                            </span>
                                            <span className="likes">
                                                <i className="fa-solid fa-heart"/> {resolveLikeCount(item)}
                                            </span>
                                        </div>
                                        <h4 className="line-clamp-2">{item.title}</h4>
                                        <p className="line-clamp-3">{buildSnippet(item.content, 120)}</p>
                                        <div className="featured-card-footer">
                                            <div className="author">
                                                <img src={resolveAvatar(item.teacherPublisherAvatar)} alt={item.teacherPublisherDisplayName}/>
                                                <span>{item.teacherPublisherDisplayName}</span>
                                            </div>
                                            <div className="article-footer-actions">
                                                <span>{formatDate(item.publishTime)}</span>
                                                <button
                                                    type="button"
                                                    className={`knowledge-like-action${isLiked(item) ? " is-liked" : ""}`}
                                                    onClick={() => handleToggleLike(item.knowledgeId)}
                                                    disabled={isLikeLoading(item.knowledgeId)}
                                                >
                                                    {isLikeLoading(item.knowledgeId) ? "处理中..." : (isLiked(item) ? "已点赞" : "点赞")}
                                                </button>
                                                <button type="button" className="read-more" onClick={() => handleOpenKnowledge(item)}>阅读全文</button>
                                                <button type="button" className="report-link" onClick={() => openReportDialog(item)}>举报</button>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                                );
                            })
                        )}
                    </div>
                </section>

                <section className="psych-knowledge-content">
                    <div className="psych-knowledge-main">
                        <div className="psych-knowledge-section-head">
                            <h3>最新科普文章</h3>
                            <span className="psych-knowledge-section-hint">持续更新的心理科普内容</span>
                        </div>

                        <div className="psych-knowledge-list">
                            {pagedKnowledge.length === 0 ? (
                                <div className="psych-knowledge-empty">暂无符合条件的文章</div>
                            ) : (
                                pagedKnowledge.map(({item, category, views}) => {
                                    const coverImage = resolveCoverImage(item.coverImage);
                                    return (
                                    <article
                                        className={`psych-knowledge-article card-shadow${coverImage ? " has-cover" : ""}`}
                                        key={item.knowledgeId}
                                    >
                                        {coverImage ? (
                                            <div className="article-cover">
                                                <img src={coverImage} alt={`${item.title}封面`} />
                                            </div>
                                        ) : null}
                                        <div className="article-body">
                                            <div className="article-meta">
                                                <span className="badge">{KNOWLEDGE_CATEGORIES.find((cat) => cat.key === category)?.label ?? "心理科普"}</span>
                                                <span className="views">
                                                    <i className="fa-solid fa-eye"/> {formatViews(views)}
                                                </span>
                                                <span className="likes">
                                                    <i className="fa-solid fa-heart"/> {resolveLikeCount(item)}
                                                </span>
                                            </div>
                                            <h4 className="line-clamp-2">{item.title}</h4>
                                            <p className="line-clamp-3">{buildSnippet(item.content)}</p>
                                            <div className="article-footer">
                                                <div className="author">
                                                    <img src={resolveAvatar(item.teacherPublisherAvatar)} alt={item.teacherPublisherDisplayName}/>
                                                    <span>{item.teacherPublisherDisplayName}</span>
                                                </div>
                                                <div className="article-footer-actions">
                                                    <span>{formatDate(item.publishTime)}</span>
                                                    <button
                                                        type="button"
                                                        className={`knowledge-like-action${isLiked(item) ? " is-liked" : ""}`}
                                                        onClick={() => handleToggleLike(item.knowledgeId)}
                                                        disabled={isLikeLoading(item.knowledgeId)}
                                                    >
                                                        {isLikeLoading(item.knowledgeId) ? "处理中..." : (isLiked(item) ? "已点赞" : "点赞")}
                                                    </button>
                                                    <button type="button" className="read-more" onClick={() => handleOpenKnowledge(item)}>阅读全文</button>
                                                    <button type="button" className="report-link" onClick={() => openReportDialog(item)}>举报</button>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                    );
                                })
                            )}
                        </div>
                        {renderPagination()}
                    </div>

                    <aside className="psych-knowledge-sidebar">
                        <div className="psych-knowledge-sidebar-card card-shadow">
                            <h3>阅读排行</h3>
                            <div className="ranking-list">
                                {rankingKnowledge.length === 0 ? (
                                    <div className="ranking-empty">暂无排行数据</div>
                                ) : rankingKnowledge.map(({item, views}, index) => (
                                    <div className="ranking-item" key={`rank-${item.knowledgeId}`}>
                                        <span className={`ranking-index ranking-${index + 1}`}>{index + 1}</span>
                                        <div>
                                            <button
                                                type="button"
                                                className="ranking-title ranking-title-btn line-clamp-1"
                                                onClick={() => handleOpenKnowledge(item)}
                                                title={item.title}
                                            >
                                                {item.title}
                                            </button>
                                            <div className="ranking-meta">{formatViews(views)} 阅读</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="psych-knowledge-tip card-shadow">
                            <div className="tip-header">
                                <i className="fa-solid fa-lightbulb"/>
                                <h3>心理科普小贴士</h3>
                            </div>
                            <ul>
                                {TIPS.map((tip) => (
                                    <li key={tip}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </section>

                <section className="psych-knowledge-videos">
                    <div className="psych-knowledge-section-head">
                        <h3>科普视频</h3>
                        <span className="psych-knowledge-section-hint">通过视频快速掌握心理知识</span>
                    </div>
                    <div className="psych-knowledge-video-grid">
                        {VIDEO_CARDS.map((video) => (
                            <a
                                className="psych-knowledge-video card-shadow"
                                key={video.title}
                                href={video.url}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={video.title}
                            >
                                <div className="video-cover">
                                    <img src={video.image} alt={video.title}/>
                                    <div className="video-overlay">
                                        <span className="video-play">
                                            <i className="fa-solid fa-play"/>
                                        </span>
                                    </div>
                                    <span className="video-duration">{video.duration}</span>
                                </div>
                                <div className="video-body">
                                    <h4 className="line-clamp-2">{video.title}</h4>
                                    <div className="video-meta">
                                        <span><i className="fa-solid fa-eye"/> {video.views}</span>
                                        <span>{video.date}</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </section>
            </div>

            {reportingKnowledge ? (
                <div className="psych-knowledge-report-modal" onClick={closeReportDialog}>
                    <div className="psych-knowledge-report-modal__panel" onClick={(event) => event.stopPropagation()}>
                        <div className="psych-knowledge-report-modal__header">
                            <h3>举报科普文章</h3>
                            <button type="button" onClick={closeReportDialog} disabled={reportSubmitting}>
                                <i className="fa-solid fa-xmark"/>
                            </button>
                        </div>
                        <p className="psych-knowledge-report-modal__title">{reportingKnowledge.title}</p>
                        <form onSubmit={submitReport} className="psych-knowledge-report-modal__form">
                            <label htmlFor="knowledge-report-type">举报类型</label>
                            <select
                                id="knowledge-report-type"
                                value={reportType}
                                onChange={(event) => setReportType(event.target.value)}
                                disabled={reportSubmitting}
                            >
                                {REPORT_TYPE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                            <label htmlFor="knowledge-report-reason">举报理由</label>
                            <textarea
                                id="knowledge-report-reason"
                                value={reportReason}
                                onChange={(event) => setReportReason(event.target.value)}
                                placeholder="请简要描述举报原因"
                                maxLength={500}
                                disabled={reportSubmitting}
                            />
                            {reportError ? <div className="psych-knowledge-report-modal__error">{reportError}</div> : null}
                            <div className="psych-knowledge-report-modal__actions">
                                <button type="button" className="report-cancel-btn" onClick={closeReportDialog} disabled={reportSubmitting}>
                                    取消
                                </button>
                                <button type="submit" className="report-submit-btn" disabled={reportSubmitting}>
                                    {reportSubmitting ? "提交中..." : "提交举报"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </>
    );
};
