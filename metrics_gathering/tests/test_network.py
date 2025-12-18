from metrics_gathering import metrics_agent
from unittest.mock import patch

def test_send_metrics_network():
    """Test that send_metrics calls requests.post (network call is mocked)."""
    with patch('metrics_gathering.metrics_agent.requests.post') as mock_post:
        mock_post.return_value.status_code = 201
        metrics_agent.send_metrics()
        assert mock_post.called