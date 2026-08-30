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
 * 역할별로 원하는 인원 수(counts, 역할 생성 순서와 1:1 대응)를 받아 참가자 풀에서 무작위로 배정한다.
 * 인원 > 역할 상황을 위해 만든 기능이라, 같은 사람이 여러 역할에 중복 배정될 수 있다(역할 내부에서는 중복 없음).
 * 재실행 시 이전 배정은 전부 초기화하고 새로 배정한다.
 */
export async function randomAssignByCounts(
  tripId: string,
  counts: number[],
  participantIds: string[]
): Promise<Map<string, string[]>> {
  const roles = await prisma.role.findMany({ where: { tripId }, orderBy: { createdAt: "asc" } });
  if (roles.length === 0) {
    throw new Error("NO_ROLES");
  }
  if (roles.length !== counts.length) {
    throw new Error("COUNT_MISMATCH");
  }

  await clearAllAssignments(tripId);

  const assignment = new Map<string, string[]>();
  const creates: { roleId: string; userId: string }[] = [];

  roles.forEach((role, i) => {
    const count = counts[i]!;
    const picked = shuffle(participantIds).slice(0, Math.min(count, participantIds.length));
    assignment.set(role.name, picked);
    for (const userId of picked) {
      creates.push({ roleId: role.id, userId });
    }
  });

  if (creates.length > 0) {
    await prisma.roleAssignment.createMany({ data: creates, skipDuplicates: true });
  }

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
