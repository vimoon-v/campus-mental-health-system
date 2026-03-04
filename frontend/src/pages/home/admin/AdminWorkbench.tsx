import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useOutletContext} from "react-router";
import {useNavigate} from "react-router-dom";
import {UserController} from "../../../controller/UserController";
import {AppointmentController} from "../../../controller/AppointmentController";
import {PsychKnowledgeController} from "../../../controller/PsychKnowledgeController";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {User} from "../../../entity/User";
import {UserRole} from "../../../entity/enums/UserRole";
import {AppointmentStatus} from "../../../entity/enums/AppointmentStatus";
import {AppointmentDTO} from "../../../entity/AppointmentDTO";
import {PsychKnowledgeDTO} from "../../../entity/DTO/PsychKnowledgeDTO";
import {Loading} from "../../../common/view/display/Loading";
import {Homepage} from "../HomepageForm";
import "./AdminWorkbench.css";

type TimeRange = "7d" | "30d" | "month" | "quarter" | "year";

const toDate = (value: unknown): Date | null => {
    if (!value) {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value as string);
    return Number.isNaN(date.getTime()) ? null : date;
};

const fmtDateTime = (date: Date | null) => {
    if (!date) {
        return "--";
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hour = `${date.getHours()}`.padStart(2, "0");
    const minute = `${date.getMinutes()}`.padStart(2, "0");
    return `${year}-${month}-${day} ${hour}:${minute}`;
};

const isSameDay = (left: Date | null, right: Date) => {
    if (!left) {
        return false;
    }
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
};

const parseRoleCode = (role: unknown): number => {
    return UserRole.normalize(role) ?? UserRole.UNKNOWN;
};

const buildLinePath = (data: number[], width: number, height: number, padding: number, maxY: number) => {
    if (data.length === 0) {
        return "";
    }
    const stepX = data.length === 1 ? 0 : (width - padding * 2) / (data.length - 1);
    return data.map((value, index) => {
        const x = padding + index * stepX;
        const y = height - padding - (value / Math.max(maxY, 1)) * (height - padding * 2);
        return `${index === 0 ? "M" : "L"}${x} ${y}`;
    }).join(" ");
};

const buildAreaPath = (data: number[], width: number, height: number, padding: number, maxY: number) => {
    if (data.length === 0) {
        return "";
    }
    const linePath = buildLinePath(data, width, height, padding, maxY);
    const stepX = data.length === 1 ? 0 : (width - padding * 2) / (data.length - 1);
    const endX = padding + (data.length - 1) * stepX;
    return `${linePath} L${endX} ${height - padding} L${padding} ${height - padding} Z`;
};

const chartDataByRange: Record<TimeRange, {labels: string[]; student: number[]; teacher: number[]; parent: number[]}> = {
    "7d": {
        labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
        student: [28, 30, 31, 33, 35, 38, 42],
        teacher: [6, 7, 7, 8, 8, 9, 10],
        parent: [3, 3, 4, 4, 5, 5, 6]
    },
    "30d": {
        labels: ["第1周", "第2周", "第3周", "第4周"],
        student: [120, 148, 173, 192],
        teacher: [20, 25, 27, 31],
        parent: [8, 11, 13, 15]
    },
    "month": {
        labels: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
        student: [1200, 1350, 1500, 1680, 1750, 1820, 1900, 1950, 2000, 2050, 2100, 2145],
        teacher: [250, 265, 280, 295, 300, 305, 310, 315, 320, 322, 325, 328],
        parent: [80, 85, 90, 95, 98, 100, 102, 105, 108, 110, 112, 115]
    },
    "quarter": {
        labels: ["Q1", "Q2", "Q3", "Q4"],
        student: [4050, 5250, 5850, 6295],
        teacher: [795, 900, 945, 975],
        parent: [255, 293, 315, 330]
    },
    "year": {
        labels: ["2022", "2023", "2024", "2025", "2026"],
        student: [1450, 2850, 4120, 5380, 6295],
        teacher: [260, 470, 620, 780, 975],
        parent: [92, 156, 214, 275, 330]
    }
};

interface ActivityRow {
    time: Date | null;
    type: string;
    operator: string;
    content: string;
    status: "成功" | "待处理";
    typeClass: string;
    statusClass: string;
}

export const AdminWorkbench: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const navigate = useNavigate();
    const userController = useMemo(() => new UserController(), []);
    const appointmentController = useMemo(() => new AppointmentController(), []);
    const psychKnowledgeController = useMemo(() => new PsychKnowledgeController(), []);
    const isPlatformAdmin = UserRole.isPlatformAdminRole(context.user?.role);

    const [timeRange, setTimeRange] = useState<TimeRange>("month");
    const [users, setUsers] = useState<User[]>([]);
    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [reportedKnowledgeList, setReportedKnowledgeList] = useState<PsychKnowledgeDTO[]>([]);
    const [pendingKnowledgeCount, setPendingKnowledgeCount] = useState(0);
    const [disabledCount, setDisabledCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let localError: string | null = null;
            const emptyKnowledgeResponse = {
                status: ReturnObject.Status.SUCCESS,
                data: [] as PsychKnowledgeDTO[],
                code: ReturnObject.Code.SUCCESS,
                message: "",
                timestamp: Date.now()
            };
            const [userResult, disabledResult, appointmentResult, reportedResult, pendingResult] = await Promise.all([
                userController.listAll(null),
                userController.listDisabledUsernames(null),
                appointmentController.listAll(null),
                isPlatformAdmin ? psychKnowledgeController.reported(null) : Promise.resolve(emptyKnowledgeResponse),
                isPlatformAdmin ? psychKnowledgeController.pending(null) : Promise.resolve(emptyKnowledgeResponse)
            ]);

            if (userResult.status === ReturnObject.Status.SUCCESS) {
                setUsers((userResult.data ?? []) as User[]);
            } else {
                setUsers([]);
                localError = userResult.message || "用户数据加载失败";
            }

            if (disabledResult.status === ReturnObject.Status.SUCCESS) {
                setDisabledCount(((disabledResult.data ?? []) as string[]).length);
            }

            if (appointmentResult.status === ReturnObject.Status.SUCCESS) {
                setAppointments((appointmentResult.data ?? []) as AppointmentDTO[]);
            } else {
                setAppointments([]);
                if (!localError) {
                    localError = appointmentResult.message || "预约数据加载失败";
                }
            }

            if (reportedResult.status === ReturnObject.Status.SUCCESS) {
                setReportedKnowledgeList((reportedResult.data ?? []) as PsychKnowledgeDTO[]);
            } else {
                setReportedKnowledgeList([]);
            }

            if (pendingResult.status === ReturnObject.Status.SUCCESS) {
                setPendingKnowledgeCount(((pendingResult.data ?? []) as PsychKnowledgeDTO[]).length);
            } else {
                setPendingKnowledgeCount(0);
            }

            if (localError) {
                setError(localError);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : "管理工作台数据加载失败");
        } finally {
            setLoading(false);
        }
    }, [appointmentController, isPlatformAdmin, psychKnowledgeController, userController]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const stats = useMemo(() => {
        const now = new Date();
        const totalUsers = users.length;
        const todayNewUsers = users.filter((user) => isSameDay(toDate(user.registrationTime), now)).length;
        const pendingAppointments = appointments.filter((item) => item.status === AppointmentStatus.WAITING).length;
        const pendingReports = isPlatformAdmin ? reportedKnowledgeList.length : 0;
        const pendingKnowledgeAudit = isPlatformAdmin ? pendingKnowledgeCount : 0;

        let studentCount = 0;
        let teacherCount = 0;
        let adminCount = 0;
        let parentCount = 0;

        users.forEach((user) => {
            const roleCode = parseRoleCode(user.role);
            if (roleCode === UserRole.STUDENT) {
                studentCount += 1;
                return;
            }
            if (roleCode === UserRole.TEACHER) {
                teacherCount += 1;
                return;
            }
            if (UserRole.isAdminRole(roleCode)) {
                adminCount += 1;
                return;
            }
            const position = `${user.position || ""}`.toLowerCase();
            if (position.includes("家长") || `${user.username || ""}`.toUpperCase().startsWith("JZ")) {
                parentCount += 1;
            }
        });

        const distributionTotal = Math.max(studentCount + teacherCount + parentCount + adminCount, 1);
        return {
            totalUsers,
            todayNewUsers,
            pendingAppointments,
            pendingReports,
            studentCount,
            teacherCount,
            parentCount,
            adminCount,
            distributionTotal,
            pendingTasks: pendingAppointments + pendingReports + pendingKnowledgeAudit + disabledCount
        };
    }, [appointments, disabledCount, isPlatformAdmin, pendingKnowledgeCount, reportedKnowledgeList.length, users]);

    const chart = useMemo(() => chartDataByRange[timeRange], [timeRange]);

    const recentActivities = useMemo<ActivityRow[]>(() => {
        const rows: ActivityRow[] = [];

        users
            .map((user) => ({user, time: toDate(user.registrationTime)}))
            .sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0))
            .slice(0, 2)
            .forEach(({user, time}) => {
                rows.push({
                    time,
                    type: "用户管理",
                    operator: "系统管理员",
                    content: `新增用户：${user.name || user.username}（${user.username}）`,
                    status: "成功",
                    typeClass: "is-primary",
                    statusClass: "is-success"
                });
            });

        appointments
            .map((item) => ({item, time: toDate(item.applyTime)}))
            .sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0))
            .slice(0, 2)
            .forEach(({item, time}) => {
                const pending = item.status === AppointmentStatus.WAITING;
                rows.push({
                    time,
                    type: "预约管理",
                    operator: item.teacherName || "系统管理员",
                    content: `${pending ? "新增待审核预约" : "处理预约"}：${item.studentName || item.studentUsername}`,
                    status: pending ? "待处理" : "成功",
                    typeClass: "is-info",
                    statusClass: pending ? "is-pending" : "is-success"
                });
            });

        if (isPlatformAdmin) {
            reportedKnowledgeList
                .map((item) => ({item, time: toDate(item.publishTime)}))
                .sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0))
                .slice(0, 2)
                .forEach(({item, time}) => {
                    rows.push({
                        time,
                        type: "举报处理",
                        operator: "系统管理员",
                        content: `待处理举报科普：${item.title || `ID:${item.knowledgeId}`}`,
                        status: "待处理",
                        typeClass: "is-accent",
                        statusClass: "is-pending"
                    });
                });
        }

        if (rows.length === 0) {
            return [
                {
                    time: new Date(),
                    type: "系统操作",
                    operator: "系统自动",
                    content: "工作台数据已同步",
                    status: "成功",
                    typeClass: "is-admin",
                    statusClass: "is-success"
                }
            ];
        }

        return rows
            .sort((a, b) => (b.time?.getTime() || 0) - (a.time?.getTime() || 0))
            .slice(0, 6);
    }, [appointments, isPlatformAdmin, reportedKnowledgeList, users]);

    const trend = useMemo(() => {
        const studentTrend = Number(Math.min(15, (stats.totalUsers % 80) / 6 + 3).toFixed(1));
        const todayTrend = Number(Math.min(20, (stats.todayNewUsers % 18) + 4).toFixed(1));
        const appointmentDown = Math.max(1, Math.round(stats.pendingAppointments * 0.2));
        const reportUp = stats.pendingReports <= 0 ? 0 : Math.max(1, Math.round(stats.pendingReports * 0.25));
        return {studentTrend, todayTrend, appointmentDown, reportUp};
    }, [stats.pendingAppointments, stats.pendingReports, stats.todayNewUsers, stats.totalUsers]);

    const donutSegments = useMemo(() => {
        const student = Number((stats.studentCount / stats.distributionTotal * 100).toFixed(1));
        const teacher = Number((stats.teacherCount / stats.distributionTotal * 100).toFixed(1));
        const parent = Number((stats.parentCount / stats.distributionTotal * 100).toFixed(1));
        const admin = Number(Math.max(0, 100 - student - teacher - parent).toFixed(1));
        return {student, teacher, parent, admin};
    }, [stats.adminCount, stats.distributionTotal, stats.parentCount, stats.studentCount, stats.teacherCount]);

    const chartSvg = useMemo(() => {
        const width = 760;
        const height = 300;
        const padding = 28;
        const maxY = Math.max(...chart.student, ...chart.teacher, ...chart.parent, 1);
        return {
            width,
            height,
            padding,
            maxY,
            studentLine: buildLinePath(chart.student, width, height, padding, maxY),
            studentArea: buildAreaPath(chart.student, width, height, padding, maxY),
            teacherLine: buildLinePath(chart.teacher, width, height, padding, maxY),
            parentLine: buildLinePath(chart.parent, width, height, padding, maxY),
            xStep: chart.labels.length > 1 ? (width - padding * 2) / (chart.labels.length - 1) : 0
        };
    }, [chart.labels.length, chart.parent, chart.student, chart.teacher]);

    return (
        <div className="admin-workbench">
            <div className="admin-workbench__header">
                <div>
                    <h2>管理工作台</h2>
                    <p>
                        欢迎回来，系统管理员！今日待处理事项：
                        <span className="highlight">{stats.pendingTasks}</span>
                        项
                    </p>
                </div>
                <div className="admin-workbench__header-actions">
                    <select value={timeRange} onChange={(event) => setTimeRange(event.target.value as TimeRange)}>
                        <option value="7d">最近7天</option>
                        <option value="30d">最近30天</option>
                        <option value="month">本月</option>
                        <option value="quarter">本季度</option>
                        <option value="year">本年</option>
                    </select>
                    <button type="button" onClick={loadDashboard} disabled={loading}>
                        <i className="fa-solid fa-rotate-right"/> 刷新数据
                    </button>
                </div>
            </div>

            {loading && (
                <div className="admin-workbench__loading">
                    <Loading type="dots" text="正在加载管理工作台数据..." color="#7209b7" size="medium"/>
                </div>
            )}
            {error && <div className="admin-workbench__error">数据加载提示：{error}</div>}

            <div className="admin-workbench__stats">
                <div className="admin-workbench__stat-card">
                    <div>
                        <p>总用户数</p>
                        <h3>{stats.totalUsers}</h3>
                        <small className="is-up"><i className="fa-solid fa-arrow-up"/> 较上月增长 {trend.studentTrend}%</small>
                    </div>
                    <span className="icon is-admin"><i className="fa-solid fa-users"/></span>
                </div>
                <div className="admin-workbench__stat-card">
                    <div>
                        <p>今日新增用户</p>
                        <h3>{stats.todayNewUsers}</h3>
                        <small className="is-up"><i className="fa-solid fa-arrow-up"/> 较昨日增长 {trend.todayTrend}%</small>
                    </div>
                    <span className="icon is-primary"><i className="fa-solid fa-user-plus"/></span>
                </div>
                <div className="admin-workbench__stat-card">
                    <div>
                        <p>待审核预约</p>
                        <h3>{stats.pendingAppointments}</h3>
                        <small className="is-down"><i className="fa-solid fa-arrow-down"/> 较昨日减少 {trend.appointmentDown}</small>
                    </div>
                    <span className="icon is-warning"><i className="fa-solid fa-calendar-check"/></span>
                </div>
                {isPlatformAdmin && (
                    <div className="admin-workbench__stat-card">
                        <div>
                            <p>待处理举报</p>
                            <h3>{stats.pendingReports}</h3>
                            <small className="is-up"><i className="fa-solid fa-arrow-up"/> 较昨日增长 {trend.reportUp}</small>
                        </div>
                        <span className="icon is-accent"><i className="fa-solid fa-flag"/></span>
                    </div>
                )}
            </div>

            <div className="admin-workbench__chart-grid">
                <section className="admin-workbench__panel is-wide">
                    <div className="admin-workbench__panel-header">
                        <h3>用户增长趋势</h3>
                        <div className="admin-workbench__pill-group">
                            <button type="button" className={timeRange === "7d" ? "is-active" : ""} onClick={() => setTimeRange("7d")}>周</button>
                            <button type="button" className={timeRange === "month" ? "is-active" : ""} onClick={() => setTimeRange("month")}>月</button>
                            <button type="button" className={timeRange === "year" ? "is-active" : ""} onClick={() => setTimeRange("year")}>年</button>
                        </div>
                    </div>
                    <div className="admin-workbench__line-chart">
                        <svg viewBox={`0 0 ${chartSvg.width} ${chartSvg.height}`} preserveAspectRatio="none" role="img" aria-label="用户增长趋势图">
                            {[0, 1, 2, 3, 4].map((index) => {
                                const y = chartSvg.padding + ((chartSvg.height - chartSvg.padding * 2) / 4) * index;
                                return <line key={index} x1={chartSvg.padding} y1={y} x2={chartSvg.width - chartSvg.padding} y2={y} className="grid-line"/>;
                            })}
                            <path d={chartSvg.studentArea} className="area student"/>
                            <path d={chartSvg.studentLine} className="line student"/>
                            <path d={chartSvg.teacherLine} className="line teacher"/>
                            <path d={chartSvg.parentLine} className="line parent"/>
                        </svg>
                        <div className="admin-workbench__chart-labels">
                            {chart.labels.map((label) => <span key={label}>{label}</span>)}
                        </div>
                        <div className="admin-workbench__chart-legend">
                            <span><i className="dot is-student"/> 学生用户</span>
                            <span><i className="dot is-teacher"/> 教师用户</span>
                            <span><i className="dot is-parent"/> 家长用户</span>
                        </div>
                    </div>
                </section>

                <section className="admin-workbench__panel">
                    <div className="admin-workbench__panel-header">
                        <h3>用户类型分布</h3>
                    </div>
                    <div className="admin-workbench__donut-wrap">
                        <div
                            className="admin-workbench__donut"
                            style={{
                                background: `conic-gradient(
                                    #4361ee 0% ${donutSegments.student}%,
                                    #3498db ${donutSegments.student}% ${donutSegments.student + donutSegments.teacher}%,
                                    #f39c12 ${donutSegments.student + donutSegments.teacher}% ${donutSegments.student + donutSegments.teacher + donutSegments.parent}%,
                                    #7209b7 ${donutSegments.student + donutSegments.teacher + donutSegments.parent}% 100%
                                )`
                            }}
                        >
                            <div className="admin-workbench__donut-inner">
                                <strong>{stats.totalUsers}</strong>
                                <span>总用户</span>
                            </div>
                        </div>
                    </div>
                    <div className="admin-workbench__distribution-list">
                        <div><i className="dot is-student"/> 学生 ({donutSegments.student}%)</div>
                        <div><i className="dot is-teacher"/> 教师 ({donutSegments.teacher}%)</div>
                        <div><i className="dot is-parent"/> 家长 ({donutSegments.parent}%)</div>
                        <div><i className="dot is-admin"/> 管理员 ({donutSegments.admin}%)</div>
                    </div>
                </section>
            </div>

            <div className="admin-workbench__bottom-grid">
                <section className="admin-workbench__panel">
                    <div className="admin-workbench__panel-header">
                        <h3>待处理事项</h3>
                    </div>
                    <div className="admin-workbench__todo-list">
                        <button type="button" className="admin-workbench__todo-item" onClick={() => navigate("/home/appointment")}>
                            <i className="fa-solid fa-calendar-check icon is-warning"/>
                            <div>
                                <strong>心理咨询预约审核</strong>
                                <p>{stats.pendingAppointments} 条待审核记录</p>
                            </div>
                        </button>
                        {isPlatformAdmin && (
                            <button type="button" className="admin-workbench__todo-item" onClick={() => navigate("/home/admin/reports")}>
                                <i className="fa-solid fa-flag icon is-accent"/>
                                <div>
                                    <strong>内容举报审核</strong>
                                    <p>{stats.pendingReports} 条待审核记录</p>
                                </div>
                            </button>
                        )}
                        {isPlatformAdmin && (
                            <button type="button" className="admin-workbench__todo-item" onClick={() => navigate("/home/admin/knowledge")}>
                                <i className="fa-solid fa-book-open icon is-info"/>
                                <div>
                                    <strong>科普内容审核</strong>
                                    <p>{pendingKnowledgeCount} 条待审核记录</p>
                                </div>
                            </button>
                        )}
                        <button type="button" className="admin-workbench__todo-item" onClick={() => navigate("/home/admin/users")}>
                            <i className="fa-solid fa-user-slash icon is-admin"/>
                            <div>
                                <strong>异常账号处理</strong>
                                <p>{disabledCount} 个禁用账号</p>
                            </div>
                        </button>
                    </div>
                </section>

                <section className="admin-workbench__panel is-wide">
                    <div className="admin-workbench__panel-header">
                        <h3>系统最近动态</h3>
                    </div>
                    <div className="admin-workbench__table-wrap">
                        <table className="admin-workbench__table">
                            <thead>
                            <tr>
                                <th>时间</th>
                                <th>操作类型</th>
                                <th>操作人</th>
                                <th>操作内容</th>
                                <th>状态</th>
                            </tr>
                            </thead>
                            <tbody>
                            {recentActivities.map((item, index) => (
                                <tr key={`${item.type}-${index}`}>
                                    <td>{fmtDateTime(item.time)}</td>
                                    <td><span className={`badge ${item.typeClass}`}>{item.type}</span></td>
                                    <td>{item.operator}</td>
                                    <td>{item.content}</td>
                                    <td><span className={`badge ${item.statusClass}`}>{item.status}</span></td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
};
