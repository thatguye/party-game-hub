import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type {
  ActiveZone,
  LatLng,
  MapTheme,
  PlayerState,
  RadarPing,
} from '../types/game';
import { getCallsignInitial, type VisiblePlayerMarker } from '../game/rules';
import { haversineMeters, roundCoord } from '../game/geo';

interface TacticalMapProps {
  center: LatLng;
  mapTheme: MapTheme;
  activeZone: ActiveZone;
  nextZonePreview?: ActiveZone | null;
  visibleMarkers?: VisiblePlayerMarker[];
  pings?: RadarPing[];
  showTrailsForPlayers?: PlayerState[];
  viewerId?: string;
  /** Uppercase initial shown on the editable zone center pin (defaults to viewer callsign first letter) */
  centerLabel?: string;
  nowMs?: number;
  /** Lobby zone editing mode */
  editableZone?: boolean;
  onZoneChange?: (zone: ActiveZone) => void;
  /** Increment to pan back to center */
  recenterSignal?: number;
  className?: string;
}

interface ThemeTileSpec {
  baseUrl: string;
  overlayUrl?: string;
  subdomains?: string;
  attribution: string;
  maxZoom: number;
}

const TILE_CONFIG: Record<MapTheme, ThemeTileSpec> = {
  night: {
    baseUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap',
    maxZoom: 16,
  },
  standard: {
    baseUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap',
    maxZoom: 19,
  },
  satellite: {
    baseUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
    maxZoom: 19,
  },
  snow: {
    baseUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap',
    maxZoom: 16,
  },
};

