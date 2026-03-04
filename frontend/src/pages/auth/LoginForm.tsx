import "./Auth.css";
// React 框架
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from 'react-router-dom'
// 控制器与通用组件
import { LoginRequest, UserController } from "../../controller/UserController";
import { CaptchaController } from "../../controller/CaptchaController";
import { ReturnObject } from "../../common/response/ReturnObject";
import { Input, InputCallback, InputRef } from "../../common/view/input/Input";
import { RadioGroup, RadioGroupRef } from "../../common/view/input/Radio";
import {Select, SelectOption, SelectRef} from "../../common/view/input/Select";
import { CaptchaCallback, CaptchaRef } from "../../common/view/custom-input/Captcha";
import { Button } from "../../common/view/controller/Button";
import { Captcha } from "../../common/view/custom-input/Captcha";
import { User } from "../../entity/User";
import { ResponseHandler, ResponseHandlerRef } from "../../common/response/ResponseHandler";
import { Loading } from "../../common/view/display/Loading";
import { ResponseState } from "../../common/response/ResponseState";
import {SchoolController} from "../../controller/SchoolController";
import {UserRole} from "../../entity/enums/UserRole";

export interface LoginFormProps {
    embedded?: boolean;
    onSwitchToSignUp?: () => void;
    onLoginSuccess?: () => void;
}

