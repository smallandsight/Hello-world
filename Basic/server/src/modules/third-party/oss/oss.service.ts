/**
 * 阿里云 OSS 对象存储服务
 * 
 * 功能：
 * 1. 图片上传（头像/车辆照片/证件照/行驶证等）
 * 2. 文件删除
 * 3. 获取临时访问URL（私有桶）
 * 4. 图片缩略处理（通过样式）
 * 5. 文件类型和大小校验
 * 
 * 文档：https://help.aliyun.com/document_detail/31988.html
 */
import { Injectable, Logger } from '@nestjs/common';
import * as OSS from 'ali-oss';

/** 允许上传的图片格式 */
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

/** 最大文件大小（10MB） */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export interface OssConfig {
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint?: string;
  isPrivate?: boolean;      // 是否为私有读
  customDomain?: string;    // 自定义域名（如 cdn.gy-bike.com）
}

/** 上传结果 */
export interface OssUploadResult {
  success: boolean;
  url: string;              // 访问URL
  key: string;              // OSS对象key
  size: number;             // 字节
  mimeType: string;
  width?: number;           // 宽度（图片时可用）
  height?: number;          // 高度
}

@Injectable()
export class OssService {
  private readonly logger = new Logger(OssService.name);
  private client: OSS | null = null;
  private config: OssConfig;

  constructor() {
    this.config = {
      region: process.env.OSS_REGION || 'oss-cn-hangzhou',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
      bucket: process.env.OSS_BUCKET_NAME || 'gy-bike-assets',
      endpoint: process.env.OSS_ENDPOINT,
      isPrivate: process.env.OSS_PRIVATE === 'true',
      customDomain: process.env.OSS_CUSTOM_DOMAIN,
    };

    this.initClient();
  }

  private initClient(): void {
    if (!this.config.accessKeyId || !this.config.accessKeySecret) {
      this.logger.warn('[Oss] 缺少OSS配置，文件上传将不可用');
      return;
    }

    try {
      const options: any = {
        region: this.config.region,
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        bucket: this.config.bucket,
        timeout: 30000, // 30秒超时
      };

      if (this.config.endpoint) {
        options.endpoint = this.config.endpoint;
      }

      this.client = new OSS(options);
      this.logger.log(`[Oss] 初始化成功 bucket=${this.config.bucket} region=${this.config.region}`);
    } catch (e) {
      this.logger.error(`[Oss] 初始化失败: ${e.message}`);
      this.client = null;
    }
  }

  get isEnabled(): boolean {
    return this.client !== null && !!this.config.accessKeyId;
  }

  // ==================== 上传 ====================

