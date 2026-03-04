import React, {useEffect, useMemo, useRef, useState} from "react";
import {PostController, PostReportRequest, ReplyRequest} from "../../../controller/PostController";
import {ResponseState} from "../../../common/response/ResponseState";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {ReplyDTO} from "../../../entity/ReplyDTO";
import {PostDTO} from "../../../entity/PostDTO";
import {Loading} from "../../../common/view/display/Loading";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Textarea, TextareaCallback, TextareaRef} from "../../../common/view/input/Textarea";
import {Button} from "../../../common/view/controller/Button";
import {Reply} from "../../../entity/Reply";
import {Dialog, DialogRef} from "../../../common/view/container/Dialog";
import {ReplyView} from "../../../component/view/ReplyView";
import {PostReport} from "../../../entity/PostReport";
import {ReportView} from "../../../component/view/ReportView";
import defaultAvatar from "../../../assets/avatar/default-avatar.png";
import {inferPostTag} from "./tagOptions";

export interface PostCardProps {
    username:string;
    mode:'browse'|'report';
    postDTO: PostDTO;
    onDeletePost:(post:PostDTO) => void;
    onLikeChange?: (postId: number, likeCount: number) => void;
    onFavoriteChange?: (postId: number, favorited: boolean, favoriteCount: number) => void;
    highlightKeyword?: string;
    forceOwnerPost?: boolean;
    defaultFavorited?: boolean;
}

const REPORT_TYPE_OPTIONS = ["内容违规", "广告推广", "人身攻击", "隐私泄露", "其他"] as const;
const CHILD_REPLY_PREVIEW_COUNT = 3;


const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightText = (text: string | undefined | null, keyword: string) => {
    const source = text ?? "";
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) {
        return source;
    }
    const matcher = new RegExp(`(${escapeRegExp(trimmedKeyword)})`, "ig");
    const parts = source.split(matcher);
    return parts.map((part, index) => (
        part.toLowerCase() === trimmedKeyword.toLowerCase()
            ? <mark key={`highlight-${index}`} className="community-highlight">{part}</mark>
            : <React.Fragment key={`text-${index}`}>{part}</React.Fragment>
    ));
};

