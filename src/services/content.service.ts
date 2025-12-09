import { Injectable, Logger } from '@nestjs/common';
import { ContentChunk } from '../models/content-chunk.model';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);
  private readonly CHUNK_SIZE = 10000; // 每个分片的大小（字符数）

  /**
   * 编译内容
   */
  redirectContent(
    content: string | object | any[],
    templateId: string,
    fromUuid: string,
    toUuid: string,
    path: string
  ): ContentChunk[] {
    // 如果是对象或数组，先序列化为 JSON 字符串
    let contentString: string;
    if (typeof content === 'string') {
      contentString = content;
    } else {
      try {
        contentString = JSON.stringify(content);
      } catch (error) {
        this.logger.error(`JSON 序列化失败: ${error.message}`);
        throw new Error('内容序列化失败，请确保是有效的 JSON 结构');
      }
    }

    const chunks: ContentChunk[] = [];
    const totalChunks = Math.ceil(contentString.length / this.CHUNK_SIZE);

    this.logger.log(`开始传输文本，总长度为: ${contentString.length} 的字符`);

    // for (let i = 0; i < totalChunks; i++) {
    //   const start = i * this.CHUNK_SIZE;
    //   const end = Math.min(start + this.CHUNK_SIZE, contentString.length);
    const chunkContent = contentString; //.substring(start, end);

    chunks.push(
      new ContentChunk(
        0,
        totalChunks,
        chunkContent,
        templateId,
        fromUuid,
        toUuid,
        path
      )
    );
    // }

    return chunks;
  }
  /**
   * 将内容分割成多个分片
   * 支持字符串或 JSON 对象
   */
  splitContent(
    content: string | object | any[],
    templateId: string,
    fromUuid: string,
    toUuid: string,
    path: string
  ): ContentChunk[] {
    // 如果是对象或数组，先序列化为 JSON 字符串
    let contentString: string;
    if (typeof content === 'string') {
      contentString = content;
    } else {
      try {
        contentString = JSON.stringify(content);
      } catch (error) {
        this.logger.error(`JSON 序列化失败: ${error.message}`);
        throw new Error('内容序列化失败，请确保是有效的 JSON 结构');
      }
    }

    const chunks: ContentChunk[] = [];
    const totalChunks = Math.ceil(contentString.length / this.CHUNK_SIZE);

    this.logger.log(
      `开始分片传输，总长度: ${contentString.length} 字符，分片数: ${totalChunks}`
    );

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.CHUNK_SIZE;
      const end = Math.min(start + this.CHUNK_SIZE, contentString.length);
      const chunkContent = contentString.substring(start, end);

      chunks.push(
        new ContentChunk(
          i,
          totalChunks,
          chunkContent,
          templateId,
          fromUuid,
          toUuid,
          path
        )
      );
    }

    return chunks;
  }

  /**
   * 合并分片内容
   * @param chunks 内容分片数组
   * @param parseJson 是否解析为 JSON 对象（默认 false，返回字符串）
   * @returns 合并后的内容（字符串或 JSON 对象）
   */
  mergeChunks(
    chunks: ContentChunk[],
    parseJson: boolean = false
  ): string | object | any[] {
    if (!chunks || chunks.length === 0) {
      return parseJson ? [] : '';
    }

    // 按索引排序
    const sortedChunks = chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // 检查是否所有分片都已接收
    const receivedIndices = sortedChunks.map((chunk) => chunk.chunkIndex);
    const expectedIndices = Array.from(
      { length: sortedChunks[0].totalChunks },
      (_, i) => i
    );

    const missingChunks = expectedIndices.filter(
      (idx) => !receivedIndices.includes(idx)
    );
    if (missingChunks.length > 0) {
      this.logger.warn(`缺少分片: ${missingChunks.join(', ')}`);
      throw new Error(`分片不完整，缺少索引: ${missingChunks.join(', ')}`);
    }

    // 合并所有分片
    const mergedContent = sortedChunks.map((chunk) => chunk.content).join('');

    // 如果需要解析为 JSON
    if (parseJson) {
      try {
        return JSON.parse(mergedContent);
      } catch (error) {
        this.logger.error(`JSON 解析失败: ${error.message}`);
        throw new Error('合并后的内容不是有效的 JSON 格式');
      }
    }

    return mergedContent;
  }

  /**
   * 验证 JSON 字符串是否有效
   */
  isValidJson(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取内容大小（字符数）
   */
  getContentSize(content: string | object | any[]): number {
    if (typeof content === 'string') {
      return content.length;
    }
    try {
      return JSON.stringify(content).length;
    } catch {
      return 0;
    }
  }
}
