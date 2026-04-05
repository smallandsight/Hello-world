import { Injectable } from '@nestjs/common';

@Injectable()
export class StaffService {
  async getStaffProfile(staffId: string): Promise<any> {
    return { message: '待实现：员工信息', staffId };
  }

  async getRoleList(): Promise<any> {
    return { message: '待实现：角色列表' };
  }

  async getStaffList(query: any): Promise<any> {
    return { message: '待实现：员工列表', query };
  }
}
