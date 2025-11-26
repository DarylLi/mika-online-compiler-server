export class ChatMessage {
  fromUuid: string;
  toUuid: string;
  content: string;
  timestamp: Date;
  templateId: string;

  constructor(fromUuid: string, toUuid: string, content: string, templateId: string) {
    this.fromUuid = fromUuid;
    this.toUuid = toUuid;
    this.content = content;
    this.templateId = templateId;
    this.timestamp = new Date();
  }
}

