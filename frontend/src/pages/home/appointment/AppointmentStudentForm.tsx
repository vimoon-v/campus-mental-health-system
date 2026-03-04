import React, {useEffect, useMemo, useRef, useState} from "react";
import {Textarea, TextareaCallback, TextareaRef} from "../../../common/view/input/Textarea";
import {Button} from "../../../common/view/controller/Button";
import {User} from "../../../entity/User";
import {Select, SelectOption, SelectRef} from "../../../common/view/input/Select";
import {UserController} from "../../../controller/UserController";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {ResponseState} from "../../../common/response/ResponseState";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {UserPosition} from "../../../entity/enums/UserPosition";
import {
    AppointmentController,
    AppointmentRequest,
    FindAppointmentRequest,
    StudentConfirmRescheduleRequest
} from "../../../controller/AppointmentController";
import {Loading} from "../../../common/view/display/Loading";
import {Dialog, DialogRef} from "../../../common/view/container/Dialog";
import {AppointmentDTO} from "../../../entity/AppointmentDTO";
import {AppointmentStatus} from "../../../entity/enums/AppointmentStatus";
import {AppointmentType} from "../../../entity/enums/AppointmentType";
import {useSearchParams} from "react-router-dom";
import {AppointmentDateTimeRangeFields} from "./AppointmentDateTimeRangeFields";

const APPOINTMENT_TYPE_OPTIONS: SelectOption[] = [
    {label: "线上咨询", value: AppointmentType.ONLINE},
    {label: "线下咨询", value: AppointmentType.OFFLINE},
];

export interface AppointmentStudentFormProps {
    studentUser: User | null
}

