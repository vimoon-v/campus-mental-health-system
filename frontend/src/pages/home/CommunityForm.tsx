//React框架
import React, {useEffect, useRef, useState} from "react";
//样式
import './Home.css'
import '../../css/LayoutFlex.css'
import {useLocation, useNavigate} from "react-router-dom";
import {Outlet, useOutletContext} from "react-router";
import {Homepage} from "./HomepageForm";
import {BrowseForm} from "./community/BrowseForm";
import {PostForm} from "./community/PostForm";
import {ReportForm} from "./community/ReportForm";

export const Community_Children=[
    {path:"browse/",element:<BrowseForm/>},
    {path:"post/",element:<PostForm/>},
    {path:"report/",element:<ReportForm/>},
];

//主页
export const CommunityForm: React.FC = () => {
    const context=useOutletContext<Homepage.OutletContext>();
    const urlLocation = useLocation();
    const navigate = useNavigate();
    //钩子
    useEffect(() => {
        if(urlLocation.pathname==='/home/community'||urlLocation.pathname==='/home/community/'){
            navigate("/home/community/browse");
        }
    }, []);


    return (
        <div className="layout-flex-column">
            <Outlet context={context}/>
        </div>
    );
}
