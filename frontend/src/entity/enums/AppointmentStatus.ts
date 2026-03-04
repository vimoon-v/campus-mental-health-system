// 预约状态枚举
export enum AppointmentStatus {
    WAITING="WAITING",
    ACCEPTED="ACCEPTED",
    REJECTED="REJECTED",
    IN_PROGRESS="IN_PROGRESS",
    FORCE_CANCELLED="FORCE_CANCELLED",
}


export namespace AppointmentStatus {
    /**
     * 根据预约状态枚举(预约状态获取预约状态名称)
     */
    export const ChineseName:Map<string,string>=new Map<string,string>([
        [AppointmentStatus.WAITING,"待处理"],
        [AppointmentStatus.ACCEPTED,"已通过"],
        [AppointmentStatus.REJECTED,"已拒绝"],
        [AppointmentStatus.IN_PROGRESS,"咨询中"],
        [AppointmentStatus.FORCE_CANCELLED,"已强制取消"],
    ]);
}
