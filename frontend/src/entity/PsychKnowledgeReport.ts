export interface PsychKnowledgeReport {
    reportId: number;
    knowledgeId: number;
    reportType?: string;
    reportReason: string;
    reporterUsername?: string;
    reportTime: Date;
}
