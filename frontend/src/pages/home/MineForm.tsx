import React, {useEffect} from "react";
import {NavLink, useLocation, useNavigate} from "react-router-dom";
import {Outlet, useOutletContext} from "react-router";
import "./Home.css";
import "../../css/LayoutFlex.css";
import {BasicInformationForm} from "./mine/BasicInformationForm";
import {CloseAccount} from "./mine/CloseAccount";
import {UpdatePassword} from "./mine/UpdatePassword";
import {Homepage} from "./HomepageForm";
import {Button} from "../../common/view/controller/Button";
import {UserController} from "../../controller/UserController";

export const MineForm_Children = [
    {path: "basic_information", element: <BasicInformationForm/>},
    {path: "close_account", element: <CloseAccount/>},
    {path: "update_password", element: <UpdatePassword/>},
    
];

export const MineForm: React.FC = () => {
    const urlLocation = useLocation();
    const context = useOutletContext<Homepage.OutletContext>();
    const navigate = useNavigate();
    const userController = new UserController();

    const hideSideMenu = false;

    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-我的";
        if (urlLocation.pathname === "/home/mine" || urlLocation.pathname === "/home/mine/") {
            navigate("/home/mine/basic_information");
        }
    });

    const handleLogout = async () => {
        try {
            await userController.logout(null);
        } catch (error) {
            console.warn("logout request failed", error);
        } finally {
            navigate("/auth/login");
        }
    };

    return (
        <div className="mine-page">
            <div className="mine-topbar">
                <div className="mine-tabs">
                    <NavLink
                        to="basic_information"
                        className={({isActive}) => `mine-tab${isActive ? " active" : ""}`}
                    >
                        基本信息
                    </NavLink>
                    <NavLink
                        to="update_password"
                        className={({isActive}) => `mine-tab${isActive ? " active" : ""}`}
                    >
                        修改密码
                    </NavLink>
                    <NavLink
                        to="close_account"
                        className={({isActive}) => `mine-tab mine-tab-danger${isActive ? " active" : ""}`}
                    >
                        注销账号
                    </NavLink>
                </div>
                <div className="mine-actions">
                    <Button type="default" onClick={handleLogout}>退出登录</Button>
                </div>
            </div>
            <div className="mine-content">
                <Outlet context={context}/>
            </div>
        </div>
    );
};
