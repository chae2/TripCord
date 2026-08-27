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

/** 역할 목록과 참가자 목록을 각각 셔플한 뒤 라운드로빈으로 배정한다 (사다리타기 방식). */
export async function randomAssign(tripId: string, participantIds: string[]): Promise<Map<string, string[]>> {
  const roles = await prisma.role.findMany({ where: { tripId } });
  if (roles.length === 0) {
    throw new Error("NO_ROLES");
  }

  const shuffledRoles = shuffle(roles);
  const shuffledParticipants = shuffle(participantIds);

  const assignment = new Map<string, string[]>(); // roleName -> userIds
  for (const role of shuffledRoles) assignment.set(role.name, []);

  await prisma.$transaction(
    shuffledParticipants.map((userId, index) => {
      const role = shuffledRoles[index % shuffledRoles.length]!;
      assignment.get(role.name)!.push(userId);
      return prisma.roleAssignment.upsert({
        where: { roleId_userId: { roleId: role.id, userId } },
        update: {},
        create: { roleId: role.id, userId },
      });
    })
  );

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
