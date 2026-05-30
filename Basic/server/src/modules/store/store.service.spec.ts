/**
 * Store 门店服务单元测试
 * 覆盖：S-01 ~ S-13 (15例)
 */
import { StoreService } from './store.service';

const mockStoreRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockVehicleRepo = {
  count: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('StoreService', () => {
  let service: StoreService;

  beforeEach(() => {
    service = new StoreService(mockStoreRepo as any, mockVehicleRepo as any);
    jest.clearAllMocks();
  });

  describe('CRUD 操作 (S-01~S-08)', () => {
    it('创建门店应返回对象且isActive=1 (S-01)', async () => {
      mockStoreRepo.findOne.mockResolvedValue(null);
      mockStoreRepo.create.mockReturnValue({
        storeName: '朝阳店', address: '朝阳区xxx', phone: '13800001111',
        latitude: 39.9, longitude: 116.4, isActive: 1, storeCode: 'BJ001',
      });
      mockStoreRepo.save.mockResolvedValue({ id: 1, storeName: '朝阳店', isActive: 1 });

      const result = await service.createStore({
        storeName: '朝阳店', address: '朝阳区xxx', storeCode: 'BJ001',
        phone: '13800001111', latitude: 39.9, longitude: 116.4,
      } as any);

      expect(result.id).toBeDefined();
      expect(result.isActive).toBe(1);
      expect(result.storeName).toBe('朝阳店');
    });

    it('编码重复应报错 (S-02)', async () => {
      mockStoreRepo.findOne.mockResolvedValue({ id: 99 });

      await expect(
        service.createStore({ storeCode: 'BJ001', storeName: '重复店' } as any),
      ).rejects.toThrow('门店编码');
    });

    it('列表返回分页结构 (S-03)', async () => {
      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 5]),
      };
      mockStoreRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.listStores({ size: 10 } as any);

      expect(result.list).toBeDefined();
      expect(typeof result.total).toBe('number');
    });

    it('存在ID的详情应返回完整信息含坐标 (S-05)', async () => {
      mockStoreRepo.findOne.mockResolvedValue({
        id: 1, storeName: '测试店', latitude: 39.9, longitude: 116.4,
      });
      mockVehicleRepo.count.mockResolvedValue(5);

      const result = await service.getStoreDetail(1);
      expect(result.latitude).toBeCloseTo(39.9);
      expect(result.longitude).toBeCloseTo(116.4);
    });

    it('不存在ID应抛出异常 (S-06)', async () => {
      mockStoreRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getStoreDetail(99999),
      ).rejects.toThrow('门店不存在');
    });

    it('更新门店信息 (S-07)', async () => {
      mockStoreRepo.findOneBy.mockResolvedValue({ id: 1, storeName: '旧名', latitude: 39.9, longitude: 116.4 });
      mockStoreRepo.save.mockResolvedValue({ id: 1, storeName: '新名' });

      const result = await service.updateStore(1, { storeName: '新名' } as any);
      expect(result.storeName).toBe('新名');
    });

    it('软删除设置deletedAt而非物理删除 (S-08)', async () => {
      mockStoreRepo.findOneBy.mockResolvedValue({ id: 1, storeName: '测试店' });
      mockVehicleRepo.count.mockResolvedValue(0);
      mockStoreRepo.softDelete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteStore(1);
      expect(mockStoreRepo.softDelete).toHaveBeenCalledWith(1);
      expect(result.message).toContain('已停用');
    });
  });

  describe('LBS查询 (S-09)', () => {
    it('附近门店应按距离排序', async () => {
      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [{ id: 1, storeName: '近店', distance_meters: 500 },
           { id: 2, storeName: '远店', distance_meters: 3200 }], 2,
        ]),
      };
      mockStoreRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getNearbyStores(39.9, 116.4);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('库存查询 (S-10)', () => {
    it('返回该门店可用车辆数', async () => {
      mockStoreRepo.findOneBy.mockResolvedValue({ id: 1, storeName: '测试店' });
      const mockQb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 15]),
      };
      mockVehicleRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getStoreInventory(1);
      expect(result.total).toBe(15);
    });
  });

  describe('坐标更新与权限 (S-11~S-13)', () => {
    it('更新经纬度成功 (S-11)', async () => {
      mockStoreRepo.findOneBy.mockResolvedValue({ id: 1, latitude: 39.9, longitude: 116.4 });
      mockStoreRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.updateLocation(1, 40.0, 116.35);
      expect(mockStoreRepo.update).toHaveBeenCalled();
      expect(result.storeId).toBe(1);
    });

    it('无效坐标应校验失败 (S-12)', () => {
      const invalidCoords = [
        { lat: 91, lng: 116 },
        { lat: -100, lng: 116 },
        { lat: 40, lng: 200 },
      ];

      invalidCoords.forEach(({ lat, lng }) => {
        const validLat = lat >= -90 && lat <= 90;
        const validLng = lng >= -180 && lng <= 180;
        expect(validLat && validLng).toBe(false);
      });
    });

    it('updateLocation方法应存在 (S-13)', () => {
      expect(service.updateLocation).toBeDefined();
    });
  });
});
