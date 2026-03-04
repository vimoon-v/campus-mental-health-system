import {AppointmentStatus} from "./enums/AppointmentStatus";
import {AppointmentType} from "./enums/AppointmentType";

export interface AppointmentDTO {
    appointmentId:number;
    studentUsername:string;
    studentName:string;
    teacherUsername:string;
    teacherName:string;
    description:string;
    anonymous?: boolean;
    appointmentType?:AppointmentType;
    startTime:Date;
    endTime:Date;
    applyTime:Date;
    acceptTime?: Date | null;
    status:AppointmentStatus;
    rejectReason?: string | null;
    reschedulePending?: boolean;
    overdueFlagged?: boolean;
}
