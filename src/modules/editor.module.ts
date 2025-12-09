import { Module } from '@nestjs/common';
import { EditorGateway } from '../gateways/editor.gateway';
import { UserService } from '../services/user.service';
import { AssistanceService } from '../services/assistance.service';
import { MessageService } from '../services/message.service';
import { ContentService } from '../services/content.service';

@Module({
  providers: [
    EditorGateway,
    UserService,
    AssistanceService,
    MessageService,
    ContentService
  ],
  exports: [UserService, AssistanceService, MessageService, ContentService]
})
export class EditorModule {}
