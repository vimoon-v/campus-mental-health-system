import React, {useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useOutletContext} from "react-router";
import {Homepage} from "../HomepageForm";
import {PostController, PostRequest} from "../../../controller/PostController";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {Dialog, DialogRef} from "../../../common/view/container/Dialog";
import {ResponseState} from "../../../common/response/ResponseState";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Button} from "../../../common/view/controller/Button";
import {COMMUNITY_TAG_OPTIONS} from "./tagOptions";

const EMOJIS = ["😀", "😞", "😠", "😢", "😣", "😰", "😌", "🤔", "🥺", "😩", "😫", "😤", "😥", "😓", "🙁", "☹️"];

type PrivacyMode = "anonymous" | "pseudonym";

interface DraftPayload {
    title: string;
    content: string;
    privacyMode: PrivacyMode;
    selectedTags: string[];
    needReply: boolean;
    allowComment: boolean;
    showInRecommend: boolean;
    anonymousLike: boolean;
}

const createDraftPayload = (): DraftPayload => ({
    title: "",
    content: "",
    privacyMode: "anonymous",
    selectedTags: ["学习压力"],
    needReply: false,
    allowComment: true,
    showInRecommend: true,
    anonymousLike: true,
});

export const PostForm: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const navigate = useNavigate();
    const postController = useMemo(() => new PostController(), []);

    const [postState, setPostState] = useState<ResponseState>();
    const [titleError, setTitleError] = useState<string>("");
    const [contentError, setContentError] = useState<string>("");
    const [draftMessage, setDraftMessage] = useState<string>("");

    const [draft, setDraft] = useState<DraftPayload>(createDraftPayload());
    const [postFormData, setPostFormData] = useState<PostRequest>({
        title: "",
        content: "",
        username: "",
        isAnonymous: true,
        isPublic: true,
        needReply: false,
        allowComment: true,
        showInRecommend: true,
        anonymousLike: true,
    });

    const [emojiOpen, setEmojiOpen] = useState(false);

    const postHandlerRef = useRef<ResponseHandlerRef<PostRequest, any>>(null);
    const postResultDialogRef = useRef<DialogRef>(null);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
    const emojiPanelRef = useRef<HTMLDivElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);

    const isSubmitting = postState?.loading === true;
    const draftKey = useMemo(
        () => `community_post_draft_${context.user?.username ?? "guest"}`,
        [context.user?.username]
    );

    useEffect(() => {
        const username = context.user?.username ?? "";
        setPostFormData((prev) => ({
            ...prev,
            username,
            isPublic: true,
        }));
    }, [context.user?.username]);

    useEffect(() => {
        const raw = localStorage.getItem(draftKey);
        if (!raw) {
            return;
        }
        try {
            const parsed = JSON.parse(raw) as Partial<DraftPayload>;
            const merged: DraftPayload = {
                ...createDraftPayload(),
                ...parsed,
                selectedTags: Array.isArray(parsed.selectedTags) ? parsed.selectedTags : ["学习压力"],
                privacyMode: parsed.privacyMode === "pseudonym" ? "pseudonym" : "anonymous",
            };
            setDraft(merged);
            setPostFormData((prev) => ({
                ...prev,
                title: merged.title,
                content: merged.content,
                isAnonymous: merged.privacyMode === "anonymous",
                isPublic: true,
            }));
        } catch {
            localStorage.removeItem(draftKey);
        }
    }, [draftKey]);

    useEffect(() => {
        if (!draftMessage) {
            return;
        }
        const timer = window.setTimeout(() => setDraftMessage(""), 2200);
        return () => window.clearTimeout(timer);
    }, [draftMessage]);

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            if (!emojiOpen) {
                return;
            }
            const target = event.target as Node;
            if (emojiPanelRef.current?.contains(target)) {
                return;
            }
            if (emojiButtonRef.current?.contains(target)) {
                return;
            }
            setEmojiOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [emojiOpen]);

    const validateForm = () => {
        const trimmedTitle = (postFormData.title || "").trim();
        const trimmedContent = (postFormData.content || "").trim();

        let valid = true;
        if (!trimmedTitle) {
            setTitleError("标题不能为空");
            valid = false;
        } else if (trimmedTitle.length > 20) {
            setTitleError("标题不能超过20个字");
            valid = false;
        } else {
            setTitleError("");
        }

        if (!trimmedContent) {
            setContentError("内容不能为空");
            valid = false;
        } else if (trimmedContent.length > 1000) {
            setContentError("内容不能超过1000个字");
            valid = false;
        } else {
            setContentError("");
        }
        return valid;
    };

    const handleTitleChange = (value: string) => {
        const nextValue = value.length > 20 ? value.slice(0, 20) : value;
        setPostFormData((prev) => ({...prev, title: nextValue}));
        setDraft((prev) => ({...prev, title: nextValue}));
        if (titleError) {
            setTitleError("");
        }
    };

    const handleContentChange = (value: string) => {
        const nextValue = value.length > 1000 ? value.slice(0, 1000) : value;
        setPostFormData((prev) => ({...prev, content: nextValue}));
        setDraft((prev) => ({...prev, content: nextValue}));
        if (contentError) {
            setContentError("");
        }
    };

    const handlePrivacyChange = (mode: PrivacyMode) => {
        setDraft((prev) => ({...prev, privacyMode: mode}));
        setPostFormData((prev) => ({...prev, isAnonymous: mode === "anonymous"}));
    };

    const handleToggleTag = (tag: string) => {
        setDraft((prev) => {
            const exists = prev.selectedTags.includes(tag);
            const nextTags = exists
                ? prev.selectedTags.filter((item) => item !== tag)
                : [...prev.selectedTags, tag];
            return {...prev, selectedTags: nextTags};
        });
    };

    const handleInsertEmoji = (emoji: string) => {
        const textarea = contentTextareaRef.current;
        if (!textarea) {
            handleContentChange(`${postFormData.content}${emoji}`);
            setEmojiOpen(false);
            return;
        }
        const start = textarea.selectionStart ?? postFormData.content.length;
        const end = textarea.selectionEnd ?? start;
        const nextText = `${postFormData.content.slice(0, start)}${emoji}${postFormData.content.slice(end)}`;
        handleContentChange(nextText);
        setEmojiOpen(false);
        window.requestAnimationFrame(() => {
            textarea.focus();
            const nextCursor = start + emoji.length;
            textarea.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const handleSaveDraft = () => {
        const payload: DraftPayload = {
            ...draft,
            title: postFormData.title,
            content: postFormData.content,
            privacyMode: postFormData.isAnonymous ? "anonymous" : "pseudonym",
        };
        localStorage.setItem(draftKey, JSON.stringify(payload));
        setDraftMessage("草稿已保存");
    };

    const handlePostSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!context.user?.username) {
            navigate("/auth/login");
            return;
        }
        if (!validateForm()) {
            return;
        }

        const requestBody: PostRequest = {
            title: postFormData.title.trim(),
            content: postFormData.content.trim(),
            username: context.user.username,
            isAnonymous: postFormData.isAnonymous,
            isPublic: true,
            primaryTag: draft.selectedTags.length > 0 ? draft.selectedTags[0] : "其他烦恼",
            needReply: draft.needReply,
            allowComment: draft.allowComment,
            showInRecommend: draft.showInRecommend,
            anonymousLike: draft.anonymousLike,
        };

        postHandlerRef.current?.request(requestBody);
    };

    const postResultDialog = (
        <ResponseHandler<PostRequest, any>
            ref={postHandlerRef}
            request={postController.post}
            setResponseState={setPostState}
            idleComponent={<></>}
            loadingComponent={<></>}
            handlingReturnObjectComponent={<></>}
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
                        <p className="text-align-left">{postState?.networkError?.message}</p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button
                                type="default"
                                style={{flexGrow: 1}}
                                onClick={() => {
                                    postResultDialogRef.current?.close();
                                }}
                            >
                                返回
                            </Button>
                        </div>
                    </div>
                </Dialog>
            }
            finishedComponent={
                <Dialog
                    ref={postResultDialogRef}
                    autoOpen
                    type="modal"
                    title={"发布倾诉" + ReturnObject.Status.ChineseName.get(postState?.returnObject?.status)}
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                    onClose={() => {
                        if (postState?.returnObject?.status === ReturnObject.Status.SUCCESS) {
                            localStorage.removeItem(draftKey);
                            navigate("/home/community/browse");
                        }
                    }}
                >
                    <div className="layout-flex-column">
                        {postState?.returnObject?.status === ReturnObject.Status.SUCCESS ? (
                            <p className="text-align-left">你的倾诉已成功发布，我们会保护你的隐私并尽快给予回应。</p>
                        ) : (
                            <p className="text-align-left">{postState?.returnObject?.message}</p>
                        )}
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button
                                type={postState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "primary" : "default"}
                                style={{flexGrow: 1}}
                                onClick={() => {
                                    postResultDialogRef.current?.close();
                                }}
                            >
                                {postState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "确定" : "返回"}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            }
        />
    );

    return (
        <div className="community-publish-page">
            {postResultDialog}

            <div className="community-publish-breadcrumb">
                <button type="button" onClick={() => navigate("/home/main")}>首页</button>
                <i className="fa-solid fa-chevron-right"/>
                <button type="button" onClick={() => navigate("/home/community/browse")}>心理树洞</button>
                <i className="fa-solid fa-chevron-right"/>
                <span>发布倾诉</span>
            </div>

            <header className="community-publish-header">
                <h1>发布你的心声</h1>
                <p>在这里，你可以匿名倾诉烦恼、压力和心情，让每一个声音都被听见。</p>
            </header>

            <div className="community-publish-card">
                <form onSubmit={handlePostSubmit}>
                    <section className="community-publish-section">
                        <h3><i className="fa-solid fa-shield-halved"/> 隐私设置</h3>
                        <div className="community-publish-privacy">
                            <label className={`privacy-option ${draft.privacyMode === "anonymous" ? "is-active" : ""}`}>
                                <input
                                    type="radio"
                                    name="privacyMode"
                                    checked={draft.privacyMode === "anonymous"}
                                    onChange={() => handlePrivacyChange("anonymous")}
                                />
                                <div>
                                    <strong>完全匿名发布</strong>
                                    <small>隐藏所有个人信息，仅管理员可见</small>
                                </div>
                            </label>
                            <label className={`privacy-option ${draft.privacyMode === "pseudonym" ? "is-active" : ""}`}>
                                <input
                                    type="radio"
                                    name="privacyMode"
                                    checked={draft.privacyMode === "pseudonym"}
                                    onChange={() => handlePrivacyChange("pseudonym")}
                                />
                                <div>
                                    <strong>使用昵称发布</strong>
                                    <small>显示你的昵称，隐藏真实身份</small>
                                </div>
                            </label>
                        </div>
                    </section>

                    <section className="community-publish-section">
                        <label className="community-publish-label" htmlFor="post-title"><i className="fa-solid fa-heading"/> 倾诉标题</label>
                        <input
                            id="post-title"
                            className={`community-publish-input ${titleError ? "is-error" : ""}`}
                            type="text"
                            value={postFormData.title}
                            placeholder="给你的倾诉起一个标题（不超过20个字）"
                            maxLength={20}
                            onChange={(event) => handleTitleChange(event.target.value)}
                        />
                        <div className="community-publish-meta">
                            <span className={`community-publish-error ${titleError ? "is-show" : ""}`}>{titleError || " "}</span>
                            <span>{postFormData.title.length}/20</span>
                        </div>
                    </section>

                    <section className="community-publish-section">
                        <label className="community-publish-label" htmlFor="post-content"><i className="fa-solid fa-pen"/> 倾诉内容</label>
                        <div className="community-publish-editor">
                            <textarea
                                id="post-content"
                                ref={contentTextareaRef}
                                className={`community-publish-input community-publish-textarea ${contentError ? "is-error" : ""}`}
                                value={postFormData.content}
                                placeholder="请详细描述你的心情、烦恼或想倾诉的内容...在这里，你的每一个感受都值得被认真对待"
                                maxLength={1000}
                                onChange={(event) => handleContentChange(event.target.value)}
                            />
                            <button
                                type="button"
                                ref={emojiButtonRef}
                                className="emoji-toggle"
                                aria-label="打开表情面板"
                                onClick={() => setEmojiOpen((prev) => !prev)}
                            >
                                <i className="fa-solid fa-face-smile"/>
                            </button>
                            {emojiOpen && (
                                <div className="emoji-panel" ref={emojiPanelRef}>
                                    <div className="emoji-grid">
                                        {EMOJIS.map((item) => (
                                            <button key={item} type="button" onClick={() => handleInsertEmoji(item)}>
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                    <Button type="default" block onClick={() => setEmojiOpen(false)}>
                                        关闭表情面板
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="community-publish-meta">
                            <span className={`community-publish-error ${contentError ? "is-show" : ""}`}>{contentError || " "}</span>
                            <span>{postFormData.content.length}/1000</span>
                        </div>
                    </section>

                    <section className="community-publish-section">
                        <label className="community-publish-label"><i className="fa-solid fa-tags"/> 选择标签（可多选）</label>
                        <div className="community-publish-tags">
                            {COMMUNITY_TAG_OPTIONS.map((tag) => {
                                const isActive = draft.selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        className={`community-publish-tag ${isActive ? "is-active" : ""}`}
                                        onClick={() => handleToggleTag(tag)}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="community-publish-tip">选择合适标签，有助于获得更精准的帮助与回应。</p>
                    </section>

                    <section className="community-publish-section">
                        <h3><i className="fa-solid fa-sliders"/> 附加选项</h3>
                        <div className="community-publish-options">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={draft.needReply}
                                    onChange={(event) => setDraft((prev) => ({...prev, needReply: event.target.checked}))}
                                />
                                <span>希望得到老师的专业回复</span>
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={draft.allowComment}
                                    onChange={(event) => setDraft((prev) => ({...prev, allowComment: event.target.checked}))}
                                />
                                <span>允许其他同学评论和安慰</span>
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={draft.showInRecommend}
                                    onChange={(event) => setDraft((prev) => ({...prev, showInRecommend: event.target.checked}))}
                                />
                                <span>允许展示在推荐列表中</span>
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={draft.anonymousLike}
                                    onChange={(event) => setDraft((prev) => ({...prev, anonymousLike: event.target.checked}))}
                                />
                                <span>匿名接收点赞和鼓励</span>
                            </label>
                        </div>
                    </section>

                    <section className="community-publish-actions">
                        <Button type="default" onClick={handleSaveDraft}>
                            <i className="fa-solid fa-floppy-disk"/> 保存草稿
                        </Button>
                        <div className="community-publish-actions-right">
                            <Button type="default" onClick={() => navigate("/home/community/browse")}>
                                <i className="fa-solid fa-arrow-left"/> 返回树洞
                            </Button>
                            <Button type="primary" summit loading={isSubmitting} disabled={isSubmitting}>
                                <i className="fa-solid fa-paper-plane"/> {isSubmitting ? "发布中..." : "发布倾诉"}
                            </Button>
                        </div>
                    </section>
                    {draftMessage && <p className="community-draft-message">{draftMessage}</p>}
                </form>
            </div>

            <section className="community-publish-notice">
                <h3><i className="fa-solid fa-lightbulb"/> 温馨提示</h3>
                <ul>
                    <li><i className="fa-solid fa-circle-check"/> 我们严格保护你的隐私，倾诉内容受平台安全策略保护。</li>
                    <li><i className="fa-solid fa-circle-check"/> 请勿发布违规、违法或涉及他人隐私的内容。</li>
                    <li><i className="fa-solid fa-circle-check"/> 若存在紧急心理困扰，请联系 400-888-9999 心理热线。</li>
                    <li><i className="fa-solid fa-circle-check"/> 发布后你可以在“我的倾诉”中查看和管理内容。</li>
                </ul>
            </section>

            <footer className="community-publish-footer">
                <div className="footer-brand">
                    <div className="icon"><i className="fa-solid fa-heart-pulse"/></div>
                    <div>
                        <h4>心晴校园</h4>
                        <p>专注于学生心理健康服务，助力青少年健康快乐成长。</p>
                    </div>
                </div>
                <div className="footer-help">
                    <div><i className="fa-solid fa-phone"/> 24小时心理热线：400-888-9999</div>
                    <div><i className="fa-solid fa-envelope"/> 邮箱支持：help@xinqingcampus.com</div>
                </div>
            </footer>
        </div>
    );
};