export const PostCard:React.FC<PostCardProps>=({
    username,
    postDTO,
    mode,
    onDeletePost,
    onLikeChange,
    onFavoriteChange,
    highlightKeyword = "",
    forceOwnerPost = false,
    defaultFavorited = false
}) => {

    //控制器
    const postController = new PostController();
    const [repliesState, setRepliesState] = React.useState<ResponseState<ReplyDTO[]>>();
    const repliesHandlerRef = useRef<ResponseHandlerRef<{ postId: number }, ReplyDTO[]>>(null);

    const [reportsState,setReportsState]=useState<ResponseState<PostReport[]>>();
    const reportsHandlerRef = useRef<ResponseHandlerRef<{postId:number},PostReport[]>>(null);



    const [replyState, setReplyState] = React.useState<ResponseState<any>>();
    const [repliesOpen, setRepliesOpen] = useState(mode === "report");
    const replyHandlerRef = useRef<ResponseHandlerRef<ReplyRequest, any>>(null);
    const replyContentTextareaRef = useRef<TextareaRef>(null);
    const replyResultDialogRef = useRef<DialogRef>(null);
    const [replyTarget, setReplyTarget] = useState<ReplyDTO | null>(null);
    const [replyFormData, setReplyFormData] = React.useState<ReplyRequest>({
        content: "", postId: 0, username: username, parentReplyId: null
    });
    const reportDialogRef = useRef<DialogRef>(null);
    const reportReasonTextareaRef = useRef<TextareaRef>(null);
    const [reportFormData, setReportFormData] = React.useState<PostReportRequest>({
        postId: postDTO.postId, reportType: "内容违规", reportReason: ""
    });
    const reportResultDialogRef = useRef<DialogRef>(null);
    const reportHandlerRef = useRef<ResponseHandlerRef<PostReportRequest, any>>(null);
    const [reportState, setReportState] = useState<ResponseState>();

    const [deletePostState,setDeletePostState] = useState<ResponseState>();
    const deletePostHandlerRef=useRef<ResponseHandlerRef<{postId:number},null>>(null);
    const deletePostResultDialogRef=useRef<DialogRef>(null);
    const [likeCount, setLikeCount] = useState<number>(postDTO.likeCount ?? 0);
    const [liked, setLiked] = useState(false);
    const [favorited, setFavorited] = useState(defaultFavorited);
    const [favoriteCount, setFavoriteCount] = useState<number>(postDTO.favoriteCount ?? 0);

    const [collapsedRootReplyMap, setCollapsedRootReplyMap] = useState<Record<number, boolean>>({});
    const [visibleChildCountMap, setVisibleChildCountMap] = useState<Record<number, number>>({});

    const parseReplyTime = (value: unknown) => {
        const date = new Date(value as string);
        return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    const replyThreads = useMemo(() => {
        const replies = repliesState?.returnObject?.data ?? [];
        const rootReplies: ReplyDTO[] = [];
        const childRepliesByRoot = new Map<number, ReplyDTO[]>();
        if (!replies.length) {
            return {rootReplies, childRepliesByRoot};
        }

        const replyById = new Map<number, ReplyDTO>();
        replies.forEach((item) => {
            replyById.set(item.replyId, item);
        });

        const resolveRootReplyId = (reply: ReplyDTO) => {
            let parentId = reply.parentReplyId ?? null;
            if (parentId === null || !replyById.has(parentId)) {
                return reply.replyId;
            }
            const visited = new Set<number>();
            let rootId = parentId;
            while (parentId !== null && replyById.has(parentId)) {
                if (visited.has(parentId)) {
                    return reply.replyId;
                }
                visited.add(parentId);
                rootId = parentId;
                parentId = replyById.get(parentId)?.parentReplyId ?? null;
            }
            return rootId;
        };

        replies.forEach((item) => {
            const rootReplyId = resolveRootReplyId(item);
            if (rootReplyId === item.replyId) {
                rootReplies.push(item);
                return;
            }
            const bucket = childRepliesByRoot.get(rootReplyId) ?? [];
            bucket.push(item);
            childRepliesByRoot.set(rootReplyId, bucket);
        });

        rootReplies.sort((a, b) => parseReplyTime(b.replyTime) - parseReplyTime(a.replyTime));
        childRepliesByRoot.forEach((bucket) => {
            bucket.sort((a, b) => parseReplyTime(b.replyTime) - parseReplyTime(a.replyTime));
        });

        return {rootReplies, childRepliesByRoot};
    }, [repliesState?.returnObject?.data]);

    const handleToggleRootReply = (rootReplyId: number) => {
        setCollapsedRootReplyMap((prev) => ({
            ...prev,
            [rootReplyId]: !(prev[rootReplyId] ?? false)
        }));
    };

    const handleShowMoreChildReplies = (rootReplyId: number, total: number) => {
        setVisibleChildCountMap((prev) => {
            const current = prev[rootReplyId] ?? CHILD_REPLY_PREVIEW_COUNT;
            return {
                ...prev,
                [rootReplyId]: Math.min(current + CHILD_REPLY_PREVIEW_COUNT, total)
            };
        });
    };

    const renderReplyCard = (value: ReplyDTO) => (
        <ReplyView
            key={value.replyId}
            replyDTO={value}
            mode={mode}
            currentUsername={username}
            onDeleteReply={() => {
                repliesHandlerRef.current?.recover();
                repliesHandlerRef.current?.request({postId: postDTO.postId});
            }}
            onReply={(targetReply) => {
                setReplyTarget(targetReply);
                setRepliesOpen(true);
                setTimeout(() => {
                    replyContentTextareaRef.current?.focus();
                }, 0);
            }}
        />
    );

    const replayCardList = replyThreads.rootReplies.map((rootReply) => {
        const childReplies = replyThreads.childRepliesByRoot.get(rootReply.replyId) ?? [];
        const isCollapsed = collapsedRootReplyMap[rootReply.replyId] ?? false;
        const visibleCount = visibleChildCountMap[rootReply.replyId] ?? CHILD_REPLY_PREVIEW_COUNT;
        const visibleChildReplies = mode === "browse" ? childReplies.slice(0, visibleCount) : childReplies;
        const hiddenChildCount = childReplies.length - visibleChildReplies.length;

        return (
            <div className="reply-thread" key={`thread-${rootReply.replyId}`}>
                {renderReplyCard(rootReply)}
                {mode === "browse" && childReplies.length > 0 && (
                    <div className="reply-thread-toolbar">
                        <button
                            type="button"
                            className="reply-thread-toggle-btn"
                            onClick={() => handleToggleRootReply(rootReply.replyId)}
                        >
                            {isCollapsed ? `展开二层回复 (${childReplies.length})` : `收起二层回复 (${childReplies.length})`}
                        </button>
                    </div>
                )}
                {!isCollapsed && visibleChildReplies.length > 0 && (
                    <div className="reply-thread-children">
                        {visibleChildReplies.map(renderReplyCard)}
                    </div>
                )}
                {mode === "browse" && !isCollapsed && hiddenChildCount > 0 && (
                    <div className="reply-thread-more">
                        <button
                            type="button"
                            className="reply-thread-more-btn"
                            onClick={() => handleShowMoreChildReplies(rootReply.replyId, childReplies.length)}
                        >
                            查看更多回复 ({hiddenChildCount})
                        </button>
                    </div>
                )}
            </div>
        );
    });

    const reportCardList=reportsState?.returnObject?.data?.map((value:PostReport)=>
        <ReportView postReport={value} onDeleteReport={()=>{
            reportsHandlerRef.current?.recover();
            reportsHandlerRef.current?.request({postId: postDTO.postId});
        }}/>
    )

    const confirmDeletePostDialogRef = useRef<DialogRef>(null);

    const displayName = postDTO.isAnonymous ? "匿名用户" : postDTO.displayName;
    const postTag = postDTO.primaryTag && postDTO.primaryTag.trim()
        ? postDTO.primaryTag.trim()
        : inferPostTag(postDTO.title, postDTO.content);
    const isPostOwner = !!postDTO.username && postDTO.username === username;
    const canDeleteOwnPost = mode === "browse" && (forceOwnerPost || isPostOwner);
    const authorAvatar = postDTO.isAnonymous
        ? undefined
        : (postDTO.avatar && postDTO.avatar.trim() ? postDTO.avatar : defaultAvatar);
    const publishTimeLabel = (() => {
        const raw = postDTO.publishTime as unknown as string;
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
            return raw ? String(raw) : "";
        }
        return date.toLocaleString();
    })();
    const replyCount = repliesState?.returnObject?.data?.length ?? 0;
    const canComment = postDTO.allowComment !== false;

    useEffect(() => {
        setLikeCount(postDTO.likeCount ?? 0);
    }, [postDTO.likeCount]);

    useEffect(() => {
        setFavorited(defaultFavorited);
    }, [defaultFavorited, postDTO.postId]);

    useEffect(() => {
        setFavoriteCount(postDTO.favoriteCount ?? 0);
    }, [postDTO.favoriteCount, postDTO.postId]);

    const handleToggleLike = async () => {
        if (!username) {
            alert("请先登录");
            window.location.href = "#/auth/login";
            return;
        }
        try {
            const response = await postController.toggleLike({postId: postDTO.postId, username});
            if (response?.status === ReturnObject.Status.SUCCESS) {
                const data = response.data as { liked?: boolean; likeCount?: number } | undefined;
                if (data) {
                    setLiked(Boolean(data.liked));
                    if (typeof data.likeCount === "number") {
                        setLikeCount(data.likeCount);
                        onLikeChange?.(postDTO.postId, data.likeCount);
                    }
                }
            } else {
                alert(response?.message ?? "点赞失败");
            }
        } catch (error) {
            alert("网络错误");
        }
    };

    const handleToggleFavorite = async () => {
        if (!username) {
            alert("请先登录");
            window.location.href = "#/auth/login";
            return;
        }
        try {
            const response = await postController.toggleFavorite({postId: postDTO.postId, username});
            if (response?.status === ReturnObject.Status.SUCCESS) {
                const data = response.data as { favorited?: boolean; favoriteCount?: number } | undefined;
                if (data && typeof data.favorited === "boolean" && typeof data.favoriteCount === "number") {
                    setFavorited(data.favorited);
                    setFavoriteCount(data.favoriteCount);
                    onFavoriteChange?.(postDTO.postId, data.favorited, data.favoriteCount);
                }
            } else {
                alert(response?.message ?? "收藏操作失败");
            }
        } catch (error) {
            alert("网络错误");
        }
    };

    const confirmDeletePostDialog = (<Dialog
        ref={confirmDeletePostDialogRef}
        type="modal"
        title="删除倾述"
        showCloseButton
        closeOnBackdropClick
        closeOnEscape
    >
        <div className="layout-flex-column">
            <p className="text-align-left">确定要删除该贴吗？</p>
            <br/>
            <div className="layout-flex-row justify-content-flex-end">
                <span style={{flexGrow: 2}}></span>
                <Button type="default" style={{flexGrow: 1}} onClick={() => {
                    confirmDeletePostDialogRef.current?.close();
                }}>返回</Button>
                <span style={{flexGrow: 0.1}}></span>
                <Button type="primary" style={{flexGrow: 1}} onClick={() => {
                    confirmDeletePostDialogRef.current?.close();
                    deletePostHandlerRef.current?.request({postId:postDTO.postId});
                }}>确定</Button>
            </div>
        </div>
    </Dialog>);


    const deletePostResultDialog=(<ResponseHandler<{postId:number},null>
        ref={deletePostHandlerRef}
        request={postController.deletePost}
        setResponseState={setDeletePostState}
        idleComponent={<></>}
        loadingComponent={<Loading type="dots" text='删除中...' color="#2196f3" size="large" fullScreen></Loading>}
        handlingReturnObjectComponent={<Loading type="dots" text='处理删除结果中...' color="#2196f3" size="large" fullScreen></Loading>}
        networkErrorComponent={<Dialog
            autoOpen
            ref={deletePostResultDialogRef}
            type="modal"
            title="网络错误"
            showCloseButton
            closeOnBackdropClick
            closeOnEscape
        >
            <div className="layout-flex-column">
                <p className="text-align-left">详情：{deletePostState?.networkError?.message}</p>
                <br/>
                <div className="layout-flex-row justify-content-flex-end">
                    <span style={{flexGrow: 3.1}}></span>
                    <Button type="default"
                            style={{flexGrow: 1}} onClick={() => {
                        deletePostResultDialogRef.current?.close();
                    }}>返回</Button>
                </div>
            </div>

        </Dialog>}
        finishedComponent={<Dialog
            autoOpen
            ref={deletePostResultDialogRef}
            type="modal"
            title={"删除帖子" + ReturnObject.Status.ChineseName.get(deletePostState?.returnObject?.status)}
            showCloseButton
            closeOnBackdropClick
            closeOnEscape
            onClose={() => {
                if (deletePostState?.returnObject?.status === ReturnObject.Status.SUCCESS) {
                    onDeletePost?.(postDTO);
                }
            }}
        >
            <div className="layout-flex-column">
                <p className="text-align-left">{deletePostState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "删除帖子成功" : deletePostState?.returnObject?.message}</p>
                <br/>
                <div className="layout-flex-row justify-content-flex-end">
                    <span style={{flexGrow: 3.1}}></span>
                    <Button type={deletePostState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "primary" : "default"}
                            style={{flexGrow: 1}} onClick={() => {
                        deletePostResultDialogRef.current?.close();
                    }}>{deletePostState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "确定" : "返回"}</Button>

                </div>
            </div>

        </Dialog>}
    />);


    const summitReplay = (event: { preventDefault: () => void; }) => {
        // 手动验证所有字段
        event.preventDefault();
        if (!canComment) {
            alert("该倾诉帖已关闭评论");
            return;
        }
        const isReplayContentValid = replyContentTextareaRef.current?.validate();
        if (isReplayContentValid) {
            const requestBody: ReplyRequest = {
                postId: postDTO.postId,
                username: username,
                content: replyFormData.content,
                parentReplyId: replyTarget?.replyId ?? null
            };
            replyHandlerRef.current?.request(requestBody);
        } else {
            alert('请检查表单错误!');
        }
    };

    const handleReportSummit = (event: { preventDefault: () => void; }) => {
        // 手动验证所有字段
        const isReportReasonValid = reportReasonTextareaRef.current?.validate();
        // 阻止默认提交
        event.preventDefault();
        if (isReportReasonValid) {
            const requestBody: PostReportRequest = {
                postId: postDTO.postId,
                reportType: reportFormData.reportType,
                reportReason: reportFormData.reportReason
            };
            //console.log("暂停测试：",formData);alert("暂停测试");
            reportDialogRef.current?.close();
            reportHandlerRef.current?.request(requestBody);
        } else {
            alert('请检查表单错误!');
        }
    };

    const ReportResultDialog = (<ResponseHandler<PostReportRequest, any>
        ref={reportHandlerRef}
        request={postController.report}
        setResponseState={setReportState}
        loadingComponent={<Loading
            type="dots"
            text='举报中...'
            color="#2196f3"
            size="large"
            fullScreen/>}
        handlingReturnObjectComponent={<Loading
            type="dots"
            text='处理举报结果中...'
            color="#2196f3"
            size="large"
            fullScreen/>}
        networkErrorComponent={
            <Dialog
                autoOpen
                ref={reportResultDialogRef}
                type="modal"
                title="网络错误"
                showCloseButton
                closeOnBackdropClick
                closeOnEscape
            >
                <div className="layout-flex-column">
                    <p className="text-align-left">{reportState?.networkError?.message}</p>
                    <br/>
                    <div className="layout-flex-row justify-content-flex-end">
                        <span style={{flexGrow: 3.1}}></span>
                        <Button type="default"
                                style={{flexGrow: 1}} onClick={() => {
                            reportResultDialogRef.current?.close();
                        }}>返回</Button>
                    </div>
                </div>

            </Dialog>}
        finishedComponent={
            <Dialog
                ref={reportResultDialogRef}
                autoOpen
                type="modal"
                title={"举报" + ReturnObject.Status.ChineseName.get(reportState?.returnObject?.status)}
                showCloseButton
                closeOnBackdropClick
                closeOnEscape
            >
                <div className="layout-flex-column">
                    {reportState?.returnObject?.status === ReturnObject.Status.SUCCESS ? (
                        <p className="text-align-left">举报成功</p>
                    ) : (
                        <p className="text-align-left">{reportState?.returnObject?.message}
                        </p>
                    )}
                    <br/>
                    <div className="layout-flex-row justify-content-flex-end">
                        <span style={{flexGrow: 3.1}}></span>
                        <Button
                            type={(reportState?.returnObject?.status === ReturnObject.Status.SUCCESS) ? "primary" : "default"}
                            style={{flexGrow: 1}} onClick={() => {
                            reportResultDialogRef.current?.close();
                        }}>{(reportState?.returnObject?.status === ReturnObject.Status.SUCCESS) ? "确定" : "返回"}</Button>
                    </div>
                </div>
            </Dialog>
        }
    />);


    const ReportDialog = (
        <Dialog
            ref={reportDialogRef}
            type="modal"
            title="举报"
            showCloseButton
            closeOnBackdropClick
            closeOnEscape
        >
            <div className="layout-flex-column">
                <form onSubmit={handleReportSummit}>
                    <div className="form-group">
                        <label className="report-type-label">举报类型</label>
                        <select
                            className="report-type-select"
                            value={reportFormData.reportType}
                            onChange={(event) => setReportFormData((prev) => ({...prev, reportType: event.target.value}))}
                        >
                            {REPORT_TYPE_OPTIONS.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <Textarea
                        ref={reportReasonTextareaRef}
                        label="举报理由"
                        placeholder="请输入举报理由"
                        onChange={TextareaCallback.handleDataChange<PostReportRequest>("reportReason", setReportFormData, null)}
                        required
                    />
                    <br/>
                    <div className="layout-flex-row justify-content-flex-end">
                        <span style={{flexGrow: 2}}></span>
                        <Button type="default" style={{flexGrow: 1}} onClick={() => {
                            reportDialogRef.current?.close();
                        }}>返回</Button>
                        <span style={{flexGrow: 0.1}}></span>
                        <Button type="primary" style={{flexGrow: 1}} summit>举报</Button>
                    </div>
                </form>
            </div>


        </Dialog>);

    const ReplyResultDialog = (
        <ResponseHandler<ReplyRequest, any>
            ref={replyHandlerRef}
            request={postController.reply}
            setResponseState={setReplyState}
            idleComponent={<></>}
            loadingComponent={
                <Loading
                    type="dots"
                    text='回复中...'
                    color="#2196f3"
                    size="large"
                    fullScreen/>}
            handlingReturnObjectComponent={<Loading
                type="dots"
                text='处理回复结果中...'
                color="#2196f3"
                size="large"
                fullScreen/>}
            networkErrorComponent={
                <Dialog
                    autoOpen
                    ref={replyResultDialogRef}
                    type="modal"
                    title="网络错误"
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">{replyState?.networkError?.message}</p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button type="default"
                                    style={{flexGrow: 1}} onClick={() => {
                                replyResultDialogRef.current?.close();
                            }}>返回</Button>
                        </div>
                    </div>

                </Dialog>}
            finishedComponent={
                <Dialog
                    ref={replyResultDialogRef}
                    autoOpen
                    type="modal"
                    title={"回复" + ReturnObject.Status.ChineseName.get(replyState?.returnObject?.status)}
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                    onClose={() => {
                        if (replyState?.returnObject?.status === ReturnObject.Status.SUCCESS) {
                            setReplyTarget(null);
                            setReplyFormData((prev) => ({...prev, content: "", parentReplyId: null}));
                            replyContentTextareaRef.current?.clear();
                            repliesHandlerRef.current?.recover();
                            repliesHandlerRef.current?.request({postId: postDTO.postId});
                        }
                    }}
                >
                    <div className="layout-flex-column">
                        {replyState?.returnObject?.status === ReturnObject.Status.SUCCESS ? (
                            <p className="text-align-left">回复成功</p>
                        ) : (
                            <p className="text-align-left">{replyState?.returnObject?.message}
                            </p>
                        )}
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button
                                type={(replyState?.returnObject?.status === ReturnObject.Status.SUCCESS) ? "primary" : "default"}
                                style={{flexGrow: 1}} onClick={() => {
                                replyResultDialogRef.current?.close();
                            }}>{(replyState?.returnObject?.status === ReturnObject.Status.SUCCESS) ? "确定" : "返回"}</Button>
                        </div>
                    </div>
                </Dialog>
            }
        />
    );

    return (
        <>
            {ReportResultDialog}
            {ReplyResultDialog}
            {ReportDialog}
            {confirmDeletePostDialog}
            {deletePostResultDialog}
            <div className="post-card">
                <div className="post-header">
                    <div className="post-user">
                        <div className="post-avatar">
                            {postDTO.isAnonymous ? (
                                <i className="fa-solid fa-user-secret"/>
                            ) : (
                                <img src={authorAvatar} alt={`${displayName || "用户"}头像`}/>
                            )}
                        </div>
                        <span>{highlightText(displayName || "匿名用户", highlightKeyword)}</span>
                    </div>
                    <div className="post-header-meta">
                        <span className="post-time">{publishTimeLabel}</span>
                        {mode === "browse" && !canDeleteOwnPost && (
                            <button
                                type="button"
                                className="icon-button"
                                aria-label="举报"
                                onClick={() => reportDialogRef.current?.open()}
                            >
                                <i className="fa-solid fa-flag"/>
                            </button>
                        )}
                        {canDeleteOwnPost && (
                            <button
                                type="button"
                                className="icon-button"
                                aria-label="删除帖子"
                                onClick={() => confirmDeletePostDialogRef.current?.open()}
                            >
                                <i className="fa-solid fa-trash"/>
                            </button>
                        )}
                    </div>
                </div>
                <h1 className="post-title">{highlightText(postDTO.title, highlightKeyword)}</h1>
                <div className="post-content">
                    <p className="text-align-left">{highlightText(postDTO.content, highlightKeyword)}</p>
                </div>
                <div className="post-topic-row">
                    <span className="post-topic-tag">{postTag}</span>
                </div>
                <div className="post-actions">
                    <button
                        type="button"
                        className={`post-action${liked ? " is-liked" : ""}`}
                        onClick={handleToggleLike}
                    >
                        <i className="fa-solid fa-heart"/>
                        <span>{liked ? "已点赞" : "点赞"} {likeCount}</span>
                    </button>
                    <button
                        type="button"
                        className="post-action"
                        title={canComment ? undefined : "该倾诉帖已关闭评论，可查看历史回复"}
                        onClick={() => {
                            if (mode === "report") {
                                return;
                            }
                            setRepliesOpen((prev) => !prev);
                        }}
                    >
                        <i className="fa-solid fa-comment"/>
                        <span>
                            {repliesOpen ? "收起" : "查看"}
                            {replyCount ? `${replyCount}条回复` : (canComment ? "回复" : "（已关闭评论）")}
                        </span>
                    </button>
                    <button
                        type="button"
                        className={`post-action${favorited ? " is-active" : ""}`}
                        onClick={handleToggleFavorite}
                    >
                        <i className="fa-solid fa-bookmark"/>
                        <span>{favorited ? "已收藏" : "收藏"} {favoriteCount}</span>
                    </button>
                </div>
                <div className={`replies-section ${repliesOpen ? "is-open" : "is-collapsed"}`}>

                    <ResponseHandler<{ postId: number }, ReplyDTO[]>
                        ref={repliesHandlerRef}
                        request={postController.getAllReplies}
                        setResponseState={setRepliesState}
                        autoRequest={{postId: postDTO.postId}}
                        idleComponent={
                            <h2 className="section-title">
                                <i className="far fa-comments"></i> 未获取回复列表
                            </h2>
                        }
                        loadingComponent={
                            <h2 className="section-title">
                                <i className="far fa-comments"></i>
                                <Loading type="dots" text='加载回复列表中...' color="#2196f3" size="large"/>
                            </h2>
                        }
                        handlingReturnObjectComponent={
                            <h2 className="section-title">
                                <i className="far fa-comments"></i>
                                <Loading type="dots" text='处理回复列表中...' color="#2196f3" size="large"/>
                            </h2>
                        }
                        networkErrorComponent={
                            <div>
                                <h2 className="section-title">
                                    <i className="far fa-comments"></i> 网络错误
                                </h2>
                                <div className="reply-card">
                                    <div className="reply-content">详情：{repliesState?.networkError?.message}</div>
                                </div>
                            </div>
                        }
                        finishedComponent={(!(repliesState?.returnObject?.status === ReturnObject.Status.SUCCESS)) ? (
                            <div>
                                <h2 className="section-title">
                                    <i className="far fa-comments"></i> 获取回复列表{ReturnObject.Status.ChineseName.get(repliesState?.returnObject?.status)}
                                </h2>
                                <div className="reply-card">
                                    <div className="reply-content">详情：{repliesState?.returnObject?.message}</div>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h2 className="section-title">
                                    <i className="far fa-comments"></i> 回复
                                    <span className="replies-count">{repliesState?.returnObject?.data?.length}</span>
                                </h2>
                                {replayCardList}
                                <div className="reply-form">
                                    <h2 className="form-title">
                                        <i className="far fa-edit"></i> {mode === 'report' ? "" : "发表回复"}
                                    </h2>
                                    {mode === 'browse' &&
                                        (canComment ? (
                                            <form id="replyForm" onSubmit={summitReplay}>
                                                {replyTarget ? (
                                                    <div className="reply-target-banner">
                                                        <span>正在回复 @{replyTarget.displayName}</span>
                                                        <Button
                                                            type="default"
                                                            onClick={() => setReplyTarget(null)}
                                                        >
                                                            取消
                                                        </Button>
                                                    </div>
                                                ) : null}
                                                <div className="form-group">
                                                    <Textarea
                                                        ref={replyContentTextareaRef}
                                                        label="回复内容"
                                                        placeholder={replyTarget ? `回复 @${replyTarget.displayName}...` : "请输入您的回复内容..."}
                                                        validationRules={Reply.ValidationRules.content}
                                                        onChange={TextareaCallback.handleDataChange<ReplyRequest>("content", setReplyFormData, null)}
                                                        required
                                                    />
                                                </div>
                                                <Button type="default" summit block>提交回复</Button>
                                            </form>
                                        ) : (
                                            <div className="reply-closed-tip">作者已关闭评论</div>
                                        ))
                                    }
                                    {mode === 'report' &&
                                        <div>
                                            <h2 className="section-title">
                                                <i className="far fa-comments"></i> 举报
                                                <span
                                                    className="replies-count">{reportsState?.returnObject?.data?.length}</span>
                                            </h2>
                                            <ResponseHandler<{postId:number},PostReport[]>
                                                ref={reportsHandlerRef}
                                                request={postController.getAllReports}
                                                setResponseState={setReportsState}
                                                autoRequest={{postId: postDTO.postId}}
                                                idleComponent={<h2 className="section-title">
                                                    <i className="far fa-comments"></i> 未获取举报列表
                                                </h2>}
                                                loadingComponent={<h2 className="section-title">
                                                    <i className="far fa-comments"></i>
                                                    <Loading type="dots" text='加载举报列表中...' color="#2196f3"
                                                             size="large"/>
                                                </h2>}
                                                handlingReturnObjectComponent={<h2 className="section-title">
                                                    <i className="far fa-comments"></i>
                                                    <Loading type="dots" text='处理举报列表中...' color="#2196f3"
                                                             size="large"/>
                                                </h2>}
                                                networkErrorComponent={<div>
                                                    <h2 className="section-title">
                                                        <i className="far fa-comments"></i> 网络错误
                                                    </h2>
                                                    <div className="reply-card">
                                                        <div
                                                            className="reply-content">详情：{reportsState?.networkError?.message}</div>
                                                    </div>
                                                </div>}
                                                finishedComponent={(!(reportsState?.returnObject?.status === ReturnObject.Status.SUCCESS)) ?(
                                                    <div>
                                                        <h2 className="section-title">
                                                            <i className="far fa-comments"></i> 获取举报列表{ReturnObject.Status.ChineseName.get(reportsState?.returnObject?.status)}
                                                        </h2>
                                                        <div className="reply-card">
                                                            <div className="reply-content">详情：{reportsState?.returnObject?.message}</div>
                                                        </div>
                                                    </div>
                                                ):(reportCardList)}
                                            />
                                                <div className="layout-flex-row">
                                                    <Button type="primary" summit block onClick={()=>{confirmDeletePostDialogRef.current?.open();}}>删除该贴</Button>
                                                </div>
                                        </div>
                                    }
                                </div>
                            </div>

                        )}
                    />
                </div>
            </div>
        </>)
}
