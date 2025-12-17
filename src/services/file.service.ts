import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileInfo {
  id: string;
  filename: string;
  filepath: string;
  contentType: string;
  createdAt: Date;
}
export interface FileChunkInfo extends FileInfo {
  fileId: string;
  order: number;
}

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private files: Map<string, FileInfo> = new Map(); // fileId -> FileInfo

  constructor() {
    // 确保上传目录存在
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`创建上传目录: ${this.uploadDir}`);
    }
  }

  /**
   * 保存分片文件并返回文件信息
   */
  async saveChunkFile(
    content: string,
    fileType: 'js' | 'css' | 'html',
    fileChunkId: string,
    order: number,
    filename?: string
  ): Promise<FileChunkInfo> {
    const fileId = uuidv4();
    const extension = fileType;
    const finalFilename = filename || `file_${Date.now()}.${extension}`;

    // 确保文件名有正确的扩展名
    const filenameWithExt = finalFilename.endsWith(`.${extension}`)
      ? finalFilename
      : `${finalFilename}.${extension}`;
    await new Promise((res, rej) => {
      fs.mkdir(path.join(this.uploadDir, `${fileChunkId}`), () => {
        res('success');
      });
    });
    const filepath = path.join(
      this.uploadDir,
      `${fileChunkId}/${order}_${filenameWithExt}`
    );
    // 写入文件
    fs.writeFileSync(filepath, content, 'utf-8');
    const fileInfo: FileChunkInfo = {
      fileId: fileChunkId,
      id: fileId,
      filename: filenameWithExt,
      order,
      filepath,
      contentType: this.getContentType(fileType),
      createdAt: new Date()
    };

    this.files.set(fileId, fileInfo);
    this.logger.log(`文件已保存: ${filepath}`);
    return fileInfo;
  }

  /**
   * 保存文件并返回文件信息
   */
  saveFile(
    content: string,
    fileType: 'js' | 'css' | 'html',
    filename?: string
  ): FileInfo {
    const fileId = uuidv4();
    const extension = fileType;
    const finalFilename = filename || `file_${Date.now()}.${extension}`;

    // 确保文件名有正确的扩展名
    const filenameWithExt = finalFilename.endsWith(`.${extension}`)
      ? finalFilename
      : `${finalFilename}.${extension}`;

    const filepath = path.join(this.uploadDir, `${fileId}_${filenameWithExt}`);

    // 写入文件
    fs.writeFileSync(filepath, content, 'utf-8');

    const fileInfo: FileInfo = {
      id: fileId,
      filename: filenameWithExt,
      filepath,
      contentType: this.getContentType(fileType),
      createdAt: new Date()
    };

    this.files.set(fileId, fileInfo);
    this.logger.log(`文件已保存: ${filepath}`);

    return fileInfo;
  }

  /**
   * 根据文件ID获取文件信息
   */
  getFileInfo(fileId: string): FileInfo | undefined {
    return this.files.get(fileId);
  }

  /**
   * 读取文件内容
   */
  readFile(fileId: string): string | null {
    const fileInfo = this.files.get(fileId);
    if (!fileInfo || !fs.existsSync(fileInfo.filepath)) {
      return null;
    }

    try {
      return fs.readFileSync(fileInfo.filepath, 'utf-8');
    } catch (error) {
      this.logger.error(`读取文件失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 删除文件夹
   */
  async deleteFileDir(fileChunkId: string): Promise<boolean> {
    const filepath = path.join(this.uploadDir, `${fileChunkId}`);
    const chunkDir = path.join(process.cwd(), `uploads/${fileChunkId}`);
    const files = fs.readdirSync(chunkDir);
    this.logger.log(files, '删除了吗？？？?????');
    // await new Promise((res,rej)=>{
    for (var i of files) {
      const filePath = chunkDir + '/' + i;
      await new Promise((res, rej) => {
        setTimeout(() => {
          try {
            if (fs.existsSync(filePath)) {
              fs.unlink(filePath, () => {
                res(true);
                this.logger.log('删除chunks:' + filePath);
              });
            }
          } catch (error) {
            this.logger.log('删除失败！' + error);
          }
        }, 1000);
      });
    }
    // )
    // files.map((file) => {
    //   const filePath = chunkDir + '/' + file;
    //   this.logger.log('删除chunks:' + filePath);
    //   if (fs.existsSync(filePath)) {
    //     // fs.unlinkSync(filePath);
    //   }
    // });
    try {
      if (fs.existsSync(filepath)) {
        fs.rmdir(filepath, (error) => {
          this.logger.log(`${filepath},文件夹删除成功！: ${fileChunkId}`);
        });
      }
      return true;
    } catch (error) {
      this.logger.error(`删除文件夹失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 删除文件
   */
  deleteFile(fileId: string): boolean {
    const fileInfo = this.files.get(fileId);
    if (!fileInfo) {
      return false;
    }

    try {
      if (fs.existsSync(fileInfo.filepath)) {
        fs.unlinkSync(fileInfo.filepath);
      }
      this.files.delete(fileId);
      this.logger.log(`文件已删除: ${fileInfo.filepath}`);
      return true;
    } catch (error) {
      this.logger.error(`删除文件失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 清理过期文件（可选，用于定期清理）
   */
  cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    this.files.forEach((fileInfo, fileId) => {
      const age = now - fileInfo.createdAt.getTime();
      if (age > maxAge) {
        if (this.deleteFile(fileId)) {
          cleanedCount++;
        }
      }
    });

    if (cleanedCount > 0) {
      this.logger.log(`清理了 ${cleanedCount} 个过期文件`);
    }

    return cleanedCount;
  }

  /**
   * 获取文件类型对应的Content-Type
   */
  private getContentType(fileType: 'js' | 'css' | 'html'): string {
    const contentTypes = {
      js: 'application/javascript',
      css: 'text/css',
      html: 'text/html'
    };
    return contentTypes[fileType];
  }

  /**
   * 验证文件类型
   */
  isValidFileType(fileType: string): fileType is 'js' | 'css' | 'html' {
    return ['js', 'css', 'html'].includes(fileType);
  }
}
