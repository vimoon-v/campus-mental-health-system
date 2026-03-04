import {UserRole} from "../entity/enums/UserRole";

export interface NavItem {
    label: string;
    path: string;
}

const parseRoleCode = (role: unknown): number | undefined => {
    return UserRole.normalize(role);
};

const buildCommonNavItems = (homePath: string): NavItem[] => [
    {label: "首页", path: homePath},
    {label: "匿名倾诉", path: "/home/community/browse"},
    {label: "预约咨询", path: "/home/appointment"},
    {label: "在线咨询", path: "/home/consultation"},
    {label: "心理科普", path: "/psych_knowledge/browse"},
    {label: "心理测试", path: "/psych_test_entrance"},
];

export const getNavItemsByRole = (role?: unknown): NavItem[] => {
    const roleCode = parseRoleCode(role);

    if (roleCode === UserRole.TEACHER) {
        return [
            {label: "工作台", path: "/home/main"},
            ...buildCommonNavItems("/home/main").filter((item) => item.label !== "首页"),
        ];
    }

    if (UserRole.isAdminRole(roleCode)) {
        const isPlatformAdmin = UserRole.isPlatformAdminRole(roleCode);
        return [
            {label: "管理工作台", path: "/home/main"},
            {label: "预约监管", path: "/home/appointment"},
            ...(isPlatformAdmin
                ? [
                    {label: "举报审核", path: "/home/admin/reports"},
                    {label: "科普审核", path: "/home/admin/knowledge"},
                ]
                : []),
            {label: "账号管理", path: "/home/admin/users"},
            {label: "通知中心", path: "/home/notifications"},
        ];
    }

    if (roleCode === UserRole.STUDENT) {
        return buildCommonNavItems("/home/main");
    }

    return buildCommonNavItems("/auth/login");
};
