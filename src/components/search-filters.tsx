"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";

// Filter types that map to URL params
export interface SearchFiltersType {
  q: string;                    // text search
  types: string[];              // entity types to include
  entityId: string | null;      // specific entity "skater:123"
  yearFrom: number | null;
  yearTo: number | null;
  magazine: string | null;      // magazine title
  contexts: string[];           // appearance contexts
}

// Entity types available for filtering
export const ENTITY_TYPES = [
  { value: "skater", label: "Skaters" },
  { value: "spot", label: "Spots" },
  { value: "photographer", label: "Photographers" },
  { value: "brand", label: "Brands" },
  { value: "trick", label: "Tricks" },
  { value: "event", label: "Events" },
] as const;

// Context types from schema
export const CONTEXT_TYPES = [
  { value: "cover", label: "Cover" },
  { value: "feature", label: "Feature" },
  { value: "interview", label: "Interview" },
  { value: "photo", label: "Photo" },
  { value: "ad", label: "Ad" },
  { value: "contest_results", label: "Contest Results" },
  { value: "mention", label: "Mention" },
] as const;

interface EntityOption {
  type: string;
  id: number;
  name: string;
}

interface SearchFiltersProps {
  entities: EntityOption[];      // all entities for autocomplete
  magazines: string[];           // unique magazine titles
  yearRange: { min: number; max: number };
}

