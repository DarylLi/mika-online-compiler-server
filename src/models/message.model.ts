export class ChatMessage {
  fromUuid: string;
  toUuid: string;
  content: string;
  timestamp: string;
  templateId: string;

  constructor(fromUuid: string, toUuid: string, content: string, templateId: string) {
    this.fromUuid = fromUuid;
    this.toUuid = toUuid;
    this.content = content;
    this.templateId = templateId;
    this.timestamp = `${new Date().getHours() < 10 ? 0 : ''}${new Date().getHours()}:${new Date().getMinutes() < 10 ? 0 : ''}${new Date().getMinutes()}`; //new Date();
  }
}
