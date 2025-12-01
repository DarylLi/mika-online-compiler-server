import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Res,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { FileService } from '../services/file.service';
import * as path from 'path';

interface CreateFileDto {
  content: string;
  type: 'js' | 'css' | 'html';
  filename?: string;
}

interface FileResponse {
  success: boolean;
  fileId: string;
  downloadUrl: string;
  filename: string;
  message?: string;
}

@Controller('api/files')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly fileService: FileService) {}

  /**
   * 创建文件并返回下载链接
   * POST /api/files
   */
  @Post()
  createFile(@Body() createFileDto: CreateFileDto): FileResponse {
    const { content, type, filename } = createFileDto;

    // 验证必填字段
    if (!content) {
      throw new BadRequestException('内容不能为空');
    }

    if (!type) {
      throw new BadRequestException('文件类型不能为空');
    }

    // 验证文件类型
    if (!this.fileService.isValidFileType(type)) {
      throw new BadRequestException('不支持的文件类型，仅支持 js、css、html');
    }

    try {
      // 保存文件
      const fileInfo = this.fileService.saveFile(content, type, filename);

      // 生成下载链接
      const downloadUrl = `/api/files/${fileInfo.id}/download`;

      this.logger.log(`文件已创建: ${fileInfo.filename} (ID: ${fileInfo.id})`);

      return {
        success: true,
        fileId: fileInfo.id,
        downloadUrl,
        filename: fileInfo.filename,
        message: '文件创建成功',
      };
    } catch (error) {
      this.logger.error(`创建文件失败: ${error.message}`);
      throw new BadRequestException('文件创建失败');
    }
  }

  /**
   * 下载文件
   * GET /api/files/:fileId/download
   */
  @Get(':fileId/download')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const fileInfo = this.fileService.getFileInfo(fileId);

    if (!fileInfo) {
      throw new NotFoundException('文件不存在');
    }

    try {
      const content = this.fileService.readFile(fileId);
      if (!content) {
        throw new NotFoundException('文件内容不存在');
      }

      // 设置响应头
      res.setHeader('Content-Type', fileInfo.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileInfo.filename)}"`,
      );

      // 发送文件内容
      res.send(content);
      this.logger.log(`文件已下载: ${fileInfo.filename} (ID: ${fileId})`);
    } catch (error) {
      this.logger.error(`下载文件失败: ${error.message}`);
      throw new NotFoundException('文件下载失败');
    }
  }

  /**
   * 获取文件信息
   * GET /api/files/:fileId/info
   */
  @Get(':fileId/info')
  getFileInfo(@Param('fileId') fileId: string) {
    const fileInfo = this.fileService.getFileInfo(fileId);

    if (!fileInfo) {
      throw new NotFoundException('文件不存在');
    }

    return {
      success: true,
      fileId: fileInfo.id,
      filename: fileInfo.filename,
      contentType: fileInfo.contentType,
      downloadUrl: `/api/files/${fileInfo.id}/download`,
      createdAt: fileInfo.createdAt,
    };
  }

  /**
   * 删除文件
   * DELETE /api/files/:fileId
   */
  @Delete(':fileId')
  deleteFile(@Param('fileId') fileId: string) {
    const deleted = this.fileService.deleteFile(fileId);

    if (!deleted) {
      throw new NotFoundException('文件不存在或已删除');
    }

    return {
      success: true,
      message: '文件已删除',
    };
  }
}

