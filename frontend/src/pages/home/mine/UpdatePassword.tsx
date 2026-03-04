import React, {useEffect, useRef, useState} from "react";
import "../Home.css";
import "../../../css/LayoutFlex.css";
import {UpdatePasswordRequest, UserController} from "../../../controller/UserController";
import {CaptchaController} from "../../../controller/CaptchaController";
import {useOutletContext} from "react-router";
import {Homepage} from "../HomepageForm";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {InputCallback, InputRef} from "../../../common/view/input/Input";
import {CaptchaCallback, CaptchaRef} from "../../../common/view/custom-input/Captcha";
import {Input} from "../../../common/view/input/Input";
import {Captcha} from "../../../common/view/custom-input/Captcha";
import {Button} from "../../../common/view/controller/Button";
import {User} from "../../../entity/User";
import {Loading} from "../../../common/view/display/Loading";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {ResponseState} from "../../../common/response/ResponseState";

export const UpdatePassword: React.FC = () => {
    const userController = new UserController();
    const captchaController = new CaptchaController();
    const context = useOutletContext<Homepage.OutletContext>();

    const [updatePasswordState, setUpdatePasswordState] = useState<ResponseState>();
    const [formData, setFormData] = useState<UpdatePasswordRequest>({
        username: "",
        oldPassword: "",
        newPassword: "",
        confirmedNewPassword: "",
        captcha: "",
        captchaKey: ""
    });

    const updatePasswordHandler = useRef<ResponseHandlerRef<UpdatePasswordRequest, any>>(null);
    const oldPasswordInputRef = useRef<InputRef>(null);
    const newPasswordInputRef = useRef<InputRef>(null);
    const confirmedNewPasswordInputRef = useRef<InputRef>(null);
    const captchaRef = useRef<CaptchaRef>(null);

    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-我的修改密码";
    }, []);

    const handleSubmit = (event: { preventDefault: () => void; }) => {
        const isOldPasswordValid = oldPasswordInputRef.current?.validate();
        const isNewPasswordValid = newPasswordInputRef.current?.validate();
        const isConfirmedNewPasswordValid = confirmedNewPasswordInputRef.current?.validate();
        const isCaptchaValid = captchaRef.current?.validate();
        formData.username = context.user?.username;

        event.preventDefault();
        if (isOldPasswordValid && isNewPasswordValid && isConfirmedNewPasswordValid && isCaptchaValid) {
            updatePasswordHandler.current?.request(formData);
        } else {
            alert("请检查表单错误!");
        }
    };

    const statusMessage = (() => {
        if (updatePasswordState?.networkError) {
            return {
                type: "error",
                text: `网络错误：${updatePasswordState.networkError.message}`
            };
        }
        if (updatePasswordState?.returnObject) {
            const status = updatePasswordState.returnObject.status;
            const statusName = ReturnObject.Status.ChineseName.get(status);
            const isSuccess = status === ReturnObject.Status.SUCCESS;
            const text = isSuccess
                ? "修改密码成功，请牢记你的新密码。"
                : `修改密码${statusName}：${updatePasswordState.returnObject.message}`;
            return {
                type: isSuccess ? "success" : "error",
                text
            };
        }
        return null;
    })();

    const mainForm = (
        <div className="account-page">
            <div className="account-title">
                <h2>修改密码</h2>
                <p>为了账号安全，建议定期更换密码。</p>
            </div>
            {statusMessage ? (
                <div className={`account-alert ${statusMessage.type === "success" ? "is-success" : "is-error"}`}>
                    {statusMessage.text}
                </div>
            ) : null}
            <section className="account-card">
                <div className="account-card-head">
                    <h3>密码更新</h3>
                    <span>提交后立即生效</span>
                </div>
                <div className="account-note">
                    密码长度需为8-45个字符，仅支持字母、数字以及英文感叹号!和问号?。
                </div>
                <form onSubmit={handleSubmit} className="account-form">
                    <Input
                        ref={oldPasswordInputRef}
                        type="password"
                        label="旧密码"
                        placeholder="请输入旧密码"
                        prefix={<span>*</span>}
                        validationRules={User.ValidationRules.password}
                        onChange={InputCallback.handleDataChange<UpdatePasswordRequest>("oldPassword", setFormData, null)}
                        required
                    />
                    <Input
                        ref={newPasswordInputRef}
                        type="password"
                        label="新密码"
                        placeholder="请输入新密码"
                        prefix={<span>*</span>}
                        validationRules={User.ValidationRules.password}
                        onChange={InputCallback.handleDataChange<UpdatePasswordRequest>("newPassword", setFormData, null)}
                        required
                    />
                    <Input
                        ref={confirmedNewPasswordInputRef}
                        type="password"
                        label="确认新密码"
                        placeholder="请确认新密码"
                        prefix={<span>*</span>}
                        validationRules={User.ValidationRules.confirmedPassword(newPasswordInputRef)}
                        onChange={InputCallback.handleDataChange<UpdatePasswordRequest>("confirmedNewPassword", setFormData, null)}
                        required
                    />
                    <Captcha
                        ref={captchaRef}
                        onChange={CaptchaCallback.handleDataChange<UpdatePasswordRequest>("captchaKey", "captcha", captchaRef, setFormData, null)}
                        placeholder="请输入图片中的验证码"
                        autoRefresh={true}
                        getCaptcha={captchaController.captcha}
                    />
                    <div className="account-actions">
                        <Button type="primary" block summit>提交修改</Button>
                    </div>
                </form>
            </section>
        </div>
    );

    return (
        <ResponseHandler<UpdatePasswordRequest, any>
            ref={updatePasswordHandler}
            request={userController.updatePassword}
            setResponseState={setUpdatePasswordState}
            idleComponent={mainForm}
            loadingComponent={<div>{mainForm}<Loading type="dots" text="修改密码中..." color="#2196f3" size="large" fullScreen/></div>}
            handlingReturnObjectComponent={<div>{mainForm}<Loading type="dots" text="处理修改密码结果中..." color="#2196f3" size="large" fullScreen/></div>}
            networkErrorComponent={<div>{mainForm}</div>}
            finishedComponent={<div>{mainForm}</div>}
        />
    );
};
