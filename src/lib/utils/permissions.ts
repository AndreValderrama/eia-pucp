import { Group, GroupRole } from '../types';

export const hasPermission = (group: Group, userId: string, requiredRole: GroupRole): boolean => {
  const userRole = group.roles[userId];
  if (!userRole) return false;

  const roleHierarchy: Record<GroupRole, number> = {
    'viewer': 1,
    'editor': 2,
    'admin': 3
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};
