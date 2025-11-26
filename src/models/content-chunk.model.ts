export class ContentChunk {
  chunkIndex: number;
  totalChunks: number;
  content: string;
  templateId: string;
  fromUuid: string;
  toUuid: string;
  path: string;

  constructor(
    chunkIndex: number,
    totalChunks: number,
    content: string,
    templateId: string,
    fromUuid: string,
    toUuid: string,
    path: string,
  ) {
    this.chunkIndex = chunkIndex;
    this.totalChunks = totalChunks;
    this.content = content;
    this.templateId = templateId;
    this.fromUuid = fromUuid;
    this.toUuid = toUuid;
    this.path = path;
  }
}
