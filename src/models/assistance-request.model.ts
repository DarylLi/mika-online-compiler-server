export class AssistanceRequest {
  requesterUuid: string;
  templateId: string;
  templateContent: string;
  createdAt: Date;
  helperUuid?: string;
  show: boolean;

  constructor(requesterUuid: string, templateId: string, templateContent: string) {
    this.requesterUuid = requesterUuid;
    this.templateId = templateId;
    this.templateContent = templateContent;
    this.createdAt = new Date();
    this.show = true;
  }
}
