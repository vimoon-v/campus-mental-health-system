import React, {useEffect, useMemo, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useOutletContext} from "react-router";
import {Homepage} from "../HomepageForm";
import {AppointmentController} from "../../../controller/AppointmentController";
import {PsychKnowledgeController} from "../../../controller/PsychKnowledgeController";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {ResponseState} from "../../../common/response/ResponseState";
import {AppointmentDTO} from "../../../entity/AppointmentDTO";
import {PsychKnowledgeDTO} from "../../../entity/DTO/PsychKnowledgeDTO";
import {AppointmentStatus} from "../../../entity/enums/AppointmentStatus";
import {ReturnObject} from "../../../common/response/ReturnObject";
import "./TeacherDashboard.css";

const formatDateTime = (value: any) => {
    if (!value) {
        return "";
    }
    const resolved = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(resolved.getTime())) {
        return "";
    }
    return resolved.toLocaleString("zh-CN");
};

const formatTime = (value: any) => {
    if (!value) {
        return "";
    }
    const resolved = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(resolved.getTime())) {
        return "";
    }
    return resolved.toLocaleTimeString("zh-CN", {hour: "2-digit", minute: "2-digit"});
};

const resolveDisplayName = (user: Homepage.OutletContext["user"]) => {
    const name = user?.name?.trim();
    if (name) {
        return name;
    }
    const nickname = user?.nickname?.trim();
    if (nickname) {
        return nickname;
    }
    const username = user?.username?.trim();
    if (username) {
        return username;
    }
    return "咨询师";
};

const resolveStatusLabel = (status: AppointmentStatus | string | undefined) => {
    return AppointmentStatus.ChineseName.get(String(status)) ?? "待处理";
};

const resolveStatusClass = (status: AppointmentStatus | string | undefined) => {
    switch (status) {
        case AppointmentStatus.ACCEPTED:
            return "teacher-dashboard__status--success";
        case AppointmentStatus.REJECTED:
            return "teacher-dashboard__status--danger";
        case AppointmentStatus.FORCE_CANCELLED:
            return "teacher-dashboard__status--danger";
        case AppointmentStatus.IN_PROGRESS:
            return "teacher-dashboard__status--info";
        default:
            return "teacher-dashboard__status--warning";
    }
};

const countByDay = (appointments: AppointmentDTO[], target: Date) => {
    return appointments.filter((item) => {
        if (!item?.startTime) {
            return false;
        }
        const date = new Date(item.startTime);
        return date.getFullYear() === target.getFullYear()
            && date.getMonth() === target.getMonth()
            && date.getDate() === target.getDate();
    }).length;
};

