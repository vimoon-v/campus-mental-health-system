import {AppointmentStatus} from "./enums/AppointmentStatus";

export interface Appointment{
    appointmentId:number;
    studentUsername:string;
    teacherUsername:string;
    description:string;
    anonymous?: boolean;
    startTime:Date;
    endTime:Date;
    applyTime:Date;
    acceptTime?: Date | null;
    status:AppointmentStatus;
}
