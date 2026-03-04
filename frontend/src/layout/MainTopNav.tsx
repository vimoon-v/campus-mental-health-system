import React, {useEffect, useMemo, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import "../pages/Preview.css";
import defaultAvatar from "../assets/avatar/default-avatar.png";
import {getUserAvatar} from "../utils/avatar";
import {getNavItemsByRole} from "./roleNavConfig";
import {UserController} from "../controller/UserController";
import {useNotificationCenter} from "../context/NotificationCenterContext";

export interface MainTopNavProps {
    username?: string | null;
    accountUsername?: string | null;
    avatar?: string | null;
    role?: unknown;
}

export const MainTopNav: React.FC<MainTopNavProps> = ({
    username,
    accountUsername,
    avatar,
    role,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const userController = useMemo(() => new UserController(), []);
    const {unreadCount} = useNotificationCenter();

    const avatarSrc = avatar?.trim()
        ? avatar
        : getUserAvatar(
            accountUsername ?? username ?? undefined,
            defaultAvatar
        );

    const navItems = getNavItemsByRole(role ?? undefined);

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener("scroll", onScroll, {passive: true});
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const handleNavClick = (path: string) => {
        navigate(path);
        setMobileMenuOpen(false);
    };

    const handleLogout = async () => {
        try {
            await userController.logout(null);
        } catch (error) {
            console.warn("logout request failed", error);
        } finally {
            navigate("/auth/login");
            setMobileMenuOpen(false);
        }
    };

    const handleNotificationClick = () => {
        navigate("/home/notifications");
        setMobileMenuOpen(false);
    };

    const isNavActive = (path: string) => {
        if (path === "/home/main") {
            return (
                location.pathname === "/home" ||
                location.pathname === "/home/" ||
                location.pathname.startsWith("/home/main")
            );
        }
        if (path === "/home/community/browse") {
            return location.pathname.startsWith("/home/community");
        }
        if (path === "/home/appointment") {
            return location.pathname.startsWith("/home/appointment");
        }
        if (path === "/home/consultation") {
            return location.pathname.startsWith("/home/consultation");
        }
        if (path === "/psych_knowledge/browse") {
            return location.pathname.startsWith("/psych_knowledge");
        }
        if (path === "/psych_test_entrance") {
            return location.pathname.startsWith("/psych_test");
        }
        return location.pathname === path;
    };

    return (
        <header className={`landing-header ${isScrolled ? "is-scrolled" : ""}`}>
            <div className="container landing-header-inner">
                <div className="landing-brand">
                    <span className="landing-brand-icon">
                        <i className="fa-solid fa-heart-pulse"/>
                    </span>
                    <div>
                        <h1>心晴校园</h1>
                        <span>高校心理咨询平台</span>
                    </div>
                </div>

                <nav className="landing-nav">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            type="button"
                            className={isNavActive(item.path) ? "is-active" : undefined}
                            onClick={() => handleNavClick(item.path)}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="landing-actions">
                    {username ? (
                        <>
                            <button
                                type="button"
                                className="landing-icon-button"
                                aria-label="通知"
                                onClick={handleNotificationClick}
                            >
                                <i className="fa-solid fa-bell"/>
                                {unreadCount > 0 && (
                                    <span className="landing-icon-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                                )}
                            </button>
                            <button
                                type="button"
                                className="landing-user"
                                onClick={() => navigate("/home/mine/basic_information")}
                            >
                                <img src={avatarSrc} alt="用户头像"/>
                                <span>{username}</span>
                            </button>
                            <button
                                type="button"
                                className="landing-icon-button"
                                aria-label="退出登录"
                                onClick={handleLogout}
                            >
                                <i className="fa-solid fa-right-from-bracket"/>
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="btn-outline" onClick={() => navigate("/auth/login")}>
                                登录
                            </button>
                            <button type="button" className="btn-primary" onClick={() => navigate("/auth/signup")}>
                                注册
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        className="landing-mobile-toggle"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        aria-label="切换菜单"
                    >
                        <i className="fa-solid fa-bars"/>
                    </button>
                </div>
            </div>

            <div className={`landing-mobile-menu ${mobileMenuOpen ? "is-open" : ""}`}>
                <div className="container">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            type="button"
                            className={isNavActive(item.path) ? "is-active" : undefined}
                            onClick={() => handleNavClick(item.path)}
                        >
                            {item.label}
                        </button>
                    ))}
                    <div className="landing-mobile-actions">
                        {username ? (
                            <>
                                <button
                                    type="button"
                                    className="landing-user landing-user--mobile"
                                    onClick={() => navigate("/home/mine/basic_information")}
                                >
                                    <img src={avatarSrc} alt="用户头像"/>
                                    <span>{username}</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={handleNotificationClick}
                                >
                                    <i className="fa-solid fa-bell"/>
                                    通知{unreadCount > 0 ? `(${unreadCount > 99 ? "99+" : unreadCount})` : ""}
                                </button>
                                <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={handleLogout}
                                >
                                    <i className="fa-solid fa-right-from-bracket"/>
                                    退出登录
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" className="btn-outline" onClick={() => navigate("/auth/login")}>
                                    登录
                                </button>
                                <button type="button" className="btn-primary" onClick={() => navigate("/auth/signup")}>
                                    注册
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
