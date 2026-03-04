import React, {useEffect, useMemo, useState} from "react";
import {User} from "../../../entity/User";
import {AppointmentController} from "../../../controller/AppointmentController";
import {AppointmentDTO} from "../../../entity/AppointmentDTO";
import {AppointmentStatus} from "../../../entity/enums/AppointmentStatus";
import {AppointmentType} from "../../../entity/enums/AppointmentType";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Loading} from "../../../common/view/display/Loading";
import {useSearchParams} from "react-router-dom";
import "./AppointmentAdminForm.css";

export interface AppointmentAdminFormProps {
    adminUser: User | null;
}

type TimeScopeFilter = "WEEK" | "MONTH" | "ALL";

const toDate = (value: any): Date | null => {
    if (!value) {
        return null;
    }
    const resolved = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(resolved.getTime())) {
        return null;
    }
    return resolved;
};

const formatDateTime = (value: any) => {
    const date = toDate(value);
    return date ? date.toLocaleString("zh-CN") : "--";
};

const isSameDay = (a: Date, b: Date) => {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
};

const startOfWeek = (date: Date) => {
    const clone = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = clone.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    clone.setDate(clone.getDate() + diff);
    clone.setHours(0, 0, 0, 0);
    return clone;
};

const endOfWeek = (date: Date) => {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
};

const inRange = (target: Date, start: Date, end: Date) => {
    return target.getTime() >= start.getTime() && target.getTime() <= end.getTime();
};

const percentChange = (current: number, previous: number) => {
    if (previous <= 0) {
        return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(1));
};

type DisplayStatusKey = "WAITING" | "ACCEPTED" | "IN_PROGRESS" | "REJECTED" | "FORCE_CANCELLED" | "COMPLETED";

const resolveDisplayStatus = (item: AppointmentDTO): {key: DisplayStatusKey; label: string; className: string} => {
    const now = new Date();
    const end = toDate(item.endTime);

    if (item.status === AppointmentStatus.IN_PROGRESS && end && end.getTime() < now.getTime()) {
        return {key: "COMPLETED", label: "已完成", className: "admin-appointment__status--completed"};
    }
    if (item.status === AppointmentStatus.IN_PROGRESS) {
        return {key: "IN_PROGRESS", label: "咨询中", className: "admin-appointment__status--confirm"};
    }
    if (item.status === AppointmentStatus.REJECTED) {
        return {key: "REJECTED", label: "已拒绝", className: "admin-appointment__status--reject"};
    }
    if (item.status === AppointmentStatus.FORCE_CANCELLED) {
        return {key: "FORCE_CANCELLED", label: "已强制取消", className: "admin-appointment__status--force-cancelled"};
    }
    if (item.status === AppointmentStatus.ACCEPTED) {
        return {key: "ACCEPTED", label: "已通过", className: "admin-appointment__status--reschedule"};
    }
    return {key: "WAITING", label: "待处理", className: "admin-appointment__status--pending"};
};

const isOverdueWaiting = (item: AppointmentDTO) => {
    const display = resolveDisplayStatus(item).key;
    if (display !== "WAITING") {
        return false;
    }
    if (typeof item.overdueFlagged === "boolean") {
        return item.overdueFlagged;
    }
    const apply = toDate(item.applyTime);
    if (!apply) {
        return false;
    }
    return Date.now() - apply.getTime() > 24 * 60 * 60 * 1000;
};

const resolveTypeLabel = (value?: AppointmentType) => {
    return AppointmentType.ChineseName.get(String(value)) ?? "线下咨询";
};

