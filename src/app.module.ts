import { Module } from '@nestjs/common';
import { EditorModule } from './modules/editor.module';

@Module({
  imports: [EditorModule],
})
export class AppModule {}