// 登录页面
export const LoginForm: React.FC<LoginFormProps> = ({
    embedded = false,
    onSwitchToSignUp,
    onLoginSuccess,
}) => {
    // 控制器
    const userController = new UserController();
    const captchaController = new CaptchaController();
    const schoolController = new SchoolController();
    // 路由
    const navigate = useNavigate();
    // 状态
    const [formData, setFormData] = useState<LoginRequest>({
        username: '',
        password: '',
        role: '',
        schoolProvince: '',
        school: '',
        captcha: '',
        captchaKey: ''
    });
    const [loginState, setLoginState] = useState<ResponseState>();
    const isSubmitting = loginState?.loading === true;
    const requestFailed = !isSubmitting && loginState?.returnObject != null && loginState.returnObject.code !== ReturnObject.Code.SUCCESS;
    const networkFailed = !isSubmitting && loginState?.networkError != null;
    // 引用
    const usernameInputRef = useRef<InputRef>(null);
    const passwordInputRef = useRef<InputRef>(null);
    const schoolProvinceSelectRef = useRef<SelectRef>(null);
    const schoolSelectRef = useRef<SelectRef>(null);
    const roleRef = useRef<RadioGroupRef>(null);
    const captchaRef = useRef<CaptchaRef>(null);
    const loginHandlerRef = useRef<ResponseHandlerRef<LoginRequest, any>>(null);
    const [schoolOptions, setSchoolOptions] = useState<SelectOption[]>([]);
    const [schoolLoading, setSchoolLoading] = useState(false);
    const [schoolError, setSchoolError] = useState("");
    const isPlatformAdminRoleSelected = formData.role === UserRole.SYSTEM_ADMIN.toString();

    // 钩子
    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-用户登录";
    }, []);

    const requestSchools = async (provinceCode: number): Promise<SelectOption[]> => {
        if (!provinceCode) {
            setSchoolOptions([]);
            setSchoolError("");
            return [];
        }
        setSchoolLoading(true);
        setSchoolError("");
        try {
            const response = await schoolController.listByProvince({provinceCode});
            if (response?.status === ReturnObject.Status.SUCCESS) {
                const options = (response.data ?? []).map((schoolName) => ({label: schoolName, value: schoolName}));
                setSchoolOptions(options);
                if (options.length === 0) {
                    setSchoolError("该省份暂无学校数据，请先维护学校库");
                }
                return options;
            }
            setSchoolOptions([]);
            setSchoolError(response?.message ?? "获取学校列表失败");
            return [];
        } catch (error) {
            setSchoolOptions([]);
            setSchoolError("获取学校列表失败");
            return [];
        } finally {
            setSchoolLoading(false);
        }
    };

    // 处理表单提交
    const handleSubmit = (event: { preventDefault: () => void; }) => {
        // 手动验证所有字段
        const isAccountValid = usernameInputRef.current?.validate();
        const isPasswordValid = passwordInputRef.current?.validate();
        const isSchoolProvinceValid = isPlatformAdminRoleSelected ? true : schoolProvinceSelectRef.current?.validate();
        const isSchoolValid = isPlatformAdminRoleSelected ? true : schoolSelectRef.current?.validate();
        const isRoleValid = roleRef.current?.validate();
        const isCaptchaValid = captchaRef.current?.validate();
        // 阻止默认提交
        event.preventDefault();
        if (isAccountValid && isPasswordValid && isSchoolProvinceValid && isSchoolValid && isRoleValid && isCaptchaValid) {
            loginHandlerRef.current?.request(formData);
        } else {
            alert('请检查表单错误!');
        }
    };

    const mainForm = (
        <div className="auth-login-panel-body">
            <div className="auth-login-form-title">
                <h3>账号登录</h3>
                <p>所有角色统一入口，登录后自动进入对应系统主页</p>
            </div>
            {requestFailed && (
                <div className="auth-login-alert auth-login-alert--error">
                    <i className="fa-solid fa-circle-exclamation"/>
                    <span>{loginState?.returnObject?.message || "登录失败，请检查账号信息"}</span>
                </div>
            )}
            {networkFailed && (
                <div className="auth-login-alert auth-login-alert--warning">
                    <i className="fa-solid fa-wifi"/>
                    <span>网络异常：{loginState?.networkError?.message}</span>
                </div>
            )}
            <form className="auth-login-fields" onSubmit={handleSubmit}>
                <Input
                    ref={usernameInputRef}
                    type="text"
                    label="用户名"
                    placeholder="请输入用户名"
                    prefix={<i className="fa-solid fa-user"/>}
                    validationRules={User.ValidationRules.username}
                    onChange={InputCallback.handleDataChange<LoginRequest>("username", setFormData, null)}
                    required
                />
                <Input
                    ref={passwordInputRef}
                    type="password"
                    label="密码"
                    placeholder="请输入密码"
                    prefix={<i className="fa-solid fa-lock"/>}
                    validationRules={User.ValidationRules.password}
                    onChange={InputCallback.handleDataChange<LoginRequest>("password", setFormData, null)}
                    required
                />
                {!isPlatformAdminRoleSelected && (
                    <>
                        <Select
                            ref={schoolProvinceSelectRef}
                            label="学校所在省份"
                            options={User.Options.schoolProvince}
                            placeholder="请选择学校所在省份"
                            required
                            showSelectAll
                            maxTagCount={2}
                            onChange={(value) => {
                                const provinceValue = Array.isArray(value) ? (value[0] ?? "") : value;
                                schoolSelectRef.current?.clear();
                                setFormData((prev) => ({...prev, schoolProvince: provinceValue, school: ""}));
                                setSchoolOptions([]);
                                setSchoolError("");
                                const provinceCode = Number(provinceValue);
                                if (!Number.isNaN(provinceCode) && provinceCode > 0) {
                                    void requestSchools(provinceCode);
                                }
                            }}
                        />
                        <Select
                            ref={schoolSelectRef}
                            label="所属学校"
                            options={schoolOptions}
                            placeholder="请选择所属学校"
                            required
                            loading={schoolLoading}
                            error={schoolError}
                            onChange={(value) => {
                                const schoolValue = Array.isArray(value) ? (value[0] ?? "") : value;
                                setFormData((prev) => ({...prev, school: schoolValue}));
                            }}
                        />
                    </>
                )}
                <RadioGroup
                    ref={roleRef}
                    label="用户类型"
                    size="large"
                    options={User.Options.role}
                    required
                    layout="horizontal"
                    onChange={(value) => {
                        const roleValue = value ?? "";
                        if (roleValue === UserRole.SYSTEM_ADMIN.toString()) {
                            schoolProvinceSelectRef.current?.clear();
                            schoolSelectRef.current?.clear();
                            setSchoolOptions([]);
                            setSchoolError("");
                            setFormData((prev) => ({...prev, role: roleValue, schoolProvince: "", school: ""}));
                            return;
                        }
                        setFormData((prev) => ({...prev, role: roleValue}));
                    }}
                />
                <Captcha
                    ref={captchaRef}
                    onChange={CaptchaCallback.handleDataChange<LoginRequest>(
                        "captchaKey",
                        "captcha",
                        captchaRef,
                        setFormData,
                        null
                    )}
                    placeholder="请输入图片中的验证码"
                    autoRefresh={true}
                    getCaptcha={captchaController.captcha}
                />
                <Button type="primary" block summit loading={isSubmitting} disabled={isSubmitting}>
                    {isSubmitting ? "登录中..." : "登录"}
                </Button>
                <div className="auth-bottom">
                    <Button
                        type="link"
                        className="btn-text-align-left"
                        onClick={() => {
                            if (onSwitchToSignUp) {
                                onSwitchToSignUp();
                                return;
                            }
                            navigate('/auth/signup');
                        }}
                    >
                        还没有账号？去注册
                    </Button>
                    <Button type="link" className="btn-text-align-right">忘记密码</Button>
                </div>
            </form>
        </div>
    );

    const content = (
        <div className={`auth-login-shell${embedded ? " auth-login-shell--embedded" : ""}`}>
            {!embedded && (
                <aside className="auth-login-brand">
                    <span className="auth-login-brand-badge">统一认证中心</span>
                    <h2>心晴校园</h2>
                    <p>高校心理咨询预约与匿名交流平台</p>
                    <ul className="auth-login-brand-list">
                        <li><i className="fa-solid fa-shield-heart"/> 同一入口支持学生、教师、管理员登录</li>
                        <li><i className="fa-solid fa-lock"/> 全程登录态校验，未登录不可进入系统主页</li>
                        <li><i className="fa-solid fa-compass"/> 登录后自动进入角色对应工作台</li>
                    </ul>
                </aside>
            )}

            <section className="auth-login-form">
                <div className="auth-login-header">
                    <h2>登录系统</h2>
                    <p>请使用平台账号完成身份认证</p>
                </div>
                <ResponseHandler<LoginRequest, any>
                    setResponseState={setLoginState}
                    ref={loginHandlerRef}
                    request={userController.login}
                    idleComponent={mainForm}
                    loadingComponent={mainForm}
                    handlingReturnObjectComponent={mainForm}
                    finishedComponent={mainForm}
                    networkErrorComponent={mainForm}
                    onRequestEnd={(requestBody, returnObject) => {
                        if (returnObject.code === ReturnObject.Code.SUCCESS) {
                            onLoginSuccess?.();
                            navigate('/home');
                        }
                    }}
                />
                {!embedded && (
                    <div className="auth-login-footer">
                        <Loading type="dots" text="身份认证过程采用安全会话机制" color="#1f6b6e" size="small"/>
                    </div>
                )}
            </section>
        </div>
    );

    return embedded ? content : <div className="auth-background auth-background--login">{content}</div>;
};
