export interface PostDTO {
    postId:number;
    title:string;
    content:string;
    displayName:string;
    username:string|null;
    avatar?: string|null;
    isAnonymous:boolean;
    isPublic:boolean;
    needReply?: boolean;
    allowComment?: boolean;
    showInRecommend?: boolean;
    anonymousLike?: boolean;
    primaryTag?: string|null;
    publishTime:Date;
    likeCount?:number;
    favoriteCount?:number;
}
