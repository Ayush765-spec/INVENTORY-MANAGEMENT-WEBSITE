// components/TrackerFeed.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import L from "leaflet";

export default function TrackerFeed() {
  const socketRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [trackingId, setTrackingId] = useState("");
  const clientId = useRef(crypto.randomUUID());

  useEffect(() => {
    socketRef.current = io();

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        ({ coords }) => {
          const { latitude, longitude } = coords;
          socketRef.current.emit("sendLocation", {
            id: clientId.current,
            latitude,
            longitude,
          });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    socketRef.current.on("receive-location", ({ id, latitude, longitude }) => {
      if (!trackingId || id !== trackingId) return;

      if (markersRef.current[id]) {
        markersRef.current[id].setLatLng([latitude, longitude]);
      } else {
        markersRef.current[id] = L.marker([latitude, longitude]).addTo(mapRef.current);
      }

      mapRef.current.setView([latitude, longitude], 13);
    });

    socketRef.current.on("user-disconnected", (id: string) => {
      if (markersRef.current[id]) {
        mapRef.current.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [trackingId]);

  useEffect(() => {
    mapRef.current = L.map("map").setView([0, 0], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "OpenStreetMap",
    }).addTo(mapRef.current);
  }, []);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!trackingId.trim()) return alert("Enter a valid tracking ID");
          setTrackingId(trackingId.trim());
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Enter Tracking ID"
          className="border px-3 py-2 rounded-lg"
        />
        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg">
          Track
        </button>
      </form>

      <div id="map" style={{ height: "400px" }} />
    </div>
  );
}