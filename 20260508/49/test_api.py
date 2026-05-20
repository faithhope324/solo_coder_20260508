import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

async def test_separator():
    print("=" * 60)
    print("Testing Audio Separator Module")
    print("=" * 60)

    try:
        from separator import AudioSeparator
        print("\n[OK] Import successful")

        separator = AudioSeparator(model_name="htdemucs")
        print(f"[OK] Model loaded: {separator.model_name}")
        print(f"[OK] Device: {separator.device}")
        print(f"[OK] Available sources: {separator.sources}")

        print("\n" + "=" * 60)
        print("All tests passed!")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_api_imports():
    print("\n" + "=" * 60)
    print("Testing FastAPI Application Imports")
    print("=" * 60)

    try:
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        import main

        print("\n[OK] FastAPI imports successful")
        print(f"[OK] App title: {main.app.title}")

        client = TestClient(main.app)
        response = client.get("/")
        assert response.status_code == 200
        print(f"[OK] Root endpoint working")

        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        print(f"[OK] Health check: {data}")

        print("\n" + "=" * 60)
        print("API tests passed!")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("\n" + "♪" * 60)
    print("Real-time Audio Separation System - Test Suite")
    print("♪" * 60)

    separator_ok = asyncio.run(test_separator())
    api_ok = asyncio.run(test_api_imports())

    print("\n" + "=" * 60)
    if separator_ok and api_ok:
        print("✅ All tests passed! System is ready.")
        print("\nTo start the server, run:")
        print("  cd backend")
        print("  python main.py")
        print("\nThen visit: http://localhost:8000/frontend/index.html")
    else:
        print("❌ Some tests failed. Please check the errors above.")
    print("=" * 60)
