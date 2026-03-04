import React, {useEffect, useMemo, useRef, useState} from "react";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import {useOutletContext} from "react-router";
import {ResponseHandler, ResponseHandlerRef} from "../../common/response/ResponseHandler";
import {PsychKnowledgeController} from "../../controller/PsychKnowledgeController";
import {PsychKnowledgeDTO} from "../../entity/DTO/PsychKnowledgeDTO";
import {ResponseState} from "../../common/response/ResponseState";
import {Loading} from "../../common/view/display/Loading";
import {ReturnObject} from "../../common/response/ReturnObject";
import {Button} from "../../common/view/controller/Button";
import {PsychKnowledgeRoot} from "./PsychKnowledgeRootPage";
import {UserRole} from "../../entity/enums/UserRole";
import defaultAvatar from "../../assets/avatar/default-avatar.png";
import "./PsychKnowledgeDetail.css";

const VIEW_INCREMENT_PENDING = new Set<string>();
const VIEW_INCREMENT_DONE = new Set<string>();

const CATEGORY_LABELS: Record<string, string> = {
    emotion: "情绪管理",
    pressure: "压力应对",
    relationship: "人际关系",
    growth: "自我成长",
    study: "学习心理",
    sleep: "睡眠健康",
    anxiety: "焦虑缓解"
};

