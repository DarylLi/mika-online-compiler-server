import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { AssistanceService } from '../services/assistance.service';
import { MessageService } from '../services/message.service';
import { ContentService } from '../services/content.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket'],
})
export class EditorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EditorGateway.name);
  private clients: Map<string, WebSocket> = new Map(); // socketId -> WebSocket

  constructor(
    private readonly userService: UserService,
    private readonly assistanceService: AssistanceService,
    private readonly messageService: MessageService,
    private readonly contentService: ContentService,
  ) {}

  /**
   * 用户连接时触发
   */
  handleConnection(client: WebSocket) {
    const socketId = this.generateSocketId();
    this.clients.set(socketId, client);
    (client as any).socketId = socketId;

    this.logger.log(`客户端连接: ${socketId}`);

    // 创建用户并返回用户信息
    const userInfo = this.userService.createUser(socketId);

    // 发送用户信息给客户端
    this.sendMessage(client, 'user-connected', userInfo);

    // 广播当前协助请求列表
    this.broadcastAssistanceList();

    // 监听消息
    client.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(socketId, message);
      } catch (error) {
        this.logger.error(`消息解析错误: ${error.message}`);
        this.sendMessage(client, 'error', { message: '消息格式错误' });
      }
    });
  }

  /**
   * 用户断开连接时触发
   */
  handleDisconnect(client: WebSocket) {
    const socketId = (client as any).socketId;
    if (!socketId) return;

    this.logger.log(`客户端断开: ${socketId}`);

    const user = this.userService.getUserBySocketId(socketId);
    if (user) {
      // 如果用户正在请求协助，结束协助请求
      if (user.isRequestingHelp) {
        this.assistanceService.endAssistance(user.uuid);
        this.broadcastAssistanceList();
      } else if (user.isJoiningHelp) {
        // 协作列表重新展示当前协作
        this.assistanceService.showAssistanceRequest(user.uuid);
        // 告知协作者跑路
        const curServicce = this.assistanceService.getAssistanceRequestByHelper(user.uuid);
        const helpTo = this.userService.getUserByUuid(curServicce.requesterUuid);
        const curClient = this.clients.get(helpTo.socketId);
        this.sendMessage(curClient, 'helper-leave', { success: true });
        this.broadcastAssistanceList();
      }
      // 移除用户
      this.userService.removeUser(socketId);
    }

    this.clients.delete(socketId);
  }

  /**
   * 处理客户端消息
   */
  private handleClientMessage(socketId: string, message: any) {
    const client = this.clients.get(socketId);
    if (!client) return;

    const user = this.userService.getUserBySocketId(socketId);
    if (!user) {
      this.sendMessage(client, 'error', { message: '用户不存在' });
      return;
    }

    switch (message.event) {
      case 'request-assistance':
        this.handleRequestAssistance(client, user, message.data);
        break;
      case 'join-assistance':
        this.handleJoinAssistance(client, user, message.data);
        break;
      case 'send-template-content':
        this.handleSendTemplateContent(client, user, message.data);
        break;
      case 'switch-content-file':
        this.handleSwitchContentFile(client, user, message.data);
        break;
      case 'send-message':
        this.handleSendMessage(client, user, message.data);
        break;
      case 'end-assistance':
        this.handleEndAssistance(client, user, message.data);
        break;
      case 'get-assistance-list':
        this.handleGetAssistanceList(client);
        break;
      default:
        this.sendMessage(client, 'error', { message: '未知的事件类型' });
    }
  }

  /**
   * 请求协助
   */
  private handleRequestAssistance(
    client: WebSocket,
    user: any,
    data: { templateId?: string; templateContent?: string },
  ) {
    // 创建协助请求
    this.assistanceService.createAssistanceRequest(
      user.uuid,
      data.templateId || user.templateId,
      data.templateContent || '',
    );

    // 广播更新后的协助列表
    this.broadcastAssistanceList();

    this.sendMessage(client, 'assistance-requested', { success: true });
    this.logger.log(`用户 ${user.uuid} 请求协助`);
  }

  /**
   * 加入协助（协助者加入）
   */
  private handleJoinAssistance(client: WebSocket, helper: any, data: { requesterUuid: string }) {
    const request = this.assistanceService.getAssistanceRequest(data.requesterUuid);
    if (!request) {
      this.sendMessage(client, 'error', { message: '协助请求不存在' });
      return;
    }

    // 设置协助者
    this.assistanceService.setHelper(data.requesterUuid, helper.uuid);
    // 不让他人加入该协助
    this.assistanceService.hideAssistanceRequest(helper.uuid);
    // 更新协助者状态
    this.assistanceService.joinAssistanceRequest(helper.uuid);
    this.broadcastAssistanceList();
    const requester = this.userService.getUserByUuid(data.requesterUuid);
    if (requester) {
      const requesterClient = this.clients.get(requester.socketId);
      if (requesterClient) {
        // 通知请求者有人加入协助
        this.sendMessage(requesterClient, 'helper-joined', {
          helperUuid: helper.uuid,
          templateId: request.templateId,
        });
      }

      // 通知协助者成功加入
      this.sendMessage(client, 'assistance-joined', {
        requesterUuid: data.requesterUuid,
        templateId: request.templateId,
      });

      this.logger.log(`用户 ${helper.uuid} 加入协助 ${data.requesterUuid}`);
    }
  }

  /**
   * 发送模板内容（分段传输）
   * 支持字符串或 JSON 对象/数组
   */
  private handleSendTemplateContent(
    client: WebSocket,
    sender: any,
    data: { content: string | object | any[]; toUuid: string; path: string; templateId: string },
  ) {
    const receiver = this.userService.getUserByUuid(data.toUuid);
    if (!receiver) {
      this.sendMessage(client, 'error', { message: '接收者不存在' });
      return;
    }

    // 分割内容为多个分片
    const chunks = this.contentService.splitContent(
      data.content,
      data.templateId,
      sender.uuid,
      data.toUuid,
      data.path,
    );

    const receiverClient = this.clients.get(receiver.socketId);
    if (receiverClient) {
      // 发送每个分片
      chunks.forEach((chunk) => {
        this.sendMessage(receiverClient, 'template-content-chunk', {
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks,
          content: chunk.content,
          templateId: chunk.templateId,
          fromUuid: chunk.fromUuid,
          path: data.path,
        });
      });
    }

    this.logger.log(
      `用户 ${sender.uuid} 向 ${data.toUuid} 发送模板内容，共 ${chunks.length} 个分片`,
    );
  }
  /**
   * 切换文件
   * 支持字符串或 JSON 对象/数组
   */
  private handleSwitchContentFile(
    client: WebSocket,
    sender: any,
    data: { switchFile: string; toUuid: string; templateId: string },
  ) {
    const receiver = this.userService.getUserByUuid(data.toUuid);
    if (!receiver) {
      this.sendMessage(client, 'error', { message: '接收者不存在' });
      return;
    }
    const receiverClient = this.clients.get(receiver.socketId);
    if (receiverClient) {
      // 发送文件切换信息
      this.sendMessage(receiverClient, 'get-switch-file', {
        path: data.switchFile,
        templateId: data.templateId,
        fromUuid: sender.uuid,
        toUuid: data.toUuid,
      });
    }
    this.logger.log(`用户 ${sender.uuid} 切换 ${data.toUuid} 模版文件为 ${data.switchFile}`);
  }
  /**
   * 发送聊天消息
   */
  private handleSendMessage(
    client: WebSocket,
    sender: any,
    data: { toUuid: string; content: string; templateId: string },
  ) {
    const receiver = this.userService.getUserByUuid(data.toUuid);
    if (!receiver) {
      this.sendMessage(client, 'error', { message: '接收者不存在' });
      return;
    }

    // 创建并保存消息
    const message = this.messageService.createMessage(
      sender.uuid,
      data.toUuid,
      data.content,
      data.templateId,
    );

    const receiverClient = this.clients.get(receiver.socketId);
    if (receiverClient) {
      // 发送消息给接收者
      this.sendMessage(receiverClient, 'message-received', {
        fromUuid: sender.uuid,
        content: message.content,
        timestamp: message.timestamp,
        templateId: message.templateId,
      });
    }

    // 确认发送给发送者
    this.sendMessage(client, 'message-sent', {
      toUuid: data.toUuid,
      content: message.content,
      timestamp: message.timestamp,
    });

    this.logger.log(`用户 ${sender.uuid} 向 ${data.toUuid} 发送消息`);
  }

  /**
   * 结束协助
   */
  private handleEndAssistance(client: WebSocket, user: any, data: { requesterUuid: string }) {
    // 只有请求者可以结束协助
    // if (user.uuid !== data.requesterUuid) {
    //   this.sendMessage(client, 'error', { message: '只有请求者可以结束协助' });
    //   return;
    // }
    const receiver = this.userService.getUserByUuid(data.requesterUuid);
    const curClient = this.clients.get(receiver.socketId);
    // const request = this.assistanceService.getAssistanceRequest(data.requesterUuid);
    // if (request && request.helperUuid) {
    //   // 通知协助者协助已结束
    //   const helper = this.userService.getUserByUuid(request.helperUuid);
    //   if (helper) {
    //     const helperClient = this.clients.get(helper.socketId);
    //     if (helperClient) {
    //       this.sendMessage(helperClient, 'assistance-ended', {
    //         requesterUuid: data.requesterUuid,
    //       });
    //     }
    //   }
    // }

    // 结束协助请求
    this.assistanceService.endAssistance(data.requesterUuid);

    // 广播更新后的协助列表
    this.broadcastAssistanceList();

    this.sendMessage(curClient, 'assistance-ended', { success: true });
    this.logger.log(`用户 ${data.requesterUuid} 请求的协助已结束`);
  }

  /**
   * 获取协助列表
   */
  private handleGetAssistanceList(client: WebSocket) {
    const list = this.assistanceService.getAssistanceRequests();
    this.sendMessage(client, 'assistance-list', list);
  }

  /**
   * 广播协助列表给所有客户端
   */
  private broadcastAssistanceList() {
    const list = this.assistanceService.getAssistanceRequests();
    this.broadcast('assistance-list-updated', list);
  }

  /**
   * 发送消息给客户端
   */
  private sendMessage(client: WebSocket, event: string, data: any) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          event,
          data,
        }),
      );
    }
  }

  /**
   * 广播消息给所有客户端
   */
  private broadcast(event: string, data: any) {
    const message = JSON.stringify({ event, data });
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * 发送消息给特定 socketId 的客户端
   */
  private sendToSocket(socketId: string, event: string, data: any) {
    const client = this.clients.get(socketId);
    if (client) {
      this.sendMessage(client, event, data);
    }
  }

  /**
   * 生成唯一的 socketId
   */
  private generateSocketId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
