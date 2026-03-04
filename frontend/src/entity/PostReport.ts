export interface PostReport {
    reportId: number;
    postId: number;
    reportType?: string;
    reportReason: string;
    reporterUsername: string;
    reportTime: Date;
}
