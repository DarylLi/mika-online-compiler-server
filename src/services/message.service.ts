import { Injectable } from '@nestjs/common';
import { ChatMessage } from '../models/message.model';

@Injectable()
export class MessageService {
  private messages: ChatMessage[] = [];

  /**
   * 创建并保存消息
   */
  createMessage(
    fromUuid: string,
    toUuid: string,
    content: string,
    templateId: string,
  ): ChatMessage {
    const message = new ChatMessage(fromUuid, toUuid, content, templateId);
    this.messages.push(message);
    return message;
  }

  /**
   * 获取两个用户之间的消息历史（可选）
   */
  getMessagesBetweenUsers(uuid1: string, uuid2: string, limit: number = 50): ChatMessage[] {
    return this.messages
      .filter(
        (msg) =>
          (msg.fromUuid === uuid1 && msg.toUuid === uuid2) ||
          (msg.fromUuid === uuid2 && msg.toUuid === uuid1),
      )
      .slice(-limit);
  }
}

