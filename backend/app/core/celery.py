from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "atlas_ai",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL.replace("/0", "/1"),
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=600,
    task_soft_time_limit=540,
    task_routes={
        "app.tasks.agent.*": {"queue": "agent"},
    },
    imports=["app.tasks.agent"],
)
