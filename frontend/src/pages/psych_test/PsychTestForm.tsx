import React, { useEffect, useRef, useState } from "react";
import { Divider } from "../../common/view/decoration/Divider";
import { CheckLoginComponent } from "../../component/CheckLoginComponent";
import {
    PsychTest,
    PsychTestAnswer,
    PsychTestController,
    PsychTestResult
} from "../../controller/PsychTestController";
import { useLocation, useNavigate } from "react-router-dom";
import { ResponseHandler, ResponseHandlerRef } from "../../common/response/ResponseHandler";
import { Loading } from "../../common/view/display/Loading";
import { ResponseState } from "../../common/response/ResponseState";
import { ReturnObject } from "../../common/response/ReturnObject";
import { Button } from "../../common/view/controller/Button";
import { PsychTestQuestionView, PsychTestQuestionViewRef } from "./PsychTestQuestionView";
import { UserController } from "../../controller/UserController";
import { AppShell } from "../../layout/AppShell";
import { PageContainer } from "../../layout/PageContainer";
import {User} from "../../entity/User";
import {UserRole} from "../../entity/enums/UserRole";
import {TeacherShell} from "../home/teacher/TeacherShell";

// 修复：统一中文文案，解决乱码问题
const TEXT = {
    submitTest: "提交测试",
    returnEntrance: "返回测试入口",
    return: "返回",
    networkError: "网络错误",
    errorDetail: "详情：",
    notSubmitted: "未提交",
    submittingTest: "提交测试问卷中...",
    handlingTestResult: "处理提交测试问卷结果中...",
    gettingTestQuestions: "获取心理测试问卷中...",
    handlingQuestionResult: "处理获取心理测试问卷结果中...",
    checkFormError: "请检查表单错误！",
    testTitle: "心理测试",
    getQuestions: "获取问卷",
    submitTestResult: "测试提交"
};

// 提取重复的网络错误组件，解决代码重复提示
const NetworkErrorComponent = ({ message }: { message?: string }) => (
    <div>
        <h2>{TEXT.networkError}</h2>
        <p className="auth-error-detail">
            {TEXT.errorDetail}{message}
        </p>
    </div>
);

