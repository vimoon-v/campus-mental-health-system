//React框架
import React, {useEffect} from "react";
//样式
import './Home.css'
import '../../css/LayoutFlex.css'
import {useOutletContext} from "react-router";
import {Homepage} from "./HomepageForm";
import {UserRole} from "../../entity/enums/UserRole";
import {TeacherDashboard} from "./teacher/TeacherDashboard";
import {AdminWorkbench} from "./admin/AdminWorkbench";
import {StudentHomeDashboard} from "./student/StudentHomeDashboard";


//主页
export const MainForm: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();

    //钩子
    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-首页";
    }, []);

    if (!context.user) {
        return null;
    }

    if (Number(context.user.role) === UserRole.STUDENT) {
        return <StudentHomeDashboard user={context.user}/>;
    }

    if (UserRole.normalize(context.user?.role) === UserRole.TEACHER) {
        return <TeacherDashboard/>;
    }
    if (UserRole.isAdminRole(context.user?.role)) {
        return <AdminWorkbench/>;
    }

    return null;
}
