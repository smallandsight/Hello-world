import request from './request'

export function getStaffList(params?: Record<string, any>) {
  return request({ url: '/staff', method: 'get', params })
}

export function getStaffDetail(id: number) {
  return request({ url: `/staff/${id}`, method: 'get' })
}

export function createStaff(data: Record<string, any>) {
  return request({ url: '/staff', method: 'post', data })
}

export function updateStaff(id: number, data: Record<string, any>) {
  return request({ url: `/staff/${id}`, method: 'put', data })
}

export function toggleStaffStatus(id: number) {
  return request({ url: `/staff/${id}/toggle`, method: 'patch' })
}

export function resetStaffPassword(id: number, password: string) {
  return request({ url: `/staff/${id}/reset-password`, method: 'patch', data: { password } })
}

export function getRoleList() {
  return request({ url: '/staff/roles', method: 'get' })
}

export function assignStaffRoles(staffId: number, roleIds: number[]) {
  return request({ url: `/staff/${staffId}/roles`, method: 'put', data: { roleIds } })
}
