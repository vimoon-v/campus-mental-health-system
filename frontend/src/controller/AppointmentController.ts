import {ReturnObject} from "../common/response/ReturnObject";
import api from "../utils/api/api_config";
import {AppointmentDTO} from "../entity/AppointmentDTO";
import {AppointmentStatus} from "../entity/enums/AppointmentStatus";
import {AppointmentType} from "../entity/enums/AppointmentType";
import {Controller} from "./Controller";


export interface AppointmentRequest {
    studentUsername:string;
    teacherUsername:string;
    description:string;
    anonymous:boolean;
    appointmentType:AppointmentType;
    startTime:string;
    endTime:string;
}

export interface FindAppointmentRequest {
    by:'studentUsername'|'teacherUsername';
    username:string;
}

export interface AppointmentHandingRequest {
    appointmentId:number;
    status:AppointmentStatus;
    rejectReason?: string;
}

export interface AppointmentRescheduleRequest {
    appointmentId:number;
    startTime:string;
    endTime:string;
}

export interface StudentConfirmRescheduleRequest {
    appointmentId:number;
    confirmed:boolean;
    feedback?: string;
}

export interface AdminReassignRequest {
    appointmentId:number;
    newTeacherUsername:string;
    reason?: string;
}

export interface AdminForceCancelRequest {
    appointmentId:number;
    reason:string;
}

export interface AdminBatchReassignOverdueRequest {
    newTeacherUsername:string;
    reason?: string;
    limit?: number;
}

export class AppointmentController extends Controller{

    //添加预约
    addAppointment=this._post<AppointmentRequest,any>("api/appointment/add");

    //查询预约
    findById=this._get<FindAppointmentRequest,AppointmentDTO[]>("api/appointment/find_by");

    //获取教师未处理的预约
    findTeacherPending=this._get<{teacherUsername:string},AppointmentDTO[]>("api/appointment/teacher/pending")

    //获取教师未处理的预约
    findTeacherNonPending=this._get<{teacherUsername:string},AppointmentDTO[]>("api/appointment/teacher/non-pending")

    //处理预约
    handle=this._post<AppointmentHandingRequest,any>("api/appointment/handle");

    //教师改期
    reschedule=this._post<AppointmentRescheduleRequest,any>("api/appointment/teacher/reschedule");

    //学生确认/拒绝改期
    confirmReschedule=this._post<StudentConfirmRescheduleRequest,any>("api/appointment/student/confirm_reschedule");

    //列出所有预约
    listAll=this._get<any,AppointmentDTO[]>("api/appointment/list_all");

    //管理员改派咨询师
    adminReassign=this._post<AdminReassignRequest,any>("api/appointment/admin/reassign");

    //管理员强制取消预约
    adminForceCancel=this._post<AdminForceCancelRequest,any>("api/appointment/admin/force_cancel");

    //管理员一键批量改派超时预约
    adminBatchReassignOverdue=this._post<AdminBatchReassignOverdueRequest,any>("api/appointment/admin/reassign_overdue");


}
