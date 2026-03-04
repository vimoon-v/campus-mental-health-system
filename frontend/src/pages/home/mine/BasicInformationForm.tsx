import React, {ChangeEvent, useEffect, useMemo, useRef, useState} from "react";
import "../Home.css";
import "../../../css/LayoutFlex.css";
import {useOutletContext} from "react-router";
import {Homepage} from "../HomepageForm";
import {Gender} from "../../../entity/enums/Gender";
import {ProvinceCN} from "../../../entity/enums/ProvinceCN";
import {UserRole} from "../../../entity/enums/UserRole";
import {UserPosition} from "../../../entity/enums/UserPosition";
import defaultAvatar from "../../../assets/avatar/default-avatar.png";
import {UpdateUserRequest, UserController} from "../../../controller/UserController";
import {ResponseHandler, ResponseHandlerRef} from "../../../common/response/ResponseHandler";
import {Input, InputCallback, InputRef} from "../../../common/view/input/Input";
import {Select, SelectCallback, SelectRef} from "../../../common/view/input/Select";
import {RadioGroup, RadioGroupCallback, RadioGroupRef} from "../../../common/view/input/Radio";
import {User} from "../../../entity/User";
import {Loading} from "../../../common/view/display/Loading";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {ResponseState} from "../../../common/response/ResponseState";
import {Button} from "../../../common/view/controller/Button";