// Inner component that uses useSearchParams
function SearchFiltersInner({ entities, magazines, yearRange }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial state from URL
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() => {
    const types = searchParams.get("types");
    return types ? types.split(",") : [];
  });
  const [entitySearch, setEntitySearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<EntityOption | null>(() => {
    const entityParam = searchParams.get("entity");
    if (entityParam) {
      const [type, idStr] = entityParam.split(":");
      const id = parseInt(idStr, 10);
      const found = entities.find(e => e.type === type && e.id === id);
      return found || null;
    }
    return null;
  });
  const [yearFrom, setYearFrom] = useState<string>(() => searchParams.get("yearFrom") || "");
  const [yearTo, setYearTo] = useState<string>(() => searchParams.get("yearTo") || "");
  const [selectedMagazine, setSelectedMagazine] = useState<string>(() => searchParams.get("magazine") || "");
  const [selectedContexts, setSelectedContexts] = useState<string[]>(() => {
    const contexts = searchParams.get("contexts");
    return contexts ? contexts.split(",") : [];
  });

  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const entityInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowEntityDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter entities based on search text
  const filteredEntities = entitySearch.trim()
    ? entities.filter(e =>
        e.name.toLowerCase().includes(entitySearch.toLowerCase())
      ).slice(0, 20) // Limit to 20 results
    : [];

  // Build URL with all filters
  const buildSearchUrl = useCallback(() => {
    const params = new URLSearchParams();

    if (query.trim()) params.set("q", query.trim());
    if (selectedTypes.length > 0) params.set("types", selectedTypes.join(","));
    if (selectedEntity) params.set("entity", `${selectedEntity.type}:${selectedEntity.id}`);
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    if (selectedMagazine) params.set("magazine", selectedMagazine);
    if (selectedContexts.length > 0) params.set("contexts", selectedContexts.join(","));

    return `/search${params.toString() ? `?${params.toString()}` : ""}`;
  }, [query, selectedTypes, selectedEntity, yearFrom, yearTo, selectedMagazine, selectedContexts]);

  // Handle search submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildSearchUrl());
  };

  // Toggle entity type
  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Toggle context
  const toggleContext = (context: string) => {
    setSelectedContexts(prev =>
      prev.includes(context)
        ? prev.filter(c => c !== context)
        : [...prev, context]
    );
  };

  // Select an entity from autocomplete
  const selectEntity = (entity: EntityOption) => {
    setSelectedEntity(entity);
    setEntitySearch("");
    setShowEntityDropdown(false);
  };

  // Clear specific entity filter
  const clearEntity = () => {
    setSelectedEntity(null);
    setEntitySearch("");
  };

  // Clear all filters
  const clearAllFilters = () => {
    setQuery("");
    setSelectedTypes([]);
    setSelectedEntity(null);
    setEntitySearch("");
    setYearFrom("");
    setYearTo("");
    setSelectedMagazine("");
    setSelectedContexts([]);
  };

  // Check if any filters are active
  const hasActiveFilters = selectedTypes.length > 0 || selectedEntity || yearFrom || yearTo || selectedMagazine || selectedContexts.length > 0;

  return (
    <div className="space-y-4">
      {/* Main search input */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skaters, spots, photographers..."
          className="flex-1 border border-[#ebebeb] bg-white px-4 py-3 text-[#3a3a3a] placeholder:text-[#999] focus:border-[#3a3a3a] focus:outline-none"
        />
        <button
          type="submit"
          className="border border-[#3a3a3a] bg-[#3a3a3a] px-6 py-3 font-medium text-white transition-colors hover:bg-white hover:text-[#3a3a3a] sm:w-auto"
        >
          Search
        </button>
      </form>

      {/* Filter toggle button */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="text-sm text-[#666] hover:text-[#3a3a3a] flex items-center gap-1"
        >
          <svg className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-sm text-[#999] hover:text-[#3a3a3a]"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Collapsible filters panel */}
      {showFilters && (
        <div className="border border-[#ebebeb] p-4 space-y-6">
          {/* Entity type filter */}
          <div>
            <label className="block text-sm font-medium text-[#3a3a3a] mb-2">Entity Types</label>
            <div className="flex flex-wrap gap-2">
              {ENTITY_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => toggleType(type.value)}
                  className={`px-3 py-1.5 text-sm border transition-colors ${
                    selectedTypes.includes(type.value)
                      ? "border-[#3a3a3a] bg-[#3a3a3a] text-white"
                      : "border-[#ebebeb] text-[#666] hover:border-[#3a3a3a]"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Specific entity autocomplete */}
          <div>
            <label className="block text-sm font-medium text-[#3a3a3a] mb-2">Specific Entity</label>
            {selectedEntity ? (
              <div className="flex items-center gap-2 border border-[#3a3a3a] bg-[#f5f5f5] px-3 py-2">
                <span className="text-xs uppercase text-[#999]">{selectedEntity.type}</span>
                <span className="font-medium">{selectedEntity.name}</span>
                <button
                  type="button"
                  onClick={clearEntity}
                  className="ml-auto text-[#999] hover:text-[#3a3a3a]"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <input
                  ref={entityInputRef}
                  type="text"
                  value={entitySearch}
                  onChange={(e) => {
                    setEntitySearch(e.target.value);
                    setShowEntityDropdown(true);
                  }}
                  onFocus={() => setShowEntityDropdown(true)}
                  placeholder="Type to search for a specific entity..."
                  className="w-full border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#3a3a3a] placeholder:text-[#999] focus:border-[#3a3a3a] focus:outline-none"
                />
                {showEntityDropdown && filteredEntities.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto border border-[#ebebeb] bg-white shadow-lg">
                    {filteredEntities.map((entity) => (
                      <button
                        key={`${entity.type}:${entity.id}`}
                        type="button"
                        onClick={() => selectEntity(entity)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[#f5f5f5] flex items-center gap-2"
                      >
                        <span className="text-xs uppercase text-[#999] w-20">{entity.type}</span>
                        <span>{entity.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {showEntityDropdown && entitySearch.trim() && filteredEntities.length === 0 && (
                  <div className="absolute z-10 mt-1 w-full border border-[#ebebeb] bg-white p-3 text-sm text-[#999]">
                    No entities found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Year range */}
          <div>
            <label className="block text-sm font-medium text-[#3a3a3a] mb-2">Year Range</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder={String(yearRange.min)}
                min={yearRange.min}
                max={yearRange.max}
                className="w-20 sm:w-24 border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#3a3a3a] focus:border-[#3a3a3a] focus:outline-none"
              />
              <span className="text-[#999]">to</span>
              <input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder={String(yearRange.max)}
                min={yearRange.min}
                max={yearRange.max}
                className="w-20 sm:w-24 border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#3a3a3a] focus:border-[#3a3a3a] focus:outline-none"
              />
              <span className="text-xs text-[#999] hidden sm:inline">({yearRange.min}–{yearRange.max})</span>
            </div>
          </div>

          {/* Magazine filter */}
          <div>
            <label className="block text-sm font-medium text-[#3a3a3a] mb-2">Magazine</label>
            <select
              value={selectedMagazine}
              onChange={(e) => setSelectedMagazine(e.target.value)}
              className="w-full max-w-xs border border-[#ebebeb] bg-white px-3 py-2 text-sm text-[#3a3a3a] focus:border-[#3a3a3a] focus:outline-none"
            >
              <option value="">All magazines</option>
              {magazines.map(mag => (
                <option key={mag} value={mag}>{mag}</option>
              ))}
            </select>
          </div>

          {/* Context filter */}
          <div>
            <label className="block text-sm font-medium text-[#3a3a3a] mb-2">Appearance Type</label>
            <div className="flex flex-wrap gap-2">
              {CONTEXT_TYPES.map(ctx => (
                <button
                  key={ctx.value}
                  type="button"
                  onClick={() => toggleContext(ctx.value)}
                  className={`px-3 py-1.5 text-sm border transition-colors ${
                    selectedContexts.includes(ctx.value)
                      ? "border-[#3a3a3a] bg-[#3a3a3a] text-white"
                      : "border-[#ebebeb] text-[#666] hover:border-[#3a3a3a]"
                  }`}
                >
                  {ctx.label}
                </button>
              ))}
            </div>
          </div>

          {/* Apply filters button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push(buildSearchUrl())}
              className="border border-[#3a3a3a] bg-[#3a3a3a] px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-white hover:text-[#3a3a3a]"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active filters summary */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-2 text-sm">
          {selectedTypes.map(type => (
            <span key={type} className="inline-flex items-center gap-1 bg-[#f5f5f5] px-2 py-1">
              {ENTITY_TYPES.find(t => t.value === type)?.label}
              <button onClick={() => toggleType(type)} className="text-[#999] hover:text-[#3a3a3a]">×</button>
            </span>
          ))}
          {selectedEntity && (
            <span className="inline-flex items-center gap-1 bg-[#f5f5f5] px-2 py-1">
              {selectedEntity.name}
              <button onClick={clearEntity} className="text-[#999] hover:text-[#3a3a3a]">×</button>
            </span>
          )}
          {(yearFrom || yearTo) && (
            <span className="inline-flex items-center gap-1 bg-[#f5f5f5] px-2 py-1">
              {yearFrom || yearRange.min}–{yearTo || yearRange.max}
              <button onClick={() => { setYearFrom(""); setYearTo(""); }} className="text-[#999] hover:text-[#3a3a3a]">×</button>
            </span>
          )}
          {selectedMagazine && (
            <span className="inline-flex items-center gap-1 bg-[#f5f5f5] px-2 py-1">
              {selectedMagazine}
              <button onClick={() => setSelectedMagazine("")} className="text-[#999] hover:text-[#3a3a3a]">×</button>
            </span>
          )}
          {selectedContexts.map(ctx => (
            <span key={ctx} className="inline-flex items-center gap-1 bg-[#f5f5f5] px-2 py-1">
              {CONTEXT_TYPES.find(c => c.value === ctx)?.label}
              <button onClick={() => toggleContext(ctx)} className="text-[#999] hover:text-[#3a3a3a]">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Loading fallback
function SearchFiltersLoading() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 h-12 bg-[#f5f5f5] animate-pulse" />
        <div className="w-24 h-12 bg-[#f5f5f5] animate-pulse" />
      </div>
      <div className="h-6 w-32 bg-[#f5f5f5] animate-pulse" />
    </div>
  );
}

// Exported wrapper with Suspense
export function SearchFilters(props: SearchFiltersProps) {
  return (
    <Suspense fallback={<SearchFiltersLoading />}>
      <SearchFiltersInner {...props} />
    </Suspense>
  );
}
