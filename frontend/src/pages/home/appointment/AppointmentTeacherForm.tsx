import React, {useEffect, useMemo, useRef, useState} from "react";
import {User} from "../../../entity/User";
import {useOutletContext} from "react-router";
import {Homepage} from "../HomepageForm";
import {
    AppointmentController,
    AppointmentHandingRequest,
    AppointmentRescheduleRequest
} from "../../../controller/AppointmentController";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {AppointmentDTO} from "../../../entity/AppointmentDTO";
import {ResponseState} from "../../../common/response/ResponseState";
import {AppointmentStatus} from "../../../entity/enums/AppointmentStatus";
import {AppointmentType} from "../../../entity/enums/AppointmentType";
import {Button} from "../../../common/view/controller/Button";
import {Loading} from "../../../common/view/display/Loading";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Dialog, DialogRef} from "../../../common/view/container/Dialog";
import {useSearchParams} from "react-router-dom";
import {AppointmentDateTimeRangeFields} from "./AppointmentDateTimeRangeFields";

export interface AppointmentTeacherFormProps {
    teacherUser: User | null;
}

type ViewMode = "list" | "calendar";

type StatusOption = {
    value: AppointmentStatus | "all";
    label: string;
};

type TypeOption = {
    value: AppointmentType | "all";
    label: string;
};

type TimeOption = {
    value: "all" | "today" | "week" | "month";
    label: string;
};

const STATUS_OPTIONS: StatusOption[] = [
    {value: "all", label: "全部状态"},
    {value: AppointmentStatus.WAITING, label: "待处理"},
    {value: AppointmentStatus.ACCEPTED, label: "已通过"},
    {value: AppointmentStatus.IN_PROGRESS, label: "咨询中"},
    {value: AppointmentStatus.REJECTED, label: "已拒绝"},
    {value: AppointmentStatus.FORCE_CANCELLED, label: "已强制取消"},
];

const TIME_OPTIONS: TimeOption[] = [
    {value: "all", label: "全部时间"},
    {value: "today", label: "今日"},
    {value: "week", label: "本周"},
    {value: "month", label: "本月"},
];

const CALENDAR_WEEKDAY_LABELS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

const TYPE_OPTIONS: TypeOption[] = [
    {value: "all", label: "全部类型"},
    {value: AppointmentType.ONLINE, label: "线上咨询"},
    {value: AppointmentType.OFFLINE, label: "线下咨询"},
];

const resolveStatusLabel = (appointment: AppointmentDTO) => {
    if (appointment.status === AppointmentStatus.WAITING && appointment.reschedulePending) {
        return "待学生确认改期";
    }
    return AppointmentStatus.ChineseName.get(String(appointment.status)) ?? "未知";
};

const resolveStatusClass = (appointment: AppointmentDTO) => {
    if (appointment.status === AppointmentStatus.WAITING && appointment.reschedulePending) {
        return "status-reschedule";
    }
    switch (appointment.status) {
        case AppointmentStatus.ACCEPTED:
            return "status-confirmed";
        case AppointmentStatus.REJECTED:
            return "status-rejected";
        case AppointmentStatus.FORCE_CANCELLED:
            return "status-rejected";
        case AppointmentStatus.IN_PROGRESS:
            return "status-reschedule";
        default:
            return "status-pending";
    }
};

const resolveStatusLabelByStatus = (status: AppointmentStatus) => {
    return AppointmentStatus.ChineseName.get(String(status)) ?? "未知";
};

const resolveStatusClassByStatus = (status: AppointmentStatus) => {
    switch (status) {
        case AppointmentStatus.ACCEPTED:
            return "status-confirmed";
        case AppointmentStatus.REJECTED:
            return "status-rejected";
        case AppointmentStatus.FORCE_CANCELLED:
            return "status-rejected";
        case AppointmentStatus.IN_PROGRESS:
            return "status-reschedule";
        default:
            return "status-pending";
    }
};

const resolveTypeLabel = (appointmentType: AppointmentType | string | undefined) => {
    if (!appointmentType) {
        return "未指定";
    }
    return AppointmentType.ChineseName.get(appointmentType) ?? appointmentType.toString();
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

const formatToInputDateTime = (value: any) => {
    if (!value) {
        return "";
    }
    const resolved = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(resolved.getTime())) {
        return "";
    }
    const year = resolved.getFullYear();
    const month = `${resolved.getMonth() + 1}`.padStart(2, "0");
    const day = `${resolved.getDate()}`.padStart(2, "0");
    const hour = `${resolved.getHours()}`.padStart(2, "0");
    const minute = `${resolved.getMinutes()}`.padStart(2, "0");
    return `${year}-${month}-${day}T${hour}:${minute}`;
};

const formatDateForInput = (value: any) => {
    const text = formatToInputDateTime(value);
    return text ? text.slice(0, 10) : "";
};

