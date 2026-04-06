import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/permissions.decorator';
import { StoreService } from './store.service';
import { CreateStoreDto, UpdateStoreDto, QueryStoreDto } from './dto/store.dto';

@ApiTags('门店管理')
@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  /** 创建门店 — 需要商家管理员权限 */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建门店' })
  async create(@Body() dto: CreateStoreDto) {
    return this.storeService.createStore(dto);
  }

  /** 门店列表（支持分页/LBS/筛选） */
  @Get()
  @Public()
  @ApiOperation({ summary: '门店列表（支持LBS查询）' })
  async list(@Query() query: QueryStoreDto) {
    return this.storeService.listStores(query);
  }

  /** 门店详情 */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: '门店详情(含车辆统计)' })
  async getDetail(@Param('id') id: string) {
    return this.storeService.getStoreDetail(Number(id));
  }

  /** 更新门店信息 */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新门店信息' })
  async update(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.storeService.updateStore(Number(id), dto);
  }

  /** 停用门店（软删除） */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '停用门店' })
  async delete(@Param('id') id: string) {
    return this.storeService.deleteStore(Number(id));
  }

  // ==================== 库存与LBS ====================

  /** 门店库存查看 */
  @Get(':id/inventory')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '门店车辆库存列表' })
  async getInventory(
    @Param('id') id: string,
    @Query() query: { page?: number; size?: number; status?: number },
  ) {
    return this.storeService.getStoreInventory(Number(id), query);
  }

  /** 附近门店（LBS排序）— 用户端接口 */
  @Get('nearby/search')
  @Public()
  @ApiOperation({ summary: '附近门店(LBS排序)' })
  async getNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
    @Query('limit') limit?: number,
  ) {
    if (!lat || !lng) {
      throw new Error('缺少坐标参数 lat/lng');
    }
    return this.storeService.getNearbyStores(lat, lng, radius, limit);
  }

  /** 更新门店坐标 */
  @Put(':id/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新门店坐标' })
  async updateLocation(
    @Param('id') id: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.storeService.updateLocation(Number(id), body.latitude, body.longitude);
  }
}
