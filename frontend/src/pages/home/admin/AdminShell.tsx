import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {User} from "../../../entity/User";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {SchoolController} from "../../../controller/SchoolController";
import {UserRole} from "../../../entity/enums/UserRole";
import {UserController} from "../../../controller/UserController";
import {User as UserMeta} from "../../../entity/User";
import defaultAvatar from "../../../assets/avatar/default-avatar.png";
import {getUserAvatar} from "../../../utils/avatar";
import {useNotificationCenter} from "../../../context/NotificationCenterContext";
import "../teacher/TeacherDashboard.css";

interface AdminShellProps {
    user: User | null;
    children: React.ReactNode;
}

const resolveDisplayName = (user: User | null) => {
    const name = user?.name?.trim();
    if (name) {
        return name;
    }
    const nickname = user?.nickname?.trim();
    if (nickname) {
        return nickname;
    }
    const username = user?.username?.trim();
    if (username) {
        return username;
    }
    return "管理员";
};

export const AdminShell: React.FC<AdminShellProps> = ({user, children}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const userController = useMemo(() => new UserController(), []);
    const schoolController = useMemo(() => new SchoolController(), []);
    const {unreadCount} = useNotificationCenter();

    const [scopeProvince, setScopeProvince] = useState("");
    const [scopeSchool, setScopeSchool] = useState("");
    const [scopeSchoolOptions, setScopeSchoolOptions] = useState<string[]>([]);
    const [scopeLoading, setScopeLoading] = useState(false);
    const [scopeSaving, setScopeSaving] = useState(false);

    const displayName = resolveDisplayName(user);
    const isPlatformAdmin = UserRole.isPlatformAdminRole(user?.role);
    const adminSubtitle = isPlatformAdmin ? "平台管理后台" : "学校心理中心管理后台";
    const avatarSrc = user?.avatar?.trim()
        ? user.avatar
        : getUserAvatar(user?.username ?? displayName, defaultAvatar);

    const menuItems = useMemo(() => ([
        {id: "dashboard", label: "管理工作台", icon: "fa-solid fa-gauge-high", path: "/home/main"},
        ...(isPlatformAdmin
            ? [
                {id: "reports", label: "举报审核", icon: "fa-solid fa-flag", path: "/home/admin/reports"},
                {id: "knowledge", label: "科普审核管理", icon: "fa-solid fa-book-open", path: "/home/admin/knowledge"},
            ]
            : []),
        {id: "appointments", label: "预约监管", icon: "fa-solid fa-calendar-check", path: "/home/appointment"},
        {id: "users", label: "账号与角色", icon: "fa-solid fa-users", path: "/home/admin/users"},
        {id: "notifications", label: "通知中心", icon: "fa-solid fa-bell", path: "/home/notifications"},
    ]), [isPlatformAdmin]);

    useEffect(() => {
        if (!sidebarOpen) {
            document.body.style.overflow = "";
            return;
        }
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, [sidebarOpen]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const requestSchools = useCallback(async (provinceCode: string): Promise<string[]> => {
        const numericProvince = Number(provinceCode);
        if (!provinceCode || Number.isNaN(numericProvince) || numericProvince <= 0) {
            setScopeSchoolOptions([]);
            return [];
        }
        setScopeLoading(true);
        try {
            const result = await schoolController.listByProvince({provinceCode: numericProvince});
            if (result.status === ReturnObject.Status.SUCCESS) {
                const schools = (result.data ?? []) as string[];
                setScopeSchoolOptions(schools);
                return schools;
            }
            setScopeSchoolOptions([]);
            return [];
        } catch (_error) {
            setScopeSchoolOptions([]);
            return [];
        } finally {
            setScopeLoading(false);
        }
    }, [schoolController]);

    useEffect(() => {
        if (!isPlatformAdmin) {
            return;
        }
        let active = true;
        (async () => {
            try {
                const result = await userController.getAdminScope(null);
                if (!active || result.status !== ReturnObject.Status.SUCCESS) {
                    return;
                }
                const data = result.data as {enabled?: boolean; schoolProvince?: number | null; school?: string | null};
                if (!data?.enabled) {
                    setScopeProvince("");
                    setScopeSchool("");
                    setScopeSchoolOptions([]);
                    return;
                }
                const provinceValue = data.schoolProvince == null ? "" : String(data.schoolProvince);
                const schoolValue = (data.school ?? "").trim();
                setScopeProvince(provinceValue);
                setScopeSchool(schoolValue);
                const schools = await requestSchools(provinceValue);
                if (active && schoolValue && !schools.includes(schoolValue)) {
                    setScopeSchoolOptions((prev) => Array.from(new Set([...prev, schoolValue])));
                }
            } catch (_error) {
                if (active) {
                    setScopeProvince("");
                    setScopeSchool("");
                    setScopeSchoolOptions([]);
                }
            }
        })();
        return () => {
            active = false;
        };
    }, [isPlatformAdmin, requestSchools, userController]);

    const handleApplyScope = async () => {
        if (!scopeProvince || !scopeSchool) {
            alert("请先选择省份和学校");
            return;
        }
        setScopeSaving(true);
        try {
            const result = await userController.setAdminScope({
                schoolProvince: Number(scopeProvince),
                school: scopeSchool
            });
            if (result.status !== ReturnObject.Status.SUCCESS) {
                alert(result.message || "切换学校视角失败");
                return;
            }
            window.location.reload();
        } catch (error) {
            alert(error instanceof Error ? error.message : "切换学校视角失败");
        } finally {
            setScopeSaving(false);
        }
    };

    const handleClearScope = async () => {
        setScopeSaving(true);
        try {
            const result = await userController.setAdminScope({schoolProvince: null, school: null});
            if (result.status !== ReturnObject.Status.SUCCESS) {
                alert(result.message || "清除学校视角失败");
                return;
            }
            window.location.reload();
        } catch (error) {
            alert(error instanceof Error ? error.message : "清除学校视角失败");
        } finally {
            setScopeSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await userController.logout(null);
        } catch (error) {
            console.warn("logout request failed", error);
        } finally {
            navigate("/auth/login");
        }
    };

    return (
        <div className="teacher-dashboard">
            <header className="teacher-dashboard__header">
                <div className="teacher-dashboard__header-inner">
                    <button
                        type="button"
                        className="teacher-dashboard__menu-button"
                        onClick={() => setSidebarOpen((prev) => !prev)}
                        aria-label="切换菜单"
                    >
                        <i className="fa-solid fa-bars"/>
                    </button>

                    <div className="teacher-dashboard__brand">
                        <i className="fa-solid fa-user-shield"/>
                        <div>
                            <div className="teacher-dashboard__brand-title">心晴校园</div>
                            <div className="teacher-dashboard__brand-subtitle">{adminSubtitle}</div>
                        </div>
                    </div>

                    <div className="teacher-dashboard__header-actions">
                        {isPlatformAdmin && (
                            <div className="teacher-dashboard__scope-switch">
                                <select
                                    value={scopeProvince}
                                    disabled={scopeSaving}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setScopeProvince(value);
                                        setScopeSchool("");
                                        setScopeSchoolOptions([]);
                                        void requestSchools(value);
                                    }}
                                >
                                    <option value="">省份</option>
                                    {UserMeta.Options.schoolProvince.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <select
                                    value={scopeSchool}
                                    disabled={scopeSaving || !scopeProvince || scopeLoading}
                                    onChange={(event) => setScopeSchool(event.target.value)}
                                >
                                    <option value="">{scopeLoading ? "加载学校中..." : "学校"}</option>
                                    {scopeSchoolOptions.map((school) => (
                                        <option key={school} value={school}>{school}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="teacher-dashboard__scope-btn"
                                    disabled={scopeSaving || !scopeProvince || !scopeSchool}
                                    onClick={handleApplyScope}
                                >
                                    切换视角
                                </button>
                                <button
                                    type="button"
                                    className="teacher-dashboard__scope-btn teacher-dashboard__scope-btn--ghost"
                                    disabled={scopeSaving}
                                    onClick={handleClearScope}
                                >
                                    跨校视角
                                </button>
                            </div>
                        )}
                        <button
                            type="button"
                            className="teacher-dashboard__icon-button"
                            aria-label="通知"
                            onClick={() => navigate("/home/notifications")}
                        >
                            <i className="fa-solid fa-bell"/>
                            {unreadCount > 0 && (
                                <span className="teacher-dashboard__icon-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                            )}
                        </button>
                        <button
                            type="button"
                            className="teacher-dashboard__user"
                            onClick={() => navigate("/home/mine/basic_information")}
                        >
                            <img src={avatarSrc} alt="用户头像"/>
                            <span>{displayName}</span>
                        </button>
                        <button
                            type="button"
                            className="teacher-dashboard__icon-button"
                            aria-label="退出登录"
                            onClick={handleLogout}
                        >
                            <i className="fa-solid fa-right-from-bracket"/>
                        </button>
                    </div>
                </div>
            </header>

            <div className="teacher-dashboard__body">
                <aside className={`teacher-dashboard__sidebar ${sidebarOpen ? "is-open" : ""}`}>
                    <nav className="teacher-dashboard__menu">
                        {menuItems.map((item) => {
                            const isActive = location.pathname.startsWith(item.path);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    className={`teacher-dashboard__menu-item${isActive ? " is-active" : ""}`}
                                    onClick={() => navigate(item.path)}
                                >
                                    <i className={item.icon}/>
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                    <div className="teacher-dashboard__sidebar-footer">
                        <div>{isPlatformAdmin ? "平台管理员统一治理入口" : "学校管理员统一治理入口"}</div>
                        <div>{isPlatformAdmin ? "预约监管 / 举报审核 / 科普审核 / 账号与角色 / 通知" : "预约监管 / 账号与角色 / 通知"}</div>
                    </div>
                </aside>

                <div
                    className={`teacher-dashboard__overlay ${sidebarOpen ? "is-open" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSidebarOpen(false)}
                    onKeyDown={() => setSidebarOpen(false)}
                />

                <main className="teacher-dashboard__content">
                    {children}
                </main>
            </div>
        </div>
    );
};
