import { Injectable } from '@nestjs/common';
import { AssistanceRequest } from '../models/assistance-request.model';
import { UserService } from './user.service';

@Injectable()
export class AssistanceService {
  private assistanceRequests: Map<string, AssistanceRequest> = new Map(); // requesterUuid -> AssistanceRequest

  constructor(private readonly userService: UserService) {}

  /**
   * 创建协助请求
   */
  createAssistanceRequest(
    requesterUuid: string,
    templateId: string,
    templateContent: string
  ): AssistanceRequest {
    const request = new AssistanceRequest(
      requesterUuid,
      templateId,
      templateContent
    );
    this.assistanceRequests.set(requesterUuid, request);

    // 更新用户状态
    this.userService.updateRequestHelpStatus(requesterUuid, true);

    return request;
  }
  /**
   * 加入协助请求
   */
  joinAssistanceRequest(requesterUuid: string): void {
    // 更新用户作为协助者状态
    this.userService.updateJoinHelpStatus(requesterUuid, true);
  }
  /**
   * 获取所有协助请求列表
   */
  getAssistanceRequests(): Array<{
    requesterUuid: string;
    templateId: string;
  }> {
    return Array.from(this.assistanceRequests.values()).map((request) => ({
      requesterUuid: request.requesterUuid,
      templateId: request.templateId,
      templateContent: request.templateContent,
      show: request.show
    }));
  }

  /**
   * 获取特定用户的协助请求
   */
  getAssistanceRequest(requesterUuid: string): AssistanceRequest | undefined {
    return this.assistanceRequests.get(requesterUuid);
  }

  /**
   * 通过协作者获取当前的协助请求
   */
  getAssistanceRequestByHelper(
    helperUuidd: string
  ): AssistanceRequest | undefined {
    return Array.from(this.assistanceRequests.values()).filter(
      (request) => request.helperUuid === helperUuidd
    )[0];
  }

  /**
   * 设置协助者
   */
  setHelper(requesterUuid: string, helperUuid: string): boolean {
    const request = this.assistanceRequests.get(requesterUuid);
    if (request) {
      request.helperUuid = helperUuid;
      return true;
    }
    return false;
  }
  /**
   * 有人加入协助时，隐藏这条协助
   */
  hideAssistanceRequest(requesterUuid: string): boolean {
    const request = this.getAssistanceRequestByHelper(requesterUuid);
    if (request) {
      request.show = false;
      return true;
    }
    return false;
  }
  /**
   * 协助者不以结束协助操作而退出，则重新显示该协助
   */
  showAssistanceRequest(requesterUuid: string): boolean {
    const request = this.getAssistanceRequestByHelper(requesterUuid);
    if (request) {
      request.show = true;
      return true;
    }
    return false;
  }
  /**
   * 结束协助请求
   */
  endAssistance(requesterUuid: string): boolean {
    const request = this.assistanceRequests.get(requesterUuid);
    if (request) {
      this.assistanceRequests.delete(requesterUuid);
      // 更新用户状态
      this.userService.updateRequestHelpStatus(requesterUuid, false);
      return true;
    }
    return false;
  }

  /**
   * 检查用户是否正在请求协助
   */
  isRequestingAssistance(requesterUuid: string): boolean {
    return this.assistanceRequests.has(requesterUuid);
  }
}
