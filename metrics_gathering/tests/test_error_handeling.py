import metrics_agent
from unittest.mock import patch

def test_send_metrics_network_failure():
    """Test that send_metrics handles network failures gracefully."""
    with patch('metrics_agent.requests.post', side_effect=Exception("Network error")):
        try:
            metrics_agent.send_metrics()
        except Exception:
            assert False, "send_metrics() should handle exceptions internally"