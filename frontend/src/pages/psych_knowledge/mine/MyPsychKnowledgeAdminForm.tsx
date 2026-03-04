import React, {useRef, useState} from "react";
import {useOutletContext} from "react-router";
import {useNavigate} from "react-router-dom";
import {PsychKnowledgeRoot} from "../PsychKnowledgeRootPage";
import {PsychKnowledgeController} from "../../../controller/PsychKnowledgeController";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {PsychKnowledgeDTO} from "../../../entity/DTO/PsychKnowledgeDTO";
import {ResponseState} from "../../../common/response/ResponseState";
import {PsychKnowledgeCard} from "../../../component/view/PsychKnowledgeCard";
import {Divider} from "../../../common/view/decoration/Divider";
import {Loading} from "../../../common/view/display/Loading";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {UserRole} from "../../../entity/enums/UserRole";
import {Button} from "../../../common/view/controller/Button";

export const MyPsychKnowledgeAdminForm: React.FC = () => {
    const context = useOutletContext<PsychKnowledgeRoot.OutletContext>();
    const navigate = useNavigate();
    const psychKnowledgeController = new PsychKnowledgeController();

    const myPsychKnowledgeHandlerRef = useRef<ResponseHandlerRef<{ adminReviewerUsername: string }, PsychKnowledgeDTO[]>>(null);
    const [myPsychKnowledgeState, setMyPsychKnowledgeState] = useState<ResponseState<PsychKnowledgeDTO[]>>();

    const psychKnowledgeCardList = myPsychKnowledgeState?.returnObject?.data?.map(value => (
        <PsychKnowledgeCard
            username={context.user == null ? "" : context.user.username}
            mode="mine"
            data={value}
            role={context.user == null ? UserRole.UNKNOWN : context.user.role}
        />
    ));

    return (
        <div className="layout-flex-column">
            <div className="layout-flex-row" style={{gap: "12px", marginBottom: "16px"}}>
                <Button type="default" onClick={() => navigate("/psych_knowledge/admin/audit")}>审核科普</Button>
                <Button type="default" onClick={() => navigate("/psych_knowledge/admin/report_audit")}>审核科普举报</Button>
                <Button type="default" onClick={() => navigate("/psych_knowledge/mine/admin")}>我的审核的科普</Button>
            </div>

            <div className="layout-flex-row">
                <span style={{flexGrow: 1}}></span>
                <h2>我的审核科普</h2>
                <span style={{flexGrow: 1}}></span>
            </div>
            <Divider color="Black" spacing="0"/>

            <ResponseHandler<{ adminReviewerUsername: string }, PsychKnowledgeDTO[]>
                ref={myPsychKnowledgeHandlerRef}
                setResponseState={setMyPsychKnowledgeState}
                request={psychKnowledgeController.adminReviewed}
                autoRequest={{adminReviewerUsername: context.user == null ? "" : context.user.username}}
                loadingComponent={<Loading type="dots" text='获取心理知识科普中...' color="#2196f3" size="large" fullScreen/>}
                handlingReturnObjectComponent={<Loading type="dots" text='处理获取心理知识科普结果中...' color="#2196f3" size="large" fullScreen/>}
                networkErrorComponent={
                    <div>
                        <h2>网络错误</h2>
                        <p>详情：{myPsychKnowledgeState?.networkError?.message}</p>
                    </div>
                }
                finishedComponent={(!(myPsychKnowledgeState?.returnObject?.status === ReturnObject.Status.SUCCESS)) ? (
                    <div>
                        <h2>获取心理科普{ReturnObject.Status.ChineseName.get(myPsychKnowledgeState?.returnObject?.status)}</h2>
                        <p>详情：{myPsychKnowledgeState?.returnObject?.message}</p>
                    </div>
                ) : (myPsychKnowledgeState?.returnObject?.data != null && myPsychKnowledgeState?.returnObject?.data.length > 0 ?
                    <div className="post-container">{psychKnowledgeCardList}</div> : <p>你还审核任何科普</p>
                )}
            />
        </div>
    );
};
