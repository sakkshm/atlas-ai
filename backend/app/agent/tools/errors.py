import json
import logging

from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)


class OAuthExpiredError(Exception):
    def __init__(self, message: str = "Google account access expired. Please reconnect."):
        self.message = message
        super().__init__(message)


def handle_google_http_error(e: HttpError, context: str = "") -> str:
    status = e.resp.status
    reason = ""
    if e.error_details:
        for detail in e.error_details:
            if isinstance(detail, dict) and "message" in detail:
                reason = detail["message"]
                break

    if status == 401:
        user_msg = "Google session expired. Please reconnect your Google account."
    elif status == 403:
        user_msg = "Permission denied. Check that Atlas has access to this Google service."
    elif status == 404:
        user_msg = "Not found. The item may have been deleted or doesn't exist."
    elif status == 429:
        user_msg = "Google API rate limit exceeded. Please try again in a moment."
    elif status >= 500:
        user_msg = "Google service is temporarily unavailable. Please try again later."
    else:
        user_msg = f"Google API error ({status})."

    if context:
        user_msg = f"{context}: {user_msg}"

    logger.warning("Google API error %d %s: %s", status, context, reason or str(e))

    return json.dumps({
        "error": str(e),
        "user_message": user_msg,
        "status_code": status,
    })


def handle_tool_error(e: Exception, context: str = "") -> str:
    if isinstance(e, HttpError):
        return handle_google_http_error(e, context)

    if isinstance(e, OAuthExpiredError):
        return json.dumps({
            "error": e.message,
            "user_message": e.message,
            "status_code": 401,
        })

    logger.exception("Tool error: %s", context)

    user_msg = "Something went wrong while performing this action."
    if context:
        user_msg = f"{context}: {user_msg}"

    return json.dumps({
        "error": str(e),
        "user_message": user_msg,
        "status_code": 500,
    })
