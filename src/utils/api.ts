import request from './request';

export function getEquipmentOverview<T = unknown>(params?: Record<string, unknown>) {
  return request<T>({
    url: '/equipment/overview',
    method: 'get',
    params,
  });
}

export function updateProcessParameters<T = unknown>(data?: Record<string, unknown>) {
  return request<T>({
    url: '/process/parameters',
    method: 'post',
    data,
  });
}

export function clearActiveAlarms<T = unknown>(data?: Record<string, unknown>) {
  return request<T>({
    url: '/alarms/clear',
    method: 'post',
    data,
  });
}