export const PsychTestForm: React.FC = () => {
    const navigate = useNavigate();
    const psychTestController = new PsychTestController();
    const userController = new UserController();

    const [psychTestState, setPsychTestState] = useState<ResponseState<PsychTest>>();
    const psychQuestionRefList = useRef<PsychTestQuestionViewRef[]>([]);
    const [done, setDone] = useState<boolean>(false);
    const [answerList, setAnswerList] = useState<string[][]>([]); // 修复：初始化空数组，避免undefined
    const [psychTestAnswerState, setPsychTestAnswerState] = useState<ResponseState<PsychTestResult>>();
    const hasSubmittedRef = useRef<boolean>(false);
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const displayName = loggedInUser?.nickname?.trim()
        ? loggedInUser?.nickname
        : loggedInUser?.username ?? null;
    const loggedInAccountUsername = loggedInUser?.username ?? null;
    const loggedInRole = loggedInUser?.role ?? null;
    const roleCode = Number(loggedInRole);
    const isTeacher = roleCode === UserRole.TEACHER;
    const isForbiddenRole = roleCode === UserRole.ADMIN || roleCode === UserRole.SYSTEM_ADMIN;

    const psychTestHandlerRef = useRef<ResponseHandlerRef<{ test: string }, PsychTest>>(null);
    const psychTestAnswerHandlerRef = useRef<ResponseHandlerRef<PsychTestAnswer, PsychTestResult>>(null);

    const urlLocation = useLocation();
    const searchParams = new URLSearchParams(urlLocation.search);
    const paramTest = searchParams.get("test");

    // 修复：添加缺失的依赖，解决ESLint警告
    useEffect(() => {
        userController.loggedInUser(null).then((result) => {
            if (result.code === ReturnObject.Code.SUCCESS && result.data?.username) {
                setLoggedInUser(result.data);
            } else {
                setLoggedInUser(null);
            }
        }).catch(() => {
            setLoggedInUser(null);
        });
    }, [userController]);

    useEffect(() => {
        if (isForbiddenRole) {
            navigate("/home/main", {replace: true});
        }
    }, [isForbiddenRole, navigate]);

    useEffect(() => {
        if (!done || hasSubmittedRef.current) {
            return;
        }
        hasSubmittedRef.current = true;
        psychTestAnswerHandlerRef.current?.request({
            answer: answerList,
            test: paramTest ?? "null" // 简化null判断
        });
    }, [done, answerList, paramTest]);

    // 修复：每次渲染清空ref，避免重复添加
    useEffect(() => {
        psychQuestionRefList.current = [];
    }, [psychTestState?.returnObject?.data?.questions]);

    function getRef(dom: PsychTestQuestionViewRef | null) {
        if (dom) {
            psychQuestionRefList.current.push(dom);
        }
    }

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        let isQuestionValid = true;
        // 修复：简化条件判断，解决代码风格提示
        for (const ref of psychQuestionRefList.current) {
            if (ref && !ref.validate()) {
                isQuestionValid = false;
                break; // 发现错误立即终止循环
            }
        }

        if (isQuestionValid) {
            setDone(true);
        } else {
            alert(TEXT.checkFormError);
        }
    };

    const renderResult = (
        <ResponseHandler<PsychTestAnswer, PsychTestResult>
            ref={psychTestAnswerHandlerRef}
            request={psychTestController.answer}
            setResponseState={setPsychTestAnswerState}
            idleComponent={<div><h2>{TEXT.notSubmitted}</h2></div>}
            loadingComponent={<Loading type="dots" text={TEXT.submittingTest} color="#2196f3" size="large" fullScreen/>}
            handlingReturnObjectComponent={<Loading type="dots" text={TEXT.handlingTestResult} color="#2196f3" size="large" fullScreen/>}
            // 使用提取的公共组件，解决代码重复
            networkErrorComponent={<NetworkErrorComponent message={psychTestAnswerState?.networkError?.message} />}
            finishedComponent={
                <div>
                    <h2>
                        {TEXT.submitTestResult}{ReturnObject.Status.ChineseName.get(psychTestAnswerState?.returnObject?.status)}
                    </h2>
                    {psychTestAnswerState?.returnObject?.status !== ReturnObject.Status.SUCCESS && (
                        <div>
                            <p>{psychTestAnswerState?.returnObject?.message}</p>
                        </div>
                    )}
                    {psychTestAnswerState?.returnObject?.data?.message && (
                        <p>{psychTestAnswerState?.returnObject?.data?.message}</p>
                    )}
                </div>
            }
        />
    );

    const renderQuestion = (
        <ResponseHandler<{ test: string }, PsychTest>
            ref={psychTestHandlerRef}
            request={psychTestController.getTest}
            setResponseState={setPsychTestState}
            autoRequest={{ test: paramTest ?? "null" }} // 简化null判断
            loadingComponent={<Loading type="dots" text={TEXT.gettingTestQuestions} color="#2196f3" size="large" fullScreen/>}
            handlingReturnObjectComponent={<Loading type="dots" text={TEXT.handlingQuestionResult} color="#2196f3" size="large" fullScreen/>}
            onHandlingReturnObject={(requestBody, returnObject) => {
                // 修复：数组修改要创建新数组，触发state更新
                const newAnswerList = Array(returnObject.data?.questions.length || 0).fill([]);
                setAnswerList(newAnswerList);
            }}
            // 使用提取的公共组件，解决代码重复
            networkErrorComponent={<NetworkErrorComponent message={psychTestState?.networkError?.message} />}
            finishedComponent={
                !(psychTestState?.returnObject?.status === ReturnObject.Status.SUCCESS) ? (
                    <div>
                        <h2>
                            {TEXT.getQuestions}{ReturnObject.Status.ChineseName.get(psychTestState?.returnObject?.status)}
                        </h2>
                        <p className="auth-error-detail">
                            {TEXT.errorDetail}{psychTestState?.returnObject?.message}
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="psych-test-description">
                            {psychTestState?.returnObject?.data?.description}
                        </p>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                            <div className="psych-test-question-box">
                                <form onSubmit={handleSubmit}>
                                    {psychTestState?.returnObject?.data?.questions.map((q, i) => (
                                        <PsychTestQuestionView
                                            key={i} // 修复：循环添加key，避免React警告
                                            ref={getRef}
                                            style={{ marginBottom: "50px" }}
                                            question={q}
                                            onChange={(a) => {
                                                // 修复：数组修改要创建新数组，触发state更新
                                                const newAnswerList = [...answerList];
                                                newAnswerList[i] = a;
                                                setAnswerList(newAnswerList);
                                            }}
                                        />
                                    ))}
                                    {/* 修复：解决Button组件不支持htmlType的TS错误，改用原生button包裹 */}
                                    <button
                                        type="submit"
                                        style={{
                                            border: 'none',
                                            padding: 0,
                                            width: '100%',
                                            backgroundColor: 'transparent'
                                        }}
                                    >
                                        <Button type="primary" block>
                                            {TEXT.submitTest}
                                        </Button>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        />
    );

    const pageContent = (
        <div className="layout-flex-column">
            <div className="layout-flex-row align-items-center">
                <h2 style={{ flexGrow: 1 }}>
                    {psychTestState?.returnObject?.data?.title || TEXT.testTitle}
                </h2>
                <Button type="default" onClick={() => navigate("/psych_test_entrance")}>
                    {TEXT.return}
                </Button>
            </div>
            <Divider color="Black" spacing="0" />
            <CheckLoginComponent>
                {!done && renderQuestion}
                {done && renderResult}
            </CheckLoginComponent>
        </div>
    );

    if (isForbiddenRole) {
        return null;
    }

    if (isTeacher) {
        return <TeacherShell user={loggedInUser}>{pageContent}</TeacherShell>;
    }

    return (
        <AppShell
            username={displayName}
            accountUsername={loggedInAccountUsername}
            avatar={loggedInUser?.avatar ?? null}
            role={loggedInRole}
            mainPadding="30px 0"
        >
            <PageContainer>{pageContent}</PageContainer>
        </AppShell>
    );
};