export const BasicInformationForm: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const userController = new UserController();

    const [updateUserState, setUpdateUserState] = useState<ResponseState>();
    const [formData, setFormData] = useState<UpdateUserRequest>({
        description: null,
        avatar: null,
        email: "",
        gender: 0,
        major: null,
        name: "",
        nickname: null,
        phoneNumber: "",
        position: "",
        qq: null,
        school: "",
        schoolProvince: 0,
        secondaryUnit: "",
        username: "",
        wechat: null
    });
    const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
    const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const updateUserHandler = useRef<ResponseHandlerRef<UpdateUserRequest, any>>(null);
    const usernameInputRef = useRef<InputRef>(null);
    const nicknameInputRef = useRef<InputRef>(null);
    const descriptionInputRef = useRef<InputRef>(null);
    const nameInputRef = useRef<InputRef>(null);
    const genderRadioRef = useRef<RadioGroupRef>(null);
    const schoolProvinceSelectRef = useRef<SelectRef>(null);
    const schoolInputRef = useRef<InputRef>(null);
    const secondaryUnitInputRef = useRef<InputRef>(null);
    const majorInputRef = useRef<InputRef>(null);
    const roleRadioRef = useRef<RadioGroupRef>(null);
    const positionSelectRef = useRef<SelectRef>(null);
    const emailInputRef = useRef<InputRef>(null);
    const phoneNumberInputRef = useRef<InputRef>(null);
    const qqInputRef = useRef<InputRef>(null);
    const wechatInputRef = useRef<InputRef>(null);

    const username = context.user?.username ?? "";
    const avatarPreview = useMemo(
        () => pendingAvatar ?? context.user?.avatar ?? defaultAvatar,
        [pendingAvatar, context.user?.avatar]
    );

    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-我的基本信息";
    }, []);

    useEffect(() => {
        if (!context.user) {
            return;
        }
        usernameInputRef.current?.setValue("" + context.user.username);
        nicknameInputRef.current?.setValue(context.user.nickname ?? "");
        descriptionInputRef.current?.setValue(context.user.description ?? "");
        nameInputRef.current?.setValue("" + context.user.name);
        genderRadioRef.current?.setValue("" + context.user.gender);
        schoolProvinceSelectRef.current?.setValue("" + context.user.schoolProvince);
        schoolInputRef.current?.setValue("" + context.user.school);
        secondaryUnitInputRef.current?.setValue("" + context.user.secondaryUnit);
        majorInputRef.current?.setValue(context.user.major == null ? "" : "" + context.user.major);
        roleRadioRef.current?.setValue("" + context.user.role);
        positionSelectRef.current?.setValue("" + context.user.position);
        emailInputRef.current?.setValue("" + context.user.email);
        phoneNumberInputRef.current?.setValue("" + context.user.phoneNumber);
        qqInputRef.current?.setValue(context.user.qq == null ? "" : "" + context.user.qq);
        wechatInputRef.current?.setValue(context.user.wechat == null ? "" : "" + context.user.wechat);
        setFormData({
            username: context.user.username,
            nickname: context.user.nickname ?? null,
            description: context.user.description ?? null,
            avatar: context.user.avatar ?? null,
            name: context.user.name,
            gender: Number(context.user.gender),
            schoolProvince: Number(context.user.schoolProvince),
            school: context.user.school,
            secondaryUnit: context.user.secondaryUnit,
            major: context.user.major ?? null,
            position: context.user.position,
            email: context.user.email,
            phoneNumber: context.user.phoneNumber,
            qq: context.user.qq ?? null,
            wechat: context.user.wechat ?? null
        });
    }, [context.user]);

    const parseStringValue = (value: string | string[] | undefined): string => {
        if (Array.isArray(value)) {
            return value[0] ?? "";
        }
        return value ?? "";
    };

    const parseNullableValue = (value: string | string[] | undefined): string | null => {
        const parsed = parseStringValue(value);
        return parsed.length === 0 ? null : parsed;
    };

    const parseNumberValue = (value: string | string[] | undefined, fallback: number): number => {
        const parsed = Number(parseStringValue(value));
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const normalizeAvatarUrl = (avatar: string | null | undefined): string | null => {
        if (!avatar || !avatar.trim()) {
            return null;
        }
        const value = avatar.trim();
        if (/^https?:\/\//i.test(value)) {
            return value;
        }
        if (value.startsWith("/uploads/avatar/")) {
            return `${window.location.origin}${value}`;
        }
        if (value.startsWith("uploads/avatar/")) {
            return `${window.location.origin}/${value}`;
        }
        return value;
    };

    const buildRequestBody = (avatarUrl: string | null): UpdateUserRequest => {
        return {
            username: username,
            nickname: parseNullableValue(nicknameInputRef.current?.getValue()),
            description: parseNullableValue(descriptionInputRef.current?.getValue()),
            avatar: avatarUrl,
            name: parseStringValue(nameInputRef.current?.getValue()),
            gender: parseNumberValue(genderRadioRef.current?.getValue(), Number(context.user?.gender ?? 0)),
            schoolProvince: parseNumberValue(schoolProvinceSelectRef.current?.getValue(), Number(context.user?.schoolProvince ?? 0)),
            school: parseStringValue(schoolInputRef.current?.getValue()),
            secondaryUnit: parseStringValue(secondaryUnitInputRef.current?.getValue()),
            major: parseNullableValue(majorInputRef.current?.getValue()),
            position: parseStringValue(positionSelectRef.current?.getValue()),
            email: parseStringValue(emailInputRef.current?.getValue()),
            phoneNumber: parseStringValue(phoneNumberInputRef.current?.getValue()),
            qq: parseNullableValue(qqInputRef.current?.getValue()),
            wechat: parseNullableValue(wechatInputRef.current?.getValue())
        };
    };

    const safeText = (value: any) => {
        if (value === null || value === undefined || value === "") {
            return "--";
        }
        return String(value);
    };

    const formatDateTime = (value: any) => {
        if (!value) {
            return "--";
        }
        const resolved = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(resolved.getTime())) {
            return String(value);
        }
        return resolved.toLocaleString("zh-CN");
    };

    const genderText = Gender.ChineseName.get(Number(context.user?.gender)) ?? "--";
    const provinceText = ProvinceCN.ChineseName.get(Number(context.user?.schoolProvince)) ?? "--";
    const roleText = UserRole.ChineseName.get(Number(context.user?.role)) ?? "--";
    const positionText = context.user?.position ? UserPosition.ChineseName.get(context.user.position) ?? "--" : "--";

    const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        if (!file.type.startsWith("image/")) {
            alert("请选择图片文件");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("头像大小不能超过5MB");
            return;
        }
        setPendingAvatarFile(file);
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = String(reader.result ?? "");
            if (!base64) {
                return;
            }
            setPendingAvatar(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (event: { preventDefault: () => void; }) => {
        const isUsernameValid = usernameInputRef.current?.getValue();
        const isNicknameValid = nicknameInputRef.current?.validate();
        const isDescriptionValid = descriptionInputRef.current?.validate();
        const isNameValid = nameInputRef.current?.validate();
        const isGenderValid = genderRadioRef.current?.validate();
        const isSchoolProvinceValid = schoolProvinceSelectRef.current?.validate();
        const isSchoolValid = schoolInputRef.current?.validate();
        const isSecondaryUnitValid = secondaryUnitInputRef.current?.validate();
        const isMajorValid = majorInputRef.current?.validate();
        const isRoleValid = roleRadioRef.current?.validate();
        const isPositionValid = positionSelectRef.current?.validate();
        const isEmailValid = emailInputRef.current?.validate();
        const isPhoneNumberValid = phoneNumberInputRef.current?.validate();
        const isQqValid = qqInputRef.current?.validate();
        const isWechatValid = wechatInputRef.current?.validate();

        event.preventDefault();
        if (
            isUsernameValid &&
            isNicknameValid &&
            isDescriptionValid &&
            isNameValid &&
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
            isWechatValid
        ) {
            let avatarUrl = normalizeAvatarUrl(context.user?.avatar ?? null);
            if (pendingAvatarFile) {
                try {
                    setAvatarUploading(true);
                    const uploadResult = await userController.uploadAvatar(pendingAvatarFile);
                    if (uploadResult.status !== ReturnObject.Status.SUCCESS) {
                        alert(uploadResult.message ?? "头像上传失败");
                        return;
                    }
                    const uploadData = uploadResult.data as {url?: string; relativeUrl?: string} | undefined;
                    avatarUrl = normalizeAvatarUrl(uploadData?.url ?? null);
                    if (!avatarUrl || !/^https?:\/\//i.test(avatarUrl)) {
                        alert("头像上传成功，但未获取到可访问URL");
                        return;
                    }
                } catch (error) {
                    alert("头像上传失败，请稍后重试");
                    return;
                } finally {
                    setAvatarUploading(false);
                }
            }
            updateUserHandler.current?.request(buildRequestBody(avatarUrl));
        } else {
            alert("请检查表单错误！");
        }
    };

    const updateStatus = (() => {
        if (updateUserState?.networkError) {
            return {
                type: "error",
                text: `网络错误：${updateUserState.networkError.message}`
            };
        }
        if (updateUserState?.returnObject) {
            const status = updateUserState.returnObject.status;
            const statusName = ReturnObject.Status.ChineseName.get(status);
            const isSuccess = status === ReturnObject.Status.SUCCESS;
            return {
                type: isSuccess ? "success" : "error",
                text: `修改用户信息${statusName}：${updateUserState.returnObject.message}`
            };
        }
        return null;
    })();

    const mainForm = (
        <div className="basic-info-page">
            <div className="basic-info-title">
                <h2>基本信息</h2>
                <p>在此页面直接修改你的个人资料与联系方式。</p>
            </div>
            {context.user ? (
                <>
                    <section className="basic-info-card basic-info-hero">
                        <div className="basic-info-profile">
                            <img className="basic-info-avatar" src={avatarPreview} alt="用户头像"/>
                            <div className="basic-info-profile-text">
                                <h3>{safeText(context.user.nickname || context.user.name)}</h3>
                                <span className="basic-info-username">@{safeText(context.user.username)}</span>
                                <div className="basic-info-badges">
                                    <span className="basic-info-badge">{roleText}</span>
                                    <span className="basic-info-badge">{safeText(context.user.school)}</span>
                                    <span className="basic-info-badge">{safeText(context.user.secondaryUnit)}</span>
                                </div>
                                <div className="basic-info-avatar-actions">
                                    <label className="basic-info-avatar-upload">
                                        <input type="file" accept="image/*" onChange={handleAvatarFileChange}/>
                                        更换头像
                                    </label>
                                    {pendingAvatar ? (
                                        <button
                                            type="button"
                                            className="basic-info-avatar-reset"
                                            onClick={() => {
                                                setPendingAvatar(null);
                                                setPendingAvatarFile(null);
                                            }}
                                        >
                                            取消更换
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                        <div className="basic-info-quick">
                            <div className="basic-info-quick-item">
                                <span>注册时间</span>
                                <strong>{formatDateTime(context.user.registrationTime)}</strong>
                            </div>
                            <div className="basic-info-quick-item">
                                <span>手机号</span>
                                <strong>{safeText(context.user.phoneNumber)}</strong>
                            </div>
                            <div className="basic-info-quick-item">
                                <span>邮箱</span>
                                <strong>{safeText(context.user.email)}</strong>
                            </div>
                            <div className="basic-info-quick-item">
                                <span>学校省份</span>
                                <strong>{provinceText}</strong>
                            </div>
                        </div>
                    </section>

                    {updateStatus ? (
                        <div className={`basic-info-alert ${updateStatus.type === "success" ? "is-success" : "is-error"}`}>
                            {updateStatus.text}
                        </div>
                    ) : null}
                    {avatarUploading ? (
                        <div className="basic-info-alert is-success">
                            头像上传中，请稍候...
                        </div>
                    ) : null}

                    <section className="basic-info-card basic-info-form-card">
                        <div className="basic-info-section-head">
                            <h3>编辑资料</h3>
                            <span>修改后点击保存即可生效</span>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="basic-info-form-grid">
                                <div className="basic-info-form-col">
                                    <Input ref={usernameInputRef} type="text" label="用户名" placeholder="请输入用户名" validationRules={User.ValidationRules.username} disabled required />
                                    <Input ref={nicknameInputRef} type="text" label="昵称" placeholder="请输入昵称" onChange={InputCallback.handleDataChange<UpdateUserRequest>("nickname", setFormData, null)} validationRules={User.ValidationRules.nickname} />
                                    <Input ref={descriptionInputRef} type="text" label="描述" placeholder="请输入描述" onChange={InputCallback.handleDataChange<UpdateUserRequest>("description", setFormData, null)} validationRules={User.ValidationRules.description} />
                                    <Input ref={nameInputRef} type="text" label="姓名" placeholder="请输入姓名" onChange={InputCallback.handleDataChange<UpdateUserRequest>("name", setFormData, null)} validationRules={User.ValidationRules.name} required />
                                    <Select ref={schoolProvinceSelectRef} label="学校所在省份" options={User.Options.schoolProvince} onChange={SelectCallback.handleDataChange<UpdateUserRequest>("schoolProvince", setFormData, null)} placeholder="请选择学校所在省份" required showSelectAll maxTagCount={2} />
                                    <Input ref={schoolInputRef} type="text" label="所属学校" placeholder="所属学校" onChange={InputCallback.handleDataChange<UpdateUserRequest>("school", setFormData, null)} validationRules={User.ValidationRules.school} required />
                                    <Input ref={secondaryUnitInputRef} type="text" label="二级单位" placeholder="二级单位" onChange={InputCallback.handleDataChange<UpdateUserRequest>("secondaryUnit", setFormData, null)} validationRules={User.ValidationRules.secondaryUnit} required />
                                    <Input ref={majorInputRef} type="text" label="专业" onChange={InputCallback.handleDataChange<UpdateUserRequest>("major", setFormData, null)} placeholder="专业" validationRules={User.ValidationRules.major} />
                                </div>
                                <div className="basic-info-form-col">
                                    <RadioGroup ref={genderRadioRef} name="gender" label="性别" onChange={RadioGroupCallback.handleDataChange<UpdateUserRequest>("gender", setFormData, null)} size="large" options={User.Options.gender} required layout="horizontal" />
                                    <RadioGroup ref={roleRadioRef} label="用户类型" size="large" options={User.Options.role} required layout="horizontal" disabled />
                                    <Select ref={positionSelectRef} label="职务" options={User.Options.position} onChange={SelectCallback.handleDataChange<UpdateUserRequest>("position", setFormData, null)} placeholder="请选择职务" required showSelectAll maxTagCount={2} />
                                    <Input ref={emailInputRef} type="email" label="Email" placeholder="Email" onChange={InputCallback.handleDataChange<UpdateUserRequest>("email", setFormData, null)} validationRules={User.ValidationRules.email} prefix={<span>@</span>} required />
                                    <Input ref={phoneNumberInputRef} type="text" label="电话号码" placeholder="电话号码" onChange={InputCallback.handleDataChange<UpdateUserRequest>("phoneNumber", setFormData, null)} validationRules={User.ValidationRules.phoneNumber} required />
                                    <Input ref={qqInputRef} type="text" label="QQ" placeholder="QQ" onChange={InputCallback.handleDataChange<UpdateUserRequest>("qq", setFormData, null)} validationRules={User.ValidationRules.qq} />
                                    <Input ref={wechatInputRef} type="text" label="微信" placeholder="微信" onChange={InputCallback.handleDataChange<UpdateUserRequest>("wechat", setFormData, null)} validationRules={User.ValidationRules.wechat} />
                                    <div className="basic-info-form-actions">
                                        <Button type="primary" block summit>保存修改</Button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </section>
                </>
            ) : (
                <div className="basic-info-empty">
                    <p>获取用户信息失败</p>
                </div>
            )}
        </div>
    );

    return (
        <ResponseHandler<UpdateUserRequest, any>
            ref={updateUserHandler}
            request={userController.updateUser}
            setResponseState={setUpdateUserState}
            onRequestEnd={(_, returnObject) => {
                if (returnObject.code === ReturnObject.Code.SUCCESS) {
                    setPendingAvatar(null);
                    setPendingAvatarFile(null);
                    userController.loggedInUser(null).then((result) => {
                        if (result.code === ReturnObject.Code.SUCCESS) {
                            context.setUser?.(result.data ?? null);
                        }
                    }).catch(() => undefined);
                }
            }}
            idleComponent={mainForm}
            loadingComponent={<div>{mainForm}<Loading type="dots" text="修改用户信息中..." color="#2196f3" size="large" fullScreen/></div>}
            handlingReturnObjectComponent={<div>{mainForm}<Loading type="dots" text="处理修改用户信息结果中..." color="#2196f3" size="large" fullScreen/></div>}
            networkErrorComponent={<div>{mainForm}</div>}
            finishedComponent={<div>{mainForm}</div>}
        />
    );
};
