"""Integration test for SSE streaming endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.main import create_app


@pytest.fixture
async def test_app_instance():
    """Create test application with in-memory SQLite database."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    yield app
    await engine.dispose()


@pytest.mark.asyncio
async def test_sse_stream_events(test_app_instance):
    """Verify SSE streaming yields plan, tool execution, and final response."""
    async with AsyncClient(
        transport=ASGITransport(app=test_app_instance), base_url="http://test"
    ) as client:
        # Create conversation
        conv_res = await client.post("/api/v1/chat/conversations", json={"title": "SSE Chat"})
        conv_id = conv_res.json()["id"]

        # Call stream endpoint
        response = await client.post(
            f"/api/v1/chat/conversations/{conv_id}/stream",
            json={"content": "Show my repositories"},
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        body_text = response.text
        assert "event: status" in body_text
        assert "event: plan" in body_text
        assert "event: tool_call" in body_text
        assert "event: tool_result" in body_text
        assert "event: response" in body_text
        assert "event: done" in body_text
