import { prisma } from '../config/prisma';

export class HierarchyService {
  /**
   * Fetches full association tree / DAG with parent-child links and clubs.
   */
  static async getFullHierarchy() {
    const associations = await prisma.association.findMany({
      include: {
        parentHierarchies: {
          include: { parent: true },
        },
        childHierarchies: {
          include: { child: true },
        },
        clubAssociations: {
          include: { club: true },
        },
      },
    });

    const clubs = await prisma.club.findMany({
      include: {
        associations: {
          include: { association: true },
        },
      },
    });

    return {
      associations,
      clubs,
    };
  }

  /**
   * Resolves effective rules for an association by walking up to the root national association.
   * National rules overrule sub-association rules where applicable.
   */
  static async getEffectiveRules(associationId: string): Promise<Record<string, any>> {
    const targetAssoc = await prisma.association.findUnique({
      where: { id: associationId },
    });

    if (!targetAssoc) {
      throw new Error('Association not found');
    }

    // Find national top-level association
    const nationalAssoc = await prisma.association.findFirst({
      where: { isTopLevel: true },
    });

    const nationalRules = (nationalAssoc?.rules as Record<string, any>) || {};
    const localRules = (targetAssoc.rules as Record<string, any>) || {};

    // Merge rules: local rules apply first, then national rules overwrite to ensure national precedence
    const merged = {
      ...localRules,
      ...nationalRules,
      _inheritedFromNational: Object.keys(nationalRules),
      _isTopLevel: targetAssoc.isTopLevel,
    };

    return merged;
  }

  /**
   * Retrieves all ancestor association IDs for a given association (recursive DAG search).
   */
  static async getAncestorIds(associationId: string, visited: Set<string> = new Set()): Promise<string[]> {
    if (visited.has(associationId)) return [];
    visited.add(associationId);

    const parents = await prisma.associationHierarchy.findMany({
      where: { childId: associationId },
      select: { parentId: true },
    });

    let ancestorIds = parents.map((p) => p.parentId);
    for (const parent of parents) {
      const grandParents = await this.getAncestorIds(parent.parentId, visited);
      ancestorIds = ancestorIds.concat(grandParents);
    }

    return Array.from(new Set(ancestorIds));
  }

  /**
   * Retrieves all descendant association IDs for a given association.
   */
  static async getDescendantIds(associationId: string, visited: Set<string> = new Set()): Promise<string[]> {
    if (visited.has(associationId)) return [];
    visited.add(associationId);

    const children = await prisma.associationHierarchy.findMany({
      where: { parentId: associationId },
      select: { childId: true },
    });

    let descendantIds = children.map((c) => c.childId);
    for (const child of children) {
      const grandChildren = await this.getDescendantIds(child.childId, visited);
      descendantIds = descendantIds.concat(grandChildren);
    }

    return Array.from(new Set(descendantIds));
  }
}