const buildLinePath = (values: number[]) => {
    if (values.length === 0) {
        return "M 0 100 L 100 100";
    }
    const maxValue = Math.max(...values, 1);
    return values.map((value, index) => {
        const x = (index / (values.length - 1 || 1)) * 100;
        const y = 100 - (value / maxValue) * 100;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
};

const buildAreaPath = (values: number[]) => {
    if (values.length === 0) {
        return "M 0 100 L 100 100 L 100 100 L 0 100 Z";
    }
    const linePath = buildLinePath(values);
    return `${linePath} L 100 100 L 0 100 Z`;
};

export const TeacherDashboard: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const navigate = useNavigate();

    const appointmentController = useMemo(() => new AppointmentController(), []);
    const psychKnowledgeController = useMemo(() => new PsychKnowledgeController(), []);

    const pendingRef = useRef<ResponseHandlerRef<{teacherUsername: string}, AppointmentDTO[]>>(null);
    const nonPendingRef = useRef<ResponseHandlerRef<{teacherUsername: string}, AppointmentDTO[]>>(null);
    const knowledgeRef = useRef<ResponseHandlerRef<{teacherUsername: string}, PsychKnowledgeDTO[]>>(null);

    const [pendingState, setPendingState] = useState<ResponseState<AppointmentDTO[]>>();
    const [nonPendingState, setNonPendingState] = useState<ResponseState<AppointmentDTO[]>>();
    const [knowledgeState, setKnowledgeState] = useState<ResponseState<PsychKnowledgeDTO[]>>();

    const displayName = resolveDisplayName(context.user);
    const teacherUsername = context.user?.username ?? "null";

    const pendingAppointments = pendingState?.returnObject?.data ?? [];
    const nonPendingAppointments = nonPendingState?.returnObject?.data ?? [];
    const knowledgeList = knowledgeState?.returnObject?.data ?? [];
    const allAppointments = useMemo(
        () => [...pendingAppointments, ...nonPendingAppointments],
        [pendingAppointments, nonPendingAppointments]
    );

    const todayCount = useMemo(() => countByDay(allAppointments, new Date()), [allAppointments]);
    const yesterdayCount = useMemo(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return countByDay(allAppointments, yesterday);
    }, [allAppointments]);
    const todayDelta = todayCount - yesterdayCount;

    const uniqueStudents = useMemo(() => {
        const unique = new Set<string>();
        allAppointments.forEach((item) => {
            const name = (item.studentName || item.studentUsername || "").trim();
            if (name) {
                unique.add(name);
            }
        });
        return unique.size;
    }, [allAppointments]);

    const todoItems = useMemo(() => {
        return [...pendingAppointments]
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, 3);
    }, [pendingAppointments]);

    const latestRequests = useMemo(() => {
        return [...pendingAppointments]
            .sort((a, b) => new Date(b.applyTime).getTime() - new Date(a.applyTime).getTime())
            .slice(0, 6);
    }, [pendingAppointments]);

    const trendData = useMemo(() => {
        const now = new Date();
        const days = Array.from({length: 7}, (_, index) => {
            const date = new Date(now);
            date.setDate(now.getDate() - (6 - index));
            return {
                key: date.toDateString(),
                label: `${date.getMonth() + 1}/${date.getDate()}`,
                total: 0,
            };
        });
        allAppointments.forEach((item) => {
            const date = new Date(item.startTime);
            const match = days.find((day) => day.key === date.toDateString());
            if (match) {
                match.total += 1;
            }
        });
        return days;
    }, [allAppointments]);

    const trendValues = trendData.map((item) => item.total);
    const linePath = buildLinePath(trendValues);
    const areaPath = buildAreaPath(trendValues);

    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-咨询师工作台";
    }, []);

    const pendingHasError = pendingState?.networkError?.message
        || (pendingState?.returnObject?.status !== ReturnObject.Status.SUCCESS
            ? pendingState?.returnObject?.message
            : undefined);

    const knowledgeHasError = knowledgeState?.networkError?.message
        || (knowledgeState?.returnObject?.status !== ReturnObject.Status.SUCCESS
            ? knowledgeState?.returnObject?.message
            : undefined);

    return (
        <div>
            <ResponseHandler<{teacherUsername: string}, AppointmentDTO[]>
                ref={pendingRef}
                request={appointmentController.findTeacherPending}
                setResponseState={setPendingState}
                autoRequest={{teacherUsername}}
                idleComponent={<></>}
                loadingComponent={<></>}
                handlingReturnObjectComponent={<></>}
                networkErrorComponent={<></>}
                finishedComponent={<></>}
            />
            <ResponseHandler<{teacherUsername: string}, AppointmentDTO[]>
                ref={nonPendingRef}
                request={appointmentController.findTeacherNonPending}
                setResponseState={setNonPendingState}
                autoRequest={{teacherUsername}}
                idleComponent={<></>}
                loadingComponent={<></>}
                handlingReturnObjectComponent={<></>}
                networkErrorComponent={<></>}
                finishedComponent={<></>}
            />
            <ResponseHandler<{teacherUsername: string}, PsychKnowledgeDTO[]>
                ref={knowledgeRef}
                request={psychKnowledgeController.teacherMine}
                setResponseState={setKnowledgeState}
                autoRequest={{teacherUsername}}
                idleComponent={<></>}
                loadingComponent={<></>}
                handlingReturnObjectComponent={<></>}
                networkErrorComponent={<></>}
                finishedComponent={<></>}
            />

            <section className="teacher-dashboard__section">
                <div className="teacher-dashboard__section-header">
                    <div>
                        <h2>仪表盘</h2>
                        <p>欢迎回来，{displayName}</p>
                    </div>
                    <div className="teacher-dashboard__section-actions">
                        <button type="button" className="teacher-dashboard__btn teacher-dashboard__btn--ghost">
                            <i className="fa-solid fa-download"/>导出数据
                        </button>
                        <button
                            type="button"
                            className="teacher-dashboard__btn teacher-dashboard__btn--primary"
                            onClick={() => navigate("/psych_knowledge/post")}
                        >
                            <i className="fa-solid fa-plus"/>发布科普
                        </button>
                    </div>
                </div>

                <div className="teacher-dashboard__stats-grid">
                    <div className="teacher-dashboard__card teacher-dashboard__stat-card">
                        <div>
                            <div className="teacher-dashboard__stat-label">今日预约</div>
                            <div className="teacher-dashboard__stat-value">{todayCount}</div>
                            <div className={`teacher-dashboard__stat-trend ${todayDelta >= 0 ? "is-up" : "is-down"}`}>
                                <i className={`fa-solid ${todayDelta >= 0 ? "fa-arrow-up" : "fa-arrow-down"}`}/>
                                {`${todayDelta >= 0 ? "+" : ""}${todayDelta} 单 (较昨日)`}
                            </div>
                        </div>
                        <div className="teacher-dashboard__stat-icon teacher-dashboard__stat-icon--primary">
                            <i className="fa-solid fa-calendar-day"/>
                        </div>
                    </div>

                    <div className="teacher-dashboard__card teacher-dashboard__stat-card">
                        <div>
                            <div className="teacher-dashboard__stat-label">待处理预约</div>
                            <div className="teacher-dashboard__stat-value">{pendingAppointments.length}</div>
                            <div className="teacher-dashboard__stat-hint">
                                {pendingAppointments.length ? "请及时处理" : "暂无待处理预约"}
                            </div>
                        </div>
                        <div className="teacher-dashboard__stat-icon teacher-dashboard__stat-icon--warning">
                            <i className="fa-solid fa-comment-dots"/>
                        </div>
                    </div>

                    <div className="teacher-dashboard__card teacher-dashboard__stat-card">
                        <div>
                            <div className="teacher-dashboard__stat-label">已发布科普</div>
                            <div className="teacher-dashboard__stat-value">{knowledgeList.length}</div>
                            <div className="teacher-dashboard__stat-hint">
                                {knowledgeHasError ? "获取科普失败" : "持续输出专业内容"}
                            </div>
                        </div>
                        <div className="teacher-dashboard__stat-icon teacher-dashboard__stat-icon--info">
                            <i className="fa-solid fa-book"/>
                        </div>
                    </div>

                    <div className="teacher-dashboard__card teacher-dashboard__stat-card">
                        <div>
                            <div className="teacher-dashboard__stat-label">累计咨询人数</div>
                            <div className="teacher-dashboard__stat-value">{uniqueStudents}</div>
                            <div className="teacher-dashboard__stat-hint">来自真实预约记录</div>
                        </div>
                        <div className="teacher-dashboard__stat-icon teacher-dashboard__stat-icon--success">
                            <i className="fa-solid fa-users"/>
                        </div>
                    </div>
                </div>
            </section>

            <section className="teacher-dashboard__section teacher-dashboard__grid">
                <div className="teacher-dashboard__card teacher-dashboard__chart-card">
                    <div className="teacher-dashboard__card-header">
                        <h3>近7天预约趋势</h3>
                        <div className="teacher-dashboard__pill-group">
                            <button type="button" className="teacher-dashboard__pill is-active">周</button>
                            <button type="button" className="teacher-dashboard__pill">月</button>
                            <button type="button" className="teacher-dashboard__pill">季</button>
                        </div>
                    </div>
                    <div className="teacher-dashboard__chart">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                            <path className="teacher-dashboard__chart-area" d={areaPath}/>
                            <path className="teacher-dashboard__chart-line" d={linePath}/>
                        </svg>
                        <div className="teacher-dashboard__chart-labels">
                            {trendData.map((item) => (
                                <span key={item.key}>{item.label}</span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="teacher-dashboard__card teacher-dashboard__todo-card">
                    <div className="teacher-dashboard__card-header">
                        <h3>今日待办</h3>
                    </div>
                    {pendingHasError ? (
                        <div className="teacher-dashboard__empty">预约获取失败：{pendingHasError}</div>
                    ) : (
                        <>
                            <div className="teacher-dashboard__todo-list">
                                {todoItems.length === 0 ? (
                                    <div className="teacher-dashboard__empty">今天暂无待办</div>
                                ) : (
                                    todoItems.map((item) => (
                                        <div key={item.appointmentId} className="teacher-dashboard__todo-item">
                                            <div className="teacher-dashboard__todo-icon">
                                                <i className="fa-solid fa-clock"/>
                                            </div>
                                            <div className="teacher-dashboard__todo-content">
                                                <h4>{formatTime(item.startTime)} 预约咨询</h4>
                                                <p>
                                                    学生：{item.studentName || item.studentUsername || "匿名"}
                                                    {" | "}问题类型：{item.description || "未填写"}
                                                </p>
                                                <div className="teacher-dashboard__badge-group">
                                                        <span
                                                        className={`teacher-dashboard__badge ${item.status === AppointmentStatus.WAITING ? "is-warning" : "is-success"}`}
                                                    >
                                                        {resolveStatusLabel(item.status)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="teacher-dashboard__badge teacher-dashboard__badge--ghost"
                                                        onClick={() => navigate("/home/appointment")}
                                                    >
                                                        查看详情
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button
                                type="button"
                                className="teacher-dashboard__btn teacher-dashboard__btn--outline teacher-dashboard__btn--full"
                                onClick={() => navigate("/home/appointment")}
                            >
                                查看全部待办 <i className="fa-solid fa-chevron-right"/>
                            </button>
                        </>
                    )}
                </div>
            </section>

            <section className="teacher-dashboard__section">
                <div className="teacher-dashboard__card">
                    <div className="teacher-dashboard__card-header">
                        <h3>最新预约申请</h3>
                        <button
                            type="button"
                            className="teacher-dashboard__link"
                            onClick={() => navigate("/home/appointment")}
                        >
                            查看全部
                        </button>
                    </div>
                    {pendingHasError ? (
                        <div className="teacher-dashboard__empty">预约获取失败：{pendingHasError}</div>
                    ) : (
                        <div className="teacher-dashboard__table-wrapper">
                            <table className="teacher-dashboard__table">
                                <thead>
                                <tr>
                                    <th>预约编号</th>
                                    <th>学生</th>
                                    <th>预约时间</th>
                                    <th>问题类型</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                                </thead>
                                <tbody>
                                {latestRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="teacher-dashboard__empty">
                                            暂无预约申请
                                        </td>
                                    </tr>
                                ) : (
                                    latestRequests.map((item) => (
                                        <tr key={item.appointmentId}>
                                            <td>#{item.appointmentId}</td>
                                            <td>{item.studentName || item.studentUsername || "匿名"}</td>
                                            <td>{formatDateTime(item.startTime)}</td>
                                            <td>{item.description || "未填写"}</td>
                                            <td>
                                                <span className={`teacher-dashboard__status ${resolveStatusClass(item.status)}`}>
                                                    {resolveStatusLabel(item.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="teacher-dashboard__table-actions">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate("/home/appointment")}
                                                        aria-label="查看"
                                                    >
                                                        <i className="fa-solid fa-eye"/>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate("/home/appointment")}
                                                        aria-label="确认"
                                                    >
                                                        <i className="fa-solid fa-check"/>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate("/home/appointment")}
                                                        aria-label="拒绝"
                                                    >
                                                        <i className="fa-solid fa-xmark"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
