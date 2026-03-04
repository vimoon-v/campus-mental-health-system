import React, {useEffect, useMemo, useState} from "react";
import {
    PsychAssessmentRecordDTO,
    PsychTestController,
    PsychTestManageDetail,
    PsychTestManageListItem,
    PsychTestManageOption,
    PsychTestManageQuestion,
    PsychTestQueryListItem
} from "../../controller/PsychTestController";
import "./PsychTest.css";
import "./PsychTestManage.css";
import {UserController} from "../../controller/UserController";
import {CheckLoginComponent} from "../../component/CheckLoginComponent";
import {ResponseHandler} from "../../common/response/ResponseHandler";
import {ResponseState} from "../../common/response/ResponseState";
import {Loading} from "../../common/view/display/Loading";
import {useNavigate} from "react-router-dom";
import {ReturnObject} from "../../common/response/ReturnObject";
import {AppShell} from "../../layout/AppShell";
import {PageContainer} from "../../layout/PageContainer";
import {User} from "../../entity/User";
import {UserRole} from "../../entity/enums/UserRole";
import {TeacherShell} from "../home/teacher/TeacherShell";

type TestCategory = {
    key: string;
    label: string;
};

const TEST_CATEGORIES: TestCategory[] = [
    {key: "all", label: "全部测试"},
    {key: "personality", label: "性格测试"},
    {key: "emotion", label: "情绪测试"},
    {key: "stress", label: "压力测试"},
    {key: "relationship", label: "人际关系"},
    {key: "study", label: "学习心理"},
    {key: "career", label: "职业规划"},
];

type ThemeStyle = {
    icon: string;
    className: string;
};

const FEATURED_THEMES: ThemeStyle[] = [
    {icon: "fa-brain", className: "featured-theme-primary"},
    {icon: "fa-heart", className: "featured-theme-secondary"},
    {icon: "fa-briefcase", className: "featured-theme-green"},
];

const LIST_THEMES: ThemeStyle[] = [
    {icon: "fa-bolt", className: "list-theme-blue"},
    {icon: "fa-handshake-angle", className: "list-theme-purple"},
    {icon: "fa-book-open", className: "list-theme-yellow"},
    {icon: "fa-bed", className: "list-theme-red"},
];

type ManageStatus = "published" | "draft" | "archived";

const MANAGE_STATUS_LABELS: Record<ManageStatus, string> = {
    published: "已发布",
    draft: "草稿",
    archived: "已归档"
};

const CATEGORY_ALIAS_MAP: Record<string, string> = {
    anxiety: "emotion",
    depression: "emotion",
    adaptation: "study"
};

const MANAGE_TYPE_OPTIONS = [
    {key: "all", label: "全部类型"},
    ...TEST_CATEGORIES
        .filter((category) => category.key !== "all")
        .map((category) => ({key: category.key, label: category.label}))
];

type ManageTestItem = {
    id: number;
    title: string;
    description: string;
    typeKey: string;
    typeLabel: string;
    status: ManageStatus;
    questionsNumber: number;
    participants: number;
    durationMinutes: number;
    rating: string;
    createdAt: string;
    createdTimeMs: number;
    passRate: number | null;
    gradeScope: (typeof MANAGE_GRADE_OPTIONS)[number]["key"];
};

const formatDate = (value: Date) => value.toLocaleDateString("zh-CN");