export const TacticalMap: React.FC<TacticalMapProps> = ({
  center,
  mapTheme,
  activeZone,
  nextZonePreview = null,
  visibleMarkers = [],
  pings = [],
  showTrailsForPlayers = [],
  viewerId,
  centerLabel,
  nowMs = Date.now(),
  editableZone = false,
  onZoneChange,
  recenterSignal = 0,
  className = 'w-full h-full',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayersRef = useRef<L.TileLayer[]>([]);
  const zoneLayerRef = useRef<L.LayerGroup | null>(null);
  const dynamicLayerRef = useRef<L.LayerGroup | null>(null);
  const zonePropsRef = useRef({ activeZone, editableZone, onZoneChange });

  zonePropsRef.current = { activeZone, editableZone, onZoneChange };

  const applyThemeLayers = (map: L.Map, theme: MapTheme) => {
    for (const layer of tileLayersRef.current) {
      map.removeLayer(layer);
    }
    tileLayersRef.current = [];

    const cfg = TILE_CONFIG[theme] ?? TILE_CONFIG.night;
    const base = L.tileLayer(cfg.baseUrl, {
      maxNativeZoom: cfg.maxZoom,
      maxZoom: 19,
      attribution: cfg.attribution,
      ...(cfg.subdomains ? { subdomains: cfg.subdomains } : {}),
    }).addTo(map);
    base.bringToBack();
    tileLayersRef.current.push(base);

    if (cfg.overlayUrl) {
      const overlay = L.tileLayer(cfg.overlayUrl, {
        maxNativeZoom: cfg.maxZoom,
        maxZoom: 19,
        opacity: 0.92,
      }).addTo(map);
      tileLayersRef.current.push(overlay);
    }
  };

  // Mount Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
    });

    applyThemeLayers(map, mapTheme);

    zoneLayerRef.current = L.layerGroup().addTo(map);
    dynamicLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { activeZone: z, editableZone: canEdit, onZoneChange: cb } = zonePropsRef.current;
      if (!canEdit || !cb) return;
      const clicked = { lat: roundCoord(e.latlng.lat), lng: roundCoord(e.latlng.lng) };
      if (z.shape === 'circle') {
        cb({ ...z, center: clicked });
      } else if (z.shape === 'polygon') {
        cb({ ...z, polygon: [...z.polygon, clicked] });
      }
    });

    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayersRef.current = [];
      zoneLayerRef.current = null;
      dynamicLayerRef.current = null;
    };
  }, []);

  // Swap tile source cleanly when mapTheme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyThemeLayers(map, mapTheme);
  }, [mapTheme]);

  // Recenter when explicitly requested
  useEffect(() => {
    if (!mapRef.current || recenterSignal === 0) return;
    mapRef.current.setView([center.lat, center.lng], Math.max(mapRef.current.getZoom(), 15), {
      animate: true,
    });
  }, [recenterSignal]);

  // Render active zone, dashed preview zone, and editable vertex/center handles
  useEffect(() => {
    const group = zoneLayerRef.current;
    if (!group) return;
    group.clearLayers();

    const isLightMap = mapTheme === 'standard' || mapTheme === 'snow';
    const zoneStroke = isLightMap ? '#059669' : '#10B981';

    if (activeZone.shape === 'circle') {
      L.circle([activeZone.center.lat, activeZone.center.lng], {
        radius: activeZone.diameterMeters / 2,
        color: zoneStroke,
        weight: 2.8,
        fillColor: zoneStroke,
        fillOpacity: isLightMap ? 0.1 : 0.08,
      }).addTo(group);

      if (editableZone) {
        const pinLetter = escapeHtml(getCallsignInitial(centerLabel));
        const pinCaption = centerLabel ? `${escapeHtml(centerLabel)} · ZONE` : 'ZONE';
        const pin = L.marker([activeZone.center.lat, activeZone.center.lng], {
          draggable: true,
          zIndexOffset: 600,
          icon: L.divIcon({
            className: 'fk-center-pin',
            html: `<div style="position:relative;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;cursor:grab;">
              <div data-testid="zone-center-pin" style="width:34px;height:34px;border-radius:9999px;background:#10B981;border:3px solid #FFFFFF;box-shadow:0 4px 16px rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;color:#08090E;font-weight:900;font-size:13px;">${pinLetter}</div>
              <div style="margin-top:4px;padding:2px 7px;border-radius:7px;background:rgba(9,10,16,0.92);border:1px solid #10B981;color:#F8FAFC;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.45);">${pinCaption}</div>
            </div>`,
            iconSize: [0, 0],
          }),
        }).addTo(group);

        pin.on('dragend', () => {
          const ll = pin.getLatLng();
          zonePropsRef.current.onZoneChange?.({
            ...zonePropsRef.current.activeZone,
            center: { lat: roundCoord(ll.lat), lng: roundCoord(ll.lng) },
          });
        });
      }
    } else if (activeZone.shape === 'polygon' && activeZone.polygon.length >= 3) {
      L.polygon(
        activeZone.polygon.map((p) => [p.lat, p.lng] as [number, number]),
        {
          color: zoneStroke,
          weight: 2.8,
          fillColor: zoneStroke,
          fillOpacity: isLightMap ? 0.11 : 0.09,
        }
      ).addTo(group);

      if (editableZone) {
        activeZone.polygon.forEach((pt, idx) => {
          const marker = L.marker([pt.lat, pt.lng], {
            draggable: true,
            icon: L.divIcon({
              className: 'fk-vertex-pin',
              html: `<div style="width:28px;height:28px;border-radius:9999px;background:#06B6D4;border:3px solid #09090E;box-shadow:0 3px 10px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;color:#09090E;font-weight:800;font-size:11px;font-family:JetBrains Mono,monospace;">${
                idx + 1
              }</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            }),
          }).addTo(group);

          marker.on('dragend', () => {
            const ll = marker.getLatLng();
            const current = zonePropsRef.current.activeZone;
            const nextPoly = current.polygon.map((v, i) =>
              i === idx ? { lat: roundCoord(ll.lat), lng: roundCoord(ll.lng) } : v
            );
            zonePropsRef.current.onZoneChange?.({ ...current, polygon: nextPoly });
          });
        });
      }
    }

    // Dashed preview ring/polygon showing where next shrink or Curfew zone will land
    if (nextZonePreview && nextZonePreview.shape !== 'off') {
      if (nextZonePreview.shape === 'circle') {
        L.circle([nextZonePreview.center.lat, nextZonePreview.center.lng], {
          radius: nextZonePreview.diameterMeters / 2,
          color: '#F59E0B',
          weight: 2.2,
          dashArray: '8 8',
          fillColor: '#F59E0B',
          fillOpacity: 0.05,
        }).addTo(group);
      } else if (nextZonePreview.shape === 'polygon' && nextZonePreview.polygon.length >= 3) {
        L.polygon(
          nextZonePreview.polygon.map((p) => [p.lat, p.lng] as [number, number]),
          {
            color: '#F59E0B',
            weight: 2.2,
            dashArray: '8 8',
            fillColor: '#F59E0B',
            fillOpacity: 0.05,
          }
        ).addTo(group);
      }
    }
  }, [activeZone, nextZonePreview, editableZone, mapTheme, centerLabel]);

  // Render players, animated radar pings, and post-round trails
  useEffect(() => {
    const group = dynamicLayerRef.current;
    if (!group) return;
    group.clearLayers();

    // Post-round GPS breadcrumb trails
    for (const p of showTrailsForPlayers) {
      if (p.trail.length >= 2) {
        L.polyline(
          p.trail.map((pt) => [pt.lat, pt.lng] as [number, number]),
          {
            color: p.color,
            weight: 4,
            opacity: 0.92,
            lineCap: 'round',
            lineJoin: 'round',
          }
        ).addTo(group);
      }
    }

    // Radar Ping Snapshot markers with live animated ripple
    for (const ping of pings) {
      const ageSec = Math.max(0, Math.floor((nowMs - ping.pingedAt) / 1000));
      const ageLabel =
        ageSec < 60
          ? `${ageSec}s ago`
          : `${Math.floor(ageSec / 60)}m ${ageSec % 60}s ago`;

      L.circle([ping.lat, ping.lng], {
        radius: 26,
        color: '#06B6D4',
        weight: 1.5,
        fillColor: '#06B6D4',
        fillOpacity: 0.16,
      }).addTo(group);

      L.marker([ping.lat, ping.lng], {
        icon: L.divIcon({
          className: 'fk-ping-marker',
          html: `<div style="position:relative;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none;">
            <div class="fk-ping-ripple"></div>
            <div style="width:14px;height:14px;border-radius:9999px;background:#06B6D4;border:2.5px solid #09090E;box-shadow:0 0 0 3px rgba(6,182,212,0.35);position:relative;z-index:2;"></div>
            <div style="margin-top:4px;padding:2px 7px;border-radius:7px;background:rgba(9,10,16,0.94);border:1px solid rgba(34,211,238,0.55);color:#E2E8F0;font-size:9.5px;line-height:1.25;text-align:center;white-space:nowrap;font-family:JetBrains Mono,monospace;box-shadow:0 4px 12px rgba(0,0,0,0.45);"><div style="font-weight:700;color:#FFFFFF;">${escapeHtml(
              ping.playerName
            )}</div><div style="color:#67E8F9;font-weight:600;">Ping · ${ageLabel}</div></div>
          </div>`,
          iconSize: [0, 0],
        }),
      }).addTo(group);
    }

    // Live visible player markers with beacon pulse
    for (const item of visibleMarkers) {
      const { player, position, isExposedOob, isEmergencyPin, isDelayed } = item;
      const isSelf = player.id === viewerId;
      // Avoid visually double-stacking the viewer dot directly underneath the draggable Lobby zone center pin
      if (
        editableZone &&
        activeZone.shape === 'circle' &&
        isSelf &&
        haversineMeters(position, activeZone.center) < 15
      ) {
        continue;
      }
      const badgeColor = isEmergencyPin
        ? '#DC2626'
        : isExposedOob
        ? '#F59E0B'
        : player.role === 'hunter'
        ? '#EF4444'
        : '#10B981';
      const subLabel = isEmergencyPin
        ? 'SOS'
        : isExposedOob
        ? 'OOB'
        : isSelf
        ? 'YOU'
        : isDelayed
        ? '1m DELAY'
        : player.role.toUpperCase();

      const initialLetter = escapeHtml(getCallsignInitial(player.name));
      const dotSize = isSelf ? 28 : 24;

      L.marker([position.lat, position.lng], {
        zIndexOffset: isEmergencyPin ? 1000 : isSelf ? 500 : 100,
        icon: L.divIcon({
          className: 'fk-player-marker',
          html: `<div style="position:relative;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none;">
            ${
              isSelf || isEmergencyPin || isExposedOob
                ? `<div class="fk-player-pulse" style="background:${badgeColor};top:${dotSize / 2}px;"></div>`
                : ''
            }
            <div data-testid="player-initial-icon" style="position:relative;z-index:2;width:${dotSize}px;height:${dotSize}px;border-radius:9999px;background:${badgeColor};border:2.5px solid #FFFFFF;box-shadow:0 3px 12px rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;color:#FFFFFF;font-weight:800;font-size:${
              isSelf ? 12 : 11
            }px;line-height:1;">${initialLetter}</div>
            <div style="margin-top:4px;padding:2px 7px;border-radius:7px;background:rgba(9,10,16,0.92);border:1px solid ${badgeColor};color:#F8FAFC;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.45);">${escapeHtml(
              player.name
            )} <span style="color:${badgeColor};margin-left:3px;">${subLabel}</span></div>
          </div>`,
          iconSize: [0, 0],
        }),
      }).addTo(group);
    }
  }, [visibleMarkers, pings, showTrailsForPlayers, viewerId, nowMs, editableZone, activeZone]);

  const themeClass = `fk-map-${mapTheme}`;

  return (
    <div
      data-testid="tactical-map"
      data-theme={mapTheme}
      className={`${className} ${themeClass} relative overflow-hidden isolate z-0`}
    >
      {/* Keep className static on Leaflet mount element so React never wipes .leaflet-container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
