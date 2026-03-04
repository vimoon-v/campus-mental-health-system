//React框架
import React, {useEffect, useRef, useState} from "react";
//样式表
import '../Home.css'
import '../../../css/LayoutFlex.css'
import {Table} from "../../../common/view/display/Table";
import {useOutletContext} from "react-router";
import {Homepage} from "../HomepageForm";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {AppointmentController, FindAppointmentRequest} from "../../../controller/AppointmentController";
import {AppointmentDTO} from "../../../entity/AppointmentDTO";
import {ResponseState} from "../../../common/response/ResponseState";
import {UserRole} from "../../../entity/enums/UserRole";
import {Loading} from "../../../common/view/display/Loading";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {AppointmentStatus} from "../../../entity/enums/AppointmentStatus";
import {Divider} from "../../../common/view/decoration/Divider";

export const AppointmentManage: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const appointmentController = new AppointmentController();

    const findAppointmentsHandler = useRef<ResponseHandlerRef<FindAppointmentRequest, AppointmentDTO[]>>(null);
    const [findAppointmentsStates, setFindAppointmentsStates] = useState<ResponseState<AppointmentDTO[]>>();

    const findPendingAppointmentsHandler = useRef<ResponseHandlerRef<{ teacherUsername: string }, AppointmentDTO[]>>(null);
    const [findPendingAppointmentsStates, setFindPendingAppointmentsStates] = useState<ResponseState<AppointmentDTO[]>>();

    const findNonPendingAppointmentsHandler = useRef<ResponseHandlerRef<{ teacherUsername: string }, AppointmentDTO[]>>(null);
    const [findNonPendingAppointmentsStates, setFindNonPendingAppointmentsStates] = useState<ResponseState<AppointmentDTO[]>>();

    const [findAppointmentRequestData] = useState<FindAppointmentRequest>({
        by: "studentUsername", username: "11"
    });

    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-我的预约管理";

        if (Number(context.user?.role) === UserRole.STUDENT) {
            findAppointmentRequestData.by = "studentUsername";
            findAppointmentRequestData.username = (context.user?.username == null ? "null" : context.user.username);
            findAppointmentsHandler.current?.request(findAppointmentRequestData);
        } else if (Number(context.user?.role) === UserRole.TEACHER) {
            const teacherUsername = context.user?.username == null ? "null" : context.user.username;
            findPendingAppointmentsHandler.current?.request({teacherUsername});
            findNonPendingAppointmentsHandler.current?.request({teacherUsername});
        } else {
            findAppointmentRequestData.by = "teacherUsername";
            findAppointmentRequestData.username = (context.user?.username == null ? "null" : context.user.username);
            findAppointmentsHandler.current?.request(findAppointmentRequestData);
        }
    }, []);

    const tableColumns = [{
        key: 'appointmentId',
        title: '预约ID',
        width: 80,
        sortable: true,
    }, {
        key: 'studentName',
        title: '学生',
        width: 80,
        sortable: true,
    }, {
        key: 'teacherName',
        title: '咨询师',
        width: 80,
        sortable: true,
    }, {
        key: 'description',
        title: '描述',
        width: 80,
        sortable: true,
    }, {
        key: 'startTime',
        title: '开始时间',
        width: 80,
        sortable: true,
    }, {
        key: 'endTime',
        title: '结束时间',
        width: 80,
        sortable: true,
    }, {
        key: 'applyTime',
        title: '申请时间',
        width: 80,
        sortable: true,
    }, {
        key: 'status',
        title: '状态',
        width: 80,
        sortable: true,
        render: (value: string) => (
            <span>{AppointmentStatus.ChineseName.get(value)}</span>
        )
    }];

    const teacherManageView = (
        <div className="layout-flex-column" style={{marginLeft: "25px"}}>
            <h2>预约管理</h2>

            <div className="layout-flex-row">
                <p>待处理的预约申请</p>
            </div>
            <ResponseHandler<{ teacherUsername: string }, AppointmentDTO[]>
                ref={findPendingAppointmentsHandler}
                request={appointmentController.findTeacherPending}
                setResponseState={setFindPendingAppointmentsStates}
                idleComponent={<></>}
                loadingComponent={<Loading type="dots" text='获取预约信息中...' color="#2196f3" size="large" fullScreen/>}
                handlingReturnObjectComponent={<Loading type="dots" text='处理预约结果中...' color="#2196f3" size="large" fullScreen/>}
                networkErrorComponent={<div className="layout-flex-column"><h2>网络错误</h2><p>详情：{findPendingAppointmentsStates?.networkError?.message}</p></div>}
                finishedComponent={(!(findPendingAppointmentsStates?.returnObject?.status === ReturnObject.Status.SUCCESS)) ? (
                    <div className="layout-flex-column">
                        <h2>获取预约信息{ReturnObject.Status.ChineseName.get(findPendingAppointmentsStates?.returnObject?.status)}</h2>
                        <p>详情：{findPendingAppointmentsStates?.returnObject?.message}</p>
                    </div>
                ) : (
                    <Table dataSource={findPendingAppointmentsStates?.returnObject?.data == null ? [] : findPendingAppointmentsStates?.returnObject?.data} columns={tableColumns}/>
                )}
            />

            <Divider color="Black" spacing="50px"/>
            <div className="layout-flex-row">
                <p>已完成的预约</p>
            </div>
            <ResponseHandler<{ teacherUsername: string }, AppointmentDTO[]>
                ref={findNonPendingAppointmentsHandler}
                request={appointmentController.findTeacherNonPending}
                setResponseState={setFindNonPendingAppointmentsStates}
                idleComponent={<></>}
                loadingComponent={<Loading type="dots" text='获取预约信息中...' color="#2196f3" size="large" fullScreen/>}
                handlingReturnObjectComponent={<Loading type="dots" text='处理预约结果中...' color="#2196f3" size="large" fullScreen/>}
                networkErrorComponent={<div className="layout-flex-column"><h2>网络错误</h2><p>详情：{findNonPendingAppointmentsStates?.networkError?.message}</p></div>}
                finishedComponent={(!(findNonPendingAppointmentsStates?.returnObject?.status === ReturnObject.Status.SUCCESS)) ? (
                    <div className="layout-flex-column">
                        <h2>获取预约信息{ReturnObject.Status.ChineseName.get(findNonPendingAppointmentsStates?.returnObject?.status)}</h2>
                        <p>详情：{findNonPendingAppointmentsStates?.returnObject?.message}</p>
                    </div>
                ) : (
                    <Table dataSource={findNonPendingAppointmentsStates?.returnObject?.data == null ? [] : findNonPendingAppointmentsStates?.returnObject?.data} columns={tableColumns}/>
                )}
            />
        </div>
    );

    const defaultManageView = (
        <div className="layout-flex-column" style={{marginLeft: "25px"}}>
            <h2>预约管理</h2>
            <ResponseHandler<FindAppointmentRequest, AppointmentDTO[]>
                ref={findAppointmentsHandler}
                request={appointmentController.findById}
                setResponseState={setFindAppointmentsStates}
                idleComponent={<></>}
                loadingComponent={<Loading type="dots" text='获取预约信息中...' color="#2196f3" size="large" fullScreen/>}
                handlingReturnObjectComponent={<Loading type="dots" text='处理预约结果中...' color="#2196f3" size="large" fullScreen/>}
                networkErrorComponent={<div className="layout-flex-column"><h2>网络错误</h2><p>详情：{findAppointmentsStates?.networkError?.message}</p></div>}
                finishedComponent={(!(findAppointmentsStates?.returnObject?.status === ReturnObject.Status.SUCCESS)) ? (
                    <div className="layout-flex-column">
                        <h2>获取预约信息{ReturnObject.Status.ChineseName.get(findAppointmentsStates?.returnObject?.status)}</h2>
                        <p>详情：{findAppointmentsStates?.returnObject?.message}</p>
                    </div>
                ) : (
                    <Table dataSource={findAppointmentsStates?.returnObject?.data == null ? [] : findAppointmentsStates?.returnObject?.data} columns={tableColumns}/>
                )}
            />
        </div>
    );

    return Number(context.user?.role) === UserRole.TEACHER ? teacherManageView : defaultManageView;
}
