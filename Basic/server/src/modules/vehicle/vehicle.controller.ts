import {
  Controller,
  Get,
  UseGuards,
  Query,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/permissions.decorator';
import { VehicleService } from './vehicle.service';
import { PageQueryDto } from '../../common/dto/pagination.dto';

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
}