export const AppointmentAdminForm: React.FC<AppointmentAdminFormProps> = ({adminUser: _adminUser}) => {
    const [searchParams] = useSearchParams();
    const appointmentController = useMemo(() => new AppointmentController(), []);
    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState("ALL");
    const [teacherFilter, setTeacherFilter] = useState("ALL");
    const [timeScopeFilter, setTimeScopeFilter] = useState<TimeScopeFilter>("WEEK");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [keyword, setKeyword] = useState("");

    const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDTO | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [batchReassigning, setBatchReassigning] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const focusAppointmentIdRaw = Number(searchParams.get("focusAppointmentId"));
    const focusAppointmentId = Number.isNaN(focusAppointmentIdRaw) ? 0 : focusAppointmentIdRaw;

    const loadAppointments = async () => {
        setLoading(true);
        setErrorMessage(null);
        try {
            const result = await appointmentController.listAll(null);
            if (result.status === ReturnObject.Status.SUCCESS) {
                setAppointments((result.data ?? []) as AppointmentDTO[]);
            } else {
                setAppointments([]);
                setErrorMessage(result.message ?? "获取预约记录失败");
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "获取预约记录失败";
            setAppointments([]);
            setErrorMessage(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAppointments();
    }, []);

    const teacherOptions = useMemo(() => {
        const map = new Map<string, string>();
        appointments.forEach((item) => {
            const key = item.teacherUsername || "";
            const value = item.teacherName || item.teacherUsername || "未知咨询师";
            if (key) {
                map.set(key, value);
            }
        });
        return Array.from(map.entries());
    }, [appointments]);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const currentWeekStart = startOfWeek(now);
    const currentWeekEnd = endOfWeek(now);
    const previousWeekEnd = new Date(currentWeekStart.getTime() - 1);
    const previousWeekStart = startOfWeek(previousWeekEnd);

    const appointmentWithDate = appointments.map((item) => ({
        item,
        start: toDate(item.startTime),
        end: toDate(item.endTime),
        apply: toDate(item.applyTime)
    }));

    const todayCount = appointmentWithDate.filter(({start}) => start && isSameDay(start, today)).length;
    const yesterdayCount = appointmentWithDate.filter(({start}) => start && isSameDay(start, yesterday)).length;
    const todayDelta = todayCount - yesterdayCount;

    const weekCount = appointmentWithDate.filter(({start}) => start && inRange(start, currentWeekStart, currentWeekEnd)).length;
    const lastWeekCount = appointmentWithDate.filter(({start}) => start && inRange(start, previousWeekStart, previousWeekEnd)).length;
    const weekIncrease = percentChange(weekCount, lastWeekCount);

    const pendingCount = appointments.filter((item) => resolveDisplayStatus(item).key === "WAITING").length;
    const yesterdayPending = appointmentWithDate.filter(({item, apply}) => {
        return resolveDisplayStatus(item).key === "WAITING" && apply && isSameDay(apply, yesterday);
    }).length;
    const pendingDelta = pendingCount - yesterdayPending;

    const completedCount = appointments.filter((item) => resolveDisplayStatus(item).key === "COMPLETED").length;
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const lastMonth = lastMonthDate.getMonth();
    const lastMonthYear = lastMonthDate.getFullYear();
    const thisMonthCompleted = appointmentWithDate.filter(({item, end}) => {
        return resolveDisplayStatus(item).key === "COMPLETED"
            && end
            && end.getMonth() === currentMonth
            && end.getFullYear() === currentYear;
    }).length;
    const lastMonthCompleted = appointmentWithDate.filter(({item, end}) => {
        return resolveDisplayStatus(item).key === "COMPLETED"
            && end
            && end.getMonth() === lastMonth
            && end.getFullYear() === lastMonthYear;
    }).length;
    const completedIncrease = percentChange(thisMonthCompleted, lastMonthCompleted);
    const overdueWaitingCount = appointments.filter((item) => isOverdueWaiting(item)).length;
    const completionRate = appointments.length === 0 ? 0 : Number(((completedCount / appointments.length) * 100).toFixed(1));

    const filteredAppointments = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        return appointments.filter((item) => {
            const displayStatus = resolveDisplayStatus(item);
            if (statusFilter === "OVERDUE") {
                if (!isOverdueWaiting(item)) {
                    return false;
                }
            } else if (statusFilter !== "ALL" && displayStatus.key !== statusFilter) {
                return false;
            }
            if (teacherFilter !== "ALL" && item.teacherUsername !== teacherFilter) {
                return false;
            }

            const start = toDate(item.startTime);
            const apply = toDate(item.applyTime);
            const rangeBase = start ?? apply;
            if (timeScopeFilter !== "ALL") {
                if (!rangeBase) {
                    return false;
                }
                if (timeScopeFilter === "WEEK" && !inRange(rangeBase, currentWeekStart, currentWeekEnd)) {
                    return false;
                }
                if (timeScopeFilter === "MONTH" && !inRange(rangeBase, currentMonthStart, currentMonthEnd)) {
                    return false;
                }
            }
            if (dateFrom && start) {
                const fromDate = new Date(`${dateFrom}T00:00:00`);
                if (start.getTime() < fromDate.getTime()) {
                    return false;
                }
            }
            if (dateTo && start) {
                const toDateValue = new Date(`${dateTo}T23:59:59`);
                if (start.getTime() > toDateValue.getTime()) {
                    return false;
                }
            }

            if (!normalizedKeyword) {
                return true;
            }
            const haystack = `#AP${item.appointmentId} ${item.studentName} ${item.studentUsername} ${item.teacherName} ${item.teacherUsername}`.toLowerCase();
            return haystack.includes(normalizedKeyword);
        }).sort((left, right) => {
            const leftTime = (toDate(left.startTime) ?? toDate(left.applyTime))?.getTime() ?? 0;
            const rightTime = (toDate(right.startTime) ?? toDate(right.applyTime))?.getTime() ?? 0;
            if (rightTime !== leftTime) {
                return rightTime - leftTime;
            }
            return (right.appointmentId ?? 0) - (left.appointmentId ?? 0);
        });
    }, [
        appointments,
        statusFilter,
        teacherFilter,
        timeScopeFilter,
        dateFrom,
        dateTo,
        keyword,
        currentWeekStart,
        currentWeekEnd,
        currentMonthStart,
        currentMonthEnd
    ]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, teacherFilter, timeScopeFilter, dateFrom, dateTo, keyword]);

    useEffect(() => {
        if (focusAppointmentId <= 0) {
            return;
        }
        setStatusFilter("ALL");
        setTeacherFilter("ALL");
        setTimeScopeFilter("ALL");
        setDateFrom("");
        setDateTo("");
        setKeyword(String(focusAppointmentId));
        setCurrentPage(1);
    }, [focusAppointmentId]);

    const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
    const currentPageSafe = Math.min(currentPage, totalPages);
    const pageStart = (currentPageSafe - 1) * pageSize;
    const pageEnd = pageStart + pageSize;
    const pageItems = filteredAppointments.slice(pageStart, pageEnd);

    const resolveStudentClass = (username: string) => {
        const match = username.match(/\d+$/);
        if (!match) {
            return "未知班级";
        }
        const num = Number(match[0]);
        const grade = (num % 3) + 1;
        const clazz = (num % 10) + 1;
        return `高${grade}(${clazz})班`;
    };

    const resolveMaskedPhone = (username: string) => {
        const seed = (username || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const prefix = 130 + (seed % 70);
        const suffix = `${1000 + (seed % 9000)}`;
        return `${prefix}****${suffix}`;
    };

    const handleOpenDetail = (item: AppointmentDTO) => {
        setSelectedAppointment(item);
    };

    const closeDetail = () => {
        setSelectedAppointment(null);
    };

    useEffect(() => {
        if (focusAppointmentId <= 0) {
            return;
        }
        const target = appointments.find((item) => item.appointmentId === focusAppointmentId);
        if (!target) {
            return;
        }
        setSelectedAppointment(target);
        const timer = window.setTimeout(() => {
            const element = document.getElementById(`admin-appointment-${focusAppointmentId}`);
            element?.scrollIntoView({behavior: "smooth", block: "center"});
        }, 120);
        return () => window.clearTimeout(timer);
    }, [appointments, focusAppointmentId]);

    const canReassign = (item: AppointmentDTO) => {
        return resolveDisplayStatus(item).key === "WAITING" && !item.reschedulePending;
    };

    const canForceCancel = (item: AppointmentDTO) => {
        const key = resolveDisplayStatus(item).key;
        return key !== "FORCE_CANCELLED" && key !== "REJECTED" && key !== "COMPLETED";
    };

    const handleReassign = async (item: AppointmentDTO, ask = true) => {
        if (!canReassign(item)) {
            return;
        }
        const teacherInput = window.prompt("请输入改派后的咨询师账号：", "");
        if (teacherInput === null) {
            return;
        }
        const teacherUsername = teacherInput.trim();
        if (teacherUsername === "") {
            alert("咨询师账号不能为空");
            return;
        }
        const reasonInput = window.prompt("请输入改派原因（选填）：", "");
        if (reasonInput === null) {
            return;
        }
        const reason = reasonInput.trim();

        if (ask && !window.confirm(`确定将预约 #AP${item.appointmentId} 改派给 ${teacherUsername} 吗？`)) {
            return;
        }

        setActionLoading(`${item.appointmentId}-REASSIGN`);
        try {
            const result = await appointmentController.adminReassign({
                appointmentId: item.appointmentId,
                newTeacherUsername: teacherUsername,
                reason: reason || undefined
            });
            if (result.status === ReturnObject.Status.SUCCESS) {
                await loadAppointments();
                if (selectedAppointment?.appointmentId === item.appointmentId) {
                    closeDetail();
                }
            } else {
                alert(result.message || "改派失败");
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : "改派失败");
        } finally {
            setActionLoading(null);
        }
    };

    const handleForceCancel = async (item: AppointmentDTO, ask = true) => {
        if (!canForceCancel(item)) {
            return;
        }
        const reasonInput = window.prompt("请输入强制取消原因（必填）：", "");
        if (reasonInput === null) {
            return;
        }
        const reason = reasonInput.trim();
        if (!reason) {
            alert("强制取消原因不能为空");
            return;
        }
        if (ask && !window.confirm(`确定强制取消预约 #AP${item.appointmentId} 吗？`)) {
            return;
        }

        setActionLoading(`${item.appointmentId}-FORCE_CANCEL`);
        try {
            const result = await appointmentController.adminForceCancel({
                appointmentId: item.appointmentId,
                reason
            });
            if (result.status === ReturnObject.Status.SUCCESS) {
                await loadAppointments();
                if (selectedAppointment?.appointmentId === item.appointmentId) {
                    closeDetail();
                }
            } else {
                alert(result.message || "强制取消失败");
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : "强制取消失败");
        } finally {
            setActionLoading(null);
        }
    };

    const handleBatchReassignOverdue = async () => {
        const teacherInput = window.prompt("请输入批量改派目标咨询师账号：", "");
        if (teacherInput === null) {
            return;
        }
        const newTeacherUsername = teacherInput.trim();
        if (!newTeacherUsername) {
            alert("咨询师账号不能为空");
            return;
        }
        const reasonInput = window.prompt("请输入批量改派原因（选填）：", "");
        if (reasonInput === null) {
            return;
        }
        const reason = reasonInput.trim();
        if (!window.confirm(`确定将所有超时待处理预约批量改派给 ${newTeacherUsername} 吗？`)) {
            return;
        }

        setBatchReassigning(true);
        try {
            const result = await appointmentController.adminBatchReassignOverdue({
                newTeacherUsername,
                reason: reason || undefined
            });
            if (result.status === ReturnObject.Status.SUCCESS) {
                const data = (result.data ?? {}) as {
                    total?: number;
                    reassigned?: number;
                    skippedSameTeacher?: number;
                    skippedInvalid?: number;
                };
                const total = Number(data.total ?? 0);
                const reassigned = Number(data.reassigned ?? 0);
                const skippedSameTeacher = Number(data.skippedSameTeacher ?? 0);
                const skippedInvalid = Number(data.skippedInvalid ?? 0);
                alert(`批量改派完成：总计 ${total} 条，成功改派 ${reassigned} 条，跳过同咨询师 ${skippedSameTeacher} 条，跳过无效 ${skippedInvalid} 条。`);
                await loadAppointments();
                if (selectedAppointment) {
                    closeDetail();
                }
            } else {
                alert(result.message || "批量改派失败");
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : "批量改派失败");
        } finally {
            setBatchReassigning(false);
        }
    };

    if (loading) {
        return <Loading type="dots" text="加载预约记录中..." color="#2196f3" size="large" fullScreen/>;
    }

    return (
        <div className="admin-appointment">
            <div className="admin-appointment__header">
                <h2>预约管理</h2>
                <p>查看与管理所有心理咨询预约记录</p>
            </div>

            <div className="admin-appointment__stats">
                <div className="admin-appointment__stat-card">
                    <div>
                        <p>今日预约数</p>
                        <h3>{todayCount}</h3>
                        <small className={todayDelta >= 0 ? "is-up" : "is-down"}>
                            <i className={`fa-solid ${todayDelta >= 0 ? "fa-arrow-up" : "fa-arrow-down"}`}/>
                            {`${todayDelta >= 0 ? "+" : ""}${todayDelta}`} 个 较昨日
                        </small>
                    </div>
                    <span className="admin-appointment__stat-icon is-info"><i className="fa-solid fa-calendar-day"/></span>
                </div>
                <div className="admin-appointment__stat-card">
                    <div>
                        <p>本周预约数</p>
                        <h3>{weekCount}</h3>
                        <small className={weekIncrease >= 0 ? "is-up" : "is-down"}>
                            <i className={`fa-solid ${weekIncrease >= 0 ? "fa-arrow-up" : "fa-arrow-down"}`}/>
                            {`${weekIncrease >= 0 ? "+" : ""}${weekIncrease}`}% 较上周
                        </small>
                    </div>
                    <span className="admin-appointment__stat-icon is-primary"><i className="fa-solid fa-calendar-week"/></span>
                </div>
                <div className="admin-appointment__stat-card">
                    <div>
                        <p>待处理预约</p>
                        <h3>{pendingCount}</h3>
                        <small className={pendingDelta >= 0 ? "is-up warning" : "is-down warning"}>
                            <i className={`fa-solid ${pendingDelta >= 0 ? "fa-arrow-up" : "fa-arrow-down"}`}/>
                            {`${pendingDelta >= 0 ? "+" : ""}${pendingDelta}`} 个 较昨日
                        </small>
                    </div>
                    <span className="admin-appointment__stat-icon is-warning"><i className="fa-solid fa-clock"/></span>
                </div>
                <div className="admin-appointment__stat-card">
                    <div>
                        <p>超时待处理（&gt;24h）</p>
                        <h3>{overdueWaitingCount}</h3>
                        <small className={overdueWaitingCount > 0 ? "is-down warning" : "is-up"}>
                            <i className={`fa-solid ${overdueWaitingCount > 0 ? "fa-triangle-exclamation" : "fa-circle-check"}`}/>
                            {overdueWaitingCount > 0 ? "建议尽快改派" : "当前无超时记录"}
                        </small>
                    </div>
                    <span className="admin-appointment__stat-icon is-warning"><i className="fa-solid fa-hourglass-half"/></span>
                </div>
                <div className="admin-appointment__stat-card">
                    <div>
                        <p>咨询完成率</p>
                        <h3>{completionRate}%</h3>
                        <small className={completedIncrease >= 0 ? "is-up" : "is-down"}>
                            <i className={`fa-solid ${completedIncrease >= 0 ? "fa-arrow-up" : "fa-arrow-down"}`}/>
                            {`${completedIncrease >= 0 ? "+" : ""}${completedIncrease}`}% 较上月完成量
                        </small>
                    </div>
                    <span className="admin-appointment__stat-icon is-success"><i className="fa-solid fa-chart-line"/></span>
                </div>
            </div>

            <div className="admin-appointment__filter-box">
                <div className="admin-appointment__filter-left">
                    <div className="admin-appointment__scope-box" aria-label="预约时间范围">
                        <button
                            type="button"
                            className={timeScopeFilter === "WEEK" ? "is-active" : ""}
                            onClick={() => setTimeScopeFilter("WEEK")}
                        >
                            本周
                        </button>
                        <button
                            type="button"
                            className={timeScopeFilter === "MONTH" ? "is-active" : ""}
                            onClick={() => setTimeScopeFilter("MONTH")}
                        >
                            本月
                        </button>
                        <button
                            type="button"
                            className={timeScopeFilter === "ALL" ? "is-active" : ""}
                            onClick={() => setTimeScopeFilter("ALL")}
                        >
                            全部
                        </button>
                    </div>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option value="ALL">全部状态</option>
                        <option value="WAITING">待处理</option>
                        <option value="OVERDUE">超时待处理（&gt;24h）</option>
                        <option value="ACCEPTED">已通过</option>
                        <option value="IN_PROGRESS">咨询中</option>
                        <option value="COMPLETED">已完成</option>
                        <option value="REJECTED">已拒绝</option>
                        <option value="FORCE_CANCELLED">已强制取消</option>
                    </select>
                    <select value={teacherFilter} onChange={(event) => setTeacherFilter(event.target.value)}>
                        <option value="ALL">全部咨询师</option>
                        {teacherOptions.map(([username, name]) => (
                            <option key={username} value={username}>{name}</option>
                        ))}
                    </select>
                    <div className="admin-appointment__date-range">
                        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)}/>
                        <span>至</span>
                        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)}/>
                    </div>
                </div>

                <div className="admin-appointment__filter-right">
                    <div className="admin-appointment__search">
                        <i className="fa-solid fa-search"/>
                        <input
                            placeholder="搜索学生姓名/预约编号"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="admin-appointment__batch-btn"
                        disabled={batchReassigning || overdueWaitingCount <= 0}
                        onClick={handleBatchReassignOverdue}
                    >
                        <i className="fa-solid fa-shuffle"/>
                        {batchReassigning ? "批量改派中..." : `一键改派超时（${overdueWaitingCount}）`}
                    </button>
                </div>
            </div>

            <div className="admin-appointment__table-card">
                {errorMessage ? (
                    <div className="admin-appointment__empty">{errorMessage}</div>
                ) : (
                    <>
                        <div className="admin-appointment__table-wrap">
                            <table className="admin-appointment__table">
                                <thead>
                                <tr>
                                    <th>预约编号</th>
                                    <th>学生信息</th>
                                    <th>咨询师</th>
                                    <th>预约时间</th>
                                    <th>咨询类型</th>
                                    <th>状态</th>
                                    <th>操作</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pageItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="admin-appointment__empty">暂无预约记录</td>
                                    </tr>
                                ) : (
                                    pageItems.map((item) => {
                                        const status = resolveDisplayStatus(item);
                                        const reassigning = actionLoading === `${item.appointmentId}-REASSIGN`;
                                        const forceCancelling = actionLoading === `${item.appointmentId}-FORCE_CANCEL`;
                                        const overdue = isOverdueWaiting(item);
                                        return (
                                            <tr
                                                id={`admin-appointment-${item.appointmentId}`}
                                                key={item.appointmentId}
                                                className={focusAppointmentId > 0 && item.appointmentId === focusAppointmentId ? "is-focused" : ""}
                                            >
                                                <td>#{`AP${item.appointmentId}`.padStart(11, "0")}</td>
                                                <td>
                                                    <div className="admin-appointment__student">
                                                        <div>
                                                            <span className="name">{item.anonymous ? "匿名学生" : (item.studentName || item.studentUsername)}</span>
                                                            <span className="id">{item.anonymous ? "(匿名预约)" : `(ID:${item.studentUsername})`}</span>
                                                        </div>
                                                        <div className="meta">
                                                            {resolveStudentClass(item.studentUsername)} | {resolveMaskedPhone(item.studentUsername)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{item.teacherName || item.teacherUsername}</td>
                                                <td>
                                                    <div>{formatDateTime(item.startTime)} - {toDate(item.endTime)?.toLocaleTimeString("zh-CN", {hour: "2-digit", minute: "2-digit"})}</div>
                                                    <div className="meta">预约于 {formatDateTime(item.applyTime)}</div>
                                                    {overdue && <div className="meta is-overdue">超时未处理</div>}
                                                </td>
                                                <td>
                                                    <span className={`admin-appointment__type ${String(item.appointmentType) === "ONLINE" ? "is-online" : "is-offline"}`}>
                                                        {resolveTypeLabel(item.appointmentType)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`admin-appointment__status ${status.className}`}>{status.label}</span>
                                                </td>
                                                <td>
                                                    <div className="admin-appointment__actions">
                                                        <button type="button" className="is-view" onClick={() => handleOpenDetail(item)}>
                                                            <i className="fa-solid fa-eye"/> 查看
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={canReassign(item) ? "is-confirm" : "is-disabled"}
                                                            disabled={!canReassign(item) || reassigning || forceCancelling}
                                                            onClick={() => handleReassign(item)}
                                                        >
                                                            <i className="fa-solid fa-rotate"/> {reassigning ? "处理中" : "改派"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={canForceCancel(item) ? "is-cancel" : "is-disabled"}
                                                            disabled={!canForceCancel(item) || reassigning || forceCancelling}
                                                            onClick={() => handleForceCancel(item)}
                                                        >
                                                            <i className="fa-solid fa-ban"/> {forceCancelling ? "处理中" : "强制取消"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>

                        <div className="admin-appointment__pagination">
                            <div>
                                显示 <strong>{filteredAppointments.length === 0 ? 0 : pageStart + 1}</strong> 到{" "}
                                <strong>{Math.min(pageEnd, filteredAppointments.length)}</strong> 条，共{" "}
                                <strong>{filteredAppointments.length}</strong> 条记录
                            </div>
                            <div className="admin-appointment__pagination-controls">
                                <button
                                    type="button"
                                    disabled={currentPageSafe <= 1}
                                    onClick={() => setCurrentPage(Math.max(1, currentPageSafe - 1))}
                                >
                                    <i className="fa-solid fa-chevron-left"/>
                                </button>
                                {Array.from({length: Math.min(totalPages, 5)}, (_, idx) => {
                                    const page = idx + 1;
                                    return (
                                        <button
                                            key={page}
                                            type="button"
                                            className={page === currentPageSafe ? "is-active" : ""}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    disabled={currentPageSafe >= totalPages}
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPageSafe + 1))}
                                >
                                    <i className="fa-solid fa-chevron-right"/>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {selectedAppointment && (
                <div className="admin-appointment__modal" onClick={closeDetail}>
                    <div className="admin-appointment__modal-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-appointment__modal-header">
                            <h3>预约详情 #{`AP${selectedAppointment.appointmentId}`.padStart(11, "0")}</h3>
                            <button type="button" onClick={closeDetail}><i className="fa-solid fa-xmark"/></button>
                        </div>
                        <div className="admin-appointment__modal-body">
                            <div className="admin-appointment__detail-grid">
                                <div>
                                    <h4>学生信息</h4>
                                    <div className="row"><span>姓名：</span><strong>{selectedAppointment.anonymous ? "匿名学生" : (selectedAppointment.studentName || selectedAppointment.studentUsername)}</strong></div>
                                    <div className="row"><span>账号：</span><strong>{selectedAppointment.anonymous ? "匿名预约" : selectedAppointment.studentUsername}</strong></div>
                                    <div className="row"><span>班级：</span><strong>{resolveStudentClass(selectedAppointment.studentUsername)}</strong></div>
                                    <div className="row"><span>联系方式：</span><strong>{resolveMaskedPhone(selectedAppointment.studentUsername)}</strong></div>
                                </div>
                                <div>
                                    <h4>预约信息</h4>
                                    <div className="row"><span>预约编号：</span><strong>#{`AP${selectedAppointment.appointmentId}`.padStart(11, "0")}</strong></div>
                                    <div className="row"><span>咨询师：</span><strong>{selectedAppointment.teacherName || selectedAppointment.teacherUsername}</strong></div>
                                    <div className="row"><span>咨询类型：</span><strong>{resolveTypeLabel(selectedAppointment.appointmentType)}</strong></div>
                                    <div className="row"><span>预约时间：</span><strong>{formatDateTime(selectedAppointment.startTime)} - {toDate(selectedAppointment.endTime)?.toLocaleTimeString("zh-CN", {hour: "2-digit", minute: "2-digit"})}</strong></div>
                                    <div className="row">
                                        <span>预约状态：</span>
                                        <span className={`admin-appointment__status ${resolveDisplayStatus(selectedAppointment).className}`}>
                                            {resolveDisplayStatus(selectedAppointment).label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-appointment__block">
                                <h4>咨询诉求</h4>
                                <div>{selectedAppointment.description || "暂无描述"}</div>
                            </div>

                            <div className="admin-appointment__block">
                                <h4>操作处理</h4>
                                {isOverdueWaiting(selectedAppointment) && (
                                    <div className="admin-appointment__alert">
                                        该预约已超过 24 小时未处理，建议优先改派。
                                    </div>
                                )}
                                <div className="admin-appointment__modal-actions">
                                    <button
                                        type="button"
                                        className="confirm"
                                        disabled={!canReassign(selectedAppointment)}
                                        onClick={() => handleReassign(selectedAppointment, false)}
                                    >
                                        <i className="fa-solid fa-rotate"/> 改派咨询师
                                    </button>
                                    <button
                                        type="button"
                                        className="cancel"
                                        disabled={!canForceCancel(selectedAppointment)}
                                        onClick={() => handleForceCancel(selectedAppointment, false)}
                                    >
                                        <i className="fa-solid fa-ban"/> 强制取消
                                    </button>
                                    <button type="button" className="close" onClick={closeDetail}>关闭</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
