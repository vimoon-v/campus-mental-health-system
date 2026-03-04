import {ReplyDTO} from "../../entity/ReplyDTO";
import React, {useRef, useState} from "react";
import {Button} from "../../common/view/controller/Button";
import {Dialog, DialogRef} from "../../common/view/container/Dialog";
import {PostController} from "../../controller/PostController";
import {ResponseState} from "../../common/response/ResponseState";
import {ResponseHandler, ResponseHandlerRef} from "../../common/response/ResponseHandler";
import {Loading} from "../../common/view/display/Loading";
import {ReturnObject} from "../../common/response/ReturnObject";
import defaultAvatar from "../../assets/avatar/default-avatar.png";

export interface ReplyViewProps {
    replyDTO:ReplyDTO;
    mode:'browse'|'report';
    onDeleteReply:(reply:ReplyDTO) => void;
    onReply?: (reply: ReplyDTO) => void;
    currentUsername?: string;
}

export const ReplyView: React.FC<ReplyViewProps> = ({replyDTO,mode,onDeleteReply,onReply,currentUsername}) => {
    const postController = new PostController();
    const confirmDialogRef = useRef<DialogRef>(null);
    const [deleteReplyState,setDeleteReplyState] = useState<ResponseState>();
    const deleteReplyHandlerRef=useRef<ResponseHandlerRef<{replyId:number},null>>(null);
    const deleteReplyResultDialogRef=useRef<DialogRef>(null);
    const avatarSrc = replyDTO.avatar && replyDTO.avatar.trim()
        ? replyDTO.avatar
        : defaultAvatar;
    const replyTimeLabel = (() => {
        const raw = replyDTO.replyTime as unknown as string;
        const date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
            return raw ? String(raw) : "";
        }
        return date.toLocaleString();
    })();




    const deleteReplyResultDialog=(<ResponseHandler<{replyId:number},null>
        ref={deleteReplyHandlerRef}
        request={postController.deleteReply}
        setResponseState={setDeleteReplyState}
        idleComponent={<></>}
        loadingComponent={<Loading type="dots" text='删除中...' color="#2196f3" size="large" fullScreen></Loading>}
        handlingReturnObjectComponent={<Loading type="dots" text='处理删除结果中...' color="#2196f3" size="large" fullScreen></Loading>}
        networkErrorComponent={<Dialog
            autoOpen
            ref={deleteReplyResultDialogRef}
            type="modal"
            title="网络错误"
            showCloseButton
            closeOnBackdropClick
            closeOnEscape
        >
            <div className="layout-flex-column">
                <p className="text-align-left">详情：{deleteReplyState?.networkError?.message}</p>
                <br/>
                <div className="layout-flex-row justify-content-flex-end">
                    <span style={{flexGrow: 3.1}}></span>
                    <Button type="default"
                            style={{flexGrow: 1}} onClick={() => {
                        deleteReplyResultDialogRef.current?.close();
                    }}>返回</Button>
                </div>
            </div>

        </Dialog>}
        finishedComponent={<Dialog
            autoOpen
            ref={deleteReplyResultDialogRef}
            type="modal"
            title={"删除回复" + ReturnObject.Status.ChineseName.get(deleteReplyState?.returnObject?.status)}
            showCloseButton
            closeOnBackdropClick
            closeOnEscape
            onClose={() => {
                if (deleteReplyState?.returnObject?.status === ReturnObject.Status.SUCCESS) {
                    onDeleteReply?.(replyDTO);
                }
            }}
        >
            <div className="layout-flex-column">
                <p className="text-align-left">{deleteReplyState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "删除回复成功" : deleteReplyState?.returnObject?.message}</p>
                <br/>
                <div className="layout-flex-row justify-content-flex-end">
                    <span style={{flexGrow: 3.1}}></span>
                    <Button type={deleteReplyState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "primary" : "default"}
                            style={{flexGrow: 1}} onClick={() => {
                        deleteReplyResultDialogRef.current?.close();
                    }}>{deleteReplyState?.returnObject?.status === ReturnObject.Status.SUCCESS ? "确定" : "返回"}</Button>

                </div>
            </div>

        </Dialog>}
    />);



    const confirmDialog = (<Dialog
        ref={confirmDialogRef}
        type="modal"
        title="删除回复"
        showCloseButton
        closeOnBackdropClick
        closeOnEscape
    >
        <div className="layout-flex-column">
            <p className="text-align-left">确定要删除该回复吗？</p>
            <br/>
            <div className="layout-flex-row justify-content-flex-end">
                <span style={{flexGrow: 2}}></span>
                <Button type="default" style={{flexGrow: 1}} onClick={() => {
                    confirmDialogRef.current?.close();
                }}>返回</Button>
                <span style={{flexGrow: 0.1}}></span>
                <Button type="primary" style={{flexGrow: 1}} onClick={() => {
                    confirmDialogRef.current?.close();
                    deleteReplyHandlerRef.current?.request({replyId: replyDTO.replyId});
                }}>确定</Button>
            </div>
        </div>
    </Dialog>);

    const cardClassName = replyDTO.parentReplyId ? "reply-card reply-card--child" : "reply-card";
    const canDeleteSelfReply = mode === "browse"
        && !!currentUsername
        && replyDTO.username === currentUsername;

    return (<div className={cardClassName}>
        {confirmDialog}
        {deleteReplyResultDialog}
        <div className="reply-content">
            {replyDTO.replyToDisplayName ? (
                <p className="reply-target">回复 @{replyDTO.replyToDisplayName}</p>
            ) : null}
            <p>{replyDTO.content}</p>
        </div>
        <div className="reply-meta">
            <div className="reply-author">
                <div className="reply-avatar">
                    <img src={avatarSrc} alt={`${replyDTO.displayName || "用户"}头像`}/>
                </div>
                <span className="author-name">{replyDTO.displayName}</span>
            </div>
            <div className="reply-time">
                {mode === 'browse' && (
                    <div className="reply-time-action">
                        <Button
                            type="default"
                            size="small"
                            onClick={() => onReply?.(replyDTO)}
                        >
                            回复
                        </Button>
                        {canDeleteSelfReply && (
                            <Button
                                type="default"
                                size="small"
                                color={"#ff5959"}
                                onClick={() => confirmDialogRef.current?.open()}
                            >
                                删除
                            </Button>
                        )}
                    </div>
                )}
                <div className="reply-time-line">
                    <span className="time-icon reply-time-icon"><i className="far fa-clock"></i></span>
                    <span className="reply-time-text">{replyTimeLabel}</span>
                </div>
                {mode === 'report' &&
                    <div className="layout-flex-row">
                        <Button type="primary" summit block color={"#ff5959"} onClick={()=>{confirmDialogRef.current?.open()}}>删除回复</Button>
                    </div>
                }
            </div>
        </div>
    </div>)
}
