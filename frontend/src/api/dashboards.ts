import client from './client';

export const dashboardApi = {
  getLayout: () => client.get('/dashboards/layout').then(res => res.data),
  getWidgetRevenue: () => client.get('/dashboards/widgets/revenue').then(res => res.data),
  getWidgetFleet: () => client.get('/dashboards/widgets/fleet').then(res => res.data),
  getWidgetTasks: () => client.get('/dashboards/widgets/tasks').then(res => res.data),
  getWidgetApprovals: () => client.get('/dashboards/widgets/approvals').then(res => res.data),
};
