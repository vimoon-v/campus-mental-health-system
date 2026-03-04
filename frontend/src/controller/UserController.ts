import {User} from "../entity/User";
import {ReturnObject} from "../common/response/ReturnObject";
import api from "../utils/api/api_config";
import {Controller} from "./Controller";



//登录请求类型
export interface LoginRequest{
    username?: string;
    password?: string;
    role?: string;
    schoolProvince?: string;
    school?: string;
    captcha?: string;
    captchaKey?:string;
}

//注册请求类型
export interface SignupRequest{
    nickname?: string;
    avatar?: string|null;
    name?: string;
    gender?: string;
    schoolProvince?: string;
    school?: string;
    secondaryUnit?: string;
    major?: string|null;
    role?: string;
    position?: string;
    email?: string;
    phoneNumber?: string;
    qq?: string|null;
    wechat?: string|null;
    username?: string;
    password?: string;
    confirmedPassword?:string;
    captcha?: string;
    captchaKey?:string;
}

//更新密码请求类型
export interface UpdatePasswordRequest{
    username?: string;
    oldPassword?: string;
    newPassword?: string;
    confirmedNewPassword?: string;
    captcha?: string;
    captchaKey?:string;
}

//注销账号请求类型
export interface CloseAccountRequest{
    username?: string;
    password?: string;
    captcha?: string;
    captchaKey?:string;
}


//更新用户信息
export interface UpdateUserRequest{
    username:string;
    nickname:string|null;
    description:string|null;
    avatar:string|null;
    name:string;
    gender:number,
    schoolProvince:number,
    school:string;
    secondaryUnit:string;
    major:string|null;
    position:string,
    email:string;
    phoneNumber:string;
    qq:string|null,
	    wechat:string|null,
	}

export interface AdminDisableUserRequest{
    username:string;
}

export interface AdminEnableUserRequest{
    username:string;
    newPassword?:string;
}

export interface AdminResetPasswordRequest{
    username:string;
    newPassword?:string;
}

export interface AdminDeleteUserRequest{
    username:string;
}

export interface AdminUpdateUserRequest{
    username:string;
    nickname?:string|null;
    description?:string|null;
    avatar?:string|null;
    name?:string;
    gender?:number|string;
    schoolProvince?:number|string;
    school?:string;
    secondaryUnit?:string;
    major?:string|null;
    role?:number|string;
    position?:string;
    email?:string;
    phoneNumber?:string;
    qq?:string|null;
    wechat?:string|null;
}

export interface AdminScopeRequest{
    schoolProvince?:number|string|null;
    school?:string|null;
}

export interface AdminScopeResult{
    enabled:boolean;
    schoolProvince?:number|null;
    school?:string|null;
}

export interface UploadAvatarResponse{
    url:string;
    relativeUrl?:string;
}

export class UserController extends Controller{

    //用户登录
    login=this._post<LoginRequest,any>("api/user/login");
    //用户注册
    signup=this._post<SignupRequest,any>("api/user/signup");
    //检查用户登录
    checkLogin=this._get<null,any>("api/user/check_login");
    //获取已经登录的用户信息
    loggedInUser=this._get<null,User>("api/user/logged-in_user");
    //执行登出操作
    logout=this._post<null,any>("api/user/logout");
    //更新密码
    updatePassword=this._post<UpdatePasswordRequest,any>("api/user/update_password");
    //注销账号
    closeAccount=this._post<CloseAccountRequest,any>("api/user/close_account");
    //更新用户信息
    updateUser=this._post<UpdateUserRequest,any>("api/user/update_user");
    //上传头像，返回可访问URL
    uploadAvatar=async (file: File): Promise<ReturnObject<UploadAvatarResponse>> => {
        const formData = new FormData();
        formData.append("file", file);
        let result:ReturnObject<UploadAvatarResponse>= {code:0,status:"",timestamp:0};
        await api.post<ReturnObject<UploadAvatarResponse>>(
            "api/user/upload_avatar",
            formData,
            {headers: {"Content-Type": "multipart/form-data"}}
        ).then(response => {
            // @ts-ignore
            result=response;
        });
        return result;
    };
    //根据学校所在省份和学校获取教师
    getAllTeachers=this._get<{schoolProvince:number,school:string},User[]>("api/user/all_teachers");
	    //管理员获取所有用户
	    listAll=this._get<null,User[]>("api/user/list_all");
    //管理员获取所有禁用用户名
    listDisabledUsernames=this._get<null,string[]>("api/user/admin/disabled_usernames");
    //管理员禁用账号
    adminDisable=this._post<AdminDisableUserRequest,any>("api/user/admin/disable");
    //管理员启用账号
    adminEnable=this._post<AdminEnableUserRequest,any>("api/user/admin/enable");
    //管理员重置密码
    adminResetPassword=this._post<AdminResetPasswordRequest,any>("api/user/admin/reset_password");
    //管理员删除账号
    adminDelete=this._post<AdminDeleteUserRequest,any>("api/user/admin/delete");
    //管理员更新用户信息
    adminUpdate=this._post<AdminUpdateUserRequest,any>("api/user/admin/update");
    //平台管理员学校视角
    getAdminScope=this._get<null,AdminScopeResult>("api/user/admin/scope");
    setAdminScope=this._post<AdminScopeRequest,AdminScopeResult>("api/user/admin/scope");
	}
