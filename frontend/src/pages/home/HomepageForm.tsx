import React, {useEffect, useState} from "react";
import {Outlet} from "react-router";
import {useLocation, useNavigate} from "react-router-dom";
import './Home.css';
import '../../css/LayoutFlex.css';
import '../../css/Text.css';
import '../../css/Decoration.css';
import {MineForm, MineForm_Children} from "./MineForm";
import {AppointmentForm} from "./AppointmentForm";
import {MainForm} from "./MainForm";
import {CommunityForm, Community_Children} from "./CommunityForm";
import {Divider} from "../../common/view/decoration/Divider";
import {User} from "../../entity/User";
import {CheckLoginComponent} from "../../component/CheckLoginComponent";
import {FetchUserComponent} from "../../component/FetchUserComponent";
import {AppShell} from "../../layout/AppShell";
import {PageContainer} from "../../layout/PageContainer";
import {UserRole} from "../../entity/enums/UserRole";
import {TeacherShell} from "./teacher/TeacherShell";
import {AdminShell} from "./admin/AdminShell";
import {AdminReportAuditForm} from "./admin/AdminReportAuditForm";
import {AdminKnowledgeManageForm} from "./admin/AdminKnowledgeManageForm";
import {AdminUserListForm} from "./admin/AdminUserListForm";
import {NotificationsForm} from "./NotificationsForm";
import {NotificationCenterProvider} from "../../context/NotificationCenterContext";
import {ConsultationForm} from "./consultation/ConsultationForm";

export namespace Homepage {
    export const Children = [
        {path: "appointment", element: <AppointmentForm/>},
        {path: "main", element: <MainForm/>},
        {path: "community", element: <CommunityForm/>, children: Community_Children},
        {path: "consultation", element: <ConsultationForm/>},
        {path: "mine", element: <MineForm/>, children: MineForm_Children},
        {path: "notifications", element: <NotificationsForm/>},
        {path: "admin/reports", element: <AdminReportAuditForm/>},
        {path: "admin/knowledge", element: <AdminKnowledgeManageForm/>},
        {path: "admin/users", element: <AdminUserListForm/>},
    ];

    export interface OutletContext {
        isLoggedIn: boolean;
        user: User | null;
        setUser?: (user: User | null) => void;
    }
}

export const HomepageForm: React.FC = () => {
    const navigate = useNavigate();
    const urlLocation = useLocation();
    const [outletContext, setOutletContext] = useState<Homepage.OutletContext>({isLoggedIn: false, user: null});
    const setUser = (user: User | null) => {
        setOutletContext((prev) => ({...prev, user}));
    };
    const outletContextValue: Homepage.OutletContext = {...outletContext, setUser};
    const displayName = outletContext.user?.nickname?.trim()
        ? outletContext.user?.nickname
        : outletContext.user?.username ?? null;
    const roleCode = UserRole.normalize(outletContext.user?.role);
    const isTeacher = roleCode === UserRole.TEACHER;
    const isAdmin = UserRole.isAdminRole(roleCode);

    useEffect(() => {
        if (urlLocation.pathname === '/home' || urlLocation.pathname === '/home/') {
            if (!outletContext.user) {
                return;
            }
            navigate('/home/main');
        }
    }, [navigate, urlLocation.pathname, outletContext.user]);

    useEffect(() => {
        const roleCode = UserRole.normalize(outletContext.user?.role);
        if (!outletContext.user || roleCode == null || Number.isNaN(roleCode)) {
            return;
        }

        // 管理员仅使用治理类页面，不进入咨询与社区业务页
        if (UserRole.isAdminRole(roleCode)) {
            const forbiddenForAdmin = ["/home/community", "/home/consultation"];
            if (forbiddenForAdmin.some((prefix) => urlLocation.pathname.startsWith(prefix))) {
                navigate("/home/main", {replace: true});
            }
        }

        if (UserRole.isSchoolAdminRole(roleCode)) {
            const forbiddenForSchoolAdmin = ["/home/admin/reports", "/home/admin/knowledge"];
            if (forbiddenForSchoolAdmin.some((prefix) => urlLocation.pathname.startsWith(prefix))) {
                navigate("/home/main", {replace: true});
            }
        }
    }, [navigate, outletContext.user, urlLocation.pathname]);

    const content = (
        <>
            {!isTeacher && !isAdmin && <Divider color="Black" spacing="0"/>}
            <CheckLoginComponent
                resultCallback={(result) => {
                    setOutletContext((prev) => ({...prev, isLoggedIn: result === true}));
                }}
            >
                <FetchUserComponent
                    resultCallback={(result) => {
                        setUser(result ? result : null);
                    }}
                >
                    {isTeacher ? (
                        <TeacherShell user={outletContext.user}>
                            <Outlet context={outletContextValue}/>
                        </TeacherShell>
                    ) : isAdmin ? (
                        <AdminShell user={outletContext.user}>
                            <Outlet context={outletContextValue}/>
                        </AdminShell>
                    ) : (
                        <Outlet context={outletContextValue}/>
                    )}
                </FetchUserComponent>
            </CheckLoginComponent>
        </>
    );

    if (isTeacher || isAdmin) {
        return (
            <NotificationCenterProvider
                username={outletContext.user?.username ?? null}
                refreshTrigger={urlLocation.pathname}
            >
                {content}
            </NotificationCenterProvider>
        );
    }

    return (
        <NotificationCenterProvider
            username={outletContext.user?.username ?? null}
            refreshTrigger={urlLocation.pathname}
        >
            <AppShell
                username={displayName}
                accountUsername={outletContext.user?.username ?? null}
                avatar={outletContext.user?.avatar ?? null}
                role={outletContext.user?.role ?? null}
                mainPadding="30px 0"
            >
                <PageContainer>{content}</PageContainer>
            </AppShell>
        </NotificationCenterProvider>
    );
};