const formatParticipants = (value: number) => {
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}k`;
    }
    return `${value}`;
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

const normalizeCategoryKey = (value?: string) => {
    if (!value) {
        return "personality";
    }
    const normalized = value.toLowerCase();
    if (TEST_CATEGORIES.some((category) => category.key === normalized)) {
        return normalized;
    }
    return CATEGORY_ALIAS_MAP[normalized] ?? "personality";
};

const getCategoryLabel = (categoryKey?: string, fallback = "性格测试") => {
    const normalized = normalizeCategoryKey(categoryKey);
    return TEST_CATEGORIES.find((category) => category.key === normalized)?.label ?? fallback;
};

const MANAGE_GRADE_OPTIONS = [
    {key: "all", label: "全部年级"},
    {key: "freshman", label: "大一"},
    {key: "sophomore", label: "大二"},
    {key: "junior", label: "大三"},
    {key: "senior", label: "大四"}
] as const;

const normalizeGradeScope = (value?: string): (typeof MANAGE_GRADE_OPTIONS)[number]["key"] => {
    const normalized = (value ?? "").toLowerCase();
    if (MANAGE_GRADE_OPTIONS.some((option) => option.key === normalized)) {
        return normalized as (typeof MANAGE_GRADE_OPTIONS)[number]["key"];
    }
    return "all";
};

export const PsychTestEntranceForm: React.FC = () => {
    const psychTestController = useMemo(() => new PsychTestController(), []);
    const userController = new UserController();
    const navigate = useNavigate();

    const [psychTestListState, setPsychTestListState] = useState<ResponseState<PsychTestQueryListItem[]>>();
    const [psychRecordState, setPsychRecordState] = useState<ResponseState<PsychAssessmentRecordDTO[]>>();
    const [manageListState, setManageListState] = useState<ResponseState<PsychTestManageListItem[]>>();
    const [manageDetailState, setManageDetailState] = useState<ResponseState<PsychTestManageDetail>>();
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [activeCategory, setActiveCategory] = useState("all");
    const [visibleCount, setVisibleCount] = useState(4);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState<ManageStatus | "all">("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [gradeFilter, setGradeFilter] = useState<(typeof MANAGE_GRADE_OPTIONS)[number]["key"]>("all");
    const [activeTestId, setActiveTestId] = useState<number | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [managePage, setManagePage] = useState(1);
    const [manageForm, setManageForm] = useState({
        title: "",
        category: "personality",
        gradeScope: "all" as (typeof MANAGE_GRADE_OPTIONS)[number]["key"],
        durationMinutes: 10,
        passRate: "",
        description: "",
        status: "draft",
        validFrom: "",
        validTo: "",
        allowRepeat: true,
        showResult: true,
        autoWarn: true
    });
    const [questionDrafts, setQuestionDrafts] = useState<PsychTestManageQuestion[]>([]);
    const displayName = loggedInUser?.nickname?.trim()
        ? loggedInUser?.nickname
        : loggedInUser?.username ?? null;
    const loggedInAccountUsername = loggedInUser?.username ?? null;
    const loggedInRole = loggedInUser?.role ?? null;
    const roleCode = Number(loggedInRole);
    const isTeacher = roleCode === UserRole.TEACHER;
    const isForbiddenRole = roleCode === UserRole.ADMIN || roleCode === UserRole.SYSTEM_ADMIN;
    const managePageSize = 8;

    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-心理测评";
        userController.loggedInUser(null).then((result) => {
            if (result.code === ReturnObject.Code.SUCCESS && result.data?.username) {
                setLoggedInUser(result.data);
            } else {
                setLoggedInUser(null);
            }
        }).catch(() => {
            setLoggedInUser(null);
        });
    }, []);

    useEffect(() => {
        if (isForbiddenRole) {
            navigate("/home/main", {replace: true});
        }
    }, [isForbiddenRole, navigate]);

    const requestManageList = async () => {
        if (!isTeacher) {
            return;
        }
        setManageListState((prev) => ({
            loading: true,
            returnObject: prev?.returnObject ?? null,
            networkError: null
        }));
        try {
            const response = await psychTestController.manageList({
                keyword: searchKeyword || undefined,
                status: statusFilter === "all" ? undefined : statusFilter
            });
            setManageListState({
                loading: false,
                returnObject: response,
                networkError: null
            });
        } catch (error) {
            setManageListState({
                loading: false,
                returnObject: null,
                networkError: error as Error
            });
        }
    };

    const requestManageDetail = async (testId: number) => {
        if (!isTeacher) {
            return;
        }
        setManageDetailState((prev) => ({
            loading: true,
            returnObject: prev?.returnObject ?? null,
            networkError: null
        }));
        try {
            const response = await psychTestController.manageDetail({testId});
            setManageDetailState({
                loading: false,
                returnObject: response,
                networkError: null
            });
        } catch (error) {
            setManageDetailState({
                loading: false,
                returnObject: null,
                networkError: error as Error
            });
        }
    };

    const resolveCategory = (value?: string) => normalizeCategoryKey(value);

    const decoratedTests = useMemo(() => {
        const list = psychTestListState?.returnObject?.data ?? [];
        return list.map((item, index) => {
            const questions = item.questionsNumber ?? 10;
            const participants = item.participants ?? 0;
            const minutes = item.durationMinutes ?? Math.max(5, Math.round(questions * 0.5));
            const rating = typeof item.rating === "number" ? item.rating.toFixed(1) : "4.6";
            return {
                item,
                category: resolveCategory(item.category),
                participants,
                minutes,
                rating,
                featuredTheme: FEATURED_THEMES[index % FEATURED_THEMES.length],
                listTheme: LIST_THEMES[index % LIST_THEMES.length],
            };
        });
    }, [psychTestListState?.returnObject?.data]);

    const manageTests = useMemo<ManageTestItem[]>(() => {
        const list = manageListState?.returnObject?.data ?? [];
        return list.map((item) => {
            const questions = item.questionsNumber ?? 0;
            const participants = item.participants ?? 0;
            const typeKey = normalizeCategoryKey(item.category);
            const status = (["published", "draft", "archived"].includes(item.status) ? item.status : "draft") as ManageStatus;
            const createdTime = item.createdAt ? new Date(item.createdAt) : new Date();
            const createdAt = formatDate(createdTime);
            return {
                id: item.testId,
                title: item.title,
                description: item.description ?? "",
                typeKey,
                typeLabel: getCategoryLabel(typeKey),
                status,
                questionsNumber: questions,
                participants,
                durationMinutes: item.durationMinutes ?? Math.max(5, Math.round(questions * 0.5)),
                rating: typeof item.rating === "number" ? item.rating.toFixed(1) : "4.6",
                createdAt,
                createdTimeMs: createdTime.getTime(),
                passRate: item.passRate == null ? null : Number(item.passRate),
                gradeScope: normalizeGradeScope(item.gradeScope)
            };
        });
    }, [manageListState?.returnObject?.data]);

    const filteredManageTests = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        return manageTests.filter((test) => {
            if (statusFilter !== "all" && test.status !== statusFilter) {
                return false;
            }
            if (typeFilter !== "all" && test.typeKey !== typeFilter) {
                return false;
            }
            if (gradeFilter !== "all" && test.gradeScope !== gradeFilter) {
                return false;
            }
            if (keyword) {
                const haystack = `${test.title} ${test.description}`.toLowerCase();
                return haystack.includes(keyword);
            }
            return true;
        }).sort((left, right) => right.createdTimeMs - left.createdTimeMs || right.id - left.id);
    }, [manageTests, searchKeyword, statusFilter, typeFilter, gradeFilter]);

    const totalManagePages = Math.max(1, Math.ceil(filteredManageTests.length / managePageSize));
    const safeManagePage = Math.min(managePage, totalManagePages);
    const pagedManageTests = useMemo(() => {
        const start = (safeManagePage - 1) * managePageSize;
        return filteredManageTests.slice(start, start + managePageSize);
    }, [filteredManageTests, safeManagePage, managePageSize]);

    useEffect(() => {
        if (!filteredManageTests.length) {
            setActiveTestId(null);
            return;
        }
        setActiveTestId((prev) => {
            if (prev && filteredManageTests.some((test) => test.id === prev)) {
                return prev;
            }
            return filteredManageTests[0].id;
        });
    }, [filteredManageTests]);

    useEffect(() => {
        setManagePage(1);
    }, [searchKeyword, statusFilter, typeFilter, gradeFilter]);

    useEffect(() => {
        if (!activeTestId || !isEditModalOpen) {
            return;
        }
        requestManageDetail(activeTestId);
    }, [activeTestId, isEditModalOpen]);

    const activeManageTest = manageDetailState?.returnObject?.data ?? null;
    const totalParticipants = manageTests.reduce((sum, test) => sum + (test.participants || 0), 0);
    const highRiskCount = Math.max(0, Math.round(totalParticipants * 0.04));
    const completionRate = manageTests.length
        ? Math.min(98, Math.max(75, Math.round(88 - (manageTests.length % 7))))
        : 0;
    const participantsPercent = totalParticipants ? Math.min(100, Math.round((totalParticipants / 500) * 100)) : 0;
    const highRiskPercent = totalParticipants ? Math.min(100, Math.round((highRiskCount / totalParticipants) * 100)) : 0;
    const publishedCount = manageTests.filter((item) => item.status === "published").length;
    const draftCount = manageTests.filter((item) => item.status === "draft").length;
    const pagedStart = filteredManageTests.length === 0 ? 0 : (safeManagePage - 1) * managePageSize + 1;
    const pagedEnd = Math.min(filteredManageTests.length, safeManagePage * managePageSize);

    useEffect(() => {
        if (!activeManageTest) {
            return;
        }
        setManageForm({
            title: activeManageTest.title ?? "",
            category: normalizeCategoryKey(activeManageTest.category),
            gradeScope: normalizeGradeScope(activeManageTest.gradeScope),
            durationMinutes: activeManageTest.durationMinutes ?? 10,
            passRate: activeManageTest.passRate == null ? "" : String(activeManageTest.passRate),
            description: activeManageTest.description ?? "",
            status: activeManageTest.status ?? "draft",
            validFrom: activeManageTest.validFrom ?? "",
            validTo: activeManageTest.validTo ?? "",
            allowRepeat: activeManageTest.allowRepeat ?? true,
            showResult: activeManageTest.showResult ?? true,
            autoWarn: activeManageTest.autoWarn ?? true
        });
        setQuestionDrafts(activeManageTest.questions ?? []);
    }, [activeManageTest?.testId]);

    const filteredTests = useMemo(() => {
        return decoratedTests.filter((test) => activeCategory === "all" || test.category === activeCategory);
    }, [decoratedTests, activeCategory]);

    useEffect(() => {
        setVisibleCount(4);
    }, [activeCategory, decoratedTests.length]);

    useEffect(() => {
        if (!isTeacher) {
            return;
        }
        requestManageList();
    }, [isTeacher, searchKeyword, statusFilter]);

    const featuredTests = filteredTests.slice(0, 3);
    const remainingTests = filteredTests.slice(3);
    const visibleTests = remainingTests.slice(0, visibleCount);
    const hasMore = remainingTests.length > visibleCount;

    const statusMessage = (() => {
        if (psychTestListState?.networkError) {
            return `网络错误：${psychTestListState.networkError.message}`;
        }
        if (psychTestListState?.returnObject?.status && psychTestListState.returnObject.status !== ReturnObject.Status.SUCCESS) {
            return `获取心理测试${ReturnObject.Status.ChineseName.get(psychTestListState.returnObject.status)}：${psychTestListState.returnObject.message}`;
        }
        return "";
    })();

    const recordStatusMessage = (() => {
        if (psychRecordState?.networkError) {
            return `网络错误：${psychRecordState.networkError.message}`;
        }
        if (psychRecordState?.returnObject?.status && psychRecordState.returnObject.status !== ReturnObject.Status.SUCCESS) {
            return `获取测评记录${ReturnObject.Status.ChineseName.get(psychRecordState.returnObject.status)}：${psychRecordState.returnObject.message}`;
        }
        return "";
    })();

    const handleCreateTest = async () => {
        if (!window.confirm("确定要创建新的心理测试吗？当前未保存的内容将会丢失。")) {
            return;
        }
        try {
            const response = await psychTestController.manageCreate({
                title: "新建心理测试",
                category: "personality",
                gradeScope: "all",
                status: "draft"
            });
            if (response?.status === ReturnObject.Status.SUCCESS && response.data?.testId) {
                await requestManageList();
                setQuestionDrafts([]);
                setActiveTestId(Number(response.data.testId));
                setIsEditModalOpen(true);
            } else {
                window.alert(response?.message ?? "创建失败");
            }
        } catch (error) {
            window.alert("网络错误");
        }
    };

    const handleRefreshList = () => {
        requestManageList();
    };

    const handleResetManageFilters = () => {
        setSearchKeyword("");
        setStatusFilter("all");
        setTypeFilter("all");
        setGradeFilter("all");
    };

    const handleOpenManageDetail = (testId: number) => {
        setQuestionDrafts([]);
        setActiveTestId(testId);
        setIsEditModalOpen(true);
    };

    const handleExport = async () => {
        try {
            const response = await psychTestController.manageExport(null);
            if (response?.status === ReturnObject.Status.SUCCESS) {
                const blob = new Blob([JSON.stringify(response.data ?? [], null, 2)], {type: "application/json"});
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "psych_test_export.json";
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(url);
            } else {
                window.alert(response?.message ?? "导出失败");
            }
        } catch (error) {
            window.alert("网络错误");
        }
    };

    const handleAddQuestion = async () => {
        if (!activeManageTest) {
            window.alert("请先选择测试");
            return;
        }
        try {
            const response = await psychTestController.manageQuestionAdd({
                testId: activeManageTest.testId,
                title: "请输入题目内容",
                type: "scale",
                options: [
                    {label: "1分 - 完全不符合", score: 1},
                    {label: "2分 - 不太符合", score: 2},
                    {label: "3分 - 一般", score: 3},
                    {label: "4分 - 比较符合", score: 4},
                    {label: "5分 - 完全符合", score: 5}
                ]
            });
            if (response?.status === ReturnObject.Status.SUCCESS) {
                await requestManageDetail(activeManageTest.testId);
                await requestManageList();
            } else {
                window.alert(response?.message ?? "添加题目失败");
            }
        } catch (error) {
            window.alert("网络错误");
        }
    };

    const handlePreviewTest = () => {
        if (!activeManageTest) {
            window.alert("暂无可预览的测试");
            return;
        }
        window.alert(`正在预览测试：${activeManageTest.title}`);
    };

    const handlePublishTest = async () => {
        if (!activeManageTest) {
            window.alert("暂无可发布的测试");
            return;
        }
        if (!window.confirm("确定要发布这个心理测试吗？发布后学生将可以参与测试。")) {
            return;
        }
        try {
            const response = await psychTestController.managePublish({testId: activeManageTest.testId});
            if (response?.status === ReturnObject.Status.SUCCESS) {
                await requestManageDetail(activeManageTest.testId);
                await requestManageList();
            } else {
                window.alert(response?.message ?? "发布失败");
            }
        } catch (error) {
            window.alert("网络错误");
        }
    };

    const handleDeleteTest = async () => {
        if (!activeManageTest) {
            window.alert("暂无可删除的测试");
            return;
        }
        if (!window.confirm("确定要删除该测试吗？删除后不可恢复。")) {
            return;
        }
        try {
            const response = await psychTestController.manageDelete({testId: activeManageTest.testId});
            if (response?.status === ReturnObject.Status.SUCCESS) {
                setActiveTestId(null);
                setIsEditModalOpen(false);
                setManageDetailState({
                    loading: false,
                    returnObject: null,
                    networkError: null
                });
                await requestManageList();
            } else {
                window.alert(response?.message ?? "删除失败");
            }
        } catch (error) {
            window.alert("网络错误");
        }
    };

    const handlePublishById = async (testId: number) => {
        try {
            const response = await psychTestController.managePublish({testId});
            if (response?.status === ReturnObject.Status.SUCCESS) {
                if (activeTestId === testId) {
                    await requestManageDetail(testId);
                }
                await requestManageList();
            } else {
                window.alert(response?.message ?? "发布失败");
            }
        } catch (error) {
            window.alert("网络错误");
        }
    };

    const handleArchiveById = async (testId: number) => {
        try {
            const response = await psychTestController.manageArchive({testId});
            if (response?.status === ReturnObject.Status.SUCCESS) {
                if (activeTestId === testId) {
                    await requestManageDetail(testId);
                }
                await requestManageList();
            } else {
                window.alert(response?.message ?? "下架失败");
            }
        } catch (error) {
            window.alert("网络错误");
        }
    };

    const handleToggleManageStatus = async (test: ManageTestItem) => {
        if (test.status === "published") {
            if (!window.confirm(`确定下架测试《${test.title}》吗？`)) {
                return;
            }
            await handleArchiveById(test.id);
            return;
        }
        if (!window.confirm(`确定发布测试《${test.title}》吗？`)) {
            return;
        }
        await handlePublishById(test.id);
    };

    const handleSaveDraft = async () => {
        if (!activeManageTest) {
            window.alert("暂无可保存的测试");
            return;
        }
        try {
            const parsedPassRate = manageForm.passRate === "" ? undefined : Number(manageForm.passRate);
            const updateResponse = await psychTestController.manageUpdate({
                testId: activeManageTest.testId,
                title: manageForm.title,
                category: manageForm.category,
                gradeScope: manageForm.gradeScope,
                durationMinutes: Number(manageForm.durationMinutes) || undefined,
                passRate: parsedPassRate != null && Number.isFinite(parsedPassRate)
                    ? Math.max(0, Math.min(100, parsedPassRate))
                    : undefined,
                description: manageForm.description,
                status: manageForm.status,
                validFrom: manageForm.validFrom || undefined,
                validTo: manageForm.validTo || undefined,
                allowRepeat: manageForm.allowRepeat,
                showResult: manageForm.showResult,
                autoWarn: manageForm.autoWarn
            });
            if (updateResponse?.status !== ReturnObject.Status.SUCCESS) {
                window.alert(updateResponse?.message ?? "保存失败");
                return;
            }
            for (const question of questionDrafts) {
                if (question.questionId) {
                    await psychTestController.manageQuestionUpdate({
                        questionId: question.questionId,
                        title: question.title,
                        type: question.type,
                        options: question.options
                    });
                } else if (question.title) {
                    await psychTestController.manageQuestionAdd({
                        testId: activeManageTest.testId,
                        title: question.title,
                        type: question.type,
                        options: question.options
                    });
                }
            }
            await requestManageDetail(activeManageTest.testId);
            await requestManageList();
            window.alert("测试已保存");
        } catch (error) {
            window.alert("网络错误");
        }
    };

    const handleQuestionDelete = async (questionId?: number) => {
        if (!questionId) {
            return;
        }
        if (!window.confirm("确定要删除该题目吗？")) {
            return;
        }
        try {
            const response = await psychTestController.manageQuestionDelete({questionId});
            if (response?.status === ReturnObject.Status.SUCCESS && activeManageTest) {
                await requestManageDetail(activeManageTest.testId);
                await requestManageList();
            } else {
                window.alert(response?.message ?? "删除失败");
            }
        } catch (error) {
            window.alert("网络错误");
        }
    };

    const updateQuestionField = (index: number, field: keyof PsychTestManageQuestion, value: string) => {
        setQuestionDrafts((prev) => {
            const next = [...prev];
            next[index] = {...next[index], [field]: value};
            return next;
        });
    };

    const updateQuestionOption = (qIndex: number, oIndex: number, field: keyof PsychTestManageOption, value: string) => {
        setQuestionDrafts((prev) => {
            const next = [...prev];
            const question = next[qIndex];
            const options = [...(question.options ?? [])];
            const option = {...options[oIndex], [field]: field === "score" ? Number(value) : value};
            options[oIndex] = option;
            next[qIndex] = {...question, options};
            return next;
        });
    };

    const teacherContent = (
        <div className="psych-test-manage">
            <section className="psych-test-manage__header">
                <div className="psych-test-manage__title">
                    <h2>心理测试管理</h2>
                    <p>创建、发布和管理面向学生的心理健康测试问卷</p>
                </div>
                <div className="psych-test-manage__actions">
                    <button
                        type="button"
                        className="teacher-dashboard__btn teacher-dashboard__btn--primary"
                        onClick={handleCreateTest}
                    >
                        <i className="fa-solid fa-plus"/>创建新测试
                    </button>
                    <button
                        type="button"
                        className="teacher-dashboard__btn teacher-dashboard__btn--ghost"
                        onClick={handleRefreshList}
                    >
                        <i className="fa-solid fa-rotate-right"/>刷新列表
                    </button>
                    <button
                        type="button"
                        className="teacher-dashboard__btn teacher-dashboard__btn--ghost"
                        onClick={handleExport}
                    >
                        <i className="fa-solid fa-download"/>导出数据
                    </button>
                </div>
            </section>

            <section className="psych-test-manage__filters">
                <div className="psych-test-manage__filter-grid">
                    <div className="psych-test-manage__search">
                        <input
                            type="text"
                            className="psych-test-manage__input"
                            placeholder="搜索测试名称/关键词"
                            value={searchKeyword}
                            onChange={(event) => setSearchKeyword(event.target.value)}
                        />
                        <i className="fa-solid fa-magnifying-glass"/>
                    </div>
                    <select
                        className="psych-test-manage__select"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value as ManageStatus | "all")}
                    >
                        <option value="all">全部状态</option>
                        {Object.entries(MANAGE_STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    <select
                        className="psych-test-manage__select"
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                    >
                        {MANAGE_TYPE_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                    </select>
                    <select
                        className="psych-test-manage__select"
                        value={gradeFilter}
                        onChange={(event) => setGradeFilter(event.target.value as (typeof MANAGE_GRADE_OPTIONS)[number]["key"])}
                    >
                        {MANAGE_GRADE_OPTIONS.map((option) => (
                            <option key={option.key} value={option.key}>{option.label}</option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="teacher-dashboard__btn teacher-dashboard__btn--outline"
                        onClick={handleResetManageFilters}
                    >
                        <i className="fa-solid fa-rotate-left"/>重置
                    </button>
                </div>
            </section>

            <section className="psych-test-manage__table-card">
                <div className="psych-test-manage__table-wrap">
                    <table className="psych-test-manage__table">
                        <thead>
                        <tr>
                            <th>测试名称</th>
                            <th>测试类型</th>
                            <th>测试时长</th>
                            <th>测试人数</th>
                            <th>通过率</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                        </thead>
                        <tbody>
                        {manageListState?.loading ? (
                            <tr>
                                <td colSpan={7} className="psych-test-manage__empty">加载中...</td>
                            </tr>
                        ) : pagedManageTests.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="psych-test-manage__empty">暂无符合条件的测试</td>
                            </tr>
                        ) : (
                            pagedManageTests.map((test) => (
                                <tr key={test.id} className={activeTestId === test.id ? "is-active" : ""}>
                                    <td>
                                        <div className="psych-test-manage__table-title">{test.title}</div>
                                        <div className="psych-test-manage__table-sub">创建于 {test.createdAt}</div>
                                    </td>
                                    <td><span className="psych-test-manage__table-tag">{test.typeLabel}</span></td>
                                    <td>{test.durationMinutes}分钟</td>
                                    <td>{test.participants}人</td>
                                    <td>{test.passRate == null ? "--" : `${test.passRate}%`}</td>
                                    <td>
                                        <span className={`psych-test-manage__badge psych-test-manage__badge--${test.status}`}>
                                            {MANAGE_STATUS_LABELS[test.status]}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="psych-test-manage__table-actions">
                                            <button type="button" title="查看详情" onClick={() => handleOpenManageDetail(test.id)}>
                                                <i className="fa-solid fa-eye"/>
                                            </button>
                                            <button type="button" title="编辑测试" onClick={() => handleOpenManageDetail(test.id)}>
                                                <i className="fa-solid fa-pen-to-square"/>
                                            </button>
                                            <button type="button" title="查看结果" onClick={() => window.alert(`查看测试《${test.title}》结果`)}>
                                                <i className="fa-solid fa-chart-pie"/>
                                            </button>
                                            <button
                                                type="button"
                                                title={test.status === "published" ? "下架测试" : "发布测试"}
                                                onClick={() => handleToggleManageStatus(test)}
                                            >
                                                <i className={`fa-solid ${test.status === "published" ? "fa-arrow-down" : "fa-arrow-up"}`}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>
                <div className="psych-test-manage__table-footer">
                    <span>显示 {pagedStart}-{pagedEnd} 条，共 {filteredManageTests.length} 条测试</span>
                    <div className="psych-test-manage__page-buttons">
                        <button type="button" disabled={safeManagePage <= 1} onClick={() => setManagePage(safeManagePage - 1)}>
                            <i className="fa-solid fa-chevron-left"/>
                        </button>
                        <span>{safeManagePage} / {totalManagePages}</span>
                        <button type="button" disabled={safeManagePage >= totalManagePages} onClick={() => setManagePage(safeManagePage + 1)}>
                            <i className="fa-solid fa-chevron-right"/>
                        </button>
                    </div>
                </div>
            </section>

            <section className="psych-test-manage__overview">
                <article className="psych-test-manage__overview-card">
                    <div>
                        <p>总测试数量</p>
                        <h4>{manageTests.length}</h4>
                    </div>
                    <span><i className="fa-solid fa-file-lines"/></span>
                </article>
                <article className="psych-test-manage__overview-card">
                    <div>
                        <p>已发布测试</p>
                        <h4>{publishedCount}</h4>
                    </div>
                    <span className="is-success"><i className="fa-solid fa-circle-check"/></span>
                </article>
                <article className="psych-test-manage__overview-card">
                    <div>
                        <p>测试总人数</p>
                        <h4>{totalParticipants}</h4>
                    </div>
                    <span className="is-info"><i className="fa-solid fa-users"/></span>
                </article>
                <article className="psych-test-manage__overview-card">
                    <div>
                        <p>草稿数量</p>
                        <h4>{draftCount}</h4>
                    </div>
                    <span className="is-warning"><i className="fa-solid fa-pen"/></span>
                </article>
            </section>

            <section
                className={`psych-test-manage__grid psych-test-manage__editor-modal${isEditModalOpen ? " is-open" : ""}`}
                onClick={() => setIsEditModalOpen(false)}
            >
                <div className="psych-test-manage__column psych-test-manage__column--legacy">
                    <div className="psych-test-manage__card">
                        <div className="psych-test-manage__card-header">
                            <h3>测试列表</h3>
                            <span className="psych-test-manage__list-count">共 {manageTests.length} 个测试</span>
                        </div>
                        <div className="psych-test-manage__list">
                            {manageListState?.loading ? (
                                <div className="psych-test-manage__empty">加载中...</div>
                            ) : filteredManageTests.length === 0 ? (
                                <div className="psych-test-manage__empty">暂无符合条件的测试</div>
                            ) : (
                                filteredManageTests.map((test) => (
                                    <button
                                        key={test.id}
                                        type="button"
                                        className={`psych-test-manage__list-item${activeTestId === test.id ? " is-active" : ""}`}
                                        onClick={() => setActiveTestId(test.id)}
                                    >
                                        <div className="psych-test-manage__list-title">
                                            <h4>{test.title}</h4>
                                            <span className={`psych-test-manage__badge psych-test-manage__badge--${test.status}`}>
                                                {MANAGE_STATUS_LABELS[test.status]}
                                            </span>
                                        </div>
                                        <div className="psych-test-manage__list-meta">
                                            <span><i className="fa-solid fa-tag"/> {test.typeLabel}</span>
                                            <span><i className="fa-solid fa-clipboard-check"/> {test.questionsNumber}题</span>
                                        </div>
                                        <div className="psych-test-manage__list-foot">
                                            <span><i className="fa-solid fa-clock"/> {test.createdAt} 创建</span>
                                            <span><i className="fa-solid fa-users"/> 已参与：{test.participants}人</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="psych-test-manage__card">
                        <div className="psych-test-manage__card-header">
                            <h3>测试数据统计</h3>
                        </div>
                        <div className="psych-test-manage__card-body psych-test-manage__stats">
                            <div>
                                <div className="psych-test-manage__stat-row">
                                    <span>总参与人数</span>
                                    <span>{totalParticipants}</span>
                                </div>
                                <div className="psych-test-manage__stat-bar">
                                    <span style={{width: `${participantsPercent}%`}}/>
                                </div>
                            </div>
                            <div>
                                <div className="psych-test-manage__stat-row">
                                    <span>高风险预警</span>
                                    <span className="psych-test-manage__accent">{highRiskCount}</span>
                                </div>
                                <div className="psych-test-manage__stat-bar is-accent">
                                    <span style={{width: `${highRiskPercent}%`}}/>
                                </div>
                            </div>
                            <div>
                                <div className="psych-test-manage__stat-row">
                                    <span>平均完成率</span>
                                    <span>{completionRate}%</span>
                                </div>
                                <div className="psych-test-manage__stat-bar is-success">
                                    <span style={{width: `${completionRate}%`}}/>
                                </div>
                            </div>
                            <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--outline teacher-dashboard__btn--full">
                                <i className="fa-solid fa-chart-simple"/>查看详细报表
                            </button>
                        </div>
                    </div>
                </div>

                <div className="psych-test-manage__column psych-test-manage__editor-panel" onClick={(event) => event.stopPropagation()}>
                    <div className="psych-test-manage__editor-head">
                        <h3>{activeManageTest ? `编辑测试：${activeManageTest.title}` : "编辑测试"}</h3>
                        <button
                            type="button"
                            className="teacher-dashboard__btn teacher-dashboard__btn--ghost"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            <i className="fa-solid fa-xmark"/>关闭
                        </button>
                    </div>
                    <div className="psych-test-manage__card">
                        <div className="psych-test-manage__card-header">
                            <h3>测试基本信息</h3>
                            <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--ghost" onClick={handlePreviewTest}>
                                <i className="fa-solid fa-eye"/>预览测试
                            </button>
                        </div>
                        {activeManageTest && activeManageTest.testId === activeTestId ? (
                            <div className="psych-test-manage__card-body" key={`detail-${activeManageTest.testId}`}>
                                <div className="psych-test-manage__detail-grid">
                                    <div className="psych-test-manage__field">
                                        <label>测试名称</label>
                                        <input
                                            className="psych-test-manage__input"
                                            value={manageForm.title}
                                            onChange={(event) => setManageForm((prev) => ({...prev, title: event.target.value}))}
                                        />
                                    </div>
                                    <div className="psych-test-manage__field">
                                        <label>测试类型</label>
                                        <select
                                            className="psych-test-manage__select"
                                            value={manageForm.category}
                                            onChange={(event) => setManageForm((prev) => ({...prev, category: event.target.value}))}
                                        >
                                            {MANAGE_TYPE_OPTIONS.filter((option) => option.key !== "all").map((option) => (
                                                <option key={option.key} value={option.key}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="psych-test-manage__field">
                                        <label>适用年级</label>
                                        <select
                                            className="psych-test-manage__select"
                                            value={manageForm.gradeScope}
                                            onChange={(event) => setManageForm((prev) => ({
                                                ...prev,
                                                gradeScope: normalizeGradeScope(event.target.value)
                                            }))}
                                        >
                                            {MANAGE_GRADE_OPTIONS.map((option) => (
                                                <option key={option.key} value={option.key}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="psych-test-manage__field">
                                        <label>预计完成时间</label>
                                        <input
                                            type="number"
                                            className="psych-test-manage__input"
                                            value={manageForm.durationMinutes}
                                            onChange={(event) => setManageForm((prev) => ({...prev, durationMinutes: Number(event.target.value)}))}
                                        />
                                    </div>
                                    <div className="psych-test-manage__field">
                                        <label>通过率(%)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            step={0.1}
                                            className="psych-test-manage__input"
                                            value={manageForm.passRate}
                                            onChange={(event) => setManageForm((prev) => ({...prev, passRate: event.target.value}))}
                                            placeholder="留空表示未设置"
                                        />
                                    </div>
                                    <div className="psych-test-manage__field" style={{gridColumn: "1 / -1"}}>
                                        <label>测试说明</label>
                                        <textarea
                                            className="psych-test-manage__textarea"
                                            value={manageForm.description}
                                            onChange={(event) => setManageForm((prev) => ({...prev, description: event.target.value}))}
                                            placeholder="请输入测试的简要说明，帮助学生了解测试目的和注意事项。"
                                        />
                                    </div>
                                </div>

                                <div className="psych-test-manage__section">
                                    <h4>发布设置</h4>
                                    <div className="psych-test-manage__detail-grid">
                                        <div className="psych-test-manage__field">
                                            <label>发布状态</label>
                                            <div className="psych-test-manage__options">
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name="publishStatus"
                                                        checked={manageForm.status === "draft"}
                                                        onChange={() => setManageForm((prev) => ({...prev, status: "draft"}))}
                                                    /> 保存为草稿
                                                </label>
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name="publishStatus"
                                                        checked={manageForm.status === "published"}
                                                        onChange={() => setManageForm((prev) => ({...prev, status: "published"}))}
                                                    /> 发布测试
                                                </label>
                                            </div>
                                        </div>
                                        <div className="psych-test-manage__field">
                                            <label>有效时间</label>
                                            <div className="psych-test-manage__option-row">
                                                <input
                                                    type="date"
                                                    className="psych-test-manage__input"
                                                    value={manageForm.validFrom}
                                                    onChange={(event) => setManageForm((prev) => ({...prev, validFrom: event.target.value}))}
                                                />
                                                <input
                                                    type="date"
                                                    className="psych-test-manage__input"
                                                    value={manageForm.validTo}
                                                    onChange={(event) => setManageForm((prev) => ({...prev, validTo: event.target.value}))}
                                                />
                                            </div>
                                        </div>
                                        <div className="psych-test-manage__field" style={{gridColumn: "1 / -1"}}>
                                            <label>结果设置</label>
                                            <div className="psych-test-manage__options">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={manageForm.showResult}
                                                        onChange={(event) => setManageForm((prev) => ({...prev, showResult: event.target.checked}))}
                                                    /> 学生完成后可查看自己的测试结果
                                                </label>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={manageForm.autoWarn}
                                                        onChange={(event) => setManageForm((prev) => ({...prev, autoWarn: event.target.checked}))}
                                                    /> 高风险结果自动预警
                                                </label>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={manageForm.allowRepeat}
                                                        onChange={(event) => setManageForm((prev) => ({...prev, allowRepeat: event.target.checked}))}
                                                    /> 允许学生重复测试
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="psych-test-manage__card-body">
                                <div className="psych-test-manage__empty">
                                    {manageDetailState?.loading ? "加载测试详情中..." : "请选择要编辑的测试"}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="psych-test-manage__card">
                        <div className="psych-test-manage__card-header">
                            <h3>试题管理 (共{questionDrafts.length}题)</h3>
                            <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--primary" onClick={handleAddQuestion}>
                                <i className="fa-solid fa-plus"/>添加题目
                            </button>
                        </div>
                        <div className="psych-test-manage__card-body">
                            <div className="psych-test-manage__question-list">
                                {questionDrafts.length === 0 ? (
                                    <div className="psych-test-manage__empty">暂无题目，请添加题目</div>
                                ) : (
                                    questionDrafts.map((question, qIndex) => (
                                        <div className="psych-test-manage__question" key={question.questionId ?? qIndex}>
                                            <div className="psych-test-manage__question-head">
                                                <span className="psych-test-manage__question-index">第{qIndex + 1}题</span>
                                                <div className="psych-test-manage__question-actions">
                                                    <button type="button"><i className="fa-solid fa-pen-to-square"/></button>
                                                    <button type="button" onClick={() => handleQuestionDelete(question.questionId)}>
                                                        <i className="fa-solid fa-trash"/>
                                                    </button>
                                                </div>
                                            </div>
                                        <div className="psych-test-manage__field">
                                            <label>题目内容</label>
                                            <input
                                                className="psych-test-manage__input"
                                                value={question.title}
                                                onChange={(event) => updateQuestionField(qIndex, "title", event.target.value)}
                                            />
                                        </div>
                                        <div className="psych-test-manage__field">
                                            <label>题目类型</label>
                                            <select
                                                className="psych-test-manage__select"
                                                value={question.type}
                                                onChange={(event) => updateQuestionField(qIndex, "type", event.target.value)}
                                            >
                                                <option value="single">单选题</option>
                                                <option value="multiple">多选题</option>
                                                <option value="scale">量表题</option>
                                                <option value="fill">填空题</option>
                                            </select>
                                        </div>
                                            <div>
                                                <label>选项设置 (量表题 1-5分)</label>
                                                <div className="psych-test-manage__options">
                                                    {(question.options ?? []).map((option, optionIndex) => (
                                                        <div className="psych-test-manage__option-row" key={optionIndex}>
                                                            <input
                                                                className="psych-test-manage__input"
                                                                value={option.label}
                                                                onChange={(event) => updateQuestionOption(qIndex, optionIndex, "label", event.target.value)}
                                                            />
                                                            <input
                                                                type="number"
                                                                className="psych-test-manage__input"
                                                                value={option.score ?? 0}
                                                                onChange={(event) => updateQuestionOption(qIndex, optionIndex, "score", event.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="psych-test-manage__section psych-test-manage__footer-actions">
                                <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--ghost">
                                    <i className="fa-solid fa-sort"/>调整题目顺序
                                </button>
                                <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--ghost">
                                    <i className="fa-solid fa-copy"/>复制题目
                                </button>
                                <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--outline">
                                    <i className="fa-solid fa-trash"/>批量删除
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="psych-test-manage__footer-actions">
                        <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--ghost" onClick={handleSaveDraft}>
                            <i className="fa-solid fa-floppy-disk"/>保存草稿
                        </button>
                        <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--ghost" onClick={handlePreviewTest}>
                            <i className="fa-solid fa-eye"/>预览测试
                        </button>
                        <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--outline" onClick={handleDeleteTest}>
                            <i className="fa-solid fa-trash"/>删除测试
                        </button>
                        <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--primary" onClick={handlePublishTest}>
                            <i className="fa-solid fa-paper-plane"/>发布测试
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );

    const pageContent = (
        <CheckLoginComponent>
            <>
                <ResponseHandler<null, PsychTestQueryListItem[]>
                    request={psychTestController.listAll}
                    autoRequest={null}
                    setResponseState={setPsychTestListState}
                    idleComponent={<></>}
                    loadingComponent={<Loading type="dots" text="获取心理测评列表中..." color="#4361ee" size="large" fullScreen/>}
                    handlingReturnObjectComponent={<Loading type="dots" text="处理获取心理测评列表结果中..." color="#4361ee" size="large" fullScreen/>}
                    networkErrorComponent={<></>}
                    finishedComponent={<></>}
                />
                <ResponseHandler<null, PsychAssessmentRecordDTO[]>
                    request={psychTestController.listMine}
                    autoRequest={null}
                    setResponseState={setPsychRecordState}
                    idleComponent={<></>}
                    loadingComponent={<Loading type="dots" text="获取测评记录中..." color="#4361ee" size="large" fullScreen/>}
                    handlingReturnObjectComponent={<Loading type="dots" text="处理测评记录中..." color="#4361ee" size="large" fullScreen/>}
                    networkErrorComponent={<></>}
                    finishedComponent={<></>}
                />

                {isTeacher ? teacherContent : (
                    <div className="psych-test-page">
                    <section className="psych-test-hero">
                        <h1>专业心理测试</h1>
                        <p>通过科学的心理测试，更好地了解自己的心理状态，发现潜在的心理需求。</p>
                    </section>

                    <section className="psych-test-filter card-shadow">
                        <h3>测试分类</h3>
                        <div className="psych-test-category-list">
                            {TEST_CATEGORIES.map((category) => (
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
                        {statusMessage ? <div className="psych-test-status">{statusMessage}</div> : null}
                    </section>

                    <section className="psych-test-featured">
                        <div className="psych-test-section-head">
                            <h3>热门推荐测试</h3>
                            <span className="psych-test-section-link">精选高人气测试</span>
                        </div>
                        <div className="psych-test-featured-grid">
                            {featuredTests.length === 0 ? (
                                <div className="psych-test-empty">暂无推荐测试</div>
                            ) : (
                                featuredTests.map((test, index) => (
                                    <article className="psych-test-featured-card card-shadow" key={test.item.className ?? index}>
                                        <div className={`featured-card-icon ${test.featuredTheme.className}`}>
                                            <i className={`fa-solid ${test.featuredTheme.icon}`}/>
                                        </div>
                                        <div className="featured-card-body">
                                            <div className="featured-card-meta">
                                                <span className="badge">
                                                    {TEST_CATEGORIES.find((category) => category.key === test.category)?.label ?? "心理测试"}
                                                </span>
                                                <span className="participants">
                                                    <i className="fa-solid fa-users"/> {formatParticipants(test.participants)}人已测
                                                </span>
                                            </div>
                                            <h4 className="line-clamp-2">{test.item.title}</h4>
                                            <p className="line-clamp-3">{test.item.description ?? "暂无测试描述。"}</p>
                                            <div className="featured-card-stats">
                                                <span><i className="fa-solid fa-clock"/> 约{test.minutes}分钟</span>
                                                <span><i className="fa-solid fa-star"/> {test.rating}分</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="start-test-btn"
                                                onClick={() => navigate(`/psych_test?test=${test.item.className}`)}
                                            >
                                                开始测试
                                            </button>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="psych-test-list-section">
                        <div className="psych-test-section-head">
                            <h3>更多心理测试</h3>
                            <span className="psych-test-section-link">覆盖多元主题的测评</span>
                        </div>
                        <div className="psych-test-list">
                            {visibleTests.length === 0 ? (
                                <div className="psych-test-empty">暂无更多测试</div>
                            ) : (
                                visibleTests.map((test, index) => (
                                    <article className="psych-test-list-card card-shadow" key={test.item.className ?? index}>
                                        <div className={`list-card-icon ${test.listTheme.className}`}>
                                            <i className={`fa-solid ${test.listTheme.icon}`}/>
                                        </div>
                                        <div className="list-card-body">
                                            <div className="list-card-meta">
                                                <span className="badge">
                                                    {TEST_CATEGORIES.find((category) => category.key === test.category)?.label ?? "心理测试"}
                                                </span>
                                                <span>{formatParticipants(test.participants)}人已测</span>
                                            </div>
                                            <h4 className="line-clamp-1">{test.item.title}</h4>
                                            <div className="list-card-stats">
                                                <span><i className="fa-solid fa-clock"/> 约{test.minutes}分钟</span>
                                                <span><i className="fa-solid fa-star"/> {test.rating}分</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="start-test-link"
                                                onClick={() => navigate(`/psych_test?test=${test.item.className}`)}
                                            >
                                                开始测试 <i className="fa-solid fa-arrow-right"/>
                                            </button>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                        {remainingTests.length > 0 ? (
                            <div className="psych-test-load-more">
                                <button
                                    type="button"
                                    onClick={() => setVisibleCount((prev) => prev + 4)}
                                    disabled={!hasMore}
                                >
                                    {hasMore ? "加载更多" : "已加载全部"}
                                    <i className={`fa-solid ${hasMore ? "fa-rotate-right" : "fa-check"}`}/>
                                </button>
                            </div>
                        ) : null}
                    </section>
                    <section className="psych-test-records">
                        <div className="psych-test-section-head">
                            <h3>我的测试记录</h3>
                            <span className="psych-test-section-link">查看历史测评结果</span>
                        </div>
                        {recordStatusMessage ? <div className="psych-test-status">{recordStatusMessage}</div> : null}
                        <div className="psych-test-record-grid">
                            {(psychRecordState?.returnObject?.data ?? []).length === 0 ? (
                                <div className="psych-test-empty">暂无测评记录</div>
                            ) : (
                                (psychRecordState?.returnObject?.data ?? []).map((record, index) => (
                                    <article className="psych-test-record-card card-shadow" key={record.assessmentId ?? index}>
                                        <div className="record-header">
                                            <div>
                                                <h4>{record.assessmentName}</h4>
                                                <span className="record-sub">记录编号：{record.assessmentId ?? "--"}</span>
                                            </div>
                                            <span className="record-time">{formatDateTime(record.assessmentTime)}</span>
                                        </div>
                                        <p className="record-report line-clamp-3">{record.assessmentReport}</p>
                                        <details className="record-details">
                                            <summary>查看完整报告</summary>
                                            <p>{record.assessmentReport}</p>
                                        </details>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                </div>
                )}
            </>
        </CheckLoginComponent>
    );

    if (isForbiddenRole) {
        return null;
    }

    if (isTeacher) {
        return <TeacherShell user={loggedInUser}>{pageContent}</TeacherShell>;
    }

    return (
        <AppShell username={displayName} accountUsername={loggedInAccountUsername} avatar={loggedInUser?.avatar ?? null} role={loggedInRole} mainPadding="30px 0">
            <PageContainer>{pageContent}</PageContainer>
        </AppShell>
    );
};
