import { prisma } from "../client";

export const DEFAULT_ROLE_NAMES = ["여행표 결정", "숙소 결정", "여행 일정 조사", "여행지 맛집 조사"];

export async function createDefaultRoles(tripId: string): Promise<void> {
  await prisma.role.createMany({
    data: DEFAULT_ROLE_NAMES.map((name) => ({ tripId, name })),
    skipDuplicates: true,
  });
}

export async function addRole(tripId: string, name: string) {
  return prisma.role.upsert({
    where: { tripId_name: { tripId, name } },
    update: {},
    create: { tripId, name },
  });
}

export async function listRoleNames(tripId: string): Promise<string[]> {
  const roles = await prisma.role.findMany({ where: { tripId }, select: { name: true } });
  return roles.map((r) => r.name);
}

export async function listRolesWithAssignees(tripId: string) {
  return prisma.role.findMany({
    where: { tripId },
    include: { assignments: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function assignRole(tripId: string, roleName: string, userId: string) {
  const role = await prisma.role.findUnique({ where: { tripId_name: { tripId, name: roleName } } });
  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }

  return prisma.roleAssignment.upsert({
    where: { roleId_userId: { roleId: role.id, userId } },
    update: {},
    create: { roleId: role.id, userId },
  });
}

export async function isUserAssignedToRole(tripId: string, roleName: string, userId: string): Promise<boolean> {
  const role = await prisma.role.findUnique({
    where: { tripId_name: { tripId, name: roleName } },
    include: { assignments: { where: { userId } } },
  });
  return Boolean(role && role.assignments.length > 0);
}

export async function renameRole(tripId: string, oldName: string, newName: string): Promise<void> {
  const role = await prisma.role.findUnique({ where: { tripId_name: { tripId, name: oldName } } });
  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }
  const conflict = await prisma.role.findUnique({ where: { tripId_name: { tripId, name: newName } } });
  if (conflict) {
    throw new Error("ROLE_NAME_TAKEN");
  }
  await prisma.role.update({ where: { id: role.id }, data: { name: newName } });
}

export async function deleteRole(tripId: string, name: string): Promise<void> {
  const role = await prisma.role.findUnique({ where: { tripId_name: { tripId, name } } });
  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }
  await prisma.role.delete({ where: { id: role.id } });
}

export async function unassignRole(tripId: string, roleName: string, userId: string): Promise<void> {
  const role = await prisma.role.findUnique({ where: { tripId_name: { tripId, name: roleName } } });
  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
  }
  await prisma.roleAssignment.deleteMany({ where: { roleId: role.id, userId } });
}

async function clearAllAssignments(tripId: string): Promise<void> {
  const roles = await prisma.role.findMany({ where: { tripId }, select: { id: true } });
  await prisma.roleAssignment.deleteMany({ where: { roleId: { in: roles.map((r) => r.id) } } });
}

/**
 * 역할 수와 참가자 수를 비교해서 자동으로 배정 방식을 정한다:
 * - 역할 수 == 참가자 수: 중복 없이 1:1로 무작위 배정
 * - 역할 수 > 참가자 수: 참가자를 돌려가며 배정(한 사람이 여러 역할을 맡음)
 * - 역할 수 < 참가자 수: 역할을 돌려가며 배정(한 역할에 여러 사람이 배정됨)
 * 재실행 시 이전 배정은 전부 초기화하고 새로 배정한다.
 */
export async function randomAssign(tripId: string, participantIds: string[]): Promise<Map<string, string[]>> {
  const roles = await prisma.role.findMany({ where: { tripId }, orderBy: { createdAt: "asc" } });
  if (roles.length === 0) {
    throw new Error("NO_ROLES");
  }
  if (participantIds.length === 0) {
    throw new Error("NO_PARTICIPANTS");
  }

  await clearAllAssignments(tripId);

  const shuffledRoles = shuffle(roles);
  const shuffledParticipants = shuffle(participantIds);
  const rounds = Math.max(shuffledRoles.length, shuffledParticipants.length);

  const assignment = new Map<string, string[]>();
  for (const role of shuffledRoles) assignment.set(role.name, []);

  const creates: { roleId: string; userId: string }[] = [];
  for (let i = 0; i < rounds; i++) {
    const role = shuffledRoles[i % shuffledRoles.length]!;
    const userId = shuffledParticipants[i % shuffledParticipants.length]!;
    assignment.get(role.name)!.push(userId);
    creates.push({ roleId: role.id, userId });
  }

  await prisma.roleAssignment.createMany({ data: creates, skipDuplicates: true });

  return assignment;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
