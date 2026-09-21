import { Employee, Vehicle } from "@/types";

export const decodePolyline = (encoded: string) => {
  if (!encoded) {
    return [];
  }
  const poly: { lat: number; lng: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) != 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    const p = {
      lat: lat / 1e5,
      lng: lng / 1e5,
    };
    poly.push(p);
  }
  return poly;
};

export const calculateMapCenter = (
  employees: Employee[],
  vehicles: Vehicle[],
): { lat: number; lng: number; zoom: number } | null => {
  if (
    (!employees || employees.length === 0) &&
    (!vehicles || vehicles.length === 0)
  ) {
    return null;
  }

  let totalLat = 0;
  let totalLng = 0;
  let count = 0;

  // Add Office Location (from first employee's drop coordinates if available)
  if (employees && employees.length > 0) {
    totalLat += employees[0].drop_lat;
    totalLng += employees[0].drop_lng;
    count++;

    // Add Pickup Locations for all employees
    employees.forEach((employee) => {
      totalLat += employee.pickup_lat;
      totalLng += employee.pickup_lng;
      count++;
    });
  }

  // Add All Vehicles Locations
  if (vehicles && vehicles.length > 0) {
    vehicles.forEach((vehicle) => {
      totalLat += vehicle.current_lat;
      totalLng += vehicle.current_lng;
      count++;
    });
  }

  if (count === 0) return null;

  const avgLat = totalLat / count;
  const avgLng = totalLng / count;
  let zoomTo = 13;

  // Calculate the zoom required to display the farthest lat-long point
  if (
    typeof window !== "undefined" &&
    window.google &&
    window.google.maps &&
    window.google.maps.geometry
  ) {
    let maxDist = 0;
    const centerPoint = new window.google.maps.LatLng(avgLat, avgLng);

    // Check distance to office
    if (employees && employees.length > 0) {
      const officePoint = new window.google.maps.LatLng(
        employees[0].drop_lat,
        employees[0].drop_lng,
      );
      const dist = window.google.maps.geometry.spherical.computeDistanceBetween(
        centerPoint,
        officePoint,
      );
      if (dist > maxDist) maxDist = dist;

      // Check distance to employee pickups as well
      employees.forEach((employee) => {
        const pickupPoint = new window.google.maps.LatLng(
          employee.pickup_lat,
          employee.pickup_lng,
        );
        const d = window.google.maps.geometry.spherical.computeDistanceBetween(
          centerPoint,
          pickupPoint,
        );
        if (d > maxDist) maxDist = d;
      });
    }

    // Check distance to vehicles
    if (vehicles && vehicles.length > 0) {
      vehicles.forEach((vehicle) => {
        const vehiclePoint = new window.google.maps.LatLng(
          vehicle.current_lat,
          vehicle.current_lng,
        );
        const dist =
          window.google.maps.geometry.spherical.computeDistanceBetween(
            centerPoint,
            vehiclePoint,
          );
        if (dist > maxDist) maxDist = dist;
      });
    }

    if (maxDist > 0) {
      // Zoom level 15 corresponds roughly to a 500m radius
      // A safe heuristic is: zoom = 16 - log2(radius_in_km * 2) roughly, or use the meter formula
      // Radius ~ 591657550.500000 / 2^zoom
      // 500m -> zoom ~15
      // 1000m -> zoom ~14
      const requiredZoom = 15 - Math.log(maxDist / 500) / Math.LN2;
      zoomTo = requiredZoom + 1.5;
    }
  }

  return { lat: avgLat, lng: avgLng, zoom: zoomTo };
};
