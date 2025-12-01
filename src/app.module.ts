import { Module } from '@nestjs/common';
import { EditorModule } from './modules/editor.module';
import { FileModule } from './modules/file.module';

@Module({
  imports: [EditorModule, FileModule],
})
export class AppModule {}

