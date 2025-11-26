export class User {
  uuid: string;
  templateId: string;
  socketId: string;
  isRequestingHelp: boolean;
  isJoiningHelp: boolean;
  connectedAt: Date;

  constructor(socketId: string, uuid: string, templateId: string) {
    this.uuid = uuid;
    this.templateId = templateId;
    this.socketId = socketId;
    this.isRequestingHelp = false;
    this.isJoiningHelp = false;
    this.connectedAt = new Date();
  }
}
