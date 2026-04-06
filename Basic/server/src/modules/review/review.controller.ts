import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
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
import { ReviewService } from './review.service';
import { CreateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/query-review.dto';

@ApiTags('评价模块')
@ApiBearerAuth('access-token')
@Controller('review')
@UseGuards(JwtAuthGuard)
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // ========== 用户评价 ==========

  @Post()
  @ApiOperation({ summary: '提交评价', description: '每订单限评1次，提交后进入审核流程' })
  async createReview(
    @CurrentUser() payload: any,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.createReview(Number(payload.sub), dto);
  }

  // ========== 公开查询（车辆评价）==========

  @Get('vehicle/:vehicleId')
  @ApiParam({ name: 'vehicleId', description: '车辆ID' })
  @ApiOperation({ summary: '车辆评价列表（分页）', description: '只返回审核通过的评价' })
  async getVehicleReviews(
    @Param('vehicleId') vehicleId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewService.getVehicleReviews(Number(vehicleId), query);
  }

  @Get('vehicle/:vehicleId/summary')
  @ApiParam({ name: 'vehicleId', description: '车辆ID' })
  @ApiOperation({ summary: '车辆评分汇总', description: '均分 + 各星级分布数量' })
  async getVehicleSummary(@Param('vehicleId') vehicleId: string) {
    return this.reviewService.getVehicleSummary(Number(vehicleId));
  }

  // ========== 我的评价 ==========

  @Get('my')
  @ApiOperation({ summary: '我的评价列表' })
  async getMyReviews(
    @CurrentUser() payload: any,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewService.getMyReviews(Number(payload.sub), query);
  }

  // ========== 商家回复 ==========

  @Put(':id/reply')
  @ApiParam({ name: 'id', description: '评价ID' })
  @ApiOperation({ summary: '商家回复评价' })
  async replyToReview(
    @Param('id') id: string,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewService.replyToReview(Number(id), dto);
  }
}
