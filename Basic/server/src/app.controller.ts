import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('健康检查')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: '服务健康检查' })
  getHello(): { message: string; status: string; timestamp: string } {
    return this.appService.getHealth();
  }

  @Get('health')
  @ApiOperation({ summary: '健康检查端点（用于负载均衡探测）' })
  healthCheck(): { status: string; uptime: number } {
    return this.appService.healthCheck();
  }
}
