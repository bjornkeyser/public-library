"use client";

import { useState } from "react";
import { mergeEntities } from "@/lib/actions/admin";

interface Entity {
  id: number;
  name: string;
  appearanceCount: number;
}

interface DuplicateGroup {
  entities: Entity[];
  similarityScore: number;
}

interface DuplicatesListProps {
  duplicates: {
    skaters: DuplicateGroup[];
    spots: DuplicateGroup[];
    photographers: DuplicateGroup[];
    brands: DuplicateGroup[];
    events: DuplicateGroup[];
    tricks: DuplicateGroup[];
    locations: DuplicateGroup[];
  };
}

const entityTypeLabels: Record<string, string> = {
  skaters: "Skaters",
  spots: "Spots",
  photographers: "Photographers",
  brands: "Brands",
  events: "Events",
  tricks: "Tricks",
  locations: "Locations",
};

function DuplicateGroupCard({
  group,
  entityType,
  groupKey,
  onMerge,
  isMerging,
}: {
  group: DuplicateGroup;
  entityType: string;
  groupKey: string;
  onMerge: (keepId: number, mergeIds: number[]) => void;
  isMerging: boolean;
}) {
  const defaultKeep = group.entities.reduce(
    (max, e) => (e.appearanceCount > max.appearanceCount ? e : max),
    group.entities[0]
  );
  const [selectedKeep, setSelectedKeep] = useState<number>(defaultKeep.id);

  const selectedEntity = group.entities.find(e => e.id === selectedKeep);

  const handleMerge = () => {
    if (isMerging) return;
    const mergeIds = group.entities.filter(e => e.id !== selectedKeep).map(e => e.id);
    onMerge(selectedKeep, mergeIds);
  };

  return (
    <div className="border border-[#ebebeb] p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#999] uppercase tracking-wide">
          {Math.round(group.similarityScore * 100)}% similar
        </span>
      </div>

      <p className="text-sm text-[#666] mb-3">
        Select which name to keep. All appearances will be merged into the selected entity.
      </p>

      <div className="space-y-2 mb-4">
        {group.entities.map((entity) => (
          <label
            key={entity.id}
            className={`flex items-center gap-3 p-3 cursor-pointer rounded border transition-colors ${
              selectedKeep === entity.id
                ? "bg-green-50 border-green-300"
                : "border-[#ebebeb] hover:border-[#ccc]"
            }`}
          >
            <input
              type="radio"
              name={`keep-${groupKey}`}
              checked={selectedKeep === entity.id}
              onChange={() => setSelectedKeep(entity.id)}
              className="accent-green-600"
            />
            <span className={`flex-1 ${selectedKeep === entity.id ? "font-semibold" : ""}`}>
              {entity.name}
            </span>
            <span className="text-sm text-[#999]">
              {entity.appearanceCount} appearance{entity.appearanceCount !== 1 && "s"}
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#ebebeb]">
        <div className="text-sm">
          <span className="text-[#666]">Final name: </span>
          <span className="font-semibold">{selectedEntity?.name}</span>
        </div>
        <button
          onClick={handleMerge}
          disabled={isMerging}
          className="text-sm border border-[#3a3a3a] px-4 py-1.5 hover:bg-[#3a3a3a] hover:text-white transition-colors disabled:opacity-50"
        >
          {isMerging ? "Merging..." : `Merge ${group.entities.length} → 1`}
        </button>
      </div>
    </div>
  );
}

export function DuplicatesList({ duplicates }: DuplicatesListProps) {
  const [mergingKey, setMergingKey] = useState<string | null>(null);
  const [mergedGroups, setMergedGroups] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleMerge = async (entityType: string, groupKey: string, keepId: number, mergeIds: number[]) => {
    if (mergingKey) return;

    setMergingKey(groupKey);

    try {
      const singularType = entityType.replace(/s$/, "") as "skater" | "spot" | "photographer" | "brand" | "event" | "trick" | "location";
      await mergeEntities(singularType, keepId, mergeIds);
      setMergedGroups(prev => new Set([...prev, groupKey]));
      setMessage({ type: "success", text: `Merged ${mergeIds.length + 1} ${entityType} into one` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: `Failed to merge: ${error}` });
    } finally {
      setMergingKey(null);
    }
  };

  const entityTypes = Object.keys(duplicates) as (keyof typeof duplicates)[];
  const hasAnyDuplicates = entityTypes.some(type => duplicates[type].length > 0);

  if (!hasAnyDuplicates) {
    return (
      <div className="text-center py-12 text-[#666]">
        <p className="text-lg">No potential duplicates found</p>
        <p className="text-sm mt-2">All entity names appear to be unique</p>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div className={`mb-6 p-4 rounded ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {entityTypes.map((entityType) => {
        const groups = duplicates[entityType];
        if (groups.length === 0) return null;

        const visibleGroups = groups.filter((_, i) => !mergedGroups.has(`${entityType}-${i}`));
        if (visibleGroups.length === 0) return null;

        return (
          <section key={entityType} className="mb-10">
            <h2 className="text-lg font-semibold uppercase tracking-wide mb-4">
              {entityTypeLabels[entityType]}{" "}
              <span className="text-sm font-normal text-[#999]">
                ({visibleGroups.length} group{visibleGroups.length !== 1 && "s"})
              </span>
            </h2>
            {groups.map((group, index) => {
              const groupKey = `${entityType}-${index}`;
              if (mergedGroups.has(groupKey)) return null;

              return (
                <DuplicateGroupCard
                  key={groupKey}
                  group={group}
                  entityType={entityType}
                  groupKey={groupKey}
                  onMerge={(keepId, mergeIds) => handleMerge(entityType, groupKey, keepId, mergeIds)}
                  isMerging={mergingKey === groupKey}
                />
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
