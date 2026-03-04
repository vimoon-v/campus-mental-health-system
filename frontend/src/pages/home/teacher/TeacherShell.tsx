import React, {useEffect, useMemo, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {User} from "../../../entity/User";
import {UserController} from "../../../controller/UserController";
import defaultAvatar from "../../../assets/avatar/default-avatar.png";
import {getUserAvatar} from "../../../utils/avatar";
import {useNotificationCenter} from "../../../context/NotificationCenterContext";
import "./TeacherDashboard.css";

interface TeacherShellProps {
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
    return "咨询师";
};

export const TeacherShell: React.FC<TeacherShellProps> = ({user, children}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const userController = useMemo(() => new UserController(), []);
    const {unreadCount} = useNotificationCenter();

    const displayName = resolveDisplayName(user);
    const avatarSrc = user?.avatar?.trim()
        ? user.avatar
        : getUserAvatar(user?.username ?? displayName, defaultAvatar);

    const menuItems = [
        {id: "dashboard", label: "仪表盘", icon: "fa-solid fa-gauge-high", path: "/home/main"},
        {id: "appointments", label: "预约管理", icon: "fa-solid fa-calendar-check", path: "/home/appointment"},
        {id: "consultation", label: "在线咨询", icon: "fa-solid fa-comments", path: "/home/consultation"},
        {id: "articles", label: "科普文章管理", icon: "fa-solid fa-book-open", path: "/psych_knowledge/mine/teacher"},
        {id: "replies", label: "学生问题回复", icon: "fa-solid fa-reply", path: "/home/community/browse"},
        {id: "tests", label: "心理测试管理", icon: "fa-solid fa-clipboard-check", path: "/psych_test_entrance"},
        {id: "settings", label: "个人设置", icon: "fa-solid fa-gear", path: "/home/mine/basic_information"},
    ];

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
                        <i className="fa-solid fa-heart-circle-check"/>
                        <div>
                            <div className="teacher-dashboard__brand-title">心晴校园</div>
                            <div className="teacher-dashboard__brand-subtitle">咨询师工作台</div>
                        </div>
                    </div>

                    <div className="teacher-dashboard__header-actions">
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
                        <div>服务热线: 010-12345678</div>
                        <div>工作时间: 9:00-18:00</div>
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
