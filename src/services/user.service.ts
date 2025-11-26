import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/user.model';

@Injectable()
export class UserService {
  private users: Map<string, User> = new Map(); // socketId -> User
  private usersByUuid: Map<string, User> = new Map(); // uuid -> User

  /**
   * 创建新用户并返回用户信息
   */
  createUser(socketId: string): { uuid: string; templateId: string; isRequestingHelp: boolean } {
    const uuid = uuidv4();
    const templateId = '';
    const user = new User(socketId, uuid, templateId);

    this.users.set(socketId, user);
    this.usersByUuid.set(uuid, user);

    return {
      uuid: user.uuid,
      templateId: user.templateId,
      isRequestingHelp: user.isRequestingHelp,
    };
  }

  /**
   * 根据 socketId 获取用户
   */
  getUserBySocketId(socketId: string): User | undefined {
    return this.users.get(socketId);
  }

  /**
   * 根据 uuid 获取用户
   */
  getUserByUuid(uuid: string): User | undefined {
    return this.usersByUuid.get(uuid);
  }

  /**
   * 更新用户请求协助状态
   */
  updateRequestHelpStatus(uuid: string, isRequestingHelp: boolean): boolean {
    const user = this.usersByUuid.get(uuid);
    if (user) {
      user.isRequestingHelp = isRequestingHelp;
      return true;
    }
    return false;
  }
  /**
   * 协助者状态
   */
  updateJoinHelpStatus(uuid: string, isJoiningHelp: boolean): boolean {
    const user = this.usersByUuid.get(uuid);
    if (user) {
      user.isJoiningHelp = isJoiningHelp;
      return true;
    }
    return false;
  }
  /**
   * 移除用户
   */
  removeUser(socketId: string): boolean {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
      this.usersByUuid.delete(user.uuid);
      return true;
    }
    return false;
  }

  /**
   * 获取所有用户
   */
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}
