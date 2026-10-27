"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { AlumRow } from "@/lib/alumni-utils";

type Group = { key: string; label: string; coords: [number, number]; alumni: AlumRow[] };

/**
 * Alumni pins grouped by location. Leaflet is loaded only when the map is
 * shown. Popups are rendered by React below the map (not Leaflet HTML), so
 * sheet text is always escaped.
 */
export function AlumniMap({
  alumni,
  me,
  onCoffeeChat,
}: {
  alumni: AlumRow[];
  me: [number, number] | null;
  onCoffeeChat?: (alum: AlumRow) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<Group | null>(null);

  const groups = useMemo(() => {
    const byKey = new Map<string, Group>();
    for (const a of alumni) {
      if (!a.coords || !a.location) continue;
      const key = a.location.toLowerCase().trim();
      const group = byKey.get(key) ?? { key, label: a.location, coords: a.coords, alumni: [] };
      group.alumni.push(a);
      byKey.set(key, group);
    }
    return [...byKey.values()];
  }, [alumni]);
  const unmapped = alumni.filter((a) => !a.coords).length;

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([39.5, -96], 4);
      // OpenStreetMap's standard tiles: free, no API key. Their usage policy
      // asks for attribution and light use, which a chapter directory is.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw pins whenever the filtered alumni change.
  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !layer) return;
    layer.clearLayers();

    for (const group of groups) {
      const count = group.alumni.length;
      const size = Math.min(22 + count * 3, 48);
      const icon = L.divIcon({
        className: "",
        html: `<div class="alumni-pin" style="width:${size}px;height:${size}px">${count}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      L.marker(group.coords, { icon, title: `${group.label}: ${count} alumni`, keyboard: true })
        .on("click", () => setSelected(group))
        .addTo(layer);
    }

    if (me) {
      L.circleMarker(me, { radius: 8, color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 })
        .bindTooltip("You are here")
        .addTo(layer);
    }
  }, [groups, me, ready]);

  // Zoom to the user once, when Near Me is turned on.
  useEffect(() => {
    if (ready && me) mapRef.current?.flyTo(me, 8, { duration: 1 });
  }, [me, ready]);

  // Close the panel if its pin was filtered away.
  const shown = selected && groups.some((g) => g.key === selected.key) ? selected : null;

  return (
    <div>
      <div className="relative">
        <div
          ref={containerRef}
          className="h-[60vh] min-h-[360px] w-full overflow-hidden rounded-xl border border-line"
          aria-label="Map of alumni locations"
        />
        {shown && (
          <div className="absolute right-3 top-3 z-[1000] max-h-[calc(60vh-1.5rem)] w-[min(20rem,calc(100%-1.5rem))] overflow-y-auto rounded-xl border border-line bg-white p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink">
                {shown.label}
                <span className="ml-1 font-normal text-muted">· {shown.alumni.length}</span>
              </p>
              <button type="button" onClick={() => setSelected(null)} className="text-sm text-muted hover:text-ink">
                Close
              </button>
            </div>
            <ul className="mt-2 divide-y divide-line">
              {shown.alumni.map((a) => (
                <li key={a.id} className="py-2.5">
                  <p className="text-sm font-medium text-ink">{a.name}</p>
                  {(a.position || a.company) && (
                    <p className="text-xs text-muted">{[a.position, a.company].filter(Boolean).join(" · ")}</p>
                  )}
                  <div className="mt-1.5 flex gap-3 text-xs font-medium">
                    {a.linkedin && (
                      <a href={a.linkedin} target="_blank" rel="noreferrer" className="text-navy hover:underline">
                        LinkedIn
                      </a>
                    )}
                    {a.email && (
                      <a href={`mailto:${a.email}`} className="text-navy hover:underline">
                        Email
                      </a>
                    )}
                    {onCoffeeChat && (
                      <button type="button" onClick={() => onCoffeeChat(a)} className="text-navy hover:underline">
                        Coffee chat
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        Pins show how many alumni are in each place. Click one to see who.
        {unmapped > 0 && ` ${unmapped} alumni aren't on the map because their location isn't recognized.`}
      </p>
    </div>
  );
}
