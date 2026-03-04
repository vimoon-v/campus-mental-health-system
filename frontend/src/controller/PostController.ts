import {ReturnObject} from "../common/response/ReturnObject";
import api from "../utils/api/api_config";
import {PostDTO} from "../entity/PostDTO";
import {ReplyDTO} from "../entity/ReplyDTO";
import {as} from "react-router/dist/production/routeModules-BmVo7q9e";
import {Controller} from "./Controller";
import {PostReport} from "../entity/PostReport";

export interface PostRequest {
    title: string;
    content: string;
    username: string;
    isAnonymous: boolean;
    isPublic: boolean;
    primaryTag?: string;
    needReply?: boolean;
    allowComment?: boolean;
    showInRecommend?: boolean;
    anonymousLike?: boolean;
}

export interface ReplyRequest {
    postId:number;
    content:string;
    username:string;
    parentReplyId?:number|null;
}

export interface PostReportRequest {
    postId:number;
    reportType:string;
    reportReason:string;
    reporterUsername?:string;
}

export interface PostLikeToggleRequest {
    postId:number;
    username:string;
}

export interface PostLikeToggleResponse {
    liked:boolean;
    likeCount:number;
}

export interface PostFavoriteToggleRequest {
    postId:number;
    username:string;
}

export interface PostFavoriteToggleResponse {
    favorited:boolean;
    favoriteCount:number;
}


export class PostController extends Controller{


    //发帖
    post =this._post<PostRequest,any>("api/post/post");
    //回帖
    reply=this._post<ReplyRequest,any>("api/post/reply");
    //获取所有公开发帖
    getAllPublicPost=this._get<null,PostDTO[]>("api/post/all_public_post");
    //获取当前用户发布的帖子
    getMyPosts=this._get<null,PostDTO[]>("api/post/my_posts");
    //获取当前用户收藏的帖子
    getMyFavoritePosts=this._get<null,PostDTO[]>("api/post/my_favorite_posts");
    //获取被举报的发帖
    getAllReportedPost=this._get<null,PostDTO[]>("api/post/all_reported_post");
    //获取某一帖子下的所有回复
    getAllReplies=this._get<{postId:number},ReplyDTO[]>("api/post/all_replies");
    //举报帖子
    report=this._post<PostReportRequest,any>("api/post/report");
    //所有举报
    getAllReports=this._get<{postId:number},PostReport[]>("api/post/all_reports");
    //删除帖子
    deletePost=this._post<{postId:number},any>("api/post/delete_post");
    //删除回复
    deleteReply=this._post<{replyId:number},any>("api/post/delete_reply");
    //删除举报
    deleteReport=this._post<{reportId:number},any>("api/post/delete_report");
    //点赞/取消点赞
    toggleLike=this._post<PostLikeToggleRequest,PostLikeToggleResponse>("api/post/toggle_like");
    //收藏/取消收藏
    toggleFavorite=this._post<PostFavoriteToggleRequest,PostFavoriteToggleResponse>("api/post/toggle_favorite");
}
