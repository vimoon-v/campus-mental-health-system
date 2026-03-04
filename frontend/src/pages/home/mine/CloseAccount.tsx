import React, {useEffect, useRef, useState} from "react";
import "../Home.css";
import "../../../css/LayoutFlex.css";
import {CloseAccountRequest, UserController} from "../../../controller/UserController";
import {CaptchaController} from "../../../controller/CaptchaController";
import {useOutletContext} from "react-router";
import {Homepage} from "../HomepageForm";
import {InputCallback, InputRef} from "../../../common/view/input/Input";
import {CaptchaCallback, CaptchaRef} from "../../../common/view/custom-input/Captcha";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {Input} from "../../../common/view/input/Input";
import {Captcha} from "../../../common/view/custom-input/Captcha";
import {Button} from "../../../common/view/controller/Button";
import {User} from "../../../entity/User";
import {Loading} from "../../../common/view/display/Loading";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {ResponseState} from "../../../common/response/ResponseState";
import {useNavigate} from "react-router-dom";

export const CloseAccount: React.FC = () => {
    const userController = new UserController();
    const captchaController = new CaptchaController();
    const navigate = useNavigate();
    const context = useOutletContext<Homepage.OutletContext>();

    const [closeAccountState, setCloseAccountState] = useState<ResponseState>();
    const [formData, setFormData] = useState<CloseAccountRequest>({
        username: "",
        password: "",
        captcha: "",
        captchaKey: ""
    });

    const closeAccountHandler = useRef<ResponseHandlerRef<CloseAccountRequest, any>>(null);
    const passwordInputRef = useRef<InputRef>(null);
    const captchaRef = useRef<CaptchaRef>(null);

    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-我的注销账号";
    }, []);

    const handleSubmit = (event: { preventDefault: () => void; }) => {
        const isPasswordValid = passwordInputRef.current?.validate();
        const isCaptchaValid = captchaRef.current?.validate();
        formData.username = context.user?.username;

        event.preventDefault();
        if (isPasswordValid && isCaptchaValid) {
            closeAccountHandler.current?.request(formData);
        } else {
            alert("请检查表单错误!");
        }
    };

    const isSuccess = closeAccountState?.returnObject?.status === ReturnObject.Status.SUCCESS;

    const statusMessage = (() => {
        if (closeAccountState?.networkError) {
            return {
                type: "error",
                text: `网络错误：${closeAccountState.networkError.message}`
            };
        }
        if (closeAccountState?.returnObject) {
            const status = closeAccountState.returnObject.status;
            const statusName = ReturnObject.Status.ChineseName.get(status);
            const isOk = status === ReturnObject.Status.SUCCESS;
            const text = isOk
                ? "账号已注销，你可以返回登录界面。"
                : `注销账号${statusName}：${closeAccountState.returnObject.message}`;
            return {
                type: isOk ? "success" : "error",
                text
            };
        }
        return null;
    })();

    const mainForm = (
        <div className="account-page">
            <div className="account-title">
                <h2>注销账号</h2>
                <p>此操作不可恢复，请谨慎确认。</p>
            </div>
            {statusMessage ? (
                <div className={`account-alert ${statusMessage.type === "success" ? "is-success" : "is-error"}`}>
                    {statusMessage.text}
                </div>
            ) : null}
            <section className="account-card account-card--danger">
                <div className="account-card-head">
                    <h3>确认注销</h3>
                    <span>操作不可撤销</span>
                </div>
                <div className="account-note account-note--danger">
                    注销后将删除你的个人资料、历史记录与相关数据。
                    <ul className="account-note-list">
                        <li>历史预约与测评记录将无法恢复。</li>
                        <li>匿名内容仍可能按平台规则保留。</li>
                        <li>如需帮助请先联系管理员。</li>
                    </ul>
                </div>
                {!isSuccess ? (
                    <form onSubmit={handleSubmit} className="account-form">
                        <Input
                            ref={passwordInputRef}
                            type="password"
                            label="确认密码"
                            placeholder="请输入密码"
                            prefix={<span>*</span>}
                            validationRules={User.ValidationRules.password}
                            onChange={InputCallback.handleDataChange<CloseAccountRequest>("password", setFormData, null)}
                            required
                        />
                        <Captcha
                            ref={captchaRef}
                            onChange={CaptchaCallback.handleDataChange<CloseAccountRequest>("captchaKey", "captcha", captchaRef, setFormData, null)}
                            placeholder="请输入图片中的验证码"
                            autoRefresh={true}
                            getCaptcha={captchaController.captcha}
                        />
                        <div className="account-actions">
                            <Button type="primary" danger block summit>注销账号</Button>
                        </div>
                    </form>
                ) : (
                    <div className="account-actions">
                        <Button type="primary" block onClick={() => navigate("/auth/login")}>
                            返回登录界面
                        </Button>
                    </div>
                )}
            </section>
        </div>
    );

    return (
        <ResponseHandler<CloseAccountRequest, any>
            ref={closeAccountHandler}
            request={userController.closeAccount}
            setResponseState={setCloseAccountState}
            idleComponent={mainForm}
            loadingComponent={<div>{mainForm}<Loading type="dots" text="注销账号中..." color="#2196f3" size="large" fullScreen/></div>}
            handlingReturnObjectComponent={<div>{mainForm}<Loading type="dots" text="处理注销结果中..." color="#2196f3" size="large" fullScreen/></div>}
            networkErrorComponent={<div>{mainForm}</div>}
            finishedComponent={<div>{mainForm}</div>}
        />
    );
};
