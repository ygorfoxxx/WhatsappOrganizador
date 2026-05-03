import prisma from "../prisma/client";
import type { User } from "@prisma/client";

export async function findOrCreateUser(phone: string, name?: string | null): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { phone } });

  if (existing) {
    if (name && !existing.name) {
      return prisma.user.update({
        where: { phone },
        data: { name },
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: { phone, name: name || null },
  });
}
