"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HierarchyService = void 0;
const prisma_1 = require("../config/prisma");
class HierarchyService {
    /**
     * Fetches full association tree / DAG with parent-child links and clubs.
     */
    static async getFullHierarchy() {
        const associations = await prisma_1.prisma.association.findMany({
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
        const clubs = await prisma_1.prisma.club.findMany({
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
    static async getEffectiveRules(associationId) {
        const targetAssoc = await prisma_1.prisma.association.findUnique({
            where: { id: associationId },
        });
        if (!targetAssoc) {
            throw new Error('Association not found');
        }
        // Find national top-level association
        const nationalAssoc = await prisma_1.prisma.association.findFirst({
            where: { isTopLevel: true },
        });
        const nationalRules = nationalAssoc?.rules || {};
        const localRules = targetAssoc.rules || {};
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
    static async getAncestorIds(associationId, visited = new Set()) {
        if (visited.has(associationId))
            return [];
        visited.add(associationId);
        const parents = await prisma_1.prisma.associationHierarchy.findMany({
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
    static async getDescendantIds(associationId, visited = new Set()) {
        if (visited.has(associationId))
            return [];
        visited.add(associationId);
        const children = await prisma_1.prisma.associationHierarchy.findMany({
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
exports.HierarchyService = HierarchyService;
