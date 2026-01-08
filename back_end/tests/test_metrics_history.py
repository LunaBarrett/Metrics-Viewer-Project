import json
from datetime import datetime, timedelta, timezone


def _auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_metrics_history_requires_auth(client, test_machine):
    resp = client.get(f"/api/front_end/machine/info/{test_machine.Hostname}/metrics/history")
    assert resp.status_code == 401


def test_metrics_history_machine_not_found(client, auth_token):
    resp = client.get(
        "/api/front_end/machine/info/does-not-exist/metrics/history",
        headers=_auth_headers(auth_token),
    )
    assert resp.status_code == 404


def test_metrics_history_empty_returns_success(client, auth_token, test_machine):
    resp = client.get(
        f"/api/front_end/machine/info/{test_machine.Hostname}/metrics/history",
        headers=_auth_headers(auth_token),
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["Hostname"] == test_machine.Hostname
    assert data["Machine_ID"] == test_machine.Machine_ID
    assert data["count"] == 0
    assert data["metrics"] == []


def test_metrics_history_returns_series_with_order_and_limit(client, app, auth_token, test_machine):
    from back_end.database.models import db, MachineMetric

    base = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    with app.app_context():
        for i in range(5):
            m = MachineMetric(
                Machine_ID=test_machine.Machine_ID,
                Timestamp=base + timedelta(minutes=i),
                Current_CPU_Usage=float(i),
                Current_Memory_Usage=json.dumps({"used": i}),
                Current_Disk_Usage=json.dumps([{"used": i}]),
            )
            db.session.add(m)
        db.session.commit()

    # asc, limit 3 -> first 3 oldest
    resp = client.get(
        f"/api/front_end/machine/info/{test_machine.Hostname}/metrics/history?order=asc&limit=3",
        headers=_auth_headers(auth_token),
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["count"] == 3
    assert [pt["Current_CPU_Usage"] for pt in data["metrics"]] == [0.0, 1.0, 2.0]

    # desc, limit 2 -> newest 2
    resp = client.get(
        f"/api/front_end/machine/info/{test_machine.Hostname}/metrics/history?order=desc&limit=2",
        headers=_auth_headers(auth_token),
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["count"] == 2
    assert [pt["Current_CPU_Usage"] for pt in data["metrics"]] == [4.0, 3.0]


def test_metrics_history_range_filtering(client, app, auth_token, test_machine):
    from back_end.database.models import db, MachineMetric

    base = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    with app.app_context():
        for i in range(10):
            m = MachineMetric(
                Machine_ID=test_machine.Machine_ID,
                Timestamp=base + timedelta(minutes=i),
                Current_CPU_Usage=float(i),
                Current_Memory_Usage=json.dumps({"used": i}),
                Current_Disk_Usage=json.dumps([{"used": i}]),
            )
            db.session.add(m)
        db.session.commit()

    # Start at minute 3, end at minute 5 inclusive => 3,4,5
    start = (base + timedelta(minutes=3)).isoformat().replace("+00:00", "Z")
    end = (base + timedelta(minutes=5)).isoformat().replace("+00:00", "Z")

    resp = client.get(
        f"/api/front_end/machine/info/{test_machine.Hostname}/metrics/history?start={start}&end={end}&order=asc&limit=50",
        headers=_auth_headers(auth_token),
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert [pt["Current_CPU_Usage"] for pt in data["metrics"]] == [3.0, 4.0, 5.0]


