import {
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  Query,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public, Roles } from '../../common/decorators/permissions.decorator';
import { VehicleService } from './vehicle.service';
import { PageQueryDto } from '../../common/dto/pagination.dto';
import {
  CalculatePriceDto,
  BatchUpdatePricingDto,
} from './dto/pricing-rule.dto';

@ApiTags('车辆模块')
@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @Get('list')
  @Public()
  @ApiOperation({ summary: '获取附近可用车辆列表' })
  async getVehicleList(
    @Query() query: PageQueryDto & { lat?: number; lng?: number; radius?: number },
  ) {
    return this.vehicleService.getNearbyVehicles(query);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: '获取车辆详情（含图片、车型信息）' })
  async getVehicleDetail(@Param('id') id: string) {
    return this.vehicleService.getVehicleDetail(Number(id));
  }

  @Get('model/list')
  @Public()
  @ApiOperation({ summary: '获取所有上架的车型列表' })
  async getModelList() {
    return this.vehicleService.getModelList();
  }

  @Get('store/list')
  @Public()
  @ApiOperation({ summary: '获取门店列表（支持LBS查询）' })
  async getStoreList(
    @Query() query: PageQueryDto & { lat?: number; lng?: number },
  ) {
    return this.vehicleService.getStores(query);
  }

  // ==================== 定价规则管理 (T3W9-4) ====================

  @Get('pricing/rules')
  @Roles('admin', 'manager')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取所有车型定价规则' })
  async getPricingRules() {
    return this.vehicleService.getPricingRules();
  }

  @Put('pricing/rules')
  @Roles('admin')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '批量更新定价规则' })
  async updatePricingRules(@Body() dto: BatchUpdatePricingDto) {
    return this.vehicleService.updatePricingRules(dto.rules);
  }

  @Post('pricing/calculate')
  @Public()
  @ApiOperation({ summary: '价格试算引擎（取还车时间+会员折扣+优惠券）' })
  async calculatePricing(@Body() dto: CalculatePriceDto) {
    return this.vehicleService.calculatePricing(dto);
  }
}
