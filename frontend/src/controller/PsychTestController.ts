
//心理题目选项
import {ReturnObject} from "../common/response/ReturnObject";
import api from "../utils/api/api_config";
import {Controller} from "./Controller";

export interface PsychOptions{
    key: string;
    text: string;
    score: number;
}

//心理问卷题目
export interface PsychQuestion{
    id: number;
    title: string;
    content: string;
    options: PsychOptions[];
    multiOptional: boolean;
}

//心理问卷
export interface PsychTest{
    id: number;
    title: string;
    description: string;
    questions: PsychQuestion[];
}

export interface PsychTestResult{
    message: string;
}



export interface PsychTestAnswer{
    test?: string;
    answer?: string[][];
}


export interface PsychTestQueryListItem {
    className:string;
    title:string;
    description:string;
    questionsNumber:number;
    category?: string;
    durationMinutes?: number;
    rating?: number;
    participants?: number;
}

export interface PsychAssessmentRecordDTO {
    assessmentId: number;
    assessmentClass: string;
    assessmentName: string;
    testUsername: string;
    testName: string;
    assessmentReport: string;
    assessmentTime: Date;
}

export interface PsychTestManageListItem {
    testId: number;
    title: string;
    description?: string;
    category: string;
    gradeScope?: "all" | "freshman" | "sophomore" | "junior" | "senior";
    status: string;
    questionsNumber: number;
    participants: number;
    durationMinutes?: number;
    passRate?: number;
    rating?: number;
    createdAt?: string;
    publishTime?: string;
}

export interface PsychTestManageOption {
    optionId?: number;
    label: string;
    score?: number;
    orderIndex?: number;
}

export interface PsychTestManageQuestion {
    questionId?: number;
    testId?: number;
    title: string;
    type: string;
    orderIndex?: number;
    options: PsychTestManageOption[];
}

export interface PsychTestManageDetail {
    testId: number;
    title: string;
    description?: string;
    category: string;
    gradeScope?: "all" | "freshman" | "sophomore" | "junior" | "senior";
    status: string;
    durationMinutes?: number;
    allowRepeat?: boolean;
    showResult?: boolean;
    autoWarn?: boolean;
    validFrom?: string;
    validTo?: string;
    participants?: number;
    passRate?: number;
    rating?: number;
    createdAt?: string;
    publishTime?: string;
    questions: PsychTestManageQuestion[];
}

export interface PsychTestManageRequest {
    title?: string;
    description?: string;
    category?: string;
    gradeScope?: "all" | "freshman" | "sophomore" | "junior" | "senior";
    durationMinutes?: number;
    allowRepeat?: boolean;
    showResult?: boolean;
    autoWarn?: boolean;
    status?: string;
    validFrom?: string;
    validTo?: string;
    passRate?: number;
    rating?: number;
}

export interface PsychTestManageUpdateRequest extends PsychTestManageRequest {
    testId: number;
}

export interface PsychTestManageQuestionRequest {
    testId: number;
    title: string;
    type: string;
    options: PsychTestManageOption[];
}

export interface PsychTestManageQuestionUpdateRequest {
    questionId: number;
    title?: string;
    type?: string;
    options?: PsychTestManageOption[];
}

export interface PsychTestManageQuestionReorderRequest {
    testId: number;
    questionIds: number[];
}

export class PsychTestController extends Controller{

    //根据名称获取测试问卷
    getTest=this._get<{test:string},PsychTest>("api/psych_test/get");

    //列出所有心理测试问卷类名
    listAll=this._get<null,PsychTestQueryListItem[]>("api/psych_test/list_all");

    //回答测试题
    answer=this._post<PsychTestAnswer,PsychTestResult>("api/psych_test/answer");

    //列出我的测评记录
    listMine=this._get<null,PsychAssessmentRecordDTO[]>("api/psych_test/record/list_mine");

    //管理端接口
    manageList=this._get<{keyword?:string; status?:string; category?:string},PsychTestManageListItem[]>("api/psych_test/manage/list");
    manageDetail=this._get<{testId:number},PsychTestManageDetail>("api/psych_test/manage/detail");
    manageCreate=this._post<PsychTestManageRequest,{testId:number}>("api/psych_test/manage/create");
    manageUpdate=this._post<PsychTestManageUpdateRequest,any>("api/psych_test/manage/update");
    managePublish=this._post<{testId:number},any>("api/psych_test/manage/publish");
    manageArchive=this._post<{testId:number},any>("api/psych_test/manage/archive");
    manageDraft=this._post<{testId:number},any>("api/psych_test/manage/draft");
    manageDelete=this._post<{testId:number},any>("api/psych_test/manage/delete");

    manageQuestionAdd=this._post<PsychTestManageQuestionRequest,{questionId:number}>("api/psych_test/manage/question/add");
    manageQuestionUpdate=this._post<PsychTestManageQuestionUpdateRequest,any>("api/psych_test/manage/question/update");
    manageQuestionDelete=this._post<{questionId:number},any>("api/psych_test/manage/question/delete");
    manageQuestionReorder=this._post<PsychTestManageQuestionReorderRequest,any>("api/psych_test/manage/question/reorder");

    manageExport=this._get<null,any>("api/psych_test/manage/export");
}
