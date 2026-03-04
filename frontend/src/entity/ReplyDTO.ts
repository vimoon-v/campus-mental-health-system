export interface ReplyDTO {
    replyId:number;
    content:string;
    postId:number;
    displayName:string;
    username:string;
    avatar?:string|null;
    replyTime:Date;
    parentReplyId?:number|null;
    replyToDisplayName?:string|null;
}
