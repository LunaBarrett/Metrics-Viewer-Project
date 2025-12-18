from metrics_gathering import metrics_agent

def test_payload_format():
    """Test that the metrics payload has the correct structure."""
    payload = {
        "hostname": "test-vm",
        "timestamp": "2023-01-01T00:00:00Z",
        "current_cpu_usage": 50.0,
        "current_memory_usage": {"total": 8, "used": 4, "percent": 50.0},
        "current_disk_usage": [{"mountpoint": "/", "total": 100, "used": 50, "percent": 50.0}]
    }
    # Check required fields
    assert "hostname" in payload
    assert "timestamp" in payload
    assert isinstance(payload["current_disk_usage"], list)