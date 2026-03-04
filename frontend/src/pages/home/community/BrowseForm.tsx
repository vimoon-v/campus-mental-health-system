//React框架
import React, {useEffect, useMemo, useRef, useState} from "react";
import {useOutletContext} from "react-router";
import {Homepage} from "../HomepageForm";
import {PostController} from "../../../controller/PostController";
import {ResponseState} from "../../../common/response/ResponseState";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {PostDTO} from "../../../entity/PostDTO";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Loading} from "../../../common/view/display/Loading";
import {PostCard} from "./PostCard";
import {useNavigate, useSearchParams} from "react-router-dom";
import {UserRole} from "../../../entity/enums/UserRole";
import {COMMUNITY_TAG_OPTIONS, TAG_KEYWORD_MAP} from "./tagOptions";

const normalizeText = (value?: string | null) => (value ?? "").toLowerCase();
const RECENT_SEARCH_STORAGE_KEY = "community_recent_search_keywords";
const RECENT_SEARCH_LIMIT = 8;

const parseRecentSearches = (raw: string | null): string[] => {
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
            .slice(0, RECENT_SEARCH_LIMIT);
    } catch {
        return [];
    }
};

const getPublishTimestamp = (post: PostDTO) => {
    const raw = post.publishTime as unknown as string;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

type PostViewMode = "all" | "mine" | "favorite";

export const BrowseForm:React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isTeacher = Number(context.user?.role) === UserRole.TEACHER;
    const focusPostIdRaw = Number(searchParams.get("focusPostId"));
    const focusPostId = Number.isNaN(focusPostIdRaw) ? 0 : focusPostIdRaw;
    //控制器
    const postController = useMemo(() => new PostController(), []);
    const [publicPostState, setPublicPostState] = useState<ResponseState<PostDTO[]>>();
    const publicPostHandler = useRef<ResponseHandlerRef<null, PostDTO[]>>(null);
    const [viewMode, setViewMode] = useState<PostViewMode>("all");
    const hasInitializedViewMode = useRef(false);
    const [activeTag, setActiveTag] = useState("全部");
    const [activeSort, setActiveSort] = useState("最新发布");
    const [searchInput, setSearchInput] = useState("");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [recentKeywords, setRecentKeywords] = useState<string[]>([]);
    const [replyCounts, setReplyCounts] = useState<Record<number, number>>({});

    const syncRecentSearches = (keywords: string[]) => {
        if (typeof window === "undefined") {
            return;
        }
        window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(keywords));
    };

    const handleSearchSubmit = (rawKeyword?: string) => {
        const keyword = (rawKeyword ?? searchInput).trim();
        setSearchInput(keyword);
        setSearchKeyword(keyword);
        if (!keyword) {
            return;
        }
        setRecentKeywords((prev) => {
            const next = [keyword, ...prev.filter((value) => normalizeText(value) !== normalizeText(keyword))]
                .slice(0, RECENT_SEARCH_LIMIT);
            syncRecentSearches(next);
            return next;
        });
    };

    const handleClearSearchHistory = () => {
        setRecentKeywords([]);
        if (typeof window === "undefined") {
            return;
        }
        window.localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
    };

    const handleCancelSearch = () => {
        setSearchInput("");
        setSearchKeyword("");
        setActiveTag("全部");
        setViewMode("all");
    };

    const tagOptions = ["全部", ...COMMUNITY_TAG_OPTIONS];
    const sortOptions = ["最新发布", "最多回复", "最多点赞"];
    const topicCards = [
        {label: "期末备考压力", count: "128人关注", tone: "topic-primary"},
        {label: "宿舍关系矛盾", count: "96人关注", tone: "topic-secondary"},
        {label: "考研就业迷茫", count: "156人关注", tone: "topic-purple"},
        {label: "恋爱情感困扰", count: "87人关注", tone: "topic-teal"},
    ];

    const postListRequest = viewMode === "mine"
        ? postController.getMyPosts
        : (viewMode === "favorite" ? postController.getMyFavoritePosts : postController.getAllPublicPost);
    const fetchStatus = publicPostState?.returnObject?.status;
    const fetchFailed = fetchStatus !== undefined && fetchStatus !== ReturnObject.Status.SUCCESS;
    const fetchMessage = publicPostState?.returnObject?.message
        || (viewMode === "mine"
            ? "获取我的倾诉列表失败"
            : (viewMode === "favorite" ? "获取我的收藏列表失败" : "获取公开倾诉列表失败"));
    const allPosts = fetchStatus === ReturnObject.Status.SUCCESS
        ? (publicPostState?.returnObject?.data ?? [])
        : [];
    const filteredPosts = useMemo(() => {
        if (!allPosts.length) {
            return [];
        }
        const normalizedKeyword = normalizeText(searchKeyword).trim();
        return allPosts.filter((post) => {
            const text = `${normalizeText(post.title)} ${normalizeText(post.content)}`;

            if (activeTag !== "全部") {
                const postTag = (post.primaryTag ?? "").trim();
                if (postTag) {
                    return postTag === activeTag;
                }
                const tagKeywords = TAG_KEYWORD_MAP[activeTag] ?? [];
                if (tagKeywords.length && !tagKeywords.some((keyword) => text.includes(keyword))) {
                    return false;
                }
            }

            if (!normalizedKeyword) {
                return true;
            }

            const searchTarget = `${text} ${normalizeText(post.displayName)} ${normalizeText(post.username)}`;
            return searchTarget.includes(normalizedKeyword);
        });
    }, [activeTag, allPosts, searchKeyword]);

    useEffect(() => {
        if (activeSort !== "最多回复") {
            return;
        }
        if (!allPosts.length) {
            return;
        }
        let cancelled = false;
        const fetchReplyCounts = async () => {
            const missingPosts = allPosts.filter((post) => replyCounts[post.postId] === undefined);
            if (!missingPosts.length) {
                return;
            }
            const results = await Promise.all(
                missingPosts.map(async (post) => {
                    const response = await postController.getAllReplies({postId: post.postId});
                    const count = response?.status === ReturnObject.Status.SUCCESS && Array.isArray(response.data)
                        ? response.data.length
                        : 0;
                    return {postId: post.postId, count};
                })
            );
            if (cancelled) {
                return;
            }
            setReplyCounts((prev) => {
                const next = {...prev};
                results.forEach(({postId, count}) => {
                    next[postId] = count;
                });
                return next;
            });
        };
        fetchReplyCounts();
        return () => {
            cancelled = true;
        };
    }, [activeSort, allPosts, postController, replyCounts]);

    const sortedPosts = useMemo(() => {
        const list = [...filteredPosts];
        if (!list.length) {
            return list;
        }
        if (activeSort === "最新发布") {
            return list.sort((a, b) => getPublishTimestamp(b) - getPublishTimestamp(a));
        }
        if (activeSort === "最多回复") {
            return list.sort((a, b) => {
                const diff = (replyCounts[b.postId] ?? 0) - (replyCounts[a.postId] ?? 0);
                return diff !== 0 ? diff : getPublishTimestamp(b) - getPublishTimestamp(a);
            });
        }
        if (activeSort === "最多点赞") {
            return list.sort((a, b) => {
                const diff = (b.likeCount ?? 0) - (a.likeCount ?? 0);
                return diff !== 0 ? diff : getPublishTimestamp(b) - getPublishTimestamp(a);
            });
        }
        return list;
    }, [activeSort, filteredPosts, replyCounts]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }
        const recentList = parseRecentSearches(window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY));
        setRecentKeywords(recentList);
    }, []);

    useEffect(() => {
        if (!hasInitializedViewMode.current) {
            hasInitializedViewMode.current = true;
            return;
        }
        setReplyCounts({});
        publicPostHandler.current?.recover();
        publicPostHandler.current?.request(null);
    }, [viewMode]);

    useEffect(() => {
        if (focusPostId > 0 && viewMode !== "all") {
            setViewMode("all");
        }
    }, [focusPostId, viewMode]);

    useEffect(() => {
        if (focusPostId <= 0) {
            return;
        }
        const exists = sortedPosts.some((item) => item.postId === focusPostId);
        if (!exists) {
            return;
        }
        const timer = window.setTimeout(() => {
            const element = document.getElementById(`community-post-${focusPostId}`);
            element?.scrollIntoView({behavior: "smooth", block: "center"});
        }, 120);
        return () => window.clearTimeout(timer);
    }, [focusPostId, sortedPosts]);


    const handleLikeChange = (postId: number, likeCount: number) => {
        setPublicPostState((prev) => {
            if (!prev?.returnObject?.data) {
                return prev;
            }
            const nextData = prev.returnObject.data.map((post) =>
                post.postId === postId ? {...post, likeCount} : post
            );
            return {
                ...prev,
                returnObject: {
                    ...prev.returnObject,
                    data: nextData
                }
            };
        });
    };

    const handleFavoriteChange = (postId: number, favorited: boolean, favoriteCount: number) => {
        setPublicPostState((prev) => {
            if (!prev?.returnObject?.data) {
                return prev;
            }
            const nextData = prev.returnObject.data
                .map((post) => post.postId === postId ? {...post, favoriteCount} : post)
                .filter((post) => !(viewMode === "favorite" && !favorited && post.postId === postId));
            return {
                ...prev,
                returnObject: {
                    ...prev.returnObject,
                    data: nextData
                }
            };
        });
    };

    const publicPostList = sortedPosts.map((value: PostDTO) => {
        const focused = focusPostId > 0 && value.postId === focusPostId;
        return (
            <div
                id={`community-post-${value.postId}`}
                key={value.postId}
                className={`community-post-wrapper${focused ? " is-focused" : ""}`}
            >
                <PostCard
                    mode="browse"
                    username={context.user==null?"":context.user.username}
                    postDTO={value}
                    highlightKeyword={searchKeyword}
                    forceOwnerPost={viewMode === "mine"}
                    onDeletePost={()=>{
                        publicPostHandler.current?.recover();
                        publicPostHandler.current?.request(null);
                    }}
                    onLikeChange={handleLikeChange}
                    defaultFavorited={viewMode === "favorite"}
                    onFavoriteChange={handleFavoriteChange}
                />
            </div>
        );
    });


    return (
        <div className={`community-page${isTeacher ? " community-page--teacher" : ""}`}>
            {!isTeacher && (
                <>
                    <div className="community-page-header">
                        <h1>匿名倾诉区</h1>
                        <p>在这里，你可以毫无顾虑地倾诉你的烦恼、压力和困惑，我们会用心倾听，给予你温暖的回应和专业的建议。</p>
                    </div>

                    <div className="community-cta">
                        <button
                            type="button"
                            className="btn-primary community-publish-btn"
                            onClick={() => {
                                if (!context.isLoggedIn) {
                                    navigate("/auth/login");
                                    return;
                                }
                                navigate("/home/community/post");
                            }}
                        >
                            <i className="fa-solid fa-pen-to-square"/>
                            发布我的倾诉
                        </button>
                    </div>
                </>
            )}

            <div className="community-filter-card">
                <div className="community-filter-row">
                    <div className="community-sort-group">
                        <h4>查看范围：</h4>
                        <div className="community-sort">
                            <button
                                type="button"
                                className={viewMode === "all" ? "is-active" : ""}
                                onClick={() => setViewMode("all")}
                            >
                                全部倾诉
                            </button>
                            <button
                                type="button"
                                className={viewMode === "mine" ? "is-active" : ""}
                                onClick={() => setViewMode("mine")}
                            >
                                我的倾诉
                            </button>
                            <button
                                type="button"
                                className={viewMode === "favorite" ? "is-active" : ""}
                                onClick={() => setViewMode("favorite")}
                            >
                                我的收藏
                            </button>
                        </div>
                    </div>

                    <div className="community-tag-group">
                        <h4>话题分类</h4>
                        <div className="community-tags">
                            {tagOptions.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    className={`community-tag ${activeTag === tag ? "is-active" : ""}`}
                                    onClick={() => setActiveTag(tag)}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="community-sort-group">
                        <h4>排序方式：</h4>
                        <div className="community-sort">
                            {sortOptions.map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    className={activeSort === option ? "is-active" : ""}
                                    onClick={() => setActiveSort(option)}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="community-search-group">
                        <h4>关键词搜索</h4>
                        <div className="community-search-row">
                            <div className="community-search">
                                <i className="fa-solid fa-search"/>
                                <input
                                    type="text"
                                    placeholder="搜索标题、内容或作者"
                                    value={searchInput}
                                    onChange={(event) => setSearchInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            handleSearchSubmit();
                                        }
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                className="community-search-btn"
                                onClick={() => handleSearchSubmit()}
                            >
                                搜索
                            </button>
                            <button
                                type="button"
                                className="community-search-cancel-btn"
                                onClick={handleCancelSearch}
                            >
                                取消
                            </button>
                        </div>
                        {recentKeywords.length > 0 && (
                            <div className="community-search-history">
                                <span className="history-label">最近搜索</span>
                                <div className="history-tags">
                                    {recentKeywords.map((keyword) => (
                                        <button
                                            key={keyword}
                                            type="button"
                                            className="history-tag"
                                            onClick={() => handleSearchSubmit(keyword)}
                                        >
                                            {keyword}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="history-clear-btn"
                                    onClick={handleClearSearchHistory}
                                >
                                    清空
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="community-topics">
                {topicCards.map((topic) => (
                    <button key={topic.label} type="button" className={`community-topic ${topic.tone}`}>
                        <span>{topic.label}</span>
                        <em>{topic.count}</em>
                    </button>
                ))}
            </div>

            <ResponseHandler<null, PostDTO[]>
                ref={publicPostHandler}
                request={postListRequest}
                setResponseState={setPublicPostState}
                autoRequest={null}
                idleComponent={
                    <p className="community-empty">
                        {viewMode === "mine" ? "未获取我的倾诉列表" : (viewMode === "favorite" ? "未获取我的收藏列表" : "未获取公开倾诉列表")}
                    </p>
                }
                loadingComponent={
                    <Loading type="dots" text='加载社区倾诉中...' color="#2196f3" size="large"
                             fullScreen></Loading>
                }
                handlingReturnObjectComponent={<Loading type="dots" text='处理加载社区倾述结果中...' color="#2196f3"
                                                        size="large"
                                                        fullScreen></Loading>}
                networkErrorComponent={
                    <div className="community-empty">
                        <h2>网络错误</h2>
                        <p>详情：{publicPostState?.networkError?.message}</p>
                    </div>

                }
                finishedComponent={
                    fetchFailed ? (
                        <div className="community-empty">
                            <h2>加载失败</h2>
                            <p>{fetchMessage}</p>
                        </div>
                    ) : (
                        <div className="post-container">
                            {publicPostList.length ? publicPostList : (
                                <p className="community-empty">
                                    {viewMode === "mine"
                                        ? "你还没有发布过倾诉内容"
                                        : (viewMode === "favorite" ? "你还没有收藏过帖子" : "暂无匹配的倾诉内容")}
                                </p>
                            )}
                        </div>
                    )
                }
            />
        </div>
    );
}
