export enum AppointmentType {
    ONLINE = "ONLINE",
    OFFLINE = "OFFLINE",
}

export namespace AppointmentType {
    export const ChineseName: Map<string, string> = new Map<string, string>([
        [AppointmentType.ONLINE, "线上咨询"],
        [AppointmentType.OFFLINE, "线下咨询"],
    ]);
}
