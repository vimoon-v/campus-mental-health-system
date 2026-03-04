//React框架
import React, {useEffect} from "react";
//样式
import './Home.css'
import '../../css/LayoutFlex.css'
import {useOutletContext} from "react-router";
import {Homepage} from "./HomepageForm";
import {UserRole} from "../../entity/enums/UserRole";
import {AppointmentStudentForm} from "./appointment/AppointmentStudentForm";
import {AppointmentTeacherForm} from "./appointment/AppointmentTeacherForm";
import {AppointmentAdminForm} from "./appointment/AppointmentAdminForm";
//自定义组件

//主页
export const AppointmentForm: React.FC = () => {

    const context=useOutletContext<Homepage.OutletContext>();
    let mainForm:any=null;

    //钩子
    useEffect(() => {
        document.title = "高校心理咨询预约与匿名交流平台-预约";
    }, []);

    if(UserRole.normalize(context.user?.role)===UserRole.STUDENT){
        mainForm=(<AppointmentStudentForm studentUser={context.user}/>);
    }

    if(UserRole.normalize(context.user?.role)===UserRole.TEACHER){
        mainForm=(<AppointmentTeacherForm teacherUser={context.user}/>);
    }

    if(UserRole.isAdminRole(context.user?.role)){
        mainForm=(<AppointmentAdminForm adminUser={context.user}/>);
    }

    if (UserRole.normalize(context.user?.role) === UserRole.STUDENT) {
        return (<div className="layout-flex-column">{mainForm}</div>);
    }

    return (<div className="layout-flex-column">
        <div>
            {UserRole.isAdminRole(context.user?.role)?(<h2>
                所有预约记录管理
            </h2>):(<h2>
                {UserRole.ChineseName.get(UserRole.normalize(context.user?.role))}预约
            </h2>)}

        </div>
        {mainForm}
    </div>);

}
