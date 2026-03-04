import React from "react";
import {PsychKnowledgeAuditForm} from "./admin_audit/PsychKnowledgeAuditForm";
import {PsychKnowledgeReportAuditForm} from "./admin_audit/PsychKnowledgeReportAuditForm";
import {Outlet, useOutletContext} from "react-router";
import {PsychKnowledgeRoot} from "./PsychKnowledgeRootPage";
import {useEffect} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {Button} from "../../common/view/controller/Button";


export namespace PsychKnowledgeAdminAudit{
    //子路由
    export const Children=[
        {path:"audit",element:<PsychKnowledgeAuditForm/>},
        {path:"report_audit",element:<PsychKnowledgeReportAuditForm/>},
    ];
}


export const PsychKnowledgeAdminAuditForm:React.FC = () => {
    const context=useOutletContext<PsychKnowledgeRoot.OutletContext>();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.pathname === "/psych_knowledge/admin" || location.pathname === "/psych_knowledge/admin/") {
            navigate("/psych_knowledge/admin/audit");
        }
    }, [location.pathname, navigate]);

    return (
        <div className="layout-flex-column">
            <div className="layout-flex-row" style={{gap: "12px", marginBottom: "16px"}}>
                <Button type="default" onClick={() => navigate("/psych_knowledge/admin/audit")}>审核科普</Button>
                <Button type="default" onClick={() => navigate("/psych_knowledge/admin/report_audit")}>审核科普举报</Button>
                <Button type="default" onClick={() => navigate("/psych_knowledge/mine/admin")}>我的审核的科普</Button>
            </div>
            <Outlet context={context}/>
        </div>
    )
}
