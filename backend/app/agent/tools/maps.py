import json
import logging
import re

import httpx

from langchain_core.tools import tool
from app.core.config import settings

logger = logging.getLogger(__name__)

MAPS_BASE_URL = "https://maps.googleapis.com/maps/api"


@tool
def distance_matrix(
    origins: str,
    destinations: str,
    mode: str = "driving",
) -> str:
    """Get travel distance and duration between locations. Args: origin, destination, mode (driving/walking/bicycling/transit)."""
    try:
        api_key = settings.GOOGLE_MAPS_API_KEY
        if not api_key:
            return json.dumps({"error": "Google Maps API key not configured"})

        params = {
            "origins": origins,
            "destinations": destinations,
            "mode": mode,
            "key": api_key,
        }

        response = httpx.get(
            f"{MAPS_BASE_URL}/distancematrix/json", params=params, timeout=10
        )
        data = response.json()

        if data.get("status") != "OK":
            return json.dumps({"error": f"Maps API error: {data.get('status')}"})

        results = []
        for i, origin in enumerate(data.get("origin_addresses", [])):
            for j, dest in enumerate(data.get("destination_addresses", [])):
                element = data["rows"][i]["elements"][j]
                if element.get("status") == "OK":
                    results.append(
                        {
                            "origin": origin,
                            "destination": dest,
                            "distance": element["distance"]["text"],
                            "duration": element["duration"]["text"],
                            "distance_meters": element["distance"]["value"],
                            "duration_seconds": element["duration"]["value"],
                        }
                    )

        return json.dumps({
            "results": results,
            "card": {
                "type": "distance_matrix",
                "results": results,
                "mode": mode,
            },
        })

    except Exception as e:
        logger.exception("Failed to get distance matrix")
        return json.dumps({"error": str(e)})


@tool
def get_directions(
    origin: str,
    destination: str,
    mode: str = "driving",
) -> str:
    """Get turn-by-turn directions. Args: origin, destination, mode (driving/walking/bicycling/transit)."""
    try:
        api_key = settings.GOOGLE_MAPS_API_KEY
        if not api_key:
            return json.dumps({"error": "Google Maps API key not configured"})

        params = {
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "key": api_key,
        }

        response = httpx.get(
            f"{MAPS_BASE_URL}/directions/json", params=params, timeout=10
        )
        data = response.json()

        if data.get("status") != "OK":
            return json.dumps({"error": f"Maps API error: {data.get('status')}"})

        routes = []
        for route in data.get("routes", []):
            leg = route["legs"][0]
            steps = []
            for step in leg.get("steps", []):
                instruction = re.sub(r"<[^>]+>", "", step.get("html_instructions", ""))
                steps.append(
                    {
                        "instruction": instruction,
                        "distance": step["distance"]["text"],
                        "duration": step["duration"]["text"],
                    }
                )

            routes.append(
                {
                    "summary": route.get("summary", ""),
                    "distance": leg["distance"]["text"],
                    "duration": leg["duration"]["text"],
                    "start_address": leg.get("start_address", ""),
                    "end_address": leg.get("end_address", ""),
                    "steps": steps,
                }
            )

        return json.dumps({
            "routes": routes,
            "card": {
                "type": "route",
                "routes": routes,
                "mode": mode,
                "step_count": len(steps) if routes else 0,
            },
        })

    except Exception as e:
        logger.exception("Failed to get directions")
        return json.dumps({"error": str(e)})