const formatTimeForInput = (value: any) => {
    const text = formatToInputDateTime(value);
    return text ? text.slice(11, 16) : "";
};

const normalizeDateTimeInput = (value: string) => {
    const normalized = value.trim().replace(" ", "T");
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
        return `${normalized}:00`;
    }
    return normalized;
};

const formatDuration = (start?: any, end?: any) => {
    if (!start || !end) {
        return "--";
    }
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end instanceof Date ? end : new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return "--";
    }
    const minutes = Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
    return `${minutes}分钟`;
};

const isSameDay = (a: Date, b: Date) => (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
);

const isSameMonth = (a: Date, b: Date) => (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
);

const toDateSafe = (value: any): Date | null => {
    if (!value) {
        return null;
    }
    const resolved = value instanceof Date ? value : new Date(value);
    return Number.isNaN(resolved.getTime()) ? null : resolved;
};

const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatMonthLabel = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月`;

const formatTimeLabel = (value: any) => {
    const date = toDateSafe(value);
    if (!date) {
        return "--:--";
    }
    const hour = `${date.getHours()}`.padStart(2, "0");
    const minute = `${date.getMinutes()}`.padStart(2, "0");
    return `${hour}:${minute}`;
};

const buildCalendarDays = (monthDate: Date) => {
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const mondayOffset = (monthStart.getDay() + 6) % 7;
    const start = new Date(monthStart);
    start.setDate(monthStart.getDate() - mondayOffset);
    return Array.from({length: 42}, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
};

const withinRange = (target: Date, range: TimeOption["value"]) => {
    const now = new Date();
    if (range === "today") {
        return isSameDay(target, now);
    }
    if (range === "week") {
        const start = new Date(now);
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return target >= start && target <= end;
    }
    if (range === "month") {
        return target.getFullYear() === now.getFullYear() && target.getMonth() === now.getMonth();
    }
    return true;
};

export const AppointmentTeacherForm: React.FC<AppointmentTeacherFormProps> = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const [searchParams] = useSearchParams();
    const appointmentController = new AppointmentController();

    const pendingRef = useRef<ResponseHandlerRef<{teacherUsername: string}, AppointmentDTO[]>>(null);
    const nonPendingRef = useRef<ResponseHandlerRef<{teacherUsername: string}, AppointmentDTO[]>>(null);
    const handleAppointmentsHandler = useRef<ResponseHandlerRef<AppointmentHandingRequest, any>>(null);

    const [pendingState, setPendingState] = useState<ResponseState<AppointmentDTO[]>>();
    const [nonPendingState, setNonPendingState] = useState<ResponseState<AppointmentDTO[]>>();
    const [handingAppointmentsStates, setHandingAppointmentsStates] = useState<ResponseState<any>>();

    const handlingResultDialogRef = useRef<DialogRef>(null);
    const rescheduleDialogRef = useRef<DialogRef>(null);
    const detailDialogRef = useRef<DialogRef>(null);

    const [statusFilter, setStatusFilter] = useState<StatusOption["value"]>("all");
    const [typeFilter, setTypeFilter] = useState<TypeOption["value"]>("all");
    const [timeFilter, setTimeFilter] = useState<TimeOption["value"]>("month");
    const [searchKeyword, setSearchKeyword] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [currentPage, setCurrentPage] = useState(1);
    const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(new Date());
    const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<number | null>(null);
    const [rescheduleTarget, setRescheduleTarget] = useState<AppointmentDTO | null>(null);
    const [rescheduleStartDate, setRescheduleStartDate] = useState("");
    const [rescheduleStartTime, setRescheduleStartTime] = useState("");
    const [rescheduleEndDate, setRescheduleEndDate] = useState("");
    const [rescheduleEndTime, setRescheduleEndTime] = useState("");
    const [rescheduleError, setRescheduleError] = useState("");
    const [detailAppointment, setDetailAppointment] = useState<AppointmentDTO | null>(null);
    const focusAppointmentIdRaw = Number(searchParams.get("focusAppointmentId"));
    const focusAppointmentId = Number.isNaN(focusAppointmentIdRaw) ? 0 : focusAppointmentIdRaw;

    const teacherUsername = context.user?.username ?? "null";

    useEffect(() => {
        pendingRef.current?.request({teacherUsername});
        nonPendingRef.current?.request({teacherUsername});
    }, [teacherUsername]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, typeFilter, timeFilter, searchKeyword]);

    useEffect(() => {
        if (focusAppointmentId > 0) {
            setSearchKeyword(String(focusAppointmentId));
            setCurrentPage(1);
        }
    }, [focusAppointmentId]);

    const pendingAppointments = pendingState?.returnObject?.data ?? [];
    const nonPendingAppointments = nonPendingState?.returnObject?.data ?? [];

    const allAppointments = useMemo(() => [...pendingAppointments, ...nonPendingAppointments], [
        pendingAppointments,
        nonPendingAppointments
    ]);

    const filteredAppointments = useMemo(() => {
        const keyword = searchKeyword.trim().toLowerCase();
        return allAppointments.filter((item) => {
            if (statusFilter !== "all" && item.status !== statusFilter) {
                return false;
            }
            if (typeFilter !== "all" && item.appointmentType !== typeFilter) {
                return false;
            }
            const startTime = item.startTime ? new Date(item.startTime) : null;
            if (startTime && !withinRange(startTime, timeFilter)) {
                return false;
            }
            if (!keyword) {
                return true;
            }
            const matchTarget = [
                item.studentName,
                item.studentUsername,
                item.description,
                item.appointmentId?.toString()
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return matchTarget.includes(keyword);
        }).sort((a, b) => {
            const timeA = new Date(a.applyTime).getTime();
            const timeB = new Date(b.applyTime).getTime();
            return timeB - timeA;
        });
    }, [allAppointments, statusFilter, typeFilter, timeFilter, searchKeyword]);

    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const pageAppointments = filteredAppointments.slice((safePage - 1) * pageSize, safePage * pageSize);
    const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

    const calendarAppointmentsByDate = useMemo(() => {
        const map = new Map<string, AppointmentDTO[]>();
        filteredAppointments.forEach((item) => {
            const start = toDateSafe(item.startTime);
            if (!start) {
                return;
            }
            const key = formatDateKey(start);
            const list = map.get(key) ?? [];
            list.push(item);
            map.set(key, list);
        });
        map.forEach((items, key) => {
            map.set(key, [...items].sort((a, b) => {
                const timeA = toDateSafe(a.startTime)?.getTime() ?? 0;
                const timeB = toDateSafe(b.startTime)?.getTime() ?? 0;
                return timeA - timeB;
            }));
        });
        return map;
    }, [filteredAppointments]);

    const selectedCalendarKey = formatDateKey(selectedCalendarDate);
    const selectedDateAppointments = calendarAppointmentsByDate.get(selectedCalendarKey) ?? [];

    useEffect(() => {
        if (currentPage !== safePage) {
            setCurrentPage(safePage);
        }
    }, [safePage, currentPage]);

    useEffect(() => {
        if (focusAppointmentId <= 0 || !pageAppointments.some((item) => item.appointmentId === focusAppointmentId)) {
            return;
        }
        const timer = window.setTimeout(() => {
            const element = document.getElementById(`teacher-appointment-${focusAppointmentId}`);
            element?.scrollIntoView({behavior: "smooth", block: "center"});
        }, 120);
        return () => window.clearTimeout(timer);
    }, [focusAppointmentId, pageAppointments]);

    const statusSummary = useMemo(() => {
        const summary = new Map<AppointmentStatus, number>();
        allAppointments.forEach((item) => {
            summary.set(item.status, (summary.get(item.status) ?? 0) + 1);
        });
        return summary;
    }, [allAppointments]);

    const trendData = useMemo(() => {
        const now = new Date();
        return Array.from({length: 7}, (_, index) => {
            const date = new Date(now);
            date.setDate(now.getDate() - (6 - index));
            const count = allAppointments.filter((item) => {
                if (!item.startTime) {
                    return false;
                }
                const start = new Date(item.startTime);
                return isSameDay(start, date);
            }).length;
            return {
                label: `${date.getMonth() + 1}/${date.getDate()}`,
                count,
            };
        });
    }, [allAppointments]);

    const maxTrend = Math.max(...trendData.map((item) => item.count), 1);

    const handleAppointmentsHandlerResultDialog = (
        <ResponseHandler<AppointmentHandingRequest, any>
            ref={handleAppointmentsHandler}
            request={appointmentController.handle}
            setResponseState={setHandingAppointmentsStates}
            idleComponent={<></>}
            loadingComponent={
                <Loading type="dots" text="处理中..." color="#2196f3" size="large" fullScreen/>
            }
            handlingReturnObjectComponent={
                <Loading type="dots" text="处理处理结果中..." color="#2196f3" size="large" fullScreen/>
            }
            networkErrorComponent={
                <Dialog
                    autoOpen
                    ref={handlingResultDialogRef}
                    type="modal"
                    title="网络错误"
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">详情：{handingAppointmentsStates?.networkError?.message}</p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button type="default"
                                    style={{flexGrow: 1}} onClick={() => {
                                handlingResultDialogRef.current?.close();
                            }}>返回</Button>
                        </div>
                    </div>
                </Dialog>
            }
            finishedComponent={
                <Dialog
                    autoOpen
                    ref={handlingResultDialogRef}
                    type="modal"
                    title={`处理${ReturnObject.Status.ChineseName.get(handingAppointmentsStates?.returnObject?.status)}`}
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                    onClose={() => {
                        refreshAppointmentLists();
                    }}
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">
                            {handingAppointmentsStates?.returnObject?.status === ReturnObject.Status.SUCCESS
                                ? "处理成功"
                                : handingAppointmentsStates?.returnObject?.message}
                        </p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button
                                type={handingAppointmentsStates?.returnObject?.status === ReturnObject.Status.SUCCESS
                                    ? "primary"
                                    : "default"}
                                style={{flexGrow: 1}}
                                onClick={() => {
                                    handlingResultDialogRef.current?.close();
                                }}
                            >
                                {handingAppointmentsStates?.returnObject?.status === ReturnObject.Status.SUCCESS ? "确定" : "返回"}
                            </Button>
                        </div>
                    </div>
                </Dialog>
            }
        />
    );

    const renderStatusCount = (status: AppointmentStatus) => statusSummary.get(status) ?? 0;

    const pendingErrorMessage = pendingState?.networkError?.message
        || (pendingState?.returnObject?.status && pendingState.returnObject.status !== ReturnObject.Status.SUCCESS
            ? pendingState.returnObject.message
            : "");

    const nonPendingErrorMessage = nonPendingState?.networkError?.message
        || (nonPendingState?.returnObject?.status && nonPendingState.returnObject.status !== ReturnObject.Status.SUCCESS
            ? nonPendingState.returnObject.message
            : "");

    const hasError = Boolean(pendingErrorMessage || nonPendingErrorMessage);
    const refreshAppointmentLists = () => {
        pendingRef.current?.recover();
        nonPendingRef.current?.recover();
        pendingRef.current?.request({teacherUsername});
        nonPendingRef.current?.request({teacherUsername});
    };

    const handleAcceptAppointment = (appointmentId: number) => {
        handleAppointmentsHandler.current?.request({
            appointmentId,
            status: AppointmentStatus.ACCEPTED
        });
    };

    const handleRejectAppointment = (appointmentId: number) => {
        const reason = window.prompt("请输入拒绝原因（必填）：", "");
        if (reason === null) {
            return;
        }
        const trimmed = reason.trim();
        if (!trimmed) {
            alert("拒绝预约必须填写原因");
            return;
        }
        handleAppointmentsHandler.current?.request({
            appointmentId,
            status: AppointmentStatus.REJECTED,
            rejectReason: trimmed
        });
    };

    const handleSelectCalendarDate = (date: Date) => {
        const selected = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        setSelectedCalendarDate(selected);
        if (!isSameMonth(selected, calendarMonth)) {
            setCalendarMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
        }
    };

    const openDetailDialog = (appointment: AppointmentDTO) => {
        setDetailAppointment(appointment);
        detailDialogRef.current?.open();
    };

    const openRescheduleDialog = (appointment: AppointmentDTO) => {
        setRescheduleTarget(appointment);
        setRescheduleStartDate(formatDateForInput(appointment.startTime));
        setRescheduleStartTime(formatTimeForInput(appointment.startTime));
        setRescheduleEndDate(formatDateForInput(appointment.endTime));
        setRescheduleEndTime(formatTimeForInput(appointment.endTime));
        setRescheduleError("");
        rescheduleDialogRef.current?.open();
    };

    const handleSubmitReschedule = async () => {
        if (!rescheduleTarget) {
            return;
        }
        if (!rescheduleStartDate || !rescheduleStartTime || !rescheduleEndDate || !rescheduleEndTime) {
            setRescheduleError("请完整填写开始和结束日期时间");
            return;
        }

        const nextStartTime = normalizeDateTimeInput(`${rescheduleStartDate}T${rescheduleStartTime}`);
        const nextEndTime = normalizeDateTimeInput(`${rescheduleEndDate}T${rescheduleEndTime}`);
        const startDate = new Date(nextStartTime);
        const endDate = new Date(nextEndTime);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            setRescheduleError("时间格式不正确");
            return;
        }
        if (endDate.getTime() <= startDate.getTime()) {
            setRescheduleError("结束时间必须晚于开始时间");
            return;
        }

        setReschedulingAppointmentId(rescheduleTarget.appointmentId);
        try {
            const payload: AppointmentRescheduleRequest = {
                appointmentId: rescheduleTarget.appointmentId,
                startTime: nextStartTime,
                endTime: nextEndTime
            };
            const result = await appointmentController.reschedule(payload);
            if (result.status === ReturnObject.Status.SUCCESS) {
                refreshAppointmentLists();
                rescheduleDialogRef.current?.close();
                alert("改期成功，已通知学生确认");
            } else {
                setRescheduleError(result.message || "改期失败");
            }
        } catch (error) {
            setRescheduleError(error instanceof Error ? error.message : "改期失败");
        } finally {
            setReschedulingAppointmentId(null);
        }
    };

    const currentDate = new Date();
    const selectedDateLabel = `${selectedCalendarDate.getFullYear()}-${`${selectedCalendarDate.getMonth() + 1}`.padStart(2, "0")}-${`${selectedCalendarDate.getDate()}`.padStart(2, "0")}`;
    const moveCalendarMonth = (offset: number) => {
        setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };
    const backToCurrentMonth = () => {
        const now = new Date();
        setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelectedCalendarDate(now);
    };

    return (
        <div className="appointment-manage-page">
            {handleAppointmentsHandlerResultDialog}
            <Dialog
                ref={rescheduleDialogRef}
                type="modal"
                title={rescheduleTarget ? `改期预约 #${rescheduleTarget.appointmentId}` : "改期预约"}
                width={640}
                showCloseButton
                closeOnBackdropClick
                closeOnEscape
                onClose={() => {
                    setRescheduleError("");
                    setRescheduleTarget(null);
                }}
            >
                <div className="appointment-modal-body">
                    <div className="appointment-modal-note">
                        请设置新的预约开始/结束日期和时间，提交后将通知学生确认。
                    </div>
                    <AppointmentDateTimeRangeFields
                        startDate={rescheduleStartDate}
                        startTime={rescheduleStartTime}
                        endDate={rescheduleEndDate}
                        endTime={rescheduleEndTime}
                        disabled={reschedulingAppointmentId !== null}
                        onChange={(field, value) => {
                            setRescheduleError("");
                            if (field === "startDate") {
                                setRescheduleStartDate(value);
                                return;
                            }
                            if (field === "startTime") {
                                setRescheduleStartTime(value);
                                return;
                            }
                            if (field === "endDate") {
                                setRescheduleEndDate(value);
                                return;
                            }
                            setRescheduleEndTime(value);
                        }}
                    />
                    {rescheduleError ? (
                        <div className="appointment-reschedule-error">{rescheduleError}</div>
                    ) : null}
                    <div className="appointment-modal-footer">
                        <Button
                            type="default"
                            onClick={() => rescheduleDialogRef.current?.close()}
                            disabled={reschedulingAppointmentId !== null}
                        >
                            取消
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleSubmitReschedule}
                            disabled={reschedulingAppointmentId !== null}
                        >
                            {reschedulingAppointmentId !== null ? "提交中..." : "确认改期"}
                        </Button>
                    </div>
                </div>
            </Dialog>
            <Dialog
                ref={detailDialogRef}
                type="modal"
                title={detailAppointment ? `预约详情 #${detailAppointment.appointmentId}` : "预约详情"}
                width={680}
                showCloseButton
                closeOnBackdropClick
                closeOnEscape
                onClose={() => setDetailAppointment(null)}
            >
                {detailAppointment ? (
                    <div className="appointment-modal-body">
                        <div className="appointment-modal-note">
                            学生：{detailAppointment.anonymous
                                ? "匿名学生"
                                : (detailAppointment.studentName || detailAppointment.studentUsername || "未知")}
                        </div>
                        <div className="appointment-reschedule-grid">
                            <div className="appointment-reschedule-item">
                                <label>预约编号</label>
                                <input value={`#${detailAppointment.appointmentId}`} readOnly />
                            </div>
                            <div className="appointment-reschedule-item">
                                <label>咨询类型</label>
                                <input value={resolveTypeLabel(detailAppointment.appointmentType)} readOnly />
                            </div>
                            <div className="appointment-reschedule-item">
                                <label>预约开始</label>
                                <input value={formatDateTime(detailAppointment.startTime)} readOnly />
                            </div>
                            <div className="appointment-reschedule-item">
                                <label>预约结束</label>
                                <input value={formatDateTime(detailAppointment.endTime)} readOnly />
                            </div>
                            <div className="appointment-reschedule-item">
                                <label>预约状态</label>
                                <input value={resolveStatusLabel(detailAppointment)} readOnly />
                            </div>
                            <div className="appointment-reschedule-item">
                                <label>预计时长</label>
                                <input value={formatDuration(detailAppointment.startTime, detailAppointment.endTime)} readOnly />
                            </div>
                        </div>
                        <div className="appointment-record-desc" style={{marginTop: 0}}>
                            {detailAppointment.description || "未填写问题类型"}
                        </div>
                        <div className="appointment-modal-footer">
                            <Button type="default" onClick={() => detailDialogRef.current?.close()}>
                                关闭
                            </Button>
                        </div>
                    </div>
                ) : null}
            </Dialog>
            <ResponseHandler<{teacherUsername: string}, AppointmentDTO[]>
                ref={pendingRef}
                request={appointmentController.findTeacherPending}
                setResponseState={setPendingState}
                idleComponent={<></>}
                loadingComponent={<Loading type="dots" text="获取预约信息中..." color="#2196f3" size="large" fullScreen/>}
                handlingReturnObjectComponent={<Loading type="dots" text="处理预约结果中..." color="#2196f3" size="large" fullScreen/>}
                networkErrorComponent={<></>}
                finishedComponent={<></>}
            />
            <ResponseHandler<{teacherUsername: string}, AppointmentDTO[]>
                ref={nonPendingRef}
                request={appointmentController.findTeacherNonPending}
                setResponseState={setNonPendingState}
                idleComponent={<></>}
                loadingComponent={<Loading type="dots" text="获取预约信息中..." color="#2196f3" size="large" fullScreen/>}
                handlingReturnObjectComponent={<Loading type="dots" text="处理预约结果中..." color="#2196f3" size="large" fullScreen/>}
                networkErrorComponent={<></>}
                finishedComponent={<></>}
            />

            <div className="appointment-manage-header">
                <div>
                    <h2>预约管理</h2>
                    <p>管理所有学生的心理咨询预约申请</p>
                </div>
                <div className="appointment-manage-actions">
                    <button className="appointment-manage-btn appointment-manage-btn--ghost" type="button">
                        <i className="fa-solid fa-download"/>导出预约
                    </button>
                    <button className="appointment-manage-btn appointment-manage-btn--primary" type="button">
                        <i className="fa-solid fa-plus"/>手动添加
                    </button>
                </div>
            </div>

            <div className="appointment-manage-filter-card">
                <div className="appointment-manage-filters">
                    <div className="appointment-manage-select">
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusOption["value"])}>
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <i className="fa-solid fa-chevron-down"/>
                    </div>

                    <div className="appointment-manage-select">
                        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as TypeOption["value"])}>
                            {TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <i className="fa-solid fa-chevron-down"/>
                    </div>

                    <div className="appointment-manage-select">
                        <select value={timeFilter} onChange={(event) => setTimeFilter(event.target.value as TimeOption["value"])}>
                            {TIME_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <i className="fa-solid fa-chevron-down"/>
                    </div>

                    <div className="appointment-manage-search">
                        <i className="fa-solid fa-search"/>
                        <input
                            value={searchKeyword}
                            onChange={(event) => setSearchKeyword(event.target.value)}
                            placeholder="搜索学生/预约编号"
                        />
                    </div>
                </div>

                <div className="appointment-manage-view-toggle">
                    <button
                        type="button"
                        className={`appointment-view-btn${viewMode === "list" ? " is-active" : ""}`}
                        onClick={() => setViewMode("list")}
                    >
                        <i className="fa-solid fa-list-ul"/>列表视图
                    </button>
                    <button
                        type="button"
                        className={`appointment-view-btn${viewMode === "calendar" ? " is-active" : ""}`}
                        onClick={() => setViewMode("calendar")}
                    >
                        <i className="fa-solid fa-calendar"/>日历视图
                    </button>
                </div>
            </div>

            {viewMode === "calendar" ? (
                <div className="appointment-manage-card">
                    {hasError ? (
                        <div className="appointment-manage-empty">{pendingErrorMessage || nonPendingErrorMessage}</div>
                    ) : (
                        <div className="appointment-calendar">
                            <div className="appointment-calendar-toolbar">
                                <div className="appointment-calendar-toolbar__left">
                                    <button
                                        type="button"
                                        className="appointment-manage-btn appointment-manage-btn--ghost"
                                        onClick={() => moveCalendarMonth(-1)}
                                    >
                                        <i className="fa-solid fa-chevron-left"/>上月
                                    </button>
                                    <h3>{formatMonthLabel(calendarMonth)}</h3>
                                    <button
                                        type="button"
                                        className="appointment-manage-btn appointment-manage-btn--ghost"
                                        onClick={() => moveCalendarMonth(1)}
                                    >
                                        下月<i className="fa-solid fa-chevron-right"/>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    className="appointment-manage-btn appointment-manage-btn--primary"
                                    onClick={backToCurrentMonth}
                                >
                                    返回本月
                                </button>
                            </div>

                            <div className="appointment-calendar-weekdays">
                                {CALENDAR_WEEKDAY_LABELS.map((label) => (
                                    <span key={label}>{label}</span>
                                ))}
                            </div>

                            <div className="appointment-calendar-grid">
                                {calendarDays.map((day) => {
                                    const dayKey = formatDateKey(day);
                                    const dayItems = calendarAppointmentsByDate.get(dayKey) ?? [];
                                    const currentMonthDay = isSameMonth(day, calendarMonth);
                                    const isToday = isSameDay(day, currentDate);
                                    const isSelected = isSameDay(day, selectedCalendarDate);
                                    return (
                                        <button
                                            key={dayKey}
                                            type="button"
                                            className={`appointment-calendar-cell${currentMonthDay ? "" : " is-outside"}${isToday ? " is-today" : ""}${isSelected ? " is-selected" : ""}`}
                                            onClick={() => handleSelectCalendarDate(day)}
                                        >
                                            <div className="appointment-calendar-cell__head">
                                                <span>{day.getDate()}</span>
                                                {dayItems.length > 0 ? (
                                                    <strong>{dayItems.length}条</strong>
                                                ) : null}
                                            </div>
                                            <div className="appointment-calendar-cell__list">
                                                {dayItems.slice(0, 2).map((item) => {
                                                    const studentLabel = item.anonymous
                                                        ? "匿名学生"
                                                        : (item.studentName || item.studentUsername || "学生");
                                                    return (
                                                        <span key={`${dayKey}-${item.appointmentId}`} className={`appointment-calendar-chip ${resolveStatusClass(item)}`}>
                                                            {formatTimeLabel(item.startTime)} {studentLabel}
                                                        </span>
                                                    );
                                                })}
                                                {dayItems.length > 2 ? (
                                                    <span className="appointment-calendar-chip is-more">+{dayItems.length - 2}</span>
                                                ) : null}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="appointment-calendar-detail">
                                <div className="appointment-card-header">
                                    <h3>{selectedDateLabel} 预约明细</h3>
                                    <span>共 {selectedDateAppointments.length} 条</span>
                                </div>
                                {selectedDateAppointments.length === 0 ? (
                                    <div className="appointment-manage-empty">当天暂无预约</div>
                                ) : (
                                    <div className="appointment-calendar-detail-list">
                                        {selectedDateAppointments.map((appointment) => {
                                            const typeLabel = resolveTypeLabel(appointment.appointmentType);
                                            const studentName = appointment.anonymous
                                                ? "匿名学生"
                                                : (appointment.studentName || appointment.studentUsername || "匿名");
                                            const waitingStudentConfirm = appointment.status === AppointmentStatus.WAITING && Boolean(appointment.reschedulePending);
                                            return (
                                                <article key={`calendar-detail-${appointment.appointmentId}`} className="appointment-calendar-detail-item">
                                                    <div className="appointment-calendar-detail-item__head">
                                                        <div>
                                                            <h4>#{appointment.appointmentId} {studentName}</h4>
                                                            <p>{formatDateTime(appointment.startTime)} - {formatDateTime(appointment.endTime)}</p>
                                                        </div>
                                                        <span className={`appointment-status-badge ${resolveStatusClass(appointment)}`}>
                                                            {resolveStatusLabel(appointment)}
                                                        </span>
                                                    </div>
                                                    <div className="appointment-calendar-detail-item__meta">
                                                        <span>类型：{typeLabel}</span>
                                                        <span>时长：{formatDuration(appointment.startTime, appointment.endTime)}</span>
                                                    </div>
                                                    <div className="appointment-calendar-detail-item__desc">
                                                        {appointment.description || "未填写问题类型"}
                                                    </div>
                                                    <div className="appointment-actions">
                                                        {appointment.status === AppointmentStatus.WAITING ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="action-btn action-btn--success"
                                                                    disabled={waitingStudentConfirm}
                                                                    title={waitingStudentConfirm ? "待学生确认改期后可通过" : "通过"}
                                                                    onClick={() => handleAcceptAppointment(appointment.appointmentId)}
                                                                >
                                                                    <i className="fa-solid fa-check"/>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="action-btn action-btn--danger"
                                                                    disabled={waitingStudentConfirm}
                                                                    title={waitingStudentConfirm ? "待学生确认改期后可拒绝" : "拒绝"}
                                                                    onClick={() => handleRejectAppointment(appointment.appointmentId)}
                                                                >
                                                                    <i className="fa-solid fa-times"/>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="action-btn action-btn--warning"
                                                                    title="改期"
                                                                    disabled={reschedulingAppointmentId === appointment.appointmentId}
                                                                    onClick={() => openRescheduleDialog(appointment)}
                                                                >
                                                                    <i className={`fa-solid ${reschedulingAppointmentId === appointment.appointmentId ? "fa-spinner fa-spin" : "fa-calendar-days"}`}/>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="action-btn"
                                                                title="查看预约详情"
                                                                onClick={() => openDetailDialog(appointment)}
                                                            >
                                                                <i className="fa-solid fa-eye"/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="appointment-manage-card">
                    {hasError ? (
                        <div className="appointment-manage-empty">{pendingErrorMessage || nonPendingErrorMessage}</div>
                    ) : (
                        <div className="appointment-manage-table-wrapper">
                            <table className="appointment-manage-table">
                                <thead>
                                <tr>
                                    <th>预约编号</th>
                                    <th>学生信息</th>
                                    <th>咨询类型</th>
                                    <th>预约时间</th>
                                    <th>问题类型</th>
                                    <th>预约状态</th>
                                    <th>操作</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pageAppointments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="appointment-manage-empty">
                                            暂无预约记录
                                        </td>
                                    </tr>
                                ) : (
                                    pageAppointments.map((appointment) => {
                                        const statusClass = resolveStatusClass(appointment);
                                        const statusLabel = resolveStatusLabel(appointment);
                                        const typeLabel = resolveTypeLabel(appointment.appointmentType);
                                        const studentName = appointment.anonymous
                                            ? "匿名学生"
                                            : (appointment.studentName || appointment.studentUsername || "匿名");
                                        const studentInitial = studentName.trim().slice(0, 1) || "?";
                                        const waitingStudentConfirm = appointment.status === AppointmentStatus.WAITING && Boolean(appointment.reschedulePending);
                                        return (
                                            <tr
                                                id={`teacher-appointment-${appointment.appointmentId}`}
                                                key={appointment.appointmentId}
                                                className={focusAppointmentId > 0 && appointment.appointmentId === focusAppointmentId ? "is-focused" : ""}
                                            >
                                                <td>#{appointment.appointmentId}</td>
                                                <td>
                                                    <div className="appointment-student">
                                                        <div className="appointment-avatar">{studentInitial}</div>
                                                        <div>
                                                            <div className="appointment-student-name">{studentName}</div>
                                                            <div className="appointment-student-sub">{appointment.anonymous ? "匿名预约" : (appointment.studentUsername || "")}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="appointment-type-badge">{typeLabel}</span>
                                                </td>
                                                <td>
                                                    <div>{formatDateTime(appointment.startTime)}</div>
                                                    <div className="appointment-sub">预计时长: {formatDuration(appointment.startTime, appointment.endTime)}</div>
                                                </td>
                                                <td>{appointment.description || "未填写"}</td>
                                                <td>
                                                    <span className={`appointment-status-badge ${statusClass}`}>{statusLabel}</span>
                                                </td>
                                                <td>
                                                    <div className="appointment-actions">
                                                        {appointment.status === AppointmentStatus.WAITING ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="action-btn action-btn--success"
                                                                    disabled={waitingStudentConfirm}
                                                                    title={waitingStudentConfirm ? "待学生确认改期后可通过" : "通过"}
                                                                    onClick={() => handleAcceptAppointment(appointment.appointmentId)}
                                                                >
                                                                    <i className="fa-solid fa-check"/>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="action-btn action-btn--danger"
                                                                    disabled={waitingStudentConfirm}
                                                                    title={waitingStudentConfirm ? "待学生确认改期后可拒绝" : "拒绝"}
                                                                    onClick={() => handleRejectAppointment(appointment.appointmentId)}
                                                                >
                                                                    <i className="fa-solid fa-times"/>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="action-btn action-btn--warning"
                                                                    title="改期"
                                                                    disabled={reschedulingAppointmentId === appointment.appointmentId}
                                                                    onClick={() => openRescheduleDialog(appointment)}
                                                                >
                                                                    <i className={`fa-solid ${reschedulingAppointmentId === appointment.appointmentId ? "fa-spinner fa-spin" : "fa-calendar-days"}`}/>
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                className="action-btn"
                                                                title="查看预约详情"
                                                                onClick={() => openDetailDialog(appointment)}
                                                            >
                                                                <i className="fa-solid fa-eye"/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="appointment-manage-pagination">
                        <p>
                            显示 <span>{filteredAppointments.length === 0 ? 0 : (safePage - 1) * pageSize + 1}</span> -
                            <span>{Math.min(filteredAppointments.length, safePage * pageSize)}</span> 条，
                            共 <span>{filteredAppointments.length}</span> 条记录
                        </p>
                        <div className="appointment-pagination-actions">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={safePage === 1}
                            >
                                <i className="fa-solid fa-chevron-left"/>
                            </button>
                            {Array.from({length: totalPages}, (_, index) => index + 1).map((page) => (
                                <button
                                    key={page}
                                    type="button"
                                    className={page === safePage ? "is-active" : ""}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={safePage === totalPages}
                            >
                                <i className="fa-solid fa-chevron-right"/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="appointment-manage-stats">
                <div className="appointment-manage-card">
                    <div className="appointment-card-header">
                        <h3>预约状态分布</h3>
                        <span>共 {allAppointments.length} 条</span>
                    </div>
                    <div className="appointment-status-list">
                        {[AppointmentStatus.WAITING, AppointmentStatus.ACCEPTED, AppointmentStatus.IN_PROGRESS, AppointmentStatus.REJECTED, AppointmentStatus.FORCE_CANCELLED].map((status) => {
                            const count = renderStatusCount(status);
                            const percent = allAppointments.length ? Math.round((count / allAppointments.length) * 100) : 0;
                            return (
                                <div className="appointment-status-item" key={status}>
                                    <div className="appointment-status-info">
                                        <span>{resolveStatusLabelByStatus(status)}</span>
                                        <span>{count} ({percent}%)</span>
                                    </div>
                                    <div className="appointment-status-bar">
                                        <span style={{width: `${percent}%`}} className={resolveStatusClassByStatus(status)} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="appointment-manage-card">
                    <div className="appointment-card-header">
                        <h3>近7天预约趋势</h3>
                        <span>按预约时间统计</span>
                    </div>
                    <div className="appointment-trend">
                        {trendData.map((item) => (
                            <div className="appointment-trend-item" key={item.label}>
                                <div className="appointment-trend-bar">
                                    <span style={{height: `${(item.count / maxTrend) * 100}%`}} />
                                </div>
                                <span className="appointment-trend-label">{item.label}</span>
                                <span className="appointment-trend-value">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
