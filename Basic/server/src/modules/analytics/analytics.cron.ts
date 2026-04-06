import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EtlService } from './etl.service';
import { AnalyticsService } from './analytics.service';

/**
 * 数据分析定时任务
 * 使用 @nestjs/schedule 实现定时聚合
 */
@Injectable()
export class AnalyticsCron {
  private readonly logger = new Logger(AnalyticsCron.name);
  private isRunning = false;

  constructor(
    private readonly etlService: EtlService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * 每日凌晨 02:00 执行日数据聚合
   */
  @Cron('0 2 * * *', {
    name: 'dailyAggregation',
    timeZone: 'Asia/Shanghai',
  })
  async handleDailyAggregation() {
    if (this.isRunning) {
      this.logger.warn('上一次聚合任务仍在执行，跳过本次');
      return;
    }

    this.isRunning = true;
    this.logger.log('开始执行日数据聚合任务...');

    try {
      // 聚合昨天的数据
      const result = await this.etlService.aggregateDaily();
      this.logger.log(`日数据聚合完成: ${result.date}`);
    } catch (error) {
      this.logger.error('日数据聚合失败', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 每周一凌晨 03:00 执行周数据聚合
   */
  @Cron('0 3 * * 1', {
    name: 'weeklyAggregation',
    timeZone: 'Asia/Shanghai',
  })
  async handleWeeklyAggregation() {
    this.logger.log('开始执行周数据聚合任务...');

    try {
      const result = await this.etlService.aggregateWeekly();
      this.logger.log(`周数据聚合完成: ${result.year}年第${result.week}周`);
    } catch (error) {
      this.logger.error('周数据聚合失败', error);
    }
  }

  /**
   * 每月1日凌晨 04:00 执行月数据聚合
   */
  @Cron('0 4 1 * *', {
    name: 'monthlyAggregation',
    timeZone: 'Asia/Shanghai',
  })
  async handleMonthlyAggregation() {
    this.logger.log('开始执行月数据聚合任务...');

    try {
      const result = await this.etlService.aggregateMonthly();
      this.logger.log(`月数据聚合完成: ${result.year}年${result.month}月`);
    } catch (error) {
      this.logger.error('月数据聚合失败', error);
    }
  }

  /**
   * 每小时检查异常订单
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'exceptionCheck',
  })
  async handleExceptionCheck() {
    this.logger.log('开始检查异常订单...');

    try {
      const exceptions = await this.analyticsService.checkOrderExceptions();
      if (exceptions.length > 0) {
        this.logger.warn(`发现 ${exceptions.length} 个异常订单`);
        // TODO: 发送通知给运营人员
      }
    } catch (error) {
      this.logger.error('异常订单检查失败', error);
    }
  }

  /**
   * 每5分钟更新实时统计（Redis缓存）
   */
  @Cron('*/5 * * * *', {
    name: 'realTimeStats',
  })
  async handleRealTimeStats() {
    try {
      await this.analyticsService.updateRealTimeStats();
    } catch (error) {
      this.logger.error('实时统计更新失败', error);
    }
  }

  /**
   * 每天上午8点发送数据日报
   */
  @Cron('0 8 * * *', {
    name: 'dailyReport',
    timeZone: 'Asia/Shanghai',
  })
  async handleDailyReport() {
    this.logger.log('开始生成数据日报...');

    try {
      await this.analyticsService.generateDailyReport();
      this.logger.log('数据日报已发送');
    } catch (error) {
      this.logger.error('数据日报生成失败', error);
    }
  }

  /**
   * 手动触发聚合（用于调试）
   */
  async triggerManualAggregation(type: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    this.logger.log(`手动触发 ${type} 聚合`);

    switch (type) {
      case 'daily':
        return this.etlService.aggregateDaily();
      case 'weekly':
        return this.etlService.aggregateWeekly();
      case 'monthly':
        return this.etlService.aggregateMonthly();
    }
  }
}