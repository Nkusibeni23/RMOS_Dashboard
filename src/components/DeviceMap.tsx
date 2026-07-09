'use client';

import { useEffect, useRef } from 'react';
import type { LocationPing } from '@/lib/types';

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '';

// Load the Google Maps JS API exactly once, shared across every map instance.
let loaderPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&v=weekly`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(s);
  });
  return loaderPromise;
}

// Light map styling that blends with the white/green dashboard: muted land, green POIs off.
const MAP_STYLE = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', stylers: [{ color: '#dbe9e2' }] },
  { featureType: 'landscape', stylers: [{ color: '#f4f7f5' }] },
];

export default function DeviceMap({ locations }: { locations: LocationPing[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const infoRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);

  useEffect(() => {
    if (!KEY || !locations || locations.length === 0) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const g = (window as any).google;
        const latest = locations[0];
        const center = { lat: latest.latitude, lng: latest.longitude };

        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(ref.current, {
            center,
            zoom: 17,
            // Hybrid = satellite imagery WITH street + place labels (best of both). Users can switch
            // to plain map / satellite via the type control.
            mapTypeId: g.maps.MapTypeId.HYBRID,
            mapTypeControl: true,
            mapTypeControlOptions: {
              style: g.maps.MapTypeControlStyle.HORIZONTAL_BAR,
              position: g.maps.ControlPosition.TOP_RIGHT,
              mapTypeIds: ['roadmap', 'satellite', 'hybrid'],
            },
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'greedy',
            styles: MAP_STYLE, // applies to the roadmap view only
          });
          infoRef.current = new g.maps.InfoWindow();
        } else {
          mapRef.current.panTo(center);
        }

        // Accuracy ring around the latest fix — shows how precise the position is (network fixes are
        // coarser than GPS, so this makes the difference legible at a glance).
        if (circleRef.current) circleRef.current.setMap(null);
        if (typeof latest.accuracyM === 'number' && latest.accuracyM > 0) {
          circleRef.current = new g.maps.Circle({
            map: mapRef.current,
            center,
            radius: latest.accuracyM,
            strokeColor: '#12A85E',
            strokeOpacity: 0.7,
            strokeWeight: 1.5,
            fillColor: '#12A85E',
            fillOpacity: 0.12,
          });
        }

        // Redraw markers (latest emphasized in RMSoft green).
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = locations.map((p, i) => {
          const isLatest = i === 0;
          const marker = new g.maps.Marker({
            position: { lat: p.latitude, lng: p.longitude },
            map: mapRef.current,
            title: new Date(p.reportedAt).toLocaleString(),
            zIndex: isLatest ? 999 : 1,
            icon: {
              path: g.maps.SymbolPath.CIRCLE,
              scale: isLatest ? 8 : 5,
              fillColor: isLatest ? '#12A85E' : '#5A655F',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
          });
          marker.addListener('click', () => {
            infoRef.current.setContent(
              `<div style="font:13px -apple-system,system-ui;color:#0C1613">
                 <b>${new Date(p.reportedAt).toLocaleString()}</b>
                 ${p.accuracyM != null ? `<br>±${Math.round(p.accuracyM)} m` : ''}
                 ${p.source ? `<br>via ${p.source}` : ''}
               </div>`,
            );
            infoRef.current.open(mapRef.current, marker);
          });
          return marker;
        });
      })
      .catch(() => {
        /* handled by the fallback UI below */
      });

    return () => {
      cancelled = true;
    };
  }, [locations]);

  if (!KEY) {
    return (
      <div className="h-[400px] grid place-items-center bg-rm-canvas border border-rm-line rounded-xl text-rm-slate text-sm text-center px-6">
        Set <code className="mx-1 px-1 rounded bg-rm-panel border border-rm-line">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code>
        to show the map.
      </div>
    );
  }

  if (!locations || locations.length === 0) {
    return (
      <div className="h-[400px] grid place-items-center bg-rm-canvas border border-rm-line rounded-xl text-rm-slate text-sm">
        No location data yet — issue a Locate command.
      </div>
    );
  }

  return <div ref={ref} className="h-[400px] rounded-xl overflow-hidden border border-rm-line" />;
}