export const AppointmentStudentForm: React.FC<AppointmentStudentFormProps> = ({studentUser}) => {
    const [searchParams] = useSearchParams();
    const userController = new UserController();
    const appointmentController = new AppointmentController();

    const getTeachersHandlerRef = useRef<ResponseHandlerRef<{ schoolProvince: number, school: string }, User[]>>(null);
    const [teachersStates, setTeachersStates] = useState<ResponseState<User[]>>();
    const [selectedTeacherUsername, setSelectedTeacherUsername] = useState<string>("");
    const appointmentFormDialogRef = useRef<DialogRef>(null);

    const descriptionInputRef = useRef<TextareaRef>(null);
    const appointmentTypeSelectRef = useRef<SelectRef>(null);

    const addAppointmentHandler = useRef<ResponseHandlerRef<AppointmentRequest, any>>(null);
    const [addAppointmentState, setAddAppointmentState] = useState<ResponseState<any>>();
    const addAppointmentResultDialogRef = useRef<DialogRef>(null);
    const [appointmentFormData, setAppointmentFormData] = useState<AppointmentRequest>({
        description: "",
        anonymous: false,
        appointmentType: AppointmentType.ONLINE,
        endTime: "",
        startTime: "",
        studentUsername: "",
        teacherUsername: ""
    });
    const findAppointmentsHandlerRef = useRef<ResponseHandlerRef<FindAppointmentRequest, AppointmentDTO[]>>(null);
    const [findAppointmentsState, setFindAppointmentsState] = useState<ResponseState<AppointmentDTO[]>>();

    const [startDateTime, setStartDateTime] = useState<{ date: string, time: string }>({date: "", time: ""});
    const [endDateTime, setEndDateTime] = useState<{ date: string, time: string }>({date: "", time: ""});
    const [scheduleError, setScheduleError] = useState("");
    const [rescheduleActionLoadingId, setRescheduleActionLoadingId] = useState<number | null>(null);
    const focusAppointmentIdRaw = Number(searchParams.get("focusAppointmentId"));
    const focusAppointmentId = Number.isNaN(focusAppointmentIdRaw) ? 0 : focusAppointmentIdRaw;
    const sortedAppointments = useMemo(() => {
        const source = findAppointmentsState?.returnObject?.data ?? [];
        return [...source].sort((left, right) => {
            const leftStartTime = left?.startTime ? new Date(left.startTime as any).getTime() : 0;
            const rightStartTime = right?.startTime ? new Date(right.startTime as any).getTime() : 0;
            if (rightStartTime !== leftStartTime) {
                return rightStartTime - leftStartTime;
            }
            const leftApplyTime = left?.applyTime ? new Date(left.applyTime as any).getTime() : 0;
            const rightApplyTime = right?.applyTime ? new Date(right.applyTime as any).getTime() : 0;
            if (rightApplyTime !== leftApplyTime) {
                return rightApplyTime - leftApplyTime;
            }
            return (right?.appointmentId ?? 0) - (left?.appointmentId ?? 0);
        });
    }, [findAppointmentsState?.returnObject?.data]);

    const resolveTeacherTitle = (teacher: User): string => {
        return UserPosition.ChineseName.get(teacher.position) ?? "心理咨询师";
    };

    const resolveTeacherTags = (teacher: User): string[] => {
        const tags: string[] = [];
        const pushTag = (value: string | null | undefined) => {
            const cleaned = value?.trim();
            if (!cleaned || tags.includes(cleaned)) {
                return;
            }
            tags.push(cleaned);
        };
        pushTag(teacher.secondaryUnit);
        pushTag(teacher.major);
        pushTag(UserPosition.ChineseName.get(teacher.position));
        if (tags.length === 0) {
            return ["心理咨询", "情绪支持", "成长支持"];
        }
        return tags.slice(0, 4);
    };

    const resolveTeacherDescription = (teacher: User): string => {
        const description = teacher.description?.trim();
        if (description) {
            return description;
        }
        return "暂无简介，欢迎在预约时进一步了解。";
    };


    const formatDateTime = (value: any) => {
        if (!value) {
            return "--";
        }
        const resolved = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(resolved.getTime())) {
            return String(value);
        }
        return resolved.toLocaleString();
    };

    const normalizeTimeValue = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) {
            return "";
        }
        if (/^\d{2}:\d{2}$/.test(trimmed)) {
            return `${trimmed}:00`;
        }
        return trimmed;
    };

    const isReschedulePending = (appointment: AppointmentDTO | null | undefined) => {
        return Boolean(appointment?.status === AppointmentStatus.WAITING && appointment?.reschedulePending);
    };

    const resolveStatusName = (appointment: AppointmentDTO | null | undefined) => {
        if (!appointment?.status) {
            return "未知";
        }
        if (isReschedulePending(appointment)) {
            return "待确认改期";
        }
        return AppointmentStatus.ChineseName.get(appointment.status) ?? appointment.status.toString();
    };

    const resolveStatusClassName = (appointment: AppointmentDTO | null | undefined) => {
        if (isReschedulePending(appointment)) {
            return "status-reschedule";
        }
        switch (appointment?.status) {
            case AppointmentStatus.ACCEPTED:
                return "status-confirm";
            case AppointmentStatus.REJECTED:
                return "status-reject";
            case AppointmentStatus.FORCE_CANCELLED:
                return "status-reject";
            case AppointmentStatus.IN_PROGRESS:
                return "status-reschedule";
            default:
                return "status-pending";
        }
    };

    const resolveAppointmentTypeName = (appointmentType: AppointmentType | string | null | undefined) => {
        if (!appointmentType) {
            return "未指定";
        }
        return AppointmentType.ChineseName.get(appointmentType) ?? appointmentType.toString();
    };

    const requestStudentAppointments = () => {
        const username = studentUser?.username ?? "";
        if (!username) {
            return;
        }
        findAppointmentsHandlerRef.current?.request({by: "studentUsername", username});
    };

    const handleConfirmReschedule = async (appointment: AppointmentDTO, confirmed: boolean) => {
        if (!appointment?.appointmentId) {
            return;
        }
        let feedback = "";
        if (!confirmed) {
            const input = window.prompt("可填写拒绝改期原因（选填）：", "");
            if (input === null) {
                return;
            }
            feedback = input.trim();
        }

        setRescheduleActionLoadingId(appointment.appointmentId);
        try {
            const payload: StudentConfirmRescheduleRequest = {
                appointmentId: appointment.appointmentId,
                confirmed,
                feedback: feedback || undefined
            };
            const result = await appointmentController.confirmReschedule(payload);
            if (result.status === ReturnObject.Status.SUCCESS) {
                alert(confirmed ? "已确认改期，已通知教师继续处理预约" : "已拒绝改期，已通知教师");
                requestStudentAppointments();
            } else {
                alert(result.message || "处理失败");
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : "处理失败");
        } finally {
            setRescheduleActionLoadingId(null);
        }
    };
    
    const clearTeacherSelection = () => {
        setAppointmentFormData((prev) => ({...prev, teacherUsername: ""}));
        setSelectedTeacherUsername("");
        appointmentFormDialogRef.current?.close();
    };

    const handleTeacherSelection = (username: string) => {
        setAppointmentFormData((prev) => ({...prev, teacherUsername: username}));
        setSelectedTeacherUsername(username);
    };

    const handleTeacherCardSelection = (username: string) => {
        handleTeacherSelection(username);
        setScheduleError("");
        appointmentFormDialogRef.current?.open();
    };

    const requestTeachers = (provinceValue: number, schoolValue: string) => {
        getTeachersHandlerRef.current?.recover();
        getTeachersHandlerRef.current?.request({schoolProvince: provinceValue, school: schoolValue});
    };

    useEffect(() => {
        if (!studentUser) {
            return;
        }
        const provinceValue = Number(studentUser.schoolProvince ?? 0);
        const schoolValue = studentUser.school ?? "";
        requestTeachers(provinceValue, schoolValue);
        requestStudentAppointments();
    }, [studentUser]);

    useEffect(() => {
        if (focusAppointmentId <= 0) {
            return;
        }
        const list = sortedAppointments;
        if (!list.some((item) => item.appointmentId === focusAppointmentId)) {
            return;
        }
        const timer = window.setTimeout(() => {
            const element = document.getElementById(`student-appointment-${focusAppointmentId}`);
            element?.scrollIntoView({behavior: "smooth", block: "center"});
        }, 120);
        return () => window.clearTimeout(timer);
    }, [sortedAppointments, focusAppointmentId]);

    const handleAppointmentSummit = (event: { preventDefault: () => void; }) => {
        const resolvedTeacherUsername = appointmentFormData.teacherUsername || selectedTeacherUsername;
        const isTeacherUsernameValid = Boolean(resolvedTeacherUsername);
        const isDescriptionValid = descriptionInputRef.current?.validate();
        const isAppointmentTypeValid = appointmentTypeSelectRef.current?.validate();

        event.preventDefault();
        if (!(isTeacherUsernameValid && isDescriptionValid && isAppointmentTypeValid)) {
            alert('请检查表单错误!');
            return;
        }

        if (!startDateTime.date || !startDateTime.time || !endDateTime.date || !endDateTime.time) {
            setScheduleError("请完整填写预约开始/结束日期和时间");
            return;
        }

        const startTimeValue = normalizeTimeValue(startDateTime.time);
        const endTimeValue = normalizeTimeValue(endDateTime.time);
        const startTime = `${startDateTime.date}T${startTimeValue}`;
        const endTime = `${endDateTime.date}T${endTimeValue}`;
        const startDate = new Date(startTime);
        const endDate = new Date(endTime);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            setScheduleError("预约时间格式不正确");
            return;
        }
        if (endDate.getTime() <= startDate.getTime()) {
            setScheduleError("预约结束时间必须晚于开始时间");
            return;
        }

        setScheduleError("");
        const payload: AppointmentRequest = {
            ...appointmentFormData,
            appointmentType: appointmentFormData.appointmentType || AppointmentType.ONLINE,
            startTime,
            endTime,
            studentUsername: studentUser?.username == null ? "" : studentUser?.username,
            teacherUsername: resolvedTeacherUsername,
        };
        addAppointmentHandler.current?.request(payload);
    };

    const addAppointResultDialog = (
        <ResponseHandler
            ref={addAppointmentHandler}
            request={appointmentController.addAppointment}
            setResponseState={setAddAppointmentState}
            onHandlingReturnObject={(_, returnObject) => {
                if (returnObject?.status === ReturnObject.Status.SUCCESS) {
                    requestStudentAppointments();
                    appointmentFormDialogRef.current?.close();
                }
            }}
            idleComponent={<></>}
            loadingComponent={
                <Loading type="dots"
                         text='预约中...'
                         color="#2196f3"
                         size="large"
                         fullScreen/>
            }
            handlingReturnObjectComponent={
                <Loading type="dots"
                         text='处理预约结果中...'
                         color="#2196f3"
                         size="large"
                         fullScreen/>
            }
            networkErrorComponent={<Dialog
                autoOpen
                ref={addAppointmentResultDialogRef}
                type="modal"
                title="网络错误"
                showCloseButton
                closeOnBackdropClick
                closeOnEscape
            >
                <div className="layout-flex-column">
                    <p className="text-align-left">详情：{addAppointmentState?.networkError?.message}</p>
                    <br/>
                    <div className="layout-flex-row justify-content-flex-end">
                        <span style={{flexGrow: 3.1}}></span>
                        <Button type="default"
                                style={{flexGrow: 1}} onClick={() => {
                            addAppointmentResultDialogRef.current?.close();
                        }}>返回</Button>
                    </div>
                </div>
            </Dialog>}
            finishedComponent={
                <Dialog
                    autoOpen
                    ref={addAppointmentResultDialogRef}
                    type="modal"
                    title={addAppointmentState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "预约成功" : "预约失败"}
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                    onClose={() => {
                        if (addAppointmentState?.returnObject?.status === ReturnObject.Status.SUCCESS) {
                            appointmentFormDialogRef.current?.close();
                        }
                    }}
                >
                    <div className="layout-flex-column">
                        <p className="text-align-left">{addAppointmentState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "预约成功！" : addAppointmentState?.returnObject?.message}</p>
                        <br/>
                        <div className="layout-flex-row justify-content-flex-end">
                            <span style={{flexGrow: 3.1}}></span>
                            <Button type={addAppointmentState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "primary" : "default"}
                                    style={{flexGrow: 1}} onClick={() => {
                                if (addAppointmentState?.returnObject?.status === ReturnObject.Status.SUCCESS) {
                                    appointmentFormDialogRef.current?.close();
                                }
                                addAppointmentResultDialogRef.current?.close();
                            }}>{addAppointmentState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "确定" : "返回"}</Button>
                        </div>
                    </div>
                </Dialog>
            }
        />
    );

    return (<div className="appointment-page">
            {addAppointResultDialog}

            <section className="appointment-hero">
                <h1>预约心理咨询</h1>
                <p>专业的心理咨询师为你提供一对一的专业指导，帮助你解决心理困扰，重拾阳光心态。</p>
            </section>

            <section className="appointment-steps-card">
                <h3>预约流程</h3>
                <div className="appointment-steps-grid">
                    <div className="appointment-step">
                        <div className="appointment-step-icon">
                            <i className="fa-solid fa-user-check"/>
                        </div>
                        <h4>1. 选择咨询师</h4>
                        <p>根据专业方向和擅长领域选择适合你的咨询师</p>
                    </div>
                    <div className="appointment-step">
                        <div className="appointment-step-icon">
                            <i className="fa-solid fa-calendar-check"/>
                        </div>
                        <h4>2. 选择时间</h4>
                        <p>在咨询师的可预约时段中选择合适的时间</p>
                    </div>
                    <div className="appointment-step">
                        <div className="appointment-step-icon">
                            <i className="fa-solid fa-file-pen"/>
                        </div>
                        <h4>3. 填写信息</h4>
                        <p>填写基本信息和咨询需求，提交预约申请</p>
                    </div>
                    <div className="appointment-step">
                        <div className="appointment-step-icon">
                            <i className="fa-solid fa-circle-check"/>
                        </div>
                        <h4>4. 完成预约</h4>
                        <p>预约成功后将收到确认通知，按时参加咨询</p>
                    </div>
                </div>
            </section>

            <div className="appointment-form">
                <section className="appointment-filter-card">
                    <div className="appointment-section-title">
                        <h3>选择心理咨询师</h3>
                        <p>系统已按你的所属学校自动匹配咨询师，请直接选择。</p>
                    </div>

                    <div className="appointment-teacher-section">
                        <ResponseHandler<{ schoolProvince: number, school: string }, User[]>
                            ref={getTeachersHandlerRef}
                            request={userController.getAllTeachers}
                            setResponseState={setTeachersStates}
                            idleComponent={<div className="appointment-teacher-empty">正在加载本校咨询师...</div>}
                            loadingComponent={
                                <div className="appointment-teacher-empty">查询中，请稍候...</div>
                            }
                            handlingReturnObjectComponent={
                                <div className="appointment-teacher-empty">处理查询结果中，请稍候...</div>
                            }
                            networkErrorComponent={<div className="appointment-teacher-empty">网络错误：{teachersStates?.networkError?.message}</div>}
                            finishedComponent={(!(teachersStates?.returnObject?.status === ReturnObject.Status.SUCCESS)) ? (
                                <div className="appointment-teacher-empty">
                                    查询咨询师{ReturnObject.Status.ChineseName.get(teachersStates?.returnObject?.status)}：{teachersStates?.returnObject?.message}
                                </div>
                            ) : (
                                <div className="appointment-teacher-content">
                                    {(teachersStates?.returnObject?.data ?? []).length === 0 ? (
                                        <div className="appointment-teacher-empty">暂无可预约的咨询师</div>
                                    ) : (
                                        <div className="appointment-teacher-grid">
                                            {(teachersStates?.returnObject?.data ?? []).map((teacher) => {
                                                const tags = resolveTeacherTags(teacher);
                                                const isSelected = selectedTeacherUsername === teacher.username;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={teacher.username}
                                                        className={`appointment-teacher-card${isSelected ? " is-selected" : ""}`}
                                                        onClick={() => handleTeacherCardSelection(teacher.username)}
                                                    >
                                                        <div className="appointment-teacher-card-top">
                                                            <div className="appointment-teacher-avatar">
                                                                {teacher.name ? teacher.name.slice(0, 1) : "?"}
                                                            </div>
                                                            <div className="appointment-teacher-info">
                                                                <div className="appointment-teacher-name">{teacher.name}</div>
                                                                <div className="appointment-teacher-title">{resolveTeacherTitle(teacher)}</div>
                                                                {teacher.secondaryUnit ? (
                                                                    <div className="appointment-teacher-unit">{teacher.secondaryUnit}</div>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        <div className="appointment-teacher-tags">
                                                            {tags.map((tag) => (
                                                                <span className="appointment-teacher-tag" key={`${teacher.username}-${tag}`}>{tag}</span>
                                                            ))}
                                                        </div>
                                                        <p className="appointment-teacher-desc">{resolveTeacherDescription(teacher)}</p>
                                                        <div className="appointment-teacher-footer">
                                                            <span className="appointment-teacher-school">{teacher.school || "未填写学校"}</span>
                                                            <span className="appointment-teacher-cta">{isSelected ? "已选择" : "选择预约"}</span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                            }
                        />
                    </div>
                </section>

                <Dialog
                    ref={appointmentFormDialogRef}
                    type="modal"
                    width={760}
                    title={`填写预约信息${selectedTeacherUsername ? " - " + ((teachersStates?.returnObject?.data ?? []).find((teacher) => teacher.username === selectedTeacherUsername)?.name ?? "") : ""}`}
                    showCloseButton
                    closeOnBackdropClick
                    closeOnEscape
                >
                    <form onSubmit={handleAppointmentSummit} className="appointment-modal-body">
                        <div className="appointment-modal-note">
                            已选择咨询师：{(teachersStates?.returnObject?.data ?? []).find((teacher) => teacher.username === selectedTeacherUsername)?.name ?? "未选择"}
                        </div>
                        <div className="layout-flex-row appointment-field-row">
                            <div className="appointment-filter-control">
                                <Select
                                    ref={appointmentTypeSelectRef}
                                    label="预约类型"
                                    options={APPOINTMENT_TYPE_OPTIONS}
                                    value={appointmentFormData.appointmentType}
                                    onChange={(value) => {
                                        setAppointmentFormData((prev) => ({...prev, appointmentType: value as AppointmentType}));
                                    }}
                                    required
                                    clearable={false}
                                />
                            </div>
                        </div>
                        <Textarea
                            ref={descriptionInputRef}
                            label="问题简述"
                            placeholder="请简要描述你的问题或困扰"
                            onChange={TextareaCallback.handleDataChange<AppointmentRequest>("description", setAppointmentFormData, null)}
                            required
                        />
                        <div className="appointment-field-row">
                            <label style={{display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "#334155"}}>
                                <input
                                    type="checkbox"
                                    checked={Boolean(appointmentFormData.anonymous)}
                                    onChange={(event) => setAppointmentFormData((prev) => ({...prev, anonymous: event.target.checked}))}
                                />
                                是否匿名（教师侧显示为匿名学生）
                            </label>
                        </div>

                        <AppointmentDateTimeRangeFields
                            startDate={startDateTime.date}
                            startTime={startDateTime.time}
                            endDate={endDateTime.date}
                            endTime={endDateTime.time}
                            onChange={(field, value) => {
                                setScheduleError("");
                                if (field === "startDate") {
                                    setStartDateTime((prev) => ({...prev, date: value}));
                                    return;
                                }
                                if (field === "startTime") {
                                    setStartDateTime((prev) => ({...prev, time: value}));
                                    return;
                                }
                                if (field === "endDate") {
                                    setEndDateTime((prev) => ({...prev, date: value}));
                                    return;
                                }
                                setEndDateTime((prev) => ({...prev, time: value}));
                            }}
                        />
                        {scheduleError ? (
                            <div className="appointment-reschedule-error">{scheduleError}</div>
                        ) : null}

                        <div className="appointment-modal-footer">
                            <Button type="default" onClick={() => appointmentFormDialogRef.current?.close()}>取消</Button>
                            <Button type="primary" summit>申请预约</Button>
                        </div>
                    </form>
                </Dialog>
            </div>

            <section className="appointment-records-card">
                <div className="appointment-section-title">
                    <h3>我的预约</h3>
                    <p>查看已提交的预约记录与处理状态。</p>
                </div>
                <ResponseHandler<FindAppointmentRequest, AppointmentDTO[]>
                    ref={findAppointmentsHandlerRef}
                    request={appointmentController.findById}
                    setResponseState={setFindAppointmentsState}
                    idleComponent={<div className="appointment-records-empty">暂无预约记录</div>}
                    loadingComponent={<div className="appointment-records-loading"><Loading type="spinner" text="加载预约记录..." size="small"/></div>}
                    handlingReturnObjectComponent={<div className="appointment-records-loading"><Loading type="spinner" text="处理数据中..." size="small"/></div>}
                    networkErrorComponent={<div className="appointment-records-empty">网络错误：{findAppointmentsState?.networkError?.message}</div>}
                    finishedComponent={(!(findAppointmentsState?.returnObject?.status === ReturnObject.Status.SUCCESS)) ? (
                        <div className="appointment-records-empty">
                            获取预约记录{ReturnObject.Status.ChineseName.get(findAppointmentsState?.returnObject?.status)}：{findAppointmentsState?.returnObject?.message}
                        </div>
                    ) : (
                        sortedAppointments.length === 0 ? (
                            <div className="appointment-records-empty">暂无预约记录</div>
                        ) : (
                            <div className="appointment-records-list">
                                {sortedAppointments.map((appointment) => (
                                    <div
                                        id={`student-appointment-${appointment.appointmentId}`}
                                        className={`appointment-record-item${focusAppointmentId > 0 && appointment.appointmentId === focusAppointmentId ? " is-focused" : ""}`}
                                        key={appointment.appointmentId}
                                    >
                                        <div className="appointment-record-header">
                                            <div>
                                                <div className="appointment-record-title">
                                                    {appointment.teacherName || appointment.teacherUsername || "咨询师"}
                                                </div>
                                                <div className="appointment-record-sub">预约编号：{appointment.appointmentId}</div>
                                            </div>
                                            <span className={`appointment-record-status ${resolveStatusClassName(appointment)}`}>
                                                {resolveStatusName(appointment)}
                                            </span>
                                        </div>
                                        <div className="appointment-record-meta">
                                            <div>
                                                <span>预约时间</span>
                                                <strong>{formatDateTime(appointment.startTime)} - {formatDateTime(appointment.endTime)}</strong>
                                            </div>
                                            <div>
                                                <span>申请时间</span>
                                                <strong>{formatDateTime(appointment.applyTime)}</strong>
                                            </div>
                                            <div>
                                                <span>预约类型</span>
                                                <strong>{resolveAppointmentTypeName(appointment.appointmentType)}</strong>
                                            </div>
                                        </div>
                                        <div className="appointment-record-desc">{appointment.description || "暂无描述"}</div>
                                        {(appointment.status === AppointmentStatus.REJECTED || appointment.status === AppointmentStatus.FORCE_CANCELLED) && appointment.rejectReason ? (
                                            <div className="appointment-record-desc" style={{marginTop: 8, color: "#b91c1c"}}>
                                                原因：{appointment.rejectReason}
                                            </div>
                                        ) : null}
                                        {isReschedulePending(appointment) ? (
                                            <div className="appointment-record-actions">
                                                <Button
                                                    type="primary"
                                                    onClick={() => handleConfirmReschedule(appointment, true)}
                                                    disabled={rescheduleActionLoadingId === appointment.appointmentId}
                                                >
                                                    {rescheduleActionLoadingId === appointment.appointmentId ? "处理中..." : "确认改期"}
                                                </Button>
                                                <Button
                                                    type="default"
                                                    onClick={() => handleConfirmReschedule(appointment, false)}
                                                    disabled={rescheduleActionLoadingId === appointment.appointmentId}
                                                >
                                                    {rescheduleActionLoadingId === appointment.appointmentId ? "处理中..." : "拒绝改期"}
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                />
            </section>

            <section className="appointment-notes-card">
                <h3>预约须知</h3>
                <div className="appointment-note-list">
                    <div className="appointment-note-item">
                        <i className="fa-solid fa-circle-info"/>
                        <p>心理咨询预约需提前1天进行，每次咨询时长为50分钟，如需取消预约请提前24小时联系心理中心。</p>
                    </div>
                    <div className="appointment-note-item">
                        <i className="fa-solid fa-circle-info"/>
                        <p>首次咨询请提前10分钟到达心理中心，携带学生证/教职工证进行身份验证。</p>
                    </div>
                    <div className="appointment-note-item">
                        <i className="fa-solid fa-circle-info"/>
                        <p>咨询过程严格遵守保密原则，你的个人信息和咨询内容将受到严格保护。</p>
                    </div>
                    <div className="appointment-note-item">
                        <i className="fa-solid fa-circle-info"/>
                        <p>如遇紧急心理危机，请直接前往心理中心或拨打24小时心理援助热线：400-123-4567。</p>
                    </div>
                </div>
            </section>

            <section className="appointment-faq">
                <h3>常见问题</h3>
                <div className="appointment-faq-grid">
                    <div className="appointment-faq-item">
                        <h4>心理咨询需要收费吗？</h4>
                        <p>本校在校学生和教职工均可免费享受心理咨询服务，无需支付任何费用。校外人员如需咨询，请联系心理中心了解相关收费标准。</p>
                    </div>
                    <div className="appointment-faq-item">
                        <h4>一次咨询能解决我的问题吗？</h4>
                        <p>心理咨询是一个循序渐进的过程，大多数心理问题无法通过一次咨询完全解决。咨询师会根据你的具体情况制定个性化的咨询方案，通常需要多次咨询才能达到较好的效果。</p>
                    </div>
                    <div className="appointment-faq-item">
                        <h4>咨询内容会被泄露吗？</h4>
                        <p>我们严格遵守心理咨询师职业道德规范，所有咨询内容均严格保密。除非涉及到自杀、自伤或伤害他人的风险，否则你的咨询记录和内容不会向任何人泄露。</p>
                    </div>
                    <div className="appointment-faq-item">
                        <h4>可以指定咨询师吗？</h4>
                        <p>可以的。你可以根据咨询师的专业方向和擅长领域选择适合你的咨询师进行预约。如果该咨询师近期无空余时段，我们会为你推荐其他擅长相关领域的咨询师。</p>
                    </div>
                </div>
            </section>
        </div>
    );
}
