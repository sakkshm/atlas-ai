import json
import logging
from typing import Annotated

from langchain_core.tools import InjectedToolArg, tool
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)


def _build_people_service(creds):
    return build("people", "v1", credentials=creds, cache_discovery=False)


@tool
def search_contacts(
    query: str,
    user_id: Annotated[str, InjectedToolArg] = "",
) -> str:
    """Search Google Contacts by name. Returns email and phone. Args: query (name to search)."""
    try:
        from app.agent.tools.credentials import get_credentials_sync

        creds = get_credentials_sync(user_id)
        service = _build_people_service(creds)

        service.people().searchContacts(query="", readMask="names").execute()

        results = (
            service.people()
            .searchContacts(
                query=query,
                readMask="names,emailAddresses,phoneNumbers",
                pageSize=20,
            )
            .execute()
        )

        contacts = []
        for result in results.get("results", []):
            person = result.get("person", {})
            names = person.get("names", [])
            emails = person.get("emailAddresses", [])
            phones = person.get("phoneNumbers", [])

            contacts.append(
                {
                    "name": names[0].get("displayName", "") if names else "",
                    "email": emails[0].get("value", "") if emails else "",
                    "phone": phones[0].get("value", "") if phones else "",
                }
            )

        return json.dumps({"contacts": contacts, "count": len(contacts)})

    except HttpError as e:
        logger.exception("People API error")
        return json.dumps({"error": str(e)})
    except Exception as e:
        logger.exception("Failed to search contacts")
        return json.dumps({"error": str(e)})
