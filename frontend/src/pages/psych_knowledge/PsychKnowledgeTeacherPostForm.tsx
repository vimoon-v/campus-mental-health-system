import React, {useEffect, useMemo, useRef, useState} from "react";
import {useOutletContext} from "react-router";
import {useNavigate, useParams} from "react-router-dom";
import {PsychKnowledgeRoot} from "./PsychKnowledgeRootPage";
import {PsychKnowledgeController, PsychKnowledgePostRequest} from "../../controller/PsychKnowledgeController";
import {PsychKnowledgeDTO} from "../../entity/DTO/PsychKnowledgeDTO";
import {ReviewStatus} from "../../entity/enums/ReviewStatus";
import {ResponseHandler, ResponseHandlerRef} from "../../common/response/ResponseHandler";
import {ResponseState} from "../../common/response/ResponseState";
import {Dialog, DialogRef} from "../../common/view/container/Dialog";
import {Loading} from "../../common/view/display/Loading";
import {ReturnObject} from "../../common/response/ReturnObject";
import {PsychKnowledgeCard} from "../../component/view/PsychKnowledgeCard";
import {Button} from "../../common/view/controller/Button";
import {UserRole} from "../../entity/enums/UserRole";
import "./PsychKnowledgePost.css";

type PublishStatus = "publish" | "schedule" | "draft";

type FormErrors = {
    title?: string;
    content?: string;
    category?: string;
};

const CATEGORY_OPTIONS = [
    {label: "压力管理", value: "pressure"},
    {label: "情绪调节", value: "emotion"},
    {label: "人际关系", value: "relationship"},
    {label: "学习心理", value: "study"},
    {label: "成长发展", value: "growth"}
];

const MAX_TITLE_LENGTH = 80;
const MAX_CONTENT_LENGTH = 5000;
const MAX_SUMMARY_LENGTH = 200;
const MAX_COVER_SIZE = 2 * 1024 * 1024;

