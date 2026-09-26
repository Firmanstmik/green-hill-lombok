/**
 * POI Editor Component
 * Allows users to manage nearby points of interest
 * - View auto-populated POIs
 * - Remove unwanted POIs
 * - Add custom POIs
 */

import { useState } from 'react';
import { NearbyPOI, POI_CATEGORIES, POICategory } from '@/types/poi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Plus, Loader2, MapPin } from 'lucide-react';

interface POIEditorProps {
  pois: NearbyPOI[];
  onChange: (pois: NearbyPOI[]) => void;
  loading?: boolean;
}

const POIEditor = ({ pois, onChange, loading = false }: POIEditorProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [customPOI, setCustomPOI] = useState({
    category: 'cafe' as POICategory,
    name: '',
    distance_meters: 0,
  });

  const removePOI = (index: number) => {
    onChange(pois.filter((_, i) => i !== index));
  };

  const addCustomPOI = () => {
    if (!customPOI.name.trim()) {
      return;
    }

    const newPOI: NearbyPOI = {
      category: customPOI.category,
      name: customPOI.name.trim(),
      distance_meters: customPOI.distance_meters,
      distance_display: formatDistance(customPOI.distance_meters),
      lat: 0,
      lng: 0,
      custom: true,
      verified: false,
    };

    onChange([...pois, newPOI]);

    // Reset form
    setCustomPOI({
      category: 'cafe',
      name: '',
      distance_meters: 0,
    });
    setShowAddForm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCustomPOI();
    }
  };

  // Group POIs by category
  const poisByCategory: Record<POICategory, NearbyPOI[]> = {} as any;
  pois.forEach((poi) => {
    if (!poisByCategory[poi.category]) {
      poisByCategory[poi.category] = [];
    }
    poisByCategory[poi.category].push(poi);
  });

  // Get sorted categories (by priority)
  const sortedCategories = Object.entries(poisByCategory)
    .map(([cat, items]) => ({
      category: cat as POICategory,
      config: POI_CATEGORIES[cat as POICategory],
      pois: items,
    }))
    .filter(item => item.config) // Filter out categories that don't exist in POI_CATEGORIES
    .sort((a, b) => a.config.priority - b.config.priority);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-border/50">
        <h3 className="text-xl font-black text-[#17382e] flex items-center gap-2">
          <MapPin size={24} className="text-[#17382e]" />
          Nearby Points of Interest
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          {pois.length > 0
            ? `${pois.length} amenities found • Hover to remove, or add custom ones below`
            : 'Select an address to auto-populate, or add custom amenities manually'}
        </p>
      </div>

      {/* Empty State */}
      {pois.length === 0 && !showAddForm && (
        <div className="text-center py-16 px-6 bg-gradient-to-b from-secondary/5 to-secondary/10 rounded-3xl border-2 border-dashed border-border/50">
          <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} className="text-muted-foreground" />
          </div>
          <p className="text-base font-bold text-[#17382e]">
            No nearby amenities detected
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Select an address above to automatically find nearby schools, hospitals, shops, and more. Or add custom amenities manually.
          </p>
        </div>
      )}

      {/* POI List by Category - Grid Layout */}
      {sortedCategories.length > 0 && (
        <div className="space-y-8">
          {sortedCategories.map(({ category, config, pois: categoryPois }) => (
            <div key={category}>
              {/* Category Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{config.icon}</span>
                <h4 className="text-sm font-black uppercase tracking-[0.2em] text-[#17382e]">
                  {config.label}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    ({categoryPois.length})
                  </span>
                </h4>
              </div>

              {/* POI Grid - Responsive columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryPois.map((poi, idx) => (
                  <div
                    key={`${category}-${idx}`}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-white to-secondary/5 border border-border/50 hover:border-border hover:shadow-md transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#17382e] truncate leading-tight">
                        {poi.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {poi.distance_display}
                        {poi.custom && (
                          <span className="ml-2 inline-block px-2 py-0.5 bg-brand-forest/10 text-brand-forest rounded-md text-[10px] font-bold">
                            Custom
                          </span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allIndex = pois.findIndex((p) => p === poi);
                        if (allIndex >= 0) removePOI(allIndex);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-brand-danger hover:bg-brand-danger/10 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Custom POI Form */}
      <div className="pt-8 mt-8 border-t border-border/50">
        {!showAddForm ? (
          <Button
            onClick={() => setShowAddForm(true)}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-[#17382e]/20 bg-gradient-to-r from-[#17382e]/5 to-secondary/5 hover:from-[#17382e]/10 hover:to-secondary/10 text-[#17382e] font-bold text-base transition-all hover:border-[#17382e]/40"
          >
            <Plus size={20} className="mr-2" />
            Add Custom Amenity
          </Button>
        ) : (
          <div className="space-y-5 p-6 bg-gradient-to-b from-secondary/10 to-secondary/5 rounded-3xl border-2 border-border/50">
            <h4 className="text-sm font-black text-[#17382e] uppercase tracking-[0.1em]">
              Add New Amenity
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#17382e] uppercase tracking-wider">
                  Category
                </label>
                <Select
                  value={customPOI.category}
                  onValueChange={(value) =>
                    setCustomPOI((prev) => ({
                      ...prev,
                      category: value as POICategory,
                    }))
                  }
                >
                  <SelectTrigger className="h-11 rounded-xl border-border font-semibold bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(POI_CATEGORIES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.icon} {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#17382e] uppercase tracking-wider">
                  Name
                </label>
                <Input
                  placeholder="e.g. Central Library"
                  value={customPOI.name}
                  onChange={(e) =>
                    setCustomPOI((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="h-11 rounded-xl border-border bg-white font-medium"
                />
              </div>

              {/* Distance Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#17382e] uppercase tracking-wider">
                  Distance (m)
                </label>
                <Input
                  type="number"
                  placeholder="500"
                  value={customPOI.distance_meters}
                  onChange={(e) =>
                    setCustomPOI((prev) => ({
                      ...prev,
                      distance_meters: parseInt(e.target.value) || 0,
                    }))
                  }
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="h-11 rounded-xl border-border bg-white font-medium"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <Button
                onClick={addCustomPOI}
                disabled={!customPOI.name.trim() || loading}
                className="flex-1 h-11 rounded-xl bg-[#17382e] hover:bg-[#17382e]/90 text-white font-bold text-base shadow-md hover:shadow-lg transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={18} className="mr-2" />
                    Add Amenity
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowAddForm(false);
                  setCustomPOI({
                    category: 'cafe',
                    name: '',
                    distance_meters: 0,
                  });
                }}
                disabled={loading}
                variant="outline"
                className="flex-1 h-11 rounded-xl text-[#17382e] border-border hover:bg-white/80 font-bold"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {pois.length > 0 && (
        <div className="pt-8 mt-8 border-t border-border/50">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-black text-[#17382e]">
                {pois.filter((p) => !p.custom).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Auto-Detected</p>
            </div>
            {pois.filter((p) => p.custom).length > 0 && (
              <>
                <div className="h-8 w-px bg-border/30"></div>
                <div className="text-center">
                  <p className="text-2xl font-black text-brand-forest">
                    {pois.filter((p) => p.custom).length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Custom Added</p>
                </div>
              </>
            )}
            <div className="h-8 w-px bg-border/30"></div>
            <div className="text-center">
              <p className="text-2xl font-black text-[#17382e]">
                {pois.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Format distance for display
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  const km = meters / 1000;
  return km % 1 === 0 ? `${km}km` : `${km.toFixed(1)}km`;
}

export default POIEditor;
