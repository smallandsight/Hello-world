import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FavoriteService } from './favorite.service';

@ApiTags('收藏模块')
@ApiBearerAuth('access-token')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post()
  @ApiOperation({ summary: '收藏车辆', description: '幂等操作：已收藏则返回成功不重复创建' })
  async addFavorite(
    @CurrentUser() payload: any,
    @Body() body: { vehicleId: number },
  ) {
    return this.favoriteService.addFavorite(
      Number(payload.sub),
      body.vehicleId,
    );
  }

  @Delete(':vehicleId')
  @ApiParam({ name: 'vehicleId', description: '车辆ID' })
  @ApiOperation({ summary: '取消收藏' })
  async removeFavorite(
    @CurrentUser() payload: any,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.favoriteService.removeFavorite(
      Number(payload.sub),
      Number(vehicleId),
    );
  }

  @Get()
  @ApiOperation({ summary: '我的收藏列表', description: '关联车辆基本信息，分页返回' })
  async getFavorites(
    @CurrentUser() payload: any,
    @Query() query?: { page?: string; size?: string },
  ) {
    return this.favoriteService.getFavorites(Number(payload.sub), {
      page: Number(query?.page) || 1,
      size: Math.min(Number(query?.size) || 20, 50),
    });
  }

  @Get('check/:vehicleId')
  @ApiParam({ name: 'vehicleId', description: '车辆ID' })
  @ApiOperation({ summary: '检查是否已收藏某车辆' })
  async checkFavorited(
    @CurrentUser() payload: any,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.favoriteService.checkFavorited(
      Number(payload.sub),
      Number(vehicleId),
    );
  }
}