export const PsychKnowledgeDetailForm: React.FC = () => {
    const {knowledgeId} = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const context = useOutletContext<PsychKnowledgeRoot.OutletContext>();
    const psychKnowledgeController = new PsychKnowledgeController();
    const detailHandlerRef = useRef<ResponseHandlerRef<{knowledgeId: number}, PsychKnowledgeDTO>>(null);
    const [detailState, setDetailState] = useState<ResponseState<PsychKnowledgeDTO>>();
    const [viewCount, setViewCount] = useState<number | null>(null);
    const [likeCount, setLikeCount] = useState<number | null>(null);
    const [liked, setLiked] = useState(false);
    const [likeSubmitting, setLikeSubmitting] = useState(false);

    const numericId = useMemo(() => {
        const parsed = Number(knowledgeId);
        return Number.isNaN(parsed) ? null : parsed;
    }, [knowledgeId]);

    useEffect(() => {
        if (numericId == null) {
            return;
        }
        detailHandlerRef.current?.request({knowledgeId: numericId});
    }, [numericId, context.user?.username, context.user?.role]);

    useEffect(() => {
        const data = detailState?.returnObject?.data;
        if (!data) {
            return;
        }
        setLikeCount(typeof data.likeCount === "number" ? data.likeCount : 0);
        setLiked(Boolean(data.liked));
    }, [detailState?.returnObject?.data?.knowledgeId, detailState?.returnObject?.data?.likeCount, detailState?.returnObject?.data?.liked]);

    const isTeacher = Number(context.user?.role) === UserRole.TEACHER;
    const isAdmin = UserRole.isAdminRole(context.user?.role);
    const teacherUsername = context.user?.username ?? "";
    const fromPath = typeof (location.state as {from?: unknown} | null)?.from === "string"
        ? (location.state as {from: string}).from
        : null;
    const viewOnceKey = useMemo(() => {
        if (numericId == null) {
            return null;
        }
        return `${location.key || "default"}:${numericId}`;
    }, [location.key, numericId]);

    const requestDetail = async ({knowledgeId}: {knowledgeId: number}) => {
        if (!isTeacher || !teacherUsername) {
            return psychKnowledgeController.detail({knowledgeId});
        }
        const publicResult = await psychKnowledgeController.detail({knowledgeId});
        if (publicResult?.status === ReturnObject.Status.SUCCESS) {
            return publicResult;
        }
        return psychKnowledgeController.teacherDetail({knowledgeId, teacherUsername});
    };

    const handleViewIncrement = (data?: PsychKnowledgeDTO | null) => {
        if (!data?.knowledgeId) {
            return;
        }
        if (data.publishStatus === "draft") {
            return;
        }
        if (!viewOnceKey) {
            return;
        }
        if (VIEW_INCREMENT_DONE.has(viewOnceKey) || VIEW_INCREMENT_PENDING.has(viewOnceKey)) {
            return;
        }
        VIEW_INCREMENT_PENDING.add(viewOnceKey);
        psychKnowledgeController.incrementView({knowledgeId: data.knowledgeId}).then((response) => {
            if (response?.status === ReturnObject.Status.SUCCESS && typeof response.data === "number") {
                setViewCount(response.data);
                VIEW_INCREMENT_DONE.add(viewOnceKey);
                VIEW_INCREMENT_PENDING.delete(viewOnceKey);
                return;
            }
            VIEW_INCREMENT_PENDING.delete(viewOnceKey);
        }).catch(() => {
            VIEW_INCREMENT_PENDING.delete(viewOnceKey);
        });
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

    const resolveAvatar = (avatar?: string | null) => {
        if (!avatar || !avatar.trim()) {
            return defaultAvatar;
        }
        return avatar;
    };

    const resolveCoverImage = (coverImage?: string | null) => {
        if (!coverImage || !coverImage.trim()) {
            return null;
        }
        return coverImage;
    };

    const handleToggleLike = async () => {
        if (numericId == null) {
            return;
        }
        const username = context.user?.username;
        if (!username) {
            alert("请先登录后再点赞");
            return;
        }
        if (likeSubmitting) {
            return;
        }
        setLikeSubmitting(true);
        try {
            const response = await psychKnowledgeController.toggleLike({knowledgeId: numericId, username});
            if (response?.status === ReturnObject.Status.SUCCESS && response.data) {
                const data = response.data as { liked?: boolean; likeCount?: number };
                setLiked(Boolean(data.liked));
                if (typeof data.likeCount === "number") {
                    setLikeCount(data.likeCount);
                }
                return;
            }
            alert(response?.message ?? "点赞失败");
        } catch (error) {
            alert("网络错误，请稍后重试");
        } finally {
            setLikeSubmitting(false);
        }
    };

    const backPath = fromPath
        ?? (isTeacher
            ? "/psych_knowledge/mine/teacher"
            : (isAdmin ? "/home/admin/knowledge" : "/psych_knowledge/browse"));

    return (
        <div className="psych-knowledge-detail-page">
            <div className="detail-toolbar">
                <Button type="default" onClick={() => navigate(backPath)}>返回</Button>
            </div>

            <ResponseHandler<{knowledgeId: number}, PsychKnowledgeDTO>
                ref={detailHandlerRef}
                request={requestDetail}
                setResponseState={setDetailState}
                onHandlingReturnObject={(_, returnObject) => {
                    if (returnObject?.status === ReturnObject.Status.SUCCESS) {
                        handleViewIncrement(returnObject.data);
                    }
                }}
                idleComponent={<div className="detail-empty">暂无数据</div>}
                loadingComponent={<Loading type="dots" text="加载科普详情中..." color="#4361ee" size="large" fullScreen/>}
                handlingReturnObjectComponent={<Loading type="dots" text="处理科普详情中..." color="#4361ee" size="large" fullScreen/>}
                networkErrorComponent={<div className="detail-empty">网络错误：{detailState?.networkError?.message}</div>}
                finishedComponent={(!(detailState?.returnObject?.status === ReturnObject.Status.SUCCESS)) ? (
                    <div className="detail-empty">
                        获取科普详情{ReturnObject.Status.ChineseName.get(detailState?.returnObject?.status)}：{detailState?.returnObject?.message}
                    </div>
                ) : (
                    detailState?.returnObject?.data ? (
                        <div className="detail-card">
                            <div className="detail-meta">
                                <span className="badge">{CATEGORY_LABELS[detailState.returnObject.data.category ?? "growth"] ?? "心理科普"}</span>
                                <span className="views">
                                    <i className="fa-solid fa-eye"/> {formatViews(viewCount ?? detailState.returnObject.data.viewCount ?? 0)}
                                </span>
                                <span className="likes">
                                    <i className="fa-solid fa-heart"/> {formatViews(likeCount ?? detailState.returnObject.data.likeCount ?? 0)}
                                </span>
                                <span>{formatDate(detailState.returnObject.data.publishTime)}</span>
                            </div>
                            <h1 className="detail-title">{detailState.returnObject.data.title}</h1>
                            {resolveCoverImage(detailState.returnObject.data.coverImage) ? (
                                <div className="detail-cover">
                                    <img
                                        src={resolveCoverImage(detailState.returnObject.data.coverImage) ?? ""}
                                        alt={`${detailState.returnObject.data.title}封面`}
                                    />
                                </div>
                            ) : null}
                            <div className="detail-author">
                                <div className="author">
                                    <img src={resolveAvatar(detailState.returnObject.data.teacherPublisherAvatar)} alt={detailState.returnObject.data.teacherPublisherDisplayName}/>
                                    <span>{detailState.returnObject.data.teacherPublisherDisplayName}</span>
                                </div>
                                <span>发布账号：{detailState.returnObject.data.teacherPublisherUsername}</span>
                            </div>
                            <div className="detail-content">
                                {detailState.returnObject.data.content}
                            </div>
                            <div className="detail-actions">
                                <button
                                    type="button"
                                    className={`detail-like-btn${liked ? " is-liked" : ""}`}
                                    onClick={handleToggleLike}
                                    disabled={likeSubmitting}
                                >
                                    <i className="fa-solid fa-heart"/>
                                    <span>{likeSubmitting ? "处理中..." : (liked ? "已点赞" : "点赞")}</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="detail-empty">暂无内容</div>
                    )
                )}
            />
        </div>
    );
};
