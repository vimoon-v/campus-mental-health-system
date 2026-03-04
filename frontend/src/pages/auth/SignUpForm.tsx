import "./Auth.css";
import React, {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router-dom";
import {SignupRequest, UserController} from "../../controller/UserController";
import {CaptchaController} from "../../controller/CaptchaController";
import {SchoolController} from "../../controller/SchoolController";
import {RadioGroup, RadioGroupCallback, RadioGroupRef} from "../../common/view/input/Radio";
import {Select, SelectCallback, SelectRef} from "../../common/view/input/Select";
import {Input, InputCallback, InputRef} from "../../common/view/input/Input";
import {Captcha, CaptchaCallback, CaptchaRef} from "../../common/view/custom-input/Captcha";
import {ResponseHandler, ResponseHandlerRef} from "../../common/response/ResponseHandler";
import {Button} from "../../common/view/controller/Button";
import {User} from "../../entity/User";
import {Loading} from "../../common/view/display/Loading";
import {ReturnObject} from "../../common/response/ReturnObject";
import {ResponseState} from "../../common/response/ResponseState";
import defaultAvatar from "../../assets/avatar/default-avatar.png";
import {ensureUserAvatar} from "../../utils/avatar";
import {UserRole} from "../../entity/enums/UserRole";

export interface SignUpFormProps {
    embedded?: boolean;
    onSwitchToLogin?: () => void;
    onSignupSuccess?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
    embedded = false,
    onSwitchToLogin,
    onSignupSuccess,
}) => {
    const userController = new UserController();
    const captchaController = new CaptchaController();
    const schoolController = new SchoolController();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<SignupRequest>({
        name: "",
        nickname: "",
        gender: "",
        schoolProvince: "",
        school: "",
        secondaryUnit: "",
        major: null,
        role: "",
        position: "",
        email: "",
        phoneNumber: "",
        qq: null,
        wechat: null,
        username: "",
        password: "",
        confirmedPassword: "",
        captcha: "",
        captchaKey: ""
    });
    const [signupState, setSignupState] = useState<ResponseState>();

    const nameInputRef = useRef<InputRef>(null);
    const nicknameInputRef = useRef<InputRef>(null);
    const genderRadioRef = useRef<RadioGroupRef>(null);
    const schoolProvinceSelectRef = useRef<SelectRef>(null);
    const schoolSelectRef = useRef<SelectRef>(null);
    const secondaryUnitInputRef = useRef<InputRef>(null);
    const majorInputRef = useRef<InputRef>(null);
    const roleRadioRef = useRef<RadioGroupRef>(null);
    const positionSelectRef = useRef<SelectRef>(null);
    const emailInputRef = useRef<InputRef>(null);
    const phoneNumberInputRef = useRef<InputRef>(null);
    const qqInputRef = useRef<InputRef>(null);
    const wechatInputRef = useRef<InputRef>(null);
    const usernameInputRef = useRef<InputRef>(null);
    const passwordInputRef = useRef<InputRef>(null);
    const confirmedPasswordInputRef = useRef<InputRef>(null);
    const captchaRef = useRef<CaptchaRef>(null);
    const signupHandlerRef = useRef<ResponseHandlerRef<SignupRequest, any>>(null);
    const [schoolOptions, setSchoolOptions] = useState<Array<{label: string; value: string}>>([]);
    const [schoolLoading, setSchoolLoading] = useState(false);
    const [schoolError, setSchoolError] = useState("");
    const signupRoleOptions = User.Options.role.filter((roleOption) => roleOption.value !== UserRole.SYSTEM_ADMIN.toString());

    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-用户注册";
    }, []);

    const requestSchools = async (provinceCode: number): Promise<Array<{label: string; value: string}>> => {
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

    const handleSubmit = (event: { preventDefault: () => void; }) => {
        const isNameValid = nameInputRef.current?.validate();
        const isNicknameValid = nicknameInputRef.current?.validate();
        const isGenderValid = genderRadioRef.current?.validate();
        const isSchoolProvinceValid = schoolProvinceSelectRef.current?.validate();
        const isSchoolValid = schoolSelectRef.current?.validate();
        const isSecondaryUnitValid = secondaryUnitInputRef.current?.validate();
        const isMajorValid = majorInputRef.current?.validate();
        const isRoleValid = roleRadioRef.current?.validate();
        const isPositionValid = positionSelectRef.current?.validate();
        const isEmailValid = emailInputRef.current?.validate();
        const isPhoneNumberValid = phoneNumberInputRef.current?.validate();
        const isQqValid = qqInputRef.current?.validate();
        const isWechatValid = wechatInputRef.current?.validate();
        const isUsernameValid = usernameInputRef.current?.validate();
        const isPasswordValid = passwordInputRef.current?.validate();
        const isConfirmedPasswordValid = confirmedPasswordInputRef.current?.validate();
        const isCaptchaValid = captchaRef.current?.validate();

        event.preventDefault();
        if (
            isNameValid &&
            isNicknameValid &&
            isGenderValid &&
            isSchoolProvinceValid &&
            isSchoolValid &&
            isSecondaryUnitValid &&
            isMajorValid &&
            isRoleValid &&
            isPositionValid &&
            isEmailValid &&
            isPhoneNumberValid &&
            isQqValid &&
            isWechatValid &&
            isUsernameValid &&
            isPasswordValid &&
            isConfirmedPasswordValid &&
            isCaptchaValid
        ) {
            signupHandlerRef.current?.request(formData);
        } else {
            alert("请检查表单错误！");
        }
    };

    const retryButton = (
        <Button
            type="link"
            className="btn-text-align-left"
            onClick={() => {
                signupHandlerRef.current?.recover();
            }}
        >
            重试
        </Button>
    );

    const mainForm = (
        <div>
            <h2>用户注册</h2>
            <form onSubmit={handleSubmit}>
                <div className="auth-pair-divide">
                    <div style={{width: "400px"}}>
                        <Input
                            ref={nameInputRef}
                            type="text"
                            label="姓名"
                            placeholder="请输入姓名"
                            onChange={InputCallback.handleDataChange<SignupRequest>("name", setFormData, null)}
                            validationRules={User.ValidationRules.name}
                            required
                        />
                        <RadioGroup
                            ref={genderRadioRef}
                            name="gender"
                            label="性别"
                            onChange={RadioGroupCallback.handleDataChange<SignupRequest>("gender", setFormData, null)}
                            size="large"
                            options={User.Options.gender}
                            required
                            layout="horizontal"
                        />
                        <Select
                            ref={schoolProvinceSelectRef}
                            label="学校所在省份"
                            options={User.Options.schoolProvince}
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
                            placeholder="请选择入学学校所在省份"
                            required
                            showSelectAll
                            maxTagCount={2}
                        />
                        <Select
                            ref={schoolSelectRef}
                            label="所属学校"
                            options={schoolOptions}
                            loading={schoolLoading}
                            error={schoolError}
                            placeholder="请选择所属学校"
                            onChange={(value) => {
                                const schoolValue = Array.isArray(value) ? (value[0] ?? "") : value;
                                setFormData((prev) => ({...prev, school: schoolValue}));
                            }}
                            required
                        />
                        <Input
                            ref={secondaryUnitInputRef}
                            type="text"
                            label="二级单位"
                            placeholder="二级单位"
                            onChange={InputCallback.handleDataChange<SignupRequest>("secondaryUnit", setFormData, null)}
                            validationRules={User.ValidationRules.secondaryUnit}
                            required
                        />
                        <Input
                            ref={majorInputRef}
                            type="text"
                            label="专业"
                            placeholder="专业"
                            onChange={InputCallback.handleDataChange<SignupRequest>("major", setFormData, null)}
                            validationRules={User.ValidationRules.major}
                        />
                        <RadioGroup
                            ref={roleRadioRef}
                            label="用户类型"
                            size="large"
                            options={signupRoleOptions}
                            onChange={RadioGroupCallback.handleDataChange<SignupRequest>("role", setFormData, null)}
                            required
                            layout="horizontal"
                        />
                        <Select
                            ref={positionSelectRef}
                            label="职务"
                            options={User.Options.position}
                            onChange={SelectCallback.handleDataChange<SignupRequest>("position", setFormData, null)}
                            placeholder="请选择职务"
                            required
                            showSelectAll
                            maxTagCount={2}
                        />
                    </div>
                    <div style={{width: "400px"}}>
                        <Input
                            ref={usernameInputRef}
                            type="text"
                            label="用户名"
                            placeholder="请输入用户名"
                            onChange={InputCallback.handleDataChange<SignupRequest>("username", setFormData, null)}
                            validationRules={User.ValidationRules.username}
                            required
                        />
                        <Input
                            ref={nicknameInputRef}
                            type="text"
                            label="昵称"
                            placeholder="请输入昵称"
                            onChange={InputCallback.handleDataChange<SignupRequest>("nickname", setFormData, null)}
                            validationRules={User.ValidationRules.nickname}
                            required
                        />
                        <Input
                            ref={emailInputRef}
                            type="email"
                            label="Email"
                            placeholder="Email"
                            onChange={InputCallback.handleDataChange<SignupRequest>("email", setFormData, null)}
                            validationRules={User.ValidationRules.email}
                            prefix={<span>@</span>}
                            required
                        />
                        <Input
                            ref={phoneNumberInputRef}
                            type="text"
                            label="电话"
                            placeholder="电话"
                            onChange={InputCallback.handleDataChange<SignupRequest>("phoneNumber", setFormData, null)}
                            validationRules={User.ValidationRules.phoneNumber}
                            required
                        />
                        <Input
                            ref={qqInputRef}
                            type="text"
                            label="QQ"
                            placeholder="QQ"
                            onChange={InputCallback.handleDataChange<SignupRequest>("qq", setFormData, null)}
                            validationRules={User.ValidationRules.qq}
                        />
                        <Input
                            ref={wechatInputRef}
                            type="text"
                            label="微信"
                            placeholder="微信"
                            onChange={InputCallback.handleDataChange<SignupRequest>("wechat", setFormData, null)}
                            validationRules={User.ValidationRules.wechat}
                        />
                        <Input
                            ref={passwordInputRef}
                            type="password"
                            label="密码"
                            placeholder="请输入密码"
                            prefix={<span>*</span>}
                            onChange={InputCallback.handleDataChange<SignupRequest>("password", setFormData, null)}
                            validationRules={User.ValidationRules.password}
                            required
                        />
                        <Input
                            ref={confirmedPasswordInputRef}
                            type="password"
                            label="确认密码"
                            placeholder="请再次输入密码"
                            prefix={<span>*</span>}
                            onChange={InputCallback.handleDataChange<SignupRequest>("confirmedPassword", setFormData, null)}
                            validationRules={User.ValidationRules.confirmedPassword(passwordInputRef)}
                            required
                        />
                        <Captcha
                            ref={captchaRef}
                            onChange={CaptchaCallback.handleDataChange<SignupRequest>("captchaKey", "captcha", captchaRef, setFormData, null)}
                            placeholder="请输入图片中的验证码"
                            autoRefresh={true}
                            getCaptcha={captchaController.captcha}
                        />
                    </div>
                </div>
                <br/>
                <Button type="primary" block summit>注册</Button>
                <br/>
                <div className="auth-bottom">
                    <Button
                        type="link"
                        className="btn-text-align-left"
                        onClick={() => {
                            if (onSwitchToLogin) {
                                onSwitchToLogin();
                                return;
                            }
                            navigate("/auth/login");
                        }}
                    >
                        返回登录
                    </Button>
                </div>
            </form>
        </div>
    );

    const content = (
        <div className="auth-signup-form">
                <h2>高校心理咨询预约与匿名交流平台</h2>
                <ResponseHandler<SignupRequest, any>
                    ref={signupHandlerRef}
                    request={userController.signup}
                    setResponseState={setSignupState}
                    onRequestEnd={(_, returnObject) => {
                        if (returnObject.code === ReturnObject.Code.SUCCESS) {
                            ensureUserAvatar(formData.username, defaultAvatar);
                            onSignupSuccess?.();
                        }
                    }}
                    idleComponent={mainForm}
                    loadingComponent={
                        <div>
                            {mainForm}
                            <Loading type="dots" text="注册中..." color="#2196f3" size="large" fullScreen/>
                        </div>
                    }
                    handlingReturnObjectComponent={
                        <div>
                            {mainForm}
                            <Loading type="dots" text="处理中..." color="#2196f3" size="large" fullScreen/>
                        </div>
                    }
                    networkErrorComponent={
                        <div>
                            <h2>网络错误</h2>
                            <p className=".auth-error-detail">{signupState?.networkError?.message}</p>
                            <div className="auth-bottom">{retryButton}</div>
                        </div>
                    }
                    finishedComponent={
                        <div>
                            <h2>注册{ReturnObject.Status.ChineseName.get(signupState?.returnObject?.status)}</h2>
                            {signupState?.returnObject?.code === ReturnObject.Code.SUCCESS ? (
                                <div className="auth-bottom">
                                    <Button
                                        type="link"
                                        className="btn-text-align-left"
                                        onClick={() => {
                                            if (onSwitchToLogin) {
                                                onSwitchToLogin();
                                                return;
                                            }
                                            navigate("/auth/login");
                                        }}
                                    >
                                        返回登录
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <p className=".auth-error-detail">{signupState?.returnObject?.message}</p>
                                    <div className="auth-bottom">{retryButton}</div>
                                </>
                            )}
                        </div>
                    }
                />
        </div>
    );

    return embedded ? content : <div className="auth-background">{content}</div>;
};
