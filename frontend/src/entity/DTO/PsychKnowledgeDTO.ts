import {ReviewStatus} from "../enums/ReviewStatus";

export interface PsychKnowledgeDTO {
    knowledgeId:number;
    title:string;
    content:string;
    summary?:string;
    tags?:string;
    coverImage?:string;
    category?:string;
    viewCount?:number;
    likeCount?:number;
    liked?:boolean;
    teacherPublisherUsername: string;
    teacherPublisherDisplayName:string;
    teacherPublisherAvatar?:string | null;
    publishTime:Date;
    publishStatus?:string;
    scheduleTime?:Date;
    visibleRange?:string;
    allowComment?:boolean;
    recommended?:boolean;
    adminReviewerUsername?:string|null;
    reviewTime?:Date|null;
    reviewStatus:ReviewStatus;
}
