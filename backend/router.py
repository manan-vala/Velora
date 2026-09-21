import asyncio
import logging

import httpx

from config import OSRM_URL, OSRM_TABLE_BLOCK

logger = logging.getLogger(__name__)

OSRM_TABLE_URL = f"{OSRM_URL}/table/v1/driving/"
OSRM_ROUTE_URL = f"{OSRM_URL}/route/v1/driving/"

MATRIX_ATTEMPTS = 3
MATRIX_RETRY_BACKOFF_S = 1.0
MATRIX_CONCURRENCY = 4


class MatrixService:
    """
    Handles the OSRM Table API for the optimization phase.

    The matrix is requested in OSRM_TABLE_BLOCK x OSRM_TABLE_BLOCK source/destination
    blocks, so a request never exceeds OSRM's --max-table-size (100 by default) or grows
    an unbounded GET URL, and one failed block is retried on its own.
    """
    def __init__(self, employees, vehicles, transport=None):
        self.index_map = {}
        self.coords_list = []
        self.durations = []
        self.distances = []
        self._transport = transport

        # 1. Build Coordinate Index
        if employees:
            self._add_point("office", employees[0].drop_lat, employees[0].drop_lng)
        for v in vehicles:
            self._add_point(v.vehicle_id, v.current_lat, v.current_lng)
        for e in employees:
            self._add_point(e.employee_id, e.pickup_lat, e.pickup_lng)

    def _add_point(self, id, lat, lng):
        if id not in self.index_map:
            self.index_map[id] = len(self.coords_list)
            self.coords_list.append(f"{lng},{lat}")

    async def fetch_matrix(self) -> bool:
        n = len(self.coords_list)
        self.durations = [[None] * n for _ in range(n)]
        self.distances = [[None] * n for _ in range(n)]
        blocks = [list(range(i, min(i + OSRM_TABLE_BLOCK, n))) for i in range(0, n, OSRM_TABLE_BLOCK)]
        sem = asyncio.Semaphore(MATRIX_CONCURRENCY)

        async with httpx.AsyncClient(timeout=30.0, transport=self._transport) as client:
            results = await asyncio.gather(
                *(self._fetch_block(client, sem, src, dst) for src in blocks for dst in blocks))

        if all(results):
            logger.info(f"[Matrix] Fetched {n}x{n} matrix in {len(results)} request(s).")
            return True
        return False

    async def _fetch_block(self, client, sem, sources, destinations) -> bool:
        points = list(dict.fromkeys(sources + destinations))
        pos = {g: i for i, g in enumerate(points)}
        url = OSRM_TABLE_URL + ";".join(self.coords_list[g] for g in points)
        params = {
            "annotations": "duration,distance",
            "sources": ";".join(str(pos[g]) for g in sources),
            "destinations": ";".join(str(pos[g]) for g in destinations),
        }

        async with sem:
            for attempt in range(1, MATRIX_ATTEMPTS + 1):
                try:
                    resp = await client.get(url, params=params)
                    if resp.status_code == 200 and resp.json().get("code") == "Ok":
                        data = resp.json()
                        for r, src in enumerate(sources):
                            for c, dst in enumerate(destinations):
                                self.durations[src][dst] = data["durations"][r][c]
                                self.distances[src][dst] = data["distances"][r][c]
                        return True
                    if resp.status_code < 500 and resp.status_code != 429:
                        logger.error(f"[Matrix] OSRM rejected the table request: HTTP {resp.status_code} {resp.text[:200]}")
                        return False
                    logger.warning(f"[Matrix] HTTP {resp.status_code} (attempt {attempt}/{MATRIX_ATTEMPTS})")
                except httpx.HTTPError as e:
                    logger.warning(f"[Matrix] {type(e).__name__}: {e} (attempt {attempt}/{MATRIX_ATTEMPTS})")
                if attempt < MATRIX_ATTEMPTS:
                    await asyncio.sleep(MATRIX_RETRY_BACKOFF_S * attempt)
        return False

    def get_pair(self, id_from, id_to):
        idx_from = self.index_map.get(id_from)
        idx_to = self.index_map.get(id_to)
        if idx_from is None or idx_to is None: return None
        distance = self.distances[idx_from][idx_to]
        duration = self.durations[idx_from][idx_to]
        if distance is None or duration is None:  # OSRM found no route; solvers fall back to haversine
            return None
        return {
            "distance_meters": distance,
            "duration_seconds": duration,
        }


class RouteService:
    """
    Handles fetching geometry with Throttling and Retries.
    Prevents 'DDoS-ing' the server.
    """
    def __init__(self, max_concurrency=50):
        # 1. Semaphore to limit parallel requests (Throttling)
        self.sem = asyncio.Semaphore(max_concurrency)
        
        # 2. Optimized Client (Connection Pooling)
        self.client = httpx.AsyncClient(
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=max_concurrency),
            timeout=10.0
        )

    async def fetch_geometry_safe(self, tag, src_coords, dst_coords, retries=3):
        """
        Fetches geometry with automatic retries and error handling.
        """
        # OSRM expects: lon,lat;lon,lat
        coords_str = f"{src_coords[1]},{src_coords[0]};{dst_coords[1]},{dst_coords[0]}"
        url = f"{OSRM_ROUTE_URL}{coords_str}?overview=full&geometries=geojson"
        
        async with self.sem: # Wait here if 50 requests are already running
            for attempt in range(retries):
                try:
                    resp = await self.client.get(url)
                    
                    if resp.status_code == 200:
                        routes = resp.json().get('routes', [])
                        if routes:
                            return tag, routes[0]['geometry']['coordinates']
                        else:
                            return tag, None # No route found (water?)

                    elif resp.status_code >= 500:
                        logger.warning(f"[Geometry] Server Error {tag} (Attempt {attempt+1}/{retries})")
                    else:
                        logger.warning(f"[Geometry] Bad Request {tag}: {resp.status_code}")
                        return tag, None

                except (httpx.ConnectError, httpx.ReadTimeout, httpx.PoolTimeout) as e:
                    logger.warning(f"[Geometry] Network Error {tag} (Attempt {attempt+1}/{retries}): {e}")

                # If we failed, wait 1 second before retrying (Backoff)
                if attempt < retries - 1:
                    await asyncio.sleep(1)

        logger.error(f"[Geometry] Failed to fetch {tag} after {retries} attempts.")
        return tag, None

    async def close(self):
        await self.client.aclose()