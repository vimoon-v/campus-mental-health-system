import React, {useEffect, useState} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {FetchUserComponent} from "../../component/FetchUserComponent";
import {Outlet} from "react-router";
import {CheckLoginComponent} from "../../component/CheckLoginComponent";
import {User} from "../../entity/User";
import {PsychKnowledgeTeacherPostForm} from "./PsychKnowledgeTeacherPostForm";
import {PsychKnowledgeBrowseForm} from "./PsychKnowledgeBrowseForm";
import {PsychKnowledgeDetailForm} from "./PsychKnowledgeDetailForm";
import {PsychKnowledgeAdminAudit, PsychKnowledgeAdminAuditForm} from "./PsychKnowledgeAdminAuditForm";
import {MyPsychKnowledge, MyPsychKnowledgeForm} from "./MyPsychKnowledgeForm";
import {AppShell} from "../../layout/AppShell";
import {PageContainer} from "../../layout/PageContainer";
import {UserRole} from "../../entity/enums/UserRole";
import {TeacherShell} from "../home/teacher/TeacherShell";
import {NotificationCenterProvider} from "../../context/NotificationCenterContext";

export namespace PsychKnowledgeRoot {
    export interface OutletContext {
        isLoggedIn: boolean;
        user: User | null;
    }

    export const Children = [
        {path: "post", element: <PsychKnowledgeTeacherPostForm/>},
        {path: "edit/:knowledgeId", element: <PsychKnowledgeTeacherPostForm/>},
        {path: "browse", element: <PsychKnowledgeBrowseForm/>},
        {path: "detail/:knowledgeId", element: <PsychKnowledgeDetailForm/>},
        {path: "admin", element: <PsychKnowledgeAdminAuditForm/>, children: PsychKnowledgeAdminAudit.Children},
        {path: "mine", element: <MyPsychKnowledgeForm/>, children: MyPsychKnowledge.Children},
    ];
}

export const PsychKnowledgeRootPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [outletContext, setOutletContext] = useState<PsychKnowledgeRoot.OutletContext>({isLoggedIn: false, user: null});
    const displayName = outletContext.user?.nickname?.trim()
        ? outletContext.user?.nickname
        : outletContext.user?.username ?? null;
    const roleCode = UserRole.normalize(outletContext.user?.role);
    const isTeacher = roleCode === UserRole.TEACHER;
    const isPlatformAdmin = UserRole.isPlatformAdminRole(roleCode);

    useEffect(() => {
        if (location.pathname === '/psych_knowledge' || location.pathname === '/psych_knowledge/') {
            if (isPlatformAdmin) {
                navigate('/home/admin/knowledge', {replace: true});
                return;
            }
            navigate('/psych_knowledge/browse');
        }
    }, [isPlatformAdmin, location.pathname, navigate]);

    useEffect(() => {
        if (!isPlatformAdmin) {
            const forbiddenForSchoolAdmin = location.pathname.startsWith('/psych_knowledge/admin')
                || location.pathname.startsWith('/psych_knowledge/mine/admin');
            if (forbiddenForSchoolAdmin) {
                navigate('/psych_knowledge/browse', {replace: true});
            }
            return;
        }
        const allowedForManager = location.pathname.startsWith('/psych_knowledge/detail/')
            || location.pathname.startsWith('/psych_knowledge/admin');
        if (!allowedForManager) {
            navigate('/home/admin/knowledge', {replace: true});
        }
    }, [isPlatformAdmin, location.pathname, navigate]);

    const innerContent = (
        <CheckLoginComponent
            resultCallback={(result) => {
                setOutletContext((prev) => ({...prev, isLoggedIn: result === true}));
            }}
        >
            <FetchUserComponent
                resultCallback={(result) => {
                    setOutletContext((prev) => ({...prev, user: result ? result : null}));
                }}
            >
                {isTeacher ? (
                    <TeacherShell user={outletContext.user}>
                        <Outlet context={outletContext}/>
                    </TeacherShell>
                ) : (
                    <Outlet context={outletContext}/>
                )}
            </FetchUserComponent>
        </CheckLoginComponent>
    );

    if (isTeacher) {
        return (
            <NotificationCenterProvider
                username={outletContext.user?.username ?? null}
                refreshTrigger={location.pathname}
            >
                {innerContent}
            </NotificationCenterProvider>
        );
    }

    return (
        <NotificationCenterProvider
            username={outletContext.user?.username ?? null}
            refreshTrigger={location.pathname}
        >
            <AppShell
                username={displayName}
                accountUsername={outletContext.user?.username ?? null}
                avatar={outletContext.user?.avatar ?? null}
                role={outletContext.user?.role ?? null}
                mainPadding="30px 0"
            >
                <PageContainer>{innerContent}</PageContainer>
            </AppShell>
        </NotificationCenterProvider>
    );
};