  /**
   * 上传文件到OSS（通用方法）
   * 
   * @param file - Buffer或Stream格式的文件数据
   * @param filename - 原始文件名（用于提取扩展名）
   * @param folder - 存储目录前缀，如 'avatars' / 'vehicles' / 'idcards'
   */
  async upload(
    file: Buffer | ReadableStream,
    filename: string,
    folder: string = 'uploads',
  ): Promise<OssUploadResult> {
    if (!this.client) throw new Error('OSS服务未初始化');

    // 1. 提取扩展名并校验
    const ext = this.getExtension(filename);
    if (!ext) {
      return { success: false, url: '', key: '', size: 0, mimeType: 'unknown', message: '无法识别的文件类型' };
    }

    // 2. 如果是Buffer，检查大小
    let fileSize = 0;
    if (Buffer.isBuffer(file)) {
      fileSize = file.length;
      if (fileSize > MAX_FILE_SIZE) {
        throw new Error('文件大小超出限制(最大10MB)');
      }
    }

    // 3. 构造唯一的对象路径
    const datePath = this.getDatePath();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const safeName = this.safeFileName(filename);
    const objectKey = `${folder}/${datePath}${randomStr}_${safeName}`;

    try {
      // 4. 上传
      const result = await this.client!.put(objectKey, file);

      // 5. 构造访问URL
      const url = this.buildUrl(objectKey);

      this.logger.log(`[Oss] 上传成功: ${objectKey} (${fileSize}B)`);

      return {
        success: true,
        url,
        key: objectKey,
        size: fileSize,
        mimeType: this.getMimeType(ext),
      };
    } catch (error) {
      this.logger.error(`[Oss] 上传失败 ${filename}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 上传Base64编码的图片（小程序常用场景）
   * 
   * @param base64 - base64字符串（含 data:image/xxx;base64, 前缀）
   * @param folder - 目录前缀
   */
  async uploadBase64(
    base64: string,
    folder: string = 'uploads',
  ): Promise<OssUploadResult> {
    // 解析base64
    const matches = base64.match(/^data:(.+?);base64,(.+)$/);
    if (!matches) {
      throw new Error('无效的Base64图片数据');
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');

    // 校验类型
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error(`不支持的图片格式: ${mimeType}`);
    }

    const ext = this.mimeToExt(mimeType);
    return this.upload(buffer, `image.${ext}`, folder);
  }

  /**
   * 批量上传（如车辆多张照片）
   */
  async uploadMultiple(
    files: Array<{ data: Buffer | ReadableStream; name: string }>,
    folder: string = 'uploads',
  ): Promise<OssUploadResult[]> {
    const results: OssUploadResult[] = [];

    for (const file of files) {
      try {
        const result = await this.upload(file.data, file.name, folder);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          url: '',
          key: '',
          size: 0,
          mimeType: 'error',
          message: error.message,
        });
      }
    }

    return results;
  }

  // ==================== 删除 ====================

  /**
   * 删除单个文件
   */
  async delete(objectKey: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client!.delete(objectKey);
      this.logger.log(`[Oss] 已删除: ${objectKey}`);
      return true;
    } catch (error) {
      this.logger.error(`[Oss] 删除失败 ${objectKey}: ${error.message}`);
      return false;
    }
  }

  /**
   * 批量删除
   */
  async deleteMultiple(objectKeys: string[]): Promise<{ success: number; failed: number }> {
    let success = 0, failed = 0;

    for (const key of objectKeys) {
      const ok = await this.delete(key);
      ok ? success++ : failed++;
    }

    return { success, failed };
  }

  // ==================== URL相关 ====================

  /**
   * 获取临时访问URL（私有桶场景）
   * @param objectKey - 对象路径
   * @param expiresIn - 过期时间（秒），默认3600
   */
  async getSignedUrl(objectKey: string, expiresIn: number = 3600): Promise<string> {
    if (!this.client) throw new Error('OSS服务未初始化');

    try {
      const url = this.client!.signatureUrl(objectKey, { expires: expiresIn });
      return url;
    } catch (error) {
      this.logger.error(`[Oss] 签名URL生成失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查对象是否存在
   */
  async exists(objectKey: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client!.head(objectKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件信息（不含下载）
   */
  async getFileInfo(objectKey: string): Promise<{
    size: number;
    lastModified: Date;
    contentType: string;
  } | null> {
    if (!this.client) return null;

    try {
      const meta = await this.client!.head(objectKey);
      return {
        size: parseInt(meta.res.headers['content-size'] || '0', 10),
        lastModified: new Date(meta.res.headers['last-modified']),
        contentType: meta.res.headers['content-type'],
      };
    } catch {
      return null;
    }
  }

  // ==================== 工具方法 ====================

  /** 构造访问URL */
  private buildUrl(objectKey: string): string {
    if (this.config.customDomain) {
      return `https://${this.config.customDomain}/${objectKey}`;
    }

    // 使用默认OSS域名
    const isPrivate = this.config.isPrivate;
    if (isPrivate && this.client) {
      // 私有桶返回签名URL
      return this.client.signatureUrl(objectKey, { expires: 7200 }); // 默认2小时有效
    }

    // 公有读直接拼接
    return `https://${this.config.bucket}.${this.config.region}.aliyuncs.com/${objectKey}`;
  }

  /** 获取日期路径 YYYY/MM/DD/ */
  private getDatePath(): string {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/`;
  }

  /** 安全文件名（去除特殊字符） */
  private safeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fff.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 100); // 限制长度
  }

  /** 从文件名获取扩展名 */
  private getExtension(filename: string): string {
    const match = filename.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : '';
  }

  /** MIME类型转扩展名 */
  private mimeToExt(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return map[mime] || 'bin';
  }

  /** 扩展名转MIME类型 */
  private getMimeType(ext: string): string {
    const map: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      json: 'application/json',
    };
    return map[ext] || 'application/octet-stream';
  }
}