export const PsychKnowledgeTeacherPostForm: React.FC = () => {
    const context = useOutletContext<PsychKnowledgeRoot.OutletContext>();
    const navigate = useNavigate();
    const {knowledgeId} = useParams<{knowledgeId?: string}>();
    const psychKnowledgeController = new PsychKnowledgeController();

    const parsedKnowledgeId = useMemo(() => {
        if (!knowledgeId) {
            return null;
        }
        const value = Number(knowledgeId);
        return Number.isNaN(value) ? null : value;
    }, [knowledgeId]);
    const isEditMode = parsedKnowledgeId !== null;

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [summary, setSummary] = useState("");
    const [category, setCategory] = useState("emotion");
    const [publishStatus, setPublishStatus] = useState<PublishStatus>("publish");
    const [scheduleTime, setScheduleTime] = useState("");
    const [visibleRange, setVisibleRange] = useState("all");
    const [allowComment, setAllowComment] = useState(true);
    const [isRecommended, setIsRecommended] = useState(false);
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [coverData, setCoverData] = useState<string | null>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitMode, setSubmitMode] = useState<"publish" | "draft">("publish");

    const [postState, setPostState] = useState<ResponseState<any>>();
    const psychKnowledgePostHandlerRef = useRef<ResponseHandlerRef<PsychKnowledgePostRequest, any>>(null);
    const postConfirmDialogRef = useRef<DialogRef>(null);
    const postResultDialogRef = useRef<DialogRef>(null);
    const previewDialogRef = useRef<DialogRef>(null);

    const [previewData, setPreviewData] = useState<PsychKnowledgeDTO>({
        adminReviewerUsername: null,
        content: "",
        category: "growth",
        viewCount: 0,
        knowledgeId: 0,
        publishTime: new Date(),
        reviewStatus: ReviewStatus.PENDING,
        reviewTime: null,
        teacherPublisherDisplayName: context.user == null ? "" : (context.user.nickname == null ? context.user.username : context.user.nickname),
        teacherPublisherUsername: context.user == null ? "" : context.user.username,
        title: ""
    });

    const contentCount = useMemo(() => content.length, [content]);
    const summaryCount = useMemo(() => summary.length, [summary]);

    const formatDatetimeLocal = (value?: Date | string | null) => {
        if (!value) {
            return "";
        }
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        const pad = (num: number) => num.toString().padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    useEffect(() => {
        if (!isEditMode || !parsedKnowledgeId || !context.user?.username) {
            return;
        }
        setIsLoading(true);
        setLoadError(null);
        psychKnowledgeController.teacherDetail({
            knowledgeId: parsedKnowledgeId,
            teacherUsername: context.user.username
        }).then((result) => {
            if (result.status === ReturnObject.Status.SUCCESS && result.data) {
                const data = result.data;
                setTitle(data.title ?? "");
                setContent(data.content ?? "");
                setSummary(data.summary ?? "");
                setCategory(data.category ?? "growth");
                setPublishStatus(data.publishStatus === "schedule" ? "schedule" : "publish");
                setScheduleTime(formatDatetimeLocal(data.scheduleTime ?? null));
                setVisibleRange(data.visibleRange ?? "all");
                setAllowComment(data.allowComment ?? true);
                setIsRecommended(data.recommended ?? false);
                if (data.coverImage) {
                    setCoverPreview(data.coverImage);
                    setCoverData(data.coverImage);
                }
            } else {
                setLoadError(result.message ?? "加载失败，请稍后重试");
            }
        }).catch(() => {
            setLoadError("加载失败，请稍后重试");
        }).finally(() => {
            setIsLoading(false);
        });
    }, [isEditMode, parsedKnowledgeId, context.user?.username]);

    useEffect(() => {
        return () => {
            if (coverPreview && coverPreview.startsWith("blob:")) {
                URL.revokeObjectURL(coverPreview);
            }
        };
    }, [coverPreview]);

    const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        if (file.size > MAX_COVER_SIZE) {
            alert("图片大小不能超过2MB，请选择更小的图片");
            event.target.value = "";
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === "string" ? reader.result : null;
            setCoverPreview(result);
            setCoverData(result);
        };
        reader.readAsDataURL(file);
    };

    const handleCoverRemove = () => {
        setCoverPreview(null);
        setCoverData(null);
        if (coverInputRef.current) {
            coverInputRef.current.value = "";
        }
    };

    const validateForm = () => {
        const errors: FormErrors = {};
        if (!title.trim()) {
            errors.title = "请输入文章标题";
        } else if (title.trim().length > 255) {
            errors.title = "标题长度不能超过255个字符";
        }
        if (!content.trim()) {
            errors.content = "请输入文章内容";
        }
        if (!category) {
            errors.category = "请选择文章分类";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handlePublish = (event?: React.FormEvent) => {
        event?.preventDefault();
        if (!context.user?.username) {
            alert("登录信息已过期，请重新登录");
            return;
        }
        if (!validateForm()) {
            return;
        }
        if (publishStatus === "schedule" && !scheduleTime) {
            alert("请选择定时发布时间");
            return;
        }
        setSubmitMode("publish");
        postConfirmDialogRef.current?.open();
    };

    const submitKnowledge = (mode: PublishStatus) => {
        if (!context.user?.username) {
            alert("登录信息已过期，请重新登录");
            return;
        }
        const payload: PsychKnowledgePostRequest = {
            knowledgeId: parsedKnowledgeId ?? undefined,
            title: title.trim(),
            content: content.trim(),
            summary: summary.trim() || null,
            coverImage: coverData ?? null,
            publishStatus: mode,
            scheduleTime: mode === "schedule" ? scheduleTime : undefined,
            visibleRange,
            allowComment,
            recommended: isRecommended,
            teacherPublisherUsername: context.user.username,
            category: category || "growth"
        };
        setSubmitMode(mode === "draft" ? "draft" : "publish");
        psychKnowledgePostHandlerRef.current?.request(payload);
    };

    const handleConfirmPublish = () => {
        postConfirmDialogRef.current?.close();
        submitKnowledge(publishStatus);
    };

    const handlePreview = () => {
        setPreviewData((prev) => ({
            ...prev,
            title: title.trim() || "未填写标题",
            content: content.trim() || "暂无内容",
            category: category || "growth",
            publishTime: new Date(),
            reviewStatus: ReviewStatus.PENDING
        }));
        previewDialogRef.current?.open();
    };

    const handleSaveDraft = () => {
        submitKnowledge("draft");
    };

    const postResultDialog = (
        <ResponseHandler<PsychKnowledgePostRequest, any>
            ref={psychKnowledgePostHandlerRef}
            request={psychKnowledgeController.teacherPost}
            setResponseState={setPostState}
            idleComponent={<></>}
            loadingComponent={<Loading type="dots" text="提交中..." color="#2196f3" size="large" fullScreen/>}
            handlingReturnObjectComponent={<Loading type="dots" text="处理提交结果中..." color="#2196f3" size="large" fullScreen/>}
            networkErrorComponent={
                <Dialog
                    autoOpen
                    ref={postResultDialogRef}
                    type="modal"
                    title="网络错误"
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">详情：{postState?.networkError?.message}</p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button type="default" style={{flexGrow: 1}} onClick={() => postResultDialogRef.current?.close()}>
                                返回
                            </Button>
                        </div>
                    </div>
                </Dialog>
            }
            finishedComponent={
                <Dialog
                    autoOpen
                    ref={postResultDialogRef}
                    type="modal"
                    title={`提交${ReturnObject.Status.ChineseName.get(postState?.returnObject?.status)}`}
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                    onClose={() => {
                        if (postState?.returnObject?.status === ReturnObject.Status.SUCCESS) {
                            if (submitMode === "draft") {
                                const data = postState?.returnObject?.data;
                                const resolvedId = typeof data === "number" ? data : Number(data);
                                if (!isEditMode && Number.isFinite(resolvedId)) {
                                    navigate(`/psych_knowledge/edit/${resolvedId}`);
                                }
                            } else {
                                navigate("/psych_knowledge/mine/teacher");
                            }
                        }
                    }}
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">
                            {postState?.returnObject?.status === ReturnObject.Status.SUCCESS
                                ? (submitMode === "draft"
                                    ? "草稿已保存"
                                    : (isEditMode ? "提交成功，文章已更新并进入审核流程" : "提交成功，文章进入审核流程"))
                                : postState?.returnObject?.message}
                        </p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button
                                type={postState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "primary" : "default"}
                                style={{flexGrow: 1}}
                                onClick={() => postResultDialogRef.current?.close()}
                            >
                                {postState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "确定" : "返回"}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            }
        />
    );

    const postConfirmDialog = (
        <Dialog
            ref={postConfirmDialogRef}
            type="modal"
            title="发布文章"
            showCloseButton
            closeOnBackdropClick
            closeOnEscape
        >
            <div className="layout-flex-column">
                <p className="text-align-left">{isEditMode ? "确定要更新文章并提交审核吗？" : "确定要提交审核并发布吗？"}</p>
                <br/>
                <div className="layout-flex-row justify-content-flex-end">
                    <span style={{flexGrow: 2}}></span>
                    <Button type="default" style={{flexGrow: 1}} onClick={() => postConfirmDialogRef.current?.close()}>
                        返回
                    </Button>
                    <span style={{flexGrow: 0.1}}></span>
                    <Button type="primary" style={{flexGrow: 1}} onClick={handleConfirmPublish}>
                        确定
                    </Button>
                </div>
            </div>
        </Dialog>
    );

    const previewDialog = (
        <Dialog
            ref={previewDialogRef}
            type="modal"
            title="科普预览"
            width={"1300px"}
            showCloseButton
            closeOnBackdropClick
            closeOnEscape
        >
            <div className="layout-flex-column">
                <PsychKnowledgeCard
                    username={context.user == null ? "" : context.user.username}
                    mode="mine"
                    data={previewData}
                    role={context.user == null ? UserRole.UNKNOWN : (Number(context.user.role) as UserRole)}
                />
                <br/>
                <div className="layout-flex-row justify-content-flex-end">
                    <span style={{flexGrow: 3.1}}></span>
                    <Button type="default" style={{flexGrow: 1}} onClick={() => previewDialogRef.current?.close()}>
                        返回
                    </Button>
                </div>
            </div>
        </Dialog>
    );

    if (isLoading) {
        return <Loading type="dots" text="加载中..." color="#2196f3" size="large" fullScreen />;
    }

    if (loadError) {
        return (
            <div className="knowledge-post-page">
                <div className="knowledge-post-card">
                    <p className="knowledge-post-error">{loadError}</p>
                    <div className="knowledge-post-footer">
                        <Button type="default" onClick={() => navigate("/psych_knowledge/mine/teacher")}>返回</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="knowledge-post-page">
            {previewDialog}
            {postConfirmDialog}
            {postResultDialog}

            <div className="knowledge-post-header">
                <div className="knowledge-post-title">
                    <h2>{isEditMode ? "编辑科普文章" : "发布科普文章"}</h2>
                    <p>{isEditMode ? "更新科普文章内容并重新提交审核" : "创建并发布心理健康科普文章，帮助学生了解心理知识"}</p>
                </div>
                <div className="knowledge-post-actions">
                    <button
                        className="appointment-manage-btn appointment-manage-btn--ghost"
                        type="button"
                        onClick={() => navigate("/psych_knowledge/mine/teacher")}
                    >
                        <i className="fa-solid fa-arrow-left"/>返回
                    </button>
                    <button
                        className="appointment-manage-btn"
                        type="button"
                        onClick={handleSaveDraft}
                    >
                        <i className="fa-solid fa-save"/>保存草稿
                    </button>
                    <button
                        className="appointment-manage-btn appointment-manage-btn--primary"
                        type="button"
                        onClick={() => handlePublish()}
                    >
                        <i className="fa-solid fa-paper-plane"/>{isEditMode ? "更新并提交" : "发布文章"}
                    </button>
                </div>
            </div>

            <form className="knowledge-post-grid" onSubmit={handlePublish}>
                <div className="knowledge-post-main">
                    <div className="knowledge-post-card">
                        <label className="knowledge-post-label">
                            文章标题 <span className="knowledge-post-required">*</span>
                        </label>
                        <input
                            className={`knowledge-post-input${formErrors.title ? " is-error" : ""}`}
                            type="text"
                            placeholder="请输入文章标题（例如：如何缓解考试焦虑？）"
                            maxLength={MAX_TITLE_LENGTH}
                            value={title}
                            onChange={(event) => {
                                setTitle(event.target.value);
                                if (formErrors.title) {
                                    setFormErrors((prev) => ({...prev, title: undefined}));
                                }
                            }}
                        />
                        <div className="knowledge-post-hint">
                            标题长度建议控制在10-20个字，简洁明了
                        </div>
                        {formErrors.title && <div className="knowledge-post-error">{formErrors.title}</div>}
                    </div>

                    <div className="knowledge-post-card">
                        <label className="knowledge-post-label">
                            文章内容 <span className="knowledge-post-required">*</span>
                        </label>
                        <div className="knowledge-post-toolbar">
                            <button type="button"><i className="fa-solid fa-bold"/></button>
                            <button type="button"><i className="fa-solid fa-italic"/></button>
                            <button type="button"><i className="fa-solid fa-underline"/></button>
                            <span className="knowledge-post-divider"/>
                            <button type="button"><i className="fa-solid fa-list-ul"/></button>
                            <button type="button"><i className="fa-solid fa-list-ol"/></button>
                            <span className="knowledge-post-divider"/>
                            <button type="button"><i className="fa-solid fa-link"/></button>
                            <button type="button"><i className="fa-solid fa-image"/></button>
                            <button type="button"><i className="fa-solid fa-video"/></button>
                            <span className="knowledge-post-divider"/>
                            <button type="button"><i className="fa-solid fa-align-left"/></button>
                            <button type="button"><i className="fa-solid fa-align-center"/></button>
                            <button type="button"><i className="fa-solid fa-align-right"/></button>
                        </div>
                        <textarea
                            className={`knowledge-post-textarea${formErrors.content ? " is-error" : ""}`}
                            placeholder="请输入文章内容（建议分段清晰，语言通俗易懂，适合学生阅读）"
                            value={content}
                            onChange={(event) => {
                                setContent(event.target.value);
                                if (formErrors.content) {
                                    setFormErrors((prev) => ({...prev, content: undefined}));
                                }
                            }}
                        />
                        <div className="knowledge-post-meta">
                            <span>内容建议：语言简洁、案例贴近学生生活、避免专业术语过多</span>
                            <span className={contentCount > MAX_CONTENT_LENGTH ? "is-warning" : ""}>
                                字数统计：{contentCount}/{MAX_CONTENT_LENGTH}
                            </span>
                        </div>
                        {formErrors.content && <div className="knowledge-post-error">{formErrors.content}</div>}
                    </div>

                    <div className="knowledge-post-card">
                        <label className="knowledge-post-label">文章摘要</label>
                        <textarea
                            className="knowledge-post-textarea is-summary"
                            placeholder="请输入文章摘要（简要介绍文章内容，100-200字）"
                            maxLength={MAX_SUMMARY_LENGTH}
                            value={summary}
                            onChange={(event) => setSummary(event.target.value)}
                        />
                        <div className="knowledge-post-meta">
                            <span>摘要将显示在文章列表页，帮助学生快速了解文章内容</span>
                            <span>{summaryCount}/{MAX_SUMMARY_LENGTH}</span>
                        </div>
                    </div>
                </div>

                <div className="knowledge-post-sidebar">
                    <div className="knowledge-post-card">
                        <label className="knowledge-post-label">
                            文章分类 <span className="knowledge-post-required">*</span>
                        </label>
                        <select
                            className={`knowledge-post-select${formErrors.category ? " is-error" : ""}`}
                            value={category}
                            onChange={(event) => {
                                setCategory(event.target.value);
                                if (formErrors.category) {
                                    setFormErrors((prev) => ({...prev, category: undefined}));
                                }
                            }}
                        >
                            <option value="">请选择分类</option>
                            {CATEGORY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        {formErrors.category && <div className="knowledge-post-error">{formErrors.category}</div>}
                    </div>

                    <div className="knowledge-post-card">
                        <label className="knowledge-post-label">封面图片</label>
                        <div className="knowledge-post-upload">
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleCoverChange}
                            />
                            <div className="knowledge-post-upload-content">
                                <i className="fa-solid fa-cloud-arrow-up"/>
                                <p>点击上传封面图片</p>
                                <span>支持 JPG、PNG 格式，建议尺寸 800×450px，大小不超过2MB</span>
                            </div>
                        </div>
                        {coverPreview && (
                            <div className="knowledge-post-cover-preview">
                                <img src={coverPreview} alt="封面预览" className="knowledge-post-cover-image" />
                                <button type="button" className="knowledge-post-cover-remove" onClick={handleCoverRemove}>
                                    <i className="fa-solid fa-trash"/>删除封面
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="knowledge-post-card">
                        <h3 className="knowledge-post-section-title">发布设置</h3>
                        <div className="knowledge-post-field">
                            <span className="knowledge-post-label">发布状态</span>
                            <div className="knowledge-post-radio">
                                <label>
                                    <input
                                        type="radio"
                                        name="publishStatus"
                                        value="publish"
                                        checked={publishStatus === "publish"}
                                        onChange={() => setPublishStatus("publish")}
                                    />
                                    立即发布
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="publishStatus"
                                        value="schedule"
                                        checked={publishStatus === "schedule"}
                                        onChange={() => setPublishStatus("schedule")}
                                    />
                                    定时发布
                                </label>
                            </div>
                        </div>
                        {publishStatus === "schedule" && (
                            <div className="knowledge-post-field">
                                <label className="knowledge-post-label">发布时间</label>
                                <input
                                    type="datetime-local"
                                    className="knowledge-post-input"
                                    value={scheduleTime}
                                    onChange={(event) => setScheduleTime(event.target.value)}
                                />
                            </div>
                        )}
                        <div className="knowledge-post-field">
                            <label className="knowledge-post-label">可见范围</label>
                            <select
                                className="knowledge-post-select"
                                value={visibleRange}
                                onChange={(event) => setVisibleRange(event.target.value)}
                            >
                                <option value="all">全部学生</option>
                                <option value="junior">初中生</option>
                                <option value="senior">高中生</option>
                                <option value="college">大学生</option>
                            </select>
                        </div>
                        <div className="knowledge-post-field knowledge-post-checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={allowComment}
                                    onChange={(event) => setAllowComment(event.target.checked)}
                                />
                                允许学生评论
                            </label>
                        </div>
                        <div className="knowledge-post-field knowledge-post-checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={isRecommended}
                                    onChange={(event) => setIsRecommended(event.target.checked)}
                                />
                                设为推荐文章
                            </label>
                        </div>
                    </div>

                    <div className="knowledge-post-card">
                        <h3 className="knowledge-post-section-title">写作指导</h3>
                        <ul className="knowledge-post-guide">
                            <li><i className="fa-solid fa-circle-check"/>内容要符合学生认知水平，避免专业术语</li>
                            <li><i className="fa-solid fa-circle-check"/>结合实际案例，增强文章的可读性和实用性</li>
                            <li><i className="fa-solid fa-circle-check"/>积极正面的引导，提供具体的解决方法</li>
                            <li><i className="fa-solid fa-circle-check"/>避免敏感内容，遵守心理健康教育规范</li>
                        </ul>
                    </div>

                    <div className="knowledge-post-footer">
                        <Button type="default" onClick={handlePreview}>预览</Button>
                        <Button type="primary" summit>{isEditMode ? "更新并提交" : "提交审核"}</Button>
                    </div>
                </div>
            </form>
        </div>
    );
};
