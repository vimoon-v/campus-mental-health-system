/**
 * 用户角色编码：
 * 当前角色划分：0未知，1学生(STUDENT)，2咨询师(COUNSELOR)，3学校管理员(SCHOOL_ADMIN)，4平台管理员(PLATFORM_ADMIN)，9其他
 */
export enum UserRole {
    UNKNOWN=0,
    STUDENT,
    TEACHER,
    ADMIN,
    SYSTEM_ADMIN,
    OTHER=9
}


export namespace UserRole {
    /**
     * 根据用户角色枚举(用户角色编码获取用户角色名称)
     */
    export const ChineseName:Map<number|undefined|string,string>=new Map<number|undefined|string,string>([
        [UserRole.UNKNOWN,"未知"],
        [UserRole.STUDENT,"学生"],
        [UserRole.TEACHER,"咨询师"],
        [UserRole.ADMIN,"学校管理员"],
        [UserRole.SYSTEM_ADMIN,"平台管理员"],
        [UserRole.OTHER,"其他"],
        ["UNKNOWN","未知"],
        ["STUDENT","学生"],
        ["TEACHER","咨询师"],
        ["COUNSELOR","咨询师"],
        ["ADMIN","学校管理员"],
        ["SCHOOL_ADMIN","学校管理员"],
        ["MANAGER","学校管理员"],
        ["SYSTEM_ADMIN","平台管理员"],
        ["PLATFORM_ADMIN","平台管理员"],
        ["SYS_ADMIN","平台管理员"],
        ["OTHER","其他"],
        [undefined,"未定义"]
    ]);

    /**
     * 根据用户角色枚举(用户角色编码获取用户角色称呼)
     */
    export const ChineseNameAppellation:Map<number|undefined,string>=new Map<number|undefined,string>([
        [UserRole.UNKNOWN,"用户"],
        [UserRole.STUDENT,"同学"],
        [UserRole.TEACHER,"老师"],
        [UserRole.ADMIN,"学校管理员"],
        [UserRole.SYSTEM_ADMIN,"平台管理员"],
        [UserRole.OTHER,"其他"],
        [undefined,"未定义"]
    ]);

    export const normalize = (role: unknown): number | undefined => {
        if (role == null) {
            return undefined;
        }
        if (typeof role === "number") {
            return Number.isNaN(role) ? undefined : role;
        }
        if (typeof role === "string") {
            const trimmed = role.trim();
            if (!trimmed) {
                return undefined;
            }
            const numeric = Number(trimmed);
            if (!Number.isNaN(numeric)) {
                return numeric;
            }
            const upper = trimmed.toUpperCase();
            if (upper === "STUDENT" || trimmed === "学生") {
                return UserRole.STUDENT;
            }
            if (upper === "TEACHER" || upper === "COUNSELOR" || trimmed === "教师" || trimmed === "心理咨询师" || trimmed === "咨询师") {
                return UserRole.TEACHER;
            }
            if (upper === "ADMIN" || upper === "MANAGER" || upper === "SCHOOL_ADMIN" || trimmed === "管理员" || trimmed === "心理中心管理员" || trimmed === "学校管理员") {
                return UserRole.ADMIN;
            }
            if (upper === "SYSTEM_ADMIN" || upper === "SYS_ADMIN" || upper === "PLATFORM_ADMIN" || trimmed === "系统管理员" || trimmed === "平台管理员") {
                return UserRole.SYSTEM_ADMIN;
            }
            if (upper === "OTHER" || trimmed === "其他") {
                return UserRole.OTHER;
            }
            return UserRole.UNKNOWN;
        }
        if (typeof role === "object") {
            const candidate = role as {code?: unknown; value?: unknown; name?: unknown};
            return normalize(candidate.code ?? candidate.value ?? candidate.name);
        }
        return undefined;
    };

    export const isAdminRole = (role: unknown): boolean => {
        const roleCode = normalize(role);
        return roleCode === UserRole.ADMIN || roleCode === UserRole.SYSTEM_ADMIN;
    };

    export const isSchoolAdminRole = (role: unknown): boolean => {
        return normalize(role) === UserRole.ADMIN;
    };

    export const isPlatformAdminRole = (role: unknown): boolean => {
        return normalize(role) === UserRole.SYSTEM_ADMIN;
    };

    export const isCounselorRole = (role: unknown): boolean => {
        return normalize(role) === UserRole.TEACHER;
    };


}


